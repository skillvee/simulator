/**
 * Step 4 prompt — LLM judge for the v2 resource pipeline.
 *
 * Reads scenario context + plan + docs + artifact summary and decides whether
 * the candidate-facing artifacts pass quality bar. Output is strict JSON
 * matching `judgeOutputSchema` in `judge.ts`.
 */

import type {
  ResourcePlan,
  ScenarioDoc,
} from "@/types";
import type { ArtifactSummary } from "@/lib/scenarios/artifact-summary";

export const JUDGE_PROMPT_VERSION = "v2.0";

export interface JudgePromptInput {
  scenario: {
    companyName: string;
    taskDescription: string;
    roleName: string;
    seniorityLevel: string;
    archetypeName: string;
  };
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  artifactSummary: ArtifactSummary;
}

export function buildJudgePrompt(input: JudgePromptInput): string {
  const { scenario, plan, docs, artifactSummary } = input;

  const planBlock = plan.resources
    .map(
      (r, i) =>
        `${i + 1}. **${r.label}** (\`${r.filename}\`)
   - Objective: ${r.objective}
   - Candidate usage: ${r.candidateUsage}${
     r.targetRowCount ? `\n   - Target rows: ${r.targetRowCount}` : ""
   }${r.dataShape ? `\n   - Data shape: ${r.dataShape}` : ""}`
    )
    .join("\n\n");

  const docsBlock = docs
    .map(
      (d) => `### ${d.name} (\`${d.filename}\`) — objective: ${d.objective}

${d.markdown.slice(0, 4000)}${d.markdown.length > 4000 ? "\n…[truncated]" : ""}`
    )
    .join("\n\n---\n\n");

  const artifactBlock =
    artifactSummary.kind === "repo"
      ? buildRepoArtifactBlock(artifactSummary)
      : buildDataArtifactBlock(artifactSummary);

  return `You are a senior staff engineer reviewing whether a candidate-facing simulation
exercise is ready to ship. The recruiter will only be allowed to publish if you
return \`passed: true\`. Be strict but fair — your job is to catch hallucinations,
inconsistencies, and missing pieces, not nitpick prose.

## Scenario context

- Company: ${scenario.companyName}
- Role: ${scenario.seniorityLevel} ${scenario.roleName} (archetype: ${scenario.archetypeName})
- Task the candidate will solve:
  ${scenario.taskDescription}

## What was planned (Step 1)

${planBlock}

### Quality criteria the plan committed to

${plan.qualityCriteria.map((q) => `- ${q}`).join("\n")}

## Markdown documents produced

${docsBlock}

## Artifacts produced (${artifactSummary.kind} branch)

${artifactBlock}

## Your task

Score the bundle on three dimensions (each 0.0-1.0):

1. **realism** — does the data / repo feel like real work, not a contrived exercise?
2. **consistency** — do the docs, plan, and artifacts agree with each other? (e.g., data dictionary references every CSV; README links to the main task issue.)
3. **coverage** — does the bundle give the candidate enough to actually solve the task?

Compute \`score = (realism + consistency + coverage) / 3\`.

Set \`passed: true\` only if **all** of these hold:
  - score ≥ 0.85
  - no blocking issues (critical hallucinations, missing required artifact, broken cross-references)
  - missingEvidence is empty or trivial

Otherwise \`passed: false\`. Populate \`blockingIssues\` (max 10) with the specific problems
to fix, \`missingEvidence\` (max 10) with what's not there but should be, and
\`retryInstructions\` with concrete guidance the next attempt can act on.

## Output

Strict JSON only, matching this schema:

{
  "passed": boolean,
  "score": number,
  "summary": string,
  "blockingIssues": string[],
  "missingEvidence": string[],
  "retryInstructions": string
}

No markdown wrapper, no commentary outside the JSON.`;
}

function buildRepoArtifactBlock(summary: {
  repoUrl: string;
  fileTree: string[];
  readme: string;
  sampleFiles: Array<{ path: string; content: string }>;
}): string {
  const tree = summary.fileTree.slice(0, 80).join("\n");
  const samples = summary.sampleFiles
    .map((f) => `### ${f.path}\n\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");
  return `**Repo URL:** ${summary.repoUrl}

### File tree (top 80)

\`\`\`
${tree}
${summary.fileTree.length > 80 ? `…and ${summary.fileTree.length - 80} more` : ""}
\`\`\`

### README

${summary.readme.slice(0, 4000)}${summary.readme.length > 4000 ? "\n…[truncated]" : ""}

### Sample source files

${samples || "(no sample source files available)"}`;
}

function buildDataArtifactBlock(summary: {
  files: Array<{
    filename: string;
    rowCount: number | null;
    byteSize: number | null;
    columns: Array<{ name: string; type: string; sample?: unknown }>;
    previewRows: Record<string, unknown>[];
  }>;
}): string {
  return summary.files
    .map((f) => {
      const colLines = f.columns
        .map(
          (c) =>
            `- \`${c.name}\` (${c.type})${c.sample !== undefined ? ` — sample: ${JSON.stringify(c.sample)}` : ""}`
        )
        .join("\n");
      const previewLines = f.previewRows
        .slice(0, 10)
        .map((r) => JSON.stringify(r))
        .join("\n");
      return `### \`${f.filename}\` — ${f.rowCount ?? "?"} rows, ${
        f.byteSize ?? "?"
      } bytes

**Columns:**
${colLines || "(no schema)"}

**Preview (first 10 rows):**

\`\`\`
${previewLines || "(no preview)"}
\`\`\``;
    })
    .join("\n\n---\n\n");
}
