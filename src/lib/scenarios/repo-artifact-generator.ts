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
import { generateRepoSpec } from "./repo-spec-generator";
import { buildRepoFromSpec } from "./repo-builder";
import { selectScaffold, type ScenarioMetadata } from "./repo-spec";
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

  // Retry path: judge rejected the previous attempt. Delete the old repo so
  // `buildRepoFromSpec` can re-create `simulation-${scenarioId}` cleanly.
  // GitHub's repo API returns 422 if the name already exists; without this,
  // every retry would fail before even calling the model.
  if (scenario.repoUrl && judgeFeedback) {
    await deleteGitHubRepo(scenario.repoUrl, githubToken);
    await db.scenario.update({
      where: { id: scenarioId },
      data: { repoUrl: null, repoSpec: null as unknown as object },
    });
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

async function deleteGitHubRepo(
  repoUrl: string,
  githubToken: string
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

  const docSummary = docs
    .map((d) => `  - ${d.name} (${d.filename}): ${d.objective}`)
    .join("\n");

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

### Markdown documents already produced

These docs ship alongside the repo. Don't contradict them; cross-reference them
where appropriate (e.g., README links to "${docs[0]?.name ?? "Project Brief"}").

${docSummary}

### Quality criteria the judge will check

${qualityCriteria}
${feedbackSection}`;
}
