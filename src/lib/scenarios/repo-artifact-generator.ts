/**
 * Step 2 (repo branch) of the v2 resource pipeline.
 *
 * Builds a GitHub repository whose contents stay aligned with the v2 plan +
 * docs from Step 1. Internally:
 *
 *   1. Augment ScenarioMetadata with plan/docs/judgeFeedback context.
 *   2. Call existing `generateRepoSpec` (Gemini, structured) → RepoSpec.
 *   3. Call existing `buildRepoFromSpec` (deterministic) → real GitHub repo.
 *   4. Persist `repoUrl` and `repoSpec` back onto the Scenario row.
 */

import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { env } from "@/lib/core/env";
import {
  generateRepoSpec,
  generateRepoSpecPatch,
} from "./repo-spec-generator";
import { buildRepoFromSpec, applySpecPatch } from "./repo-builder";
import {
  repoSpecSchema,
  selectScaffold,
  type RepoSpec,
  type ScenarioMetadata,
} from "./repo-spec";
import { getGitHubHeaders } from "@/lib/external/github/client";
import type {
  ResourcePlan,
  ScenarioDoc,
  JudgeVerdict,
} from "@/types";

const logger = createLogger("lib:scenarios:repo-artifact-generator");

export interface GenerateRepoArtifactInput {
  scenarioId: string;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  judgeFeedback?: JudgeVerdict;
  attempt: number;
}

export interface RepoArtifactResult {
  repoUrl: string;
  repoSpec: unknown;
}

export async function generateRepoArtifact(
  input: GenerateRepoArtifactInput
): Promise<RepoArtifactResult> {
  const { scenarioId, plan, docs, judgeFeedback, attempt } = input;

  const githubToken = env.GITHUB_TOKEN ?? process.env.GITHUB_ORG_TOKEN;
  if (!githubToken) {
    throw new Error(
      "GitHub token not configured (GITHUB_TOKEN or GITHUB_ORG_TOKEN must be set)"
    );
  }

  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      id: true,
      name: true,
      companyName: true,
      companyDescription: true,
      taskDescription: true,
      techStack: true,
      targetLevel: true,
      repoUrl: true,
      repoSpec: true,
      coworkers: {
        select: {
          name: true,
          role: true,
          personaStyle: true,
          knowledge: true,
        },
      },
    },
  });

  if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

  // Idempotency: if a repo already exists from a previous attempt and there's
  // no judge feedback to act on, reuse it.
  if (scenario.repoUrl && !judgeFeedback) {
    logger.info("Reusing existing repoUrl (no judge feedback)", {
      scenarioId,
      repoUrl: scenario.repoUrl,
    });
    return { repoUrl: scenario.repoUrl, repoSpec: null };
  }

  const metadata: ScenarioMetadata = {
    name: scenario.name,
    companyName: scenario.companyName,
    companyDescription: scenario.companyDescription,
    taskDescription: scenario.taskDescription,
    techStack: scenario.techStack,
    targetLevel: scenario.targetLevel,
    coworkers: scenario.coworkers.map((c) => ({
      name: c.name,
      role: c.role,
      personaStyle: c.personaStyle,
      knowledge: (c.knowledge as Array<{
        topic: string;
        triggerKeywords: string[];
        response: string;
        isCritical: boolean;
      }>) || [],
    })),
  };

  // Pre-flight scaffold check — surfaces a clean error early if the tech stack
  // doesn't match a known scaffold.
  selectScaffold(metadata.techStack);

  // Retry path with patch mode — if we have a prior repo + spec + judge
  // feedback, generate a spec patch and apply it to the existing repo
  // instead of deleting and rebuilding. Eliminates "lazy regeneration" drift
  // and is ~13x faster than the full regeneration path.
  const priorSpec = scenario.repoUrl && scenario.repoSpec && judgeFeedback
    ? parsePriorRepoSpec(scenario.repoSpec)
    : null;

  if (priorSpec && scenario.repoUrl && judgeFeedback) {
    logger.info("Retry: applying spec patch in place", {
      scenarioId,
      attempt,
      priorFileCount: priorSpec.files.length,
    });
    const patch = await generateRepoSpecPatch({
      metadata,
      priorSpec,
      judgeFeedback: formatJudgeFeedbackBlock(judgeFeedback, attempt),
    });
    const applied = await applySpecPatch({
      repoUrl: scenario.repoUrl,
      prior: priorSpec,
      next: patch.spec,
      githubToken,
    });
    await db.scenario.update({
      where: { id: scenarioId },
      data: { repoSpec: patch.spec as unknown as object },
    });
    logger.info("Spec patch applied", { ...applied });
    return { repoUrl: scenario.repoUrl, repoSpec: patch.spec };
  }

  // Fallback: legacy delete-and-rebuild. Only reached when retry has no
  // priorSpec available (older scenario rows from before patch mode shipped,
  // or transient state where priorSpec failed to persist on the first run).
  if (scenario.repoUrl && judgeFeedback) {
    logger.warn("Retry without prior spec — falling back to delete+rebuild", {
      scenarioId,
    });
    await deleteGitHubRepo(scenario.repoUrl, githubToken);
    await db.scenario.update({
      where: { id: scenarioId },
      data: { repoUrl: null, repoSpec: null as unknown as object },
    });
  }

  const extraContext = buildExtraContext({ plan, docs, judgeFeedback, attempt });

  logger.info("Generating repo spec (v2)", { scenarioId, attempt });
  const { spec } = await generateRepoSpec(metadata, { extraContext });

  logger.info("Building GitHub repo (v2)", { scenarioId, fileCount: spec.files.length });
  const repoUrl = await buildRepoFromSpec(scenarioId, spec, githubToken);
  if (!repoUrl) {
    throw new Error("buildRepoFromSpec returned null — GitHub provisioning failed");
  }

  await db.scenario.update({
    where: { id: scenarioId },
    data: {
      repoUrl,
      repoSpec: spec as unknown as object,
    },
  });

  return { repoUrl, repoSpec: spec };
}

