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
import { judgeArtifacts } from "./judge";
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

  for (let attempt = 1; attempt <= MAX_ARTIFACT_ATTEMPTS; attempt++) {
    meta = { ...meta, attempts: attempt, status: "artifacts_generating" };
    await persistMeta(scenarioId, meta);

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

      if (!validatorResult.ok) {
        lastVerdict = synthesizeVerdictFromValidators(validatorResult.errors);
        continue; // retry artifact generation
      }

      // Step 4 — judge (filled in by phase 5).
      meta = { ...meta, status: "judging" };
      await persistMeta(scenarioId, meta);
      const verdict = await runStep4({
        scenarioId,
        plan: state.plan,
        docs: state.docs,
        resourceType,
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
        };
        await persistMeta(scenarioId, meta);
        return;
      }
      // else: loop to retry
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.warn("artifact pipeline attempt failed", { scenarioId, attempt, err: lastError });
    }
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
}): Promise<{ ok: boolean; errors: string[] }> {
  const { scenarioId, docs, resourceType, creationLogId } = args;

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
  creationLogId?: string;
}): Promise<JudgeVerdict> {
  const { scenarioId, plan, docs, resourceType, creationLogId } = args;

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

    const verdict = await judgeArtifacts({
      scenario: scenarioContext,
      plan,
      docs,
      artifactSummary: summary,
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
