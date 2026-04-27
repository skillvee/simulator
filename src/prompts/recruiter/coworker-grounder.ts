/**
 * Coworker Grounder Prompt — refreshes existing coworker knowledge against
 * the finalized v2 resource bundle (plan + docs + artifacts).
 *
 * Run as Step 5 of the v2 pipeline, AFTER the judge passes. The wizard
 * generates ungrounded coworker personas pre-pipeline (so the recruiter sees
 * preview cards immediately); this pass keeps the personas the recruiter
 * already saw — name, role, personality — and ONLY rewrites the `knowledge`
 * array so every concrete reference (file, schema, table, command) actually
 * exists in the bundle.
 */

import type { ResourcePlan, ScenarioDoc } from "@/types";
import type { ArtifactSummary } from "@/lib/scenarios/artifact-summary";

export const COWORKER_GROUNDER_PROMPT_VERSION = "v1.0";

export interface CoworkerIdentity {
  id: string;
  name: string;
  role: string;
  personaStyle: string;
  language: string;
}

export interface CoworkerGrounderPromptInput {
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
  coworkers: CoworkerIdentity[];
}

export function buildCoworkerGrounderPrompt(input: CoworkerGrounderPromptInput): string {
  const { scenario, plan, docs, artifactSummary, coworkers } = input;

  const planBlock = plan.resources
    .map(
      (r, i) =>
        `${i + 1}. **${r.label}** (\`${r.filename}\`)
   - Objective: ${r.objective}
   - Candidate usage: ${r.candidateUsage}`
    )
    .join("\n\n");

  const docsBlock = docs.length === 0
    ? "(no docs — repo branch with kickoff embedded in the README)"
    : docs
        .map(
          (d) =>
            `### ${d.name} (\`${d.filename}\`) — ${d.objective}\n\n${d.markdown.slice(0, 3000)}${d.markdown.length > 3000 ? "\n\n[truncated]" : ""}`
        )
        .join("\n\n---\n\n");

  const artifactBlock =
    artifactSummary.kind === "repo"
      ? buildRepoArtifactBlock(artifactSummary)
      : buildDataArtifactBlock(artifactSummary);

  const coworkersBlock = coworkers
    .map(
      (c, i) =>
        `${i + 1}. **id**: \`${c.id}\`
   **name**: ${c.name}
   **role**: ${c.role}
   **persona style**: ${c.personaStyle}
   **language**: ${c.language}`
    )
    .join("\n\n");

  return `You are refreshing the knowledge of AI coworker personas so they don't lie to
the candidate. The personas already exist (name, role, persona style are
fixed). Your job is to write each persona's \`knowledge\` array — the topics
they'll speak about when the candidate asks — so that every concrete reference
points at something that actually exists in the bundle below.

## Hard rules

1. **Never invent artifacts.** Every filename, path, table name, column name,
   schema, DB engine, command, endpoint, or service name in any \`response\`
   MUST appear in the plan, docs, or artifact summary below. If it's not in
   the bundle, it does not exist.
2. **Stay on-task.** The task description is canonical. If the task is about
   Oracle, no coworker mentions MySQL. If the bundle has \`docker-compose.yml\`,
   reference it; if it doesn't, never mention docker-compose at all.
3. **Match the persona.** The "persona style" string defines how each
   coworker talks. Don't merge personas; each coworker has their own voice.
4. **Stay in their lane.** A QA Automation Engineer talks about tests + edge
   cases. An Engineering Manager talks about priorities + process. Don't have
   the EM explain the SQL schema, and don't have the QA engineer set sprint
   priorities.
5. **Language**: write \`response\` in the coworker's language (\`${coworkers[0]?.language ?? "en"}\` if you can't tell from the persona). Names + roles stay as-is.

## Scenario context

- Company: ${scenario.companyName}
- Role: ${scenario.seniorityLevel} ${scenario.roleName} (archetype: ${scenario.archetypeName})
- Task the candidate will solve:
  ${scenario.taskDescription}

## What was planned (Step 1 of the pipeline)

${planBlock}

## Markdown documents the candidate will read

${docsBlock}

## Artifacts the candidate will look at (${artifactSummary.kind} branch)

${artifactBlock}

## Coworkers to ground

${coworkersBlock}

## What to produce per coworker

For each coworker above, output 3-5 \`knowledge\` items. Each item is:

- **topic** (string): a 2-5 word label for the topic (in the coworker's language)
- **triggerKeywords** (string[]): 3-6 keywords/phrases the orchestrator
  matches against the candidate's chat to decide when to surface this
  knowledge. Include rephrased forms ("schema", "esquema", "tablas").
- **response** (string): what the coworker says — 1-3 sentences, in their
  voice, naming SPECIFIC artifacts from the bundle (use filenames in
  backticks, e.g. \`python-agent/Dockerfile\`).
- **isCritical** (boolean): \`true\` if this knowledge is on the critical
  path for the candidate solving the task; \`false\` for nice-to-know context.

Quality bar:
- ≥ 2 of the items per coworker should reference a SPECIFIC artifact from
  the bundle (filename, schema, column, table, command, etc.). Use backticks
  around code-like references.
- At least 1 item per coworker should be marked \`isCritical: true\`.
- No two coworkers should have overlapping topics (e.g., both explaining the
  same DB schema).
- The responses should sound like someone IM'ing or speaking — short,
  conversational, not documentation.

## Output

Return strict JSON matching this schema. Output coworkers in the SAME ORDER
as the input list. Use the input \`id\` exactly:

{
  "coworkers": [
    {
      "coworkerId": "<input id>",
      "knowledge": [
        {
          "topic": "...",
          "triggerKeywords": ["...", "..."],
          "response": "...",
          "isCritical": true
        }
      ]
    }
  ]
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
    .slice(0, 3)
    .map((f) => `### ${f.path}\n\n\`\`\`\n${f.content.slice(0, 1500)}\n\`\`\``)
    .join("\n\n");
  return `**Repo URL:** ${summary.repoUrl}

### File tree (top 80 paths)

\`\`\`
${tree}
${summary.fileTree.length > 80 ? `…and ${summary.fileTree.length - 80} more` : ""}
\`\`\`

### README

${summary.readme.slice(0, 3000)}${summary.readme.length > 3000 ? "\n…[truncated]" : ""}

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
      return `### \`${f.filename}\` — ${f.rowCount ?? "?"} rows

**Columns:**
${colLines || "(no schema)"}`;
    })
    .join("\n\n---\n\n");
}
