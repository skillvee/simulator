/**
 * Orchestrator for the v2 resource pipeline.
 *
 * The pipeline runs in two halves:
 *
 *   1. `generatePlanAndPersist` (sync) — invoked from the start-pipeline route,
 *      runs Step 1 (plan + 3 docs) with Gemini 3.1 Pro, persists to the scenario,
 *      and sets `pipelineMeta.status = "markdown_ready"`.
 *
 *   2. `runArtifactPipeline` (async, kicked via Vercel `after()`) — runs Step 2
 *      (artifact generation, branched by archetypeToResourceType), Step 3
 *      (deterministic validators), and Step 4 (LLM judge). Loops up to 3 times
 *      on judge failure, feeding judge issues back into Step 2 each retry.
 *
 * Both halves are idempotent — they read `pipelineMeta.status` on entry and
 * resume from the last completed step. This makes the pipeline robust to
 * Vercel function cold-kills.
 */

import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { logGenerationStep } from "./generation-logger";
import {
  generatePlanAndDocs,
  type GeneratePlanAndDocsInput,
} from "./plan-and-docs-generator";
import {
  archetypeToResourceType,
  type ResourceType,
} from "./archetype-resource-mapping";
import { generateRepoArtifact } from "./repo-artifact-generator";
import { generateDataArtifact } from "./data-artifact-generator";
import { runValidators } from "./validators";
import { validateCoworkerKnowledge } from "./validators/coworkers";
import { judgeArtifacts } from "./judge";
import {
  groundCoworkerKnowledge,
  type CoworkerKnowledgeUpdate,
} from "./coworker-grounder";
import {
  buildRepoArtifactSummary,
  buildDataArtifactSummary,
  type ArtifactSummary,
} from "./artifact-summary";
import { getArchetypeDisplayName } from "@/lib/candidate";
import type {
  RoleArchetype,
} from "@/lib/candidate";
import type {
  ResourcePlan,
  ScenarioDoc,
  ResourcePipelineMeta,
  ResourcePipelineStatus,
  JudgeVerdict,
} from "@/types";
import type { Prisma } from "@prisma/client";

const logger = createLogger("lib:scenarios:orchestrator");

const MAX_ARTIFACT_ATTEMPTS = 3;

// Thrown errors that won't change between attempts — config gaps and schema
// mismatches, not transient network/API failures. Match → abort the retry loop
// immediately on first occurrence (don't waste 2 more Pro calls reproducing the
// same throw). Anything not on this list is treated as potentially retryable
// (timeouts, 429s, 5xx) and gets the full attempt budget.
const NON_RETRYABLE_THROW_PATTERNS: RegExp[] = [
  /GitHub token not configured/i,
  /GITHUB_(?:ORG_)?TOKEN.*not set/i,
];

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export interface StartPipelineInput {
  scenarioId: string;
  archetype: RoleArchetype;
  archetypeName: string;
  resourceType: ResourceType;
  generateInput: GeneratePlanAndDocsInput;
  creationLogId?: string;
}

export interface StartPipelineResult {
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  pipelineMeta: ResourcePipelineMeta;
}

/**
 * Step 1 — sync. Generates the plan + 3 docs and persists them to the Scenario.
 * Sets status to `markdown_ready` so the recruiter UI can render docs immediately.
 *
 * Idempotent: if `pipelineMeta.status` is already past `planning`, returns the
 * existing plan/docs without re-calling Gemini.
 */
