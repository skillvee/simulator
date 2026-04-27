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

export const JUDGE_PROMPT_VERSION = "v2.3";

export interface JudgeCoworker {
  name: string;
  role: string;
  knowledge: Array<{
    topic: string;
    response: string;
    isCritical?: boolean;
    triggerKeywords?: string[];
  }>;
}

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
  /**
   * Ground-truth results from Step 3 deterministic validators. The judge
   * sees these and must treat any non-empty entry as a hard blocker — these
   * are facts (URL liveness, file presence, schema match), not opinions.
   * Passed through even when validators pass so the judge can reason about
   * them explicitly in the verdict summary.
   */
  validatorResults: {
    passed: boolean;
    errors: string[];
  };
  /**
   * What the AI personas will tell the candidate during the simulation. Each
   * `knowledge` entry is a topic the coworker will speak about when triggered
   * — they reference the same files / schemas / DB engines / endpoints the
   * candidate is going to look for. The judge MUST cross-check these against
   * the bundle: a coworker who "knows" about a `docker-compose.yml` that
   * doesn't exist, or a MySQL DB when the task is Oracle, will sabotage the
   * candidate the moment they start a conversation.
   */
  coworkers: JudgeCoworker[];
}

export function buildJudgePrompt(input: JudgePromptInput): string {
  const { scenario, plan, docs, artifactSummary, validatorResults, coworkers } = input;

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
      (d) =>
        `### ${d.name} (\`${d.filename}\`) — objective: ${d.objective} (full length: ${d.markdown.length} chars)

${d.markdown.slice(0, 4000)}${
          d.markdown.length > 4000
            ? `\n\n[Truncated for judge context — the full doc is ${d.markdown.length} chars; the source is NOT truncated.]`
            : ""
        }`
    )
    .join("\n\n---\n\n");

  const artifactBlock =
    artifactSummary.kind === "repo"
      ? buildRepoArtifactBlock(artifactSummary)
      : buildDataArtifactBlock(artifactSummary);

  const coworkersBlock = coworkers.length === 0
    ? "(no coworkers configured for this scenario)"
    : coworkers
        .map((c) => {
          const knowledgeLines = c.knowledge
            .map(
              (k, i) =>
                `  ${i + 1}. **${k.topic}**${k.isCritical ? " _(critical)_" : ""}\n     ${k.response.replace(/\n/g, "\n     ")}`
            )
            .join("\n");
          return `### ${c.name} — ${c.role}\n\n${knowledgeLines || "  (no knowledge entries)"}`;
        })
        .join("\n\n---\n\n");

  const validatorBlock = validatorResults.passed
    ? `**All deterministic validators passed.** (URL reachability, file
presence, schema, doc structure — all green.)`
    : `**Deterministic validators FAILED.** Treat every line below as a hard
blocking issue in your verdict — these are facts (URL liveness, file presence,
schema match), not opinions, and they must be repeated in \`blockingIssues\`
verbatim or rephrased:

${validatorResults.errors.map((e) => `  - ${e}`).join("\n")}

Even if the docs and artifacts read well, you MUST set \`passed: false\` when
validators fail — a candidate cannot succeed against a 404 link or a missing
file no matter how good the prose is.`;

  return `You are a senior staff engineer reviewing whether a candidate-facing simulation
exercise is ready to ship. The recruiter will only be allowed to publish if you
return \`passed: true\`. Be strict but fair — your job is to catch hallucinations,
inconsistencies, and missing pieces that would block a candidate, not nitpick prose.

The candidate's success is the bar. They will read the brief, open the
artifacts, and try to make progress. If they hit a dead link, a missing file,
a schema that doesn't match a description, or a doc that references something
that isn't there — the simulation has failed before they typed a line.

## Scenario context

- Company: ${scenario.companyName}
- Role: ${scenario.seniorityLevel} ${scenario.roleName} (archetype: ${scenario.archetypeName})
- Task the candidate will solve (this is also the **brief** they read first):
  ${scenario.taskDescription}

## What was planned (Step 1)

${planBlock}

### Quality criteria the plan committed to

${plan.qualityCriteria.map((q) => `- ${q}`).join("\n")}

## Markdown documents produced

${docs.length === 0 ? "(no docs — by design for v2.4 repo scenarios; the brief + repo README + GitHub issues are the candidate's reading material)" : docsBlock}

## Artifacts produced (${artifactSummary.kind} branch)

${artifactBlock}

## AI coworker knowledge (what the personas will tell the candidate)

The candidate will chat with these AI personas during the simulation. Whatever
each coworker "knows" below is what they will say — including any concrete
file path, schema, DB engine, command, or endpoint they reference. Treat this
as an additional artifact: it must agree with the bundle.

${coworkersBlock}

## Deterministic validator results (ground truth — Step 3)

${validatorBlock}

## Your task

Walk through the bundle as the candidate would: open the brief, then each
artifact, then try to start the task. Score four dimensions (each 0.0-1.0):

1. **realism** — does the data / repo feel like real work, not a contrived exercise?
2. **consistency** — do the docs, plan, artifacts, AND coworker knowledge agree?
   - Every filename, path, table name, column name, function name, env var, or
     URL mentioned in any doc / README / issue MUST exist in the artifact
     bundle. If the kickoff says "see \`src/queue.ts\`" or "join on \`order_id\`"
     and that file/column isn't there, that's a blocking inconsistency.
   - **Coworker knowledge is part of consistency.** Every concrete reference a
     coworker makes — files (\`docker-compose.yml\`, \`schema.sql\`), DB
     engines (MySQL vs Oracle), commands (\`pytest\`, \`make build\`),
     endpoints, schemas, or topic areas — must exist in the bundle and match
     the task. A coworker who promises \`docker-compose.yml\` when the repo
     has none, or "knows" about MySQL JOIN bugs when the task is Oracle data
     validation, is a blocking issue: the candidate will hit the
     contradiction the moment they ask. List the offending coworker's name +
     the contradicting claim explicitly in \`blockingIssues\`.
   - Numbers and identifiers used in two places must match.
3. **candidateSuccess** — pretend you're the candidate at minute zero. Read
   the brief. Open every artifact in the bundle. Try to make the first move
   on the task. **What's missing?**
   - Is the entry point obvious (which file to edit / which CSV to query)?
   - Are referenced links / files / repos all reachable?
   - Are the access methods correct? (e.g., a private repo URL displayed to
     a candidate who can't authenticate is a dead link.)
   - If a coworker conversation is required to fill in a gap, is the gap
     pointed to by name in the artifacts (so the candidate knows whom to ask)?
   - Anything you'd reasonably need to start that isn't here is a deduction.
4. **coverage (inputs only)** — does the bundle contain every INPUT artifact
   the candidate needs to begin? CSVs to query, repo to edit, schemas to read.
   Do NOT penalize missing **deliverables** (see rule below).

Compute \`score = (realism + consistency + candidateSuccess + coverage) / 4\`.

### Inputs vs deliverables — DO NOT penalize for missing deliverables

The task description often references artifacts the candidate **produces** as
output: dbt models, SQL queries, Looker dashboards, Hex notebooks, ML models,
PRs, analyses, memos, refactored code. Those are **deliverables**, not inputs.

Their absence from the bundle is correct and expected. **Do not** flag
"missing dbt models", "no SQL queries", "no notebook", "no analysis", etc., as
blocking issues or missing evidence — that's the candidate's job to write.

You should ONLY flag a missing artifact when:
- It is something the candidate **reads** to begin the task (data, schemas, code),
- AND the docs/plan promise it exists,
- AND it is not in the bundle.

Concretely for the **data** branch: the inputs are CSV files. Anything else
mentioned in the task (dbt, SQL, notebooks, dashboards) is the candidate's
deliverable. For the **repo** branch: the input is the source repo + README +
issues. Pull requests, refactored functions, fixes are the candidate's deliverable.

### Pass / fail

Set \`passed: true\` only if **all** of these hold:
  - score ≥ 0.85
  - validator results passed (no errors in the ground-truth block above)
  - no blocking issues (critical hallucinations, missing required INPUT artifact, broken cross-references, dead links, files referenced in docs that don't exist in the bundle)
  - missingEvidence is empty or trivial
  - a candidate could plausibly read the brief, open the artifacts, and start
    making progress on the task without needing to ask a human "is this link
    actually working?" or "where's the file you mentioned?"

Otherwise \`passed: false\`. Populate \`blockingIssues\` (max 10) with the specific problems
to fix — include any validator failures from the ground-truth block — \`missingEvidence\`
(max 10) with what a candidate would need but isn't there, and \`retryInstructions\`
with concrete guidance the next attempt can act on.

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