function parsePriorRepoSpec(raw: unknown): RepoSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const result = repoSpecSchema.safeParse(raw);
  if (!result.success) {
    logger.warn("Stored repoSpec failed validation; falling back to full regen", {
      issues: result.error.issues.slice(0, 3).map((i) => i.message).join("; "),
    });
    return null;
  }
  return result.data;
}

function formatJudgeFeedbackBlock(
  judgeFeedback: JudgeVerdict,
  attempt: number
): string {
  return `Attempt #${attempt - 1} was rejected by the judge. Address these issues:

- Summary: ${judgeFeedback.summary}
- Blocking issues:
${judgeFeedback.blockingIssues.map((i) => `  - ${i}`).join("\n")}
- Missing evidence:
${judgeFeedback.missingEvidence.map((i) => `  - ${i}`).join("\n")}
- Retry instructions: ${judgeFeedback.retryInstructions ?? "(none)"}`;
}

async function deleteGitHubRepo(
  repoUrl: string,
  _githubToken: string
): Promise<void> {
  try {
    const url = new URL(repoUrl);
    const [, owner, repo] = url.pathname.split("/");
    if (!owner || !repo) return;

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        method: "DELETE",
        headers: getGitHubHeaders(),
      }
    );

    if (!res.ok && res.status !== 404) {
      logger.warn("Failed to delete previous repo (continuing anyway)", {
        owner,
        repo,
        status: res.status,
      });
    } else {
      logger.info("Deleted previous repo for retry", { owner, repo });
    }
  } catch (err) {
    logger.warn("Error deleting previous repo (continuing anyway)", {
      err: String(err),
    });
  }
}