export async function generatePlanAndPersist(
  input: StartPipelineInput
): Promise<StartPipelineResult> {
  const { scenarioId, generateInput, creationLogId } = input;

  // Resume short-circuit
  const existing = await loadScenarioPipelineState(scenarioId);
  if (existing && (existing.plan && existing.docs && existing.meta && existing.meta.status !== "planning")) {
    logger.info("plan-and-docs already complete; skipping Step 1", {
      scenarioId,
      status: existing.meta.status,
    });
    return {
      plan: existing.plan,
      docs: existing.docs,
      pipelineMeta: existing.meta,
    };
  }

  // Mark planning state
  const meta: ResourcePipelineMeta = {
    version: "v2",
    status: "planning",
    attempts: 0,
    startedAt: new Date().toISOString(),
  };
  await persistMeta(scenarioId, meta);

  const tracker = creationLogId
    ? await logGenerationStep({
        creationLogId,
        stepName: "generate_plan",
        modelUsed: "gemini-3.1-pro-preview",
        promptVersion: "v2.0",
        inputData: serializeInput(generateInput),
      })
    : null;

  try {
    const result = await generatePlanAndDocs(generateInput);

    const newMeta: ResourcePipelineMeta = {
      ...meta,
      status: "markdown_ready",
    };

    await db.scenario.update({
      where: { id: scenarioId },
      data: {
        plan: result.plan as unknown as Prisma.InputJsonValue,
        docs: result.docs as unknown as Prisma.InputJsonValue,
        resourcePipelineMeta: newMeta as unknown as Prisma.InputJsonValue,
        pipelineVersion: "v2",
      },
    });

    await tracker?.complete({
      promptText: result._debug.promptText,
      responseText: result._debug.responseText,
      outputData: { plan: result.plan, docs: result.docs },
      attempts: result._meta.attempts,
    });

    return {
      plan: result.plan,
      docs: result.docs,
      pipelineMeta: newMeta,
    };
  } catch (err) {
    const failedMeta: ResourcePipelineMeta = {
      ...meta,
      status: "failed",
      lastError: err instanceof Error ? err.message : String(err),
    };
    await persistMeta(scenarioId, failedMeta);
    await tracker?.fail(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

/**
 * Steps 2-4. Async — invoked via `after()` from the start-pipeline route.
 *
 * Phases 3-5 of the implementation will fill the artifact / validator / judge
 * branches; this skeleton wires the state machine and retry loop so the API
 * layer + UI can be built and tested ahead of the full content. When the
 * branches throw `NotImplementedYet`, the pipeline transitions to `failed` with
 * a descriptive error.
 */
export async function runArtifactPipeline(
  scenarioId: string,
  options: { creationLogId?: string; archetype: RoleArchetype } = {
    archetype: "GENERAL_SOFTWARE_ENGINEER",
  }
): Promise<void> {
  const { creationLogId, archetype } = options;
  const resourceType = archetypeToResourceType(archetype);

  const state = await loadScenarioPipelineState(scenarioId);
  if (!state) {
    logger.warn("runArtifactPipeline: scenario not found", { scenarioId });
    return;
  }

  if (state.meta?.status === "passed") {
    logger.info("Pipeline already passed; skipping", { scenarioId });
    return;
  }
  if (!state.plan || !state.docs) {
    logger.error("runArtifactPipeline called before Step 1 complete", { scenarioId });
    return;
  }

  let meta: ResourcePipelineMeta = {
    ...state.meta!,
    status: "artifacts_generating",
  };
  await persistMeta(scenarioId, meta);

  let lastVerdict: JudgeVerdict | undefined;
  let lastError: string | undefined;
  // Coworker-validator hits from the most recent attempt. Threaded into
  // Step 5 so we skip the Pro call when the ungrounded coworkers already
  // align with the bundle.
  let lastCoworkerErrorCount = 0;
  // Fingerprint of the previous attempt's deterministic failure (validator
  // errors, or judge blockingIssues). When two attempts produce identical
  // deterministic feedback, the regenerator demonstrably can't address it —
  // bail to save Gemini cost. Score-only judge failures and thrown exceptions
  // are NOT fingerprinted: model variance can cross 0.85 on a third try, and
  // identical-looking throws are usually transient (429/5xx/timeouts).
  let previousFingerprint: string | null = null;

  for (let attempt = 1; attempt <= MAX_ARTIFACT_ATTEMPTS; attempt++) {
    meta = { ...meta, attempts: attempt, status: "artifacts_generating" };
    await persistMeta(scenarioId, meta);

    let currentFingerprint: string | null = null;

    try {
      // Step 2 — artifact generation (filled in by phases 3 & 4).
      await runStep2({
        scenarioId,
        plan: state.plan,
        docs: state.docs,
        resourceType,
        judgeFeedback: lastVerdict,
        creationLogId,
        attempt,
      });

      // Step 3 — deterministic validators (filled in by phase 5).
      meta = { ...meta, status: "validating" };
      await persistMeta(scenarioId, meta);
      const validatorResult = await runStep3({
        scenarioId,
        plan: state.plan,
        docs: state.docs,
        resourceType,
        creationLogId,
      });
      lastCoworkerErrorCount = validatorResult.coworkerErrorCount;

      if (!validatorResult.ok) {
        lastVerdict = synthesizeVerdictFromValidators(validatorResult.errors);
        currentFingerprint = "validator:" + JSON.stringify([...validatorResult.errors].sort());
      } else {
        // Step 5 — coworker grounding runs BEFORE Step 4 (judge). The v2.3
        // judge prompt treats concrete coworker hallucinations as blocking
        // (a candidate who asks about a missing `docker-compose.yml` derails
        // the simulation), so judging unground coworkers would loop forever
        // — Step 5 IS the recovery for those mismatches. Order: validate →
        // ground (if needed) → judge sees grounded knowledge.
        // Skipped when Step 3's coworker validator reported zero errors.
        // Grounder failure is non-fatal here: judge will independently
        // re-flag any unfixed coworker issues, and fail-fast handles
        // persistent loops.
        meta = { ...meta, status: "grounding_coworkers" };
        await persistMeta(scenarioId, meta);
        const grounded = await runStep5_groundCoworkers({
          scenarioId,
          plan: state.plan,
          docs: state.docs,
          resourceType,
          coworkerErrorCount: lastCoworkerErrorCount,
          creationLogId,
        });

        // Step 4 — judge (filled in by phase 5).
        meta = { ...meta, status: "judging" };
        await persistMeta(scenarioId, meta);
        const verdict = await runStep4({
          scenarioId,
          plan: state.plan,
          docs: state.docs,
          resourceType,
          validatorResults: { passed: true, errors: [] },
          creationLogId,
        });
        lastVerdict = verdict;

        if (verdict.passed && verdict.score >= 0.85 && verdict.blockingIssues.length === 0) {
          meta = {
            ...meta,
            status: "passed",
            judgeSummary: verdict.summary,
            blockingIssues: undefined,
            passedAt: new Date().toISOString(),
            coworkersGrounded: grounded,
          };
          // Auto-publish: once the judge accepts the bundle there's no further
          // human gate, so the candidate-facing invite link starts working
          // immediately. Recruiters wanted "ready means shareable" — no
          // separate Publish click.
          await db.scenario.update({
            where: { id: scenarioId },
            data: {
              resourcePipelineMeta: meta as unknown as Prisma.InputJsonValue,
              isPublished: true,
            },
          });
          return;
        }
        // Only fingerprint when the judge cited specific blocking issues. A
        // bare score-only failure (passed=false, blockingIssues=[]) reflects
        // model variance and might cross 0.85 on the next try — let it retry.
        if (verdict.blockingIssues.length > 0) {
          currentFingerprint = "judge:" + JSON.stringify([...verdict.blockingIssues].sort());
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.warn("artifact pipeline attempt failed", { scenarioId, attempt, err: lastError });
      // Known non-retryable throws (config gaps, schema mismatches) abort
      // immediately — no point burning 2 more attempts on the same exception.
      // Anything else is potentially transient; fall through and let the loop
      // continue without fingerprinting the throw.
      if (NON_RETRYABLE_THROW_PATTERNS.some((p) => p.test(lastError!))) {
        logger.warn("aborting retries — non-retryable error", { scenarioId, lastError });
        break;
      }
    }

    if (currentFingerprint !== null && currentFingerprint === previousFingerprint) {
      logger.warn("aborting retries — same deterministic failure as previous attempt", {
        scenarioId,
        attempt,
        fingerprint: currentFingerprint.slice(0, 200),
      });
      lastError =
        lastError ??
        `Same failure as previous attempt; retries won't help. Fix the underlying issue and re-run.`;
      break;
    }
    previousFingerprint = currentFingerprint;
  }

  meta = {
    ...meta,
    status: "failed",
    lastError: lastError ?? lastVerdict?.summary ?? "artifact generation exhausted retries",
    blockingIssues: lastVerdict?.blockingIssues,
    judgeSummary: lastVerdict?.summary,
  };
  await persistMeta(scenarioId, meta);
}

// ---------------------------------------------------------------------------
// Step stubs — replaced by phases 3, 4, and 5
// ---------------------------------------------------------------------------

/** Invoke the right Step 2 generator based on resourceType. */
async function runStep2(args: {
  scenarioId: string;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  resourceType: ResourceType;
  judgeFeedback?: JudgeVerdict;
  creationLogId?: string;
  attempt: number;
}): Promise<void> {
  const { scenarioId, plan, docs, resourceType, judgeFeedback, attempt, creationLogId } = args;

  const tracker = creationLogId
    ? await logGenerationStep({
        creationLogId,
        stepName: "generate_artifacts",
        modelUsed: "gemini-3.1-pro-preview",
        promptVersion: "v2.0",
        inputData: {
          attempt,
          resourceType,
          hasJudgeFeedback: !!judgeFeedback,
        },
      })
    : null;

  try {
    if (resourceType === "repo") {
      const result = await generateRepoArtifact({
        scenarioId,
        plan,
        docs,
        judgeFeedback,
        attempt,
      });
      await tracker?.complete({
        outputData: { repoUrl: result.repoUrl },
        attempts: attempt,
      });
      return;
    }

    // Data branch
    const scenarioContext = await loadScenarioContext(scenarioId);
    const dataResult = await generateDataArtifact({
      scenarioId,
      plan,
      docs,
      scenarioContext,
      judgeFeedback,
      attempt,
    });
    await tracker?.complete({
      outputData: {
        files: dataResult.files.map((f) => ({
          id: f.id,
          filename: f.filename,
          rowCount: f.rowCount,
          byteSize: f.byteSize,
        })),
        parseErrors: dataResult.parseErrors,
      },
      attempts: attempt,
    });
  } catch (err) {
    await tracker?.fail(
      err instanceof Error ? err : new Error(String(err)),
      { attempts: attempt }
    );
    throw err;
  }
}

/** Run deterministic validators. */
async function runStep3(args: {
  scenarioId: string;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  resourceType: ResourceType;
  creationLogId?: string;
}): Promise<{ ok: boolean; errors: string[]; coworkerErrorCount: number }> {
  const { scenarioId, plan, docs, resourceType, creationLogId } = args;

  const tracker = creationLogId
    ? await logGenerationStep({
        creationLogId,
        stepName: "validate_artifacts",
        inputData: { resourceType },
      })
    : null;

  try {
    const taskDescription = await loadTaskDescription(scenarioId);
    const result = await runValidators({
      scenarioId,
      plan,
      docs,
      resourceType,
      taskDescription,
    });
    await tracker?.complete({
      outputData: { ok: result.ok, errorCount: result.errors.length, errors: result.errors },
    });
    return result;
  } catch (err) {
    await tracker?.fail(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

/** Run the LLM judge with thinkingLevel: "high". */
async function runStep4(args: {
  scenarioId: string;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  resourceType: ResourceType;
  validatorResults: { passed: boolean; errors: string[] };
  creationLogId?: string;
}): Promise<JudgeVerdict> {
  const { scenarioId, plan, docs, resourceType, validatorResults, creationLogId } = args;

  const tracker = creationLogId
    ? await logGenerationStep({
        creationLogId,
        stepName: "judge_artifacts",
        modelUsed: "gemini-3.1-pro-preview",
        promptVersion: "v2.0",
        inputData: { resourceType },
      })
    : null;

  try {
    const summary: ArtifactSummary | null =
      resourceType === "repo"
        ? await buildRepoArtifactSummary(scenarioId)
        : await buildDataArtifactSummary(scenarioId);

    if (!summary) {
      throw new Error("Could not build artifact summary for judge");
    }

    const scenarioContext = await loadJudgeScenarioContext(scenarioId);
    const coworkers = await loadCoworkersForJudge(scenarioId);

    const verdict = await judgeArtifacts({
      scenario: scenarioContext,
      plan,
      docs,
      artifactSummary: summary,
      validatorResults,
      coworkers,
    });

    await tracker?.complete({
      outputData: {
        passed: verdict.passed,
        score: verdict.score,
        blockingIssues: verdict.blockingIssues,
        summary: verdict.summary,
      },
    });

    return verdict;
  } catch (err) {
    await tracker?.fail(err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

const COWORKER_GROUNDING_MAX_ATTEMPTS = 3;

/**
 * Step 5 — coworker grounding. Refreshes existing coworkers' `knowledge`
 * field against the finalized bundle so personas stop referencing files /
 * schemas / DB engines that aren't there.
 *
 * Non-fatal: failures fall back silently to the ungrounded knowledge that
 * was generated in the wizard (the bundle is still shippable; PR #418's
 * validator already flagged the mismatches for visibility).
 *
 * Skipped when Step 3's coworker validator reported zero errors — the
 * ungrounded knowledge already aligns with the bundle.
 *
 * Returns `true` when grounded knowledge was successfully persisted, `false`
 * when skipped or fell back.
 */
export async function runStep5_groundCoworkers(args: {
  scenarioId: string;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  resourceType: ResourceType;
  coworkerErrorCount: number;
  creationLogId?: string;
}): Promise<boolean> {
  const { scenarioId, plan, docs, resourceType, coworkerErrorCount, creationLogId } = args;

  // US-006 telemetry. One canonical `coworker_grounding` event per pipeline
  // run, emitted at every exit path (skip / fallback / success / outer
  // failure) by `emit()` below. Success metric query in 7-day windows:
  //   count where validatorErrorsBefore > 0 && validatorErrorsAfter === 0
  const startedAt = Date.now();
  const validatorErrorsBefore = coworkerErrorCount;
  let skipped = false;
  let skipReason: string | undefined;
  let attempts = 0;
  let validatorErrorsAfter: number | undefined;
  let outerError: string | undefined;
  let lastErr: string | undefined;

  const emit = (success: boolean): boolean => {
    logger.info("coworker_grounding", {
      scenarioId,
      skipped,
      ...(skipReason ? { skipReason } : {}),
      attempts,
      success,
      validatorErrorsBefore,
      validatorErrorsAfter,
      durationMs: Date.now() - startedAt,
      ...(lastErr ? { lastErr } : {}),
      ...(outerError ? { outerError } : {}),
    });
    return success;
  };

  if (coworkerErrorCount === 0) {
    skipped = true;
    skipReason = "validator_clean";
    logger.info("Step 5 skipped — coworker validator reported no errors", { scenarioId });
    return emit(false);
  }

  const tracker = creationLogId
    ? await logGenerationStep({
        creationLogId,
        stepName: "ground_coworkers",
        modelUsed: "gemini-3.1-pro-preview",
        promptVersion: "v1.0",
        inputData: { resourceType, coworkerErrorCount },
      })
    : null;

  try {
    const coworkers = await db.coworker.findMany({
      where: { scenarioId },
      select: {
        id: true,
        name: true,
        role: true,
        personaStyle: true,
        language: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (coworkers.length === 0) {
      skipped = true;
      skipReason = "no_coworkers";
      logger.info("Step 5 skipped — no coworkers on scenario", { scenarioId });
      await tracker?.complete({ outputData: { skipped: "no_coworkers" } });
      return emit(false);
    }

    const summary = resourceType === "repo"
      ? await buildRepoArtifactSummary(scenarioId)
      : await buildDataArtifactSummary(scenarioId);
    if (!summary) {
      throw new Error("Could not build artifact summary for coworker grounding");
    }

    const scenarioContext = await loadJudgeScenarioContext(scenarioId);

    let updates: CoworkerKnowledgeUpdate[] | null = null;
    let lastFingerprint: string | null = null;

    for (let attempt = 1; attempt <= COWORKER_GROUNDING_MAX_ATTEMPTS; attempt++) {
      attempts = attempt;
      try {
        const result = await groundCoworkerKnowledge({
          scenarioId,
          scenario: scenarioContext,
          plan,
          docs,
          artifactSummary: summary,
          coworkers: coworkers.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
            personaStyle: c.personaStyle,
            language: c.language,
          })),
        });
        updates = result.updates;
        break;
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
        logger.warn("coworker grounding attempt failed", { scenarioId, attempt, err: lastErr });
        const fingerprint = "throw:" + lastErr;
        if (fingerprint === lastFingerprint) {
          logger.warn("aborting coworker grounding — same failure as previous attempt", {
            scenarioId,
            attempt,
          });
          break;
        }
        lastFingerprint = fingerprint;
      }
    }

    if (!updates) {
      logger.warn("coworker grounding fell back to ungrounded knowledge", {
        scenarioId,
        lastErr,
      });
      await tracker?.complete({
        outputData: { fallback: true, lastErr },
      });
      return emit(false);
    }

    // Persist — identity-preservation invariant: only `knowledge`.
    await db.$transaction(
      updates.map((u) =>
        db.coworker.update({
          where: { id: u.coworkerId },
          data: { knowledge: u.knowledge as unknown as Prisma.InputJsonValue },
        })
      )
    );

    // Re-run the deterministic coworker validator against the persisted
    // grounded state to confirm the regrounding actually fixed the
    // hallucinations the original count flagged. Best-effort — telemetry
    // only, never blocks publishing.
    try {
      const afterErrors = await validateCoworkerKnowledge({
        scenarioId,
        resourceType,
        plan,
        docs,
      });
      validatorErrorsAfter = afterErrors.length;
    } catch (err) {
      logger.warn("coworker validator re-check failed (telemetry only)", {
        scenarioId,
        err: String(err),
      });
    }

    logger.info("coworker grounding persisted", {
      scenarioId,
      coworkerCount: updates.length,
      totalKnowledgeEntries: updates.reduce((n, u) => n + u.knowledge.length, 0),
      validatorErrorsAfter,
    });
    await tracker?.complete({
      outputData: {
        grounded: true,
        coworkerCount: updates.length,
        validatorErrorsBefore,
        validatorErrorsAfter,
      },
    });
    return emit(true);
  } catch (err) {
    // Outer failure — couldn't even load coworkers / build summary. Still
    // non-fatal: log and let the pipeline publish with original knowledge.
    outerError = err instanceof Error ? err.message : String(err);
    logger.warn("coworker grounding outer failure — falling back", {
      scenarioId,
      err: outerError,
    });
    await tracker?.fail(err instanceof Error ? err : new Error(outerError));
    return emit(false);
  }
}

function synthesizeVerdictFromValidators(errors: string[]): JudgeVerdict {
  return {
    passed: false,
    score: 0,
    summary: `Validators failed: ${errors.length} issue(s)`,
    blockingIssues: errors.slice(0, 10),
    missingEvidence: [],
    retryInstructions:
      "Fix the structural issues listed in blockingIssues and re-emit the artifacts.",
  };
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

interface ScenarioPipelineState {
  meta: ResourcePipelineMeta | null;
  plan: ResourcePlan | null;
  docs: ScenarioDoc[] | null;
}

async function loadScenarioPipelineState(
  scenarioId: string
): Promise<ScenarioPipelineState | null> {
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: { plan: true, docs: true, resourcePipelineMeta: true },
  });

  if (!scenario) return null;

  return {
    meta: (scenario.resourcePipelineMeta as unknown as ResourcePipelineMeta | null) ?? null,
    plan: (scenario.plan as unknown as ResourcePlan | null) ?? null,
    docs: (scenario.docs as unknown as ScenarioDoc[] | null) ?? null,
  };
}

async function persistMeta(scenarioId: string, meta: ResourcePipelineMeta): Promise<void> {
  await db.scenario.update({
    where: { id: scenarioId },
    data: {
      resourcePipelineMeta: meta as unknown as Prisma.InputJsonValue,
    },
  });
}

async function loadTaskDescription(scenarioId: string): Promise<string> {
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: { taskDescription: true },
  });
  return scenario?.taskDescription ?? "";
}

async function loadJudgeScenarioContext(scenarioId: string): Promise<{
  companyName: string;
  taskDescription: string;
  roleName: string;
  seniorityLevel: string;
  archetypeName: string;
}> {
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      companyName: true,
      taskDescription: true,
      targetLevel: true,
      archetype: { select: { name: true, slug: true } },
    },
  });
  if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

  const archetypeName =
    scenario.archetype?.name ??
    (scenario.archetype?.slug
      ? getArchetypeDisplayName(
          scenario.archetype.slug.toUpperCase().replace(/-/g, "_") as never
        )
      : "Software Engineer");

  return {
    companyName: scenario.companyName,
    taskDescription: scenario.taskDescription,
    roleName: archetypeName,
    seniorityLevel: scenario.targetLevel,
    archetypeName,
  };
}

async function loadCoworkersForJudge(scenarioId: string): Promise<
  Array<{
    name: string;
    role: string;
    knowledge: Array<{
      topic: string;
      response: string;
      isCritical?: boolean;
      triggerKeywords?: string[];
    }>;
  }>
> {
  const coworkers = await db.coworker.findMany({
    where: { scenarioId },
    select: { name: true, role: true, knowledge: true },
  });
  return coworkers.map((c) => ({
    name: c.name,
    role: c.role,
    knowledge: Array.isArray(c.knowledge)
      ? (c.knowledge as Array<{
          topic: string;
          response: string;
          isCritical?: boolean;
          triggerKeywords?: string[];
        }>)
      : [],
  }));
}

async function loadScenarioContext(scenarioId: string): Promise<{
  companyName: string;
  taskDescription: string;
  techStack: string[];
  roleName: string;
  seniorityLevel: string;
}> {
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      companyName: true,
      taskDescription: true,
      techStack: true,
      targetLevel: true,
      archetype: { select: { name: true } },
    },
  });
  if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);
  return {
    companyName: scenario.companyName,
    taskDescription: scenario.taskDescription,
    techStack: scenario.techStack,
    roleName: scenario.archetype?.name ?? "Data Analyst",
    seniorityLevel: scenario.targetLevel,
  };
}

function serializeInput(input: GeneratePlanAndDocsInput): Record<string, unknown> {
  return {
    companyName: input.companyName,
    roleName: input.roleName,
    seniorityLevel: input.seniorityLevel,
    archetypeName: input.archetypeName,
    resourceType: input.resourceType,
    techStack: input.techStack,
    coworkerCount: input.coworkers.length,
    language: input.language,
  };
}

export type { ResourcePipelineStatus };