function buildExtraContext(args: {
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  judgeFeedback?: JudgeVerdict;
  attempt: number;
}): string {
  const { plan, docs, judgeFeedback, attempt } = args;

  const planSummary = plan.resources
    .map(
      (r, i) =>
        `  ${i + 1}. ${r.label} (${r.filename}) — ${r.objective} | candidate uses it: ${r.candidateUsage}`
    )
    .join("\n");

  // Inline the full doc bodies. The candidate reads them; the repo MUST match
  // every concrete name, path, schema, signature, and conceptual claim that
  // the docs commit to. Summary-only context lets the model invent details
  // that contradict what the candidate will see.
  const docFullText = docs
    .map(
      (d) => `#### ${d.name} (\`${d.filename}\`)

${d.markdown}`
    )
    .join("\n\n---\n\n");

  const qualityCriteria = plan.qualityCriteria
    .map((q) => `  - ${q}`)
    .join("\n");

  const feedbackSection = judgeFeedback
    ? `

### Judge feedback (attempt ${attempt})

The previous attempt failed the judge. Address these issues in this regeneration:

  - Summary: ${judgeFeedback.summary}
  - Blocking issues:
${judgeFeedback.blockingIssues.map((i) => `    - ${i}`).join("\n")}
  - Missing evidence:
${judgeFeedback.missingEvidence.map((i) => `    - ${i}`).join("\n")}
  - Retry instructions: ${judgeFeedback.retryInstructions ?? "n/a"}
`
    : "";

  return `### Resource plan (Step 1 output)

The candidate-facing artifacts must align with this plan. Generate code that
matches the plan's filenames where reasonable, and ensure the README + main
task issue reference these resources by name.

${planSummary}

### Markdown documents — AUTHORITATIVE for what they commit to

These docs ship to the candidate verbatim. Anything they commit to —
file paths, class/function/table names, schema fields, env-var names,
architectural concepts — is the source of truth. Your repo spec MUST
exactly match every concrete name and path the docs use. Cross-reference
the docs from README/issues by name. Do not invent alternative names or
move files to different paths than what the docs describe.

**Note**: the docs are deliberately incomplete (the candidate is meant to
discover specifics by talking to coworkers). For things the docs DO NOT
specify, fall back to the **plan above** — which IS exhaustive — and to
your own judgment based on the company/role context. The plan is the
authoritative spec for everything not nailed down in the docs.

${docFullText}

### Anti-spoiler rule — NON-NEGOTIABLE

Do NOT leave hints at the bug or solution anywhere in the spec.

**Forbidden in source files (.ts, .tsx, .js, .py, etc.):**

- ANY \`// TODO\`, \`// FIXME\`, \`// XXX\`, \`// HACK\`, \`// NOTE\` comment.
  Even a generic \`// TODO: implement locking\` at the bug site is a
  breadcrumb. Real production code with a bug has NO comment marking the
  bug location — just the buggy code.
- ANY comment containing a **coworker name** (first OR last). Real
  production code does not say \`// Sarah: this needs idempotency\`,
  \`// Note: Kwame mentioned the cluster is sharded\`, or
  \`* Elena Vance: Marcus started this but...\`. The coworker's
  knowledge belongs in the conversation, not the source. **If you are
  about to write any coworker name into a comment, delete the comment.**
- Comments naming the bug (\`// race here\`, \`// not idempotent\`,
  \`// re-render storm\`, \`// expensive query\`).
- Obvious filenames (\`broken-cache.ts\`, \`slow-handler.ts\`,
  \`fix-me.ts\`).
- Debug strings or log lines that name the issue.

**Forbidden as standalone doc/markdown files in the repo:**

- Incident reports, post-mortems, RCAs (e.g.
  \`docs/incidents/double-charging.md\`,
  \`docs/postmortems/2024-Q1.md\`). These ALWAYS contain the diagnosis
  — they are the candidate's job to write, not pre-existing context.
- Architecture Decision Records (ADRs) or "concurrency / performance /
  caching strategy" docs that compare options the candidate is meant
  to weigh. Listing the trade-offs and naming the gap solves the
  exercise.
- Any \`docs/\` markdown that reads like an analysis of why the current
  code is wrong, what changed recently, or which option to pick.

**Allowed in the repo:**

- README with setup + run instructions, brief project overview, and
  links to the main task issue (kept short — it does NOT explain the
  business problem in detail; the kickoff doc covers that).
- GitHub Issues describing SYMPTOMS the candidate must reproduce
  (\`"Customers are reporting duplicate charges during peak times"\`),
  never the root cause.
- A \`CHANGELOG\` or \`CONTRIBUTING\` is fine.

The candidate must diagnose the problem from system behavior alone,
exactly as they would on a real codebase. If the judge spots a forbidden
comment, named coworker, or post-mortem-style doc, the bundle fails.

### Quality criteria the judge will check

${qualityCriteria}
${feedbackSection}`;
}
