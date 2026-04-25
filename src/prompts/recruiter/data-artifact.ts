/**
 * Step 2 prompt — Python sandbox CSV generation for DA/DS/DE archetypes.
 *
 * Gemini 3.1 Pro runs Python in a sandbox (numpy, pandas, scipy preloaded).
 * The model writes scripts that produce 2-5 realistic CSVs and prints each
 * between the markers our parser expects.
 */

import type { ResourcePlan, ScenarioDoc, JudgeVerdict } from "@/types";

export const DATA_ARTIFACT_PROMPT_VERSION = "v2.0";

export interface DataArtifactPromptInput {
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  scenario: {
    companyName: string;
    taskDescription: string;
    techStack: string[];
    roleName: string;
    seniorityLevel: string;
  };
  judgeFeedback?: JudgeVerdict;
  attempt: number;
  /**
   * On retry attempts, the prior CSVs attached inline. Gemini renames them
   * to `input_file_<n>.csv` in the sandbox, so the prompt must publish the
   * mapping between sandbox path and original filename.
   */
  priorFiles?: Array<{ sandboxPath: string; originalFilename: string }>;
}

export function buildDataArtifactPrompt(input: DataArtifactPromptInput): string {
  const { plan, docs, scenario, judgeFeedback, attempt, priorFiles } = input;

  const planSection = plan.resources
    .map(
      (r, i) => `${i + 1}. **${r.label}** (\`${r.filename}\`)
   - Objective: ${r.objective}
   - Candidate usage: ${r.candidateUsage}
   - Target rows: ${r.targetRowCount ?? "n/a"}
   - Data shape: ${r.dataShape ?? "n/a"}`
    )
    .join("\n\n");

  // Inline the full markdown content. The candidate will read these docs;
  // the CSVs we generate MUST agree with every concrete name, value, range
  // and relationship the docs commit to. The model cannot match the docs
  // unless it sees them verbatim.
  const docsSection = docs
    .map(
      (d) => `### ${d.name} (\`${d.filename}\`)

${d.markdown}`
    )
    .join("\n\n---\n\n");

  const judgeSection = judgeFeedback
    ? `

## Judge feedback from previous attempt (#${attempt - 1})

The previous run failed. Address these issues:

- Summary: ${judgeFeedback.summary}
- Blocking issues:
${judgeFeedback.blockingIssues.map((i) => `  - ${i}`).join("\n")}
- Missing evidence:
${judgeFeedback.missingEvidence.map((i) => `  - ${i}`).join("\n")}
- Retry guidance: ${judgeFeedback.retryInstructions ?? "n/a"}
`
    : "";

  const priorFilesSection =
    priorFiles && priorFiles.length > 0
      ? `

## Prior attempt — ATTACHED for editing

You are NOT starting from scratch. The previous attempt's CSV files are
attached to this request. Gemini renames attached files in the sandbox, so
the mapping is:

${priorFiles
  .map((f) => `- \`${f.sandboxPath}\` ← original name was \`${f.originalFilename}\``)
  .join("\n")}

**Your job is to EDIT these files**, not regenerate them:

1. Load each prior file with pandas (e.g. \`df = pd.read_csv("input_file_0.csv")\`).
2. Inspect what's there.
3. Apply the judge's feedback as a **surgical change**: modify only what the
   feedback calls out, preserve everything else (column order, column names,
   distribution shapes, foreign-key relationships, row identities) byte-for-byte
   when you can.
4. Re-emit the modified file under its **original** filename (the one in the
   plan), not the \`input_file_<n>.csv\` name.

If a prior file does NOT need any change to address the feedback, you can
re-emit it unchanged (read it, then print it between the markers).
`
      : "";

  return `You are a senior data engineer at ${scenario.companyName} preparing a realistic candidate exercise for a ${scenario.seniorityLevel} ${scenario.roleName}.

## Task

The candidate will be analyzing the following datasets to address this business problem:

${scenario.taskDescription}

## Reference documents — AUTHORITATIVE

The candidate will read these markdown documents alongside your CSVs. Anything
the docs commit to — column names, allowed enum values, value ranges, foreign-
key relationships, row-count claims, time spans — is the source of truth. Your
CSVs MUST match them exactly. If a doc says "the column \`X\` takes values
\`A\` / \`B\` / \`C\`", you MUST use only \`A\`, \`B\`, \`C\`. If a doc claims
N rows, generate ~N rows. Drift between docs and data is a hard failure.

${docsSection}

## Anti-spoiler rule

The CSV is raw data — it should look like an export from a real production
table. Specifically forbidden:

- Column names like \`is_anomaly\`, \`is_fraud_flagged\`, \`bug_indicator\`
  that telegraph the answer.
- Sentinel values that scream "look here" (\`error_code = 'BUG-7'\`,
  customer_id ranges that are suspiciously gappy on exactly the rows the
  candidate should investigate). Realistic problems are statistical, not
  flagged.
- Notes / comments embedded as extra rows.
- Debug strings or human-readable annotations in cells.

The candidate must surface the issue from aggregations and joins on
realistic data, not from a column that says "look at this row".

## Files to generate

Generate **${plan.resources.length} CSV files** matching this plan:

${planSection}

## How to produce them

You have access to a Python code execution sandbox with **numpy**, **pandas**,
**scipy**, and **scikit-learn** preinstalled. Write Python code that:

1. Sets deterministic seeds at the top of every script:
   \`\`\`python
   import random
   import numpy as np
   random.seed(42)
   np.random.seed(42)
   \`\`\`

2. Generates realistic data using appropriate distributions
   (e.g., \`np.random.lognormal\`, \`np.random.poisson\`, \`scipy.stats.zipf\`,
   weekly/seasonal cycles via sine, correlated columns via multivariate normal).
   **Avoid uniform random** — it looks fake.

3. Caps each CSV at **2,000 rows max** (the sandbox stdout has a ~1 MB limit
   and the response token budget is tight). Match the plan's \`targetRowCount\`
   exactly — the docs commit to that number, so generating significantly fewer
   rows will fail the judge for "row count mismatch".

4. Prints each CSV between markers, exactly:

\`\`\`
=== FILE: <filename.csv> ===
<header,row1
data,row1
…>
=== END ===
\`\`\`

   - Use \`print(df.to_csv(index=False))\` between the markers — NOT
     \`df.to_json()\` and NOT JSON Lines (\`{"col": "val"}\` per line).
     The first line MUST be a comma-separated header row like
     \`order_id,customer_id,amount,created_at\`. Anything that starts with
     \`{\` or \`[\` will be rejected as malformed.
   - Use the exact filename from the plan (e.g. \`${plan.resources[0]?.filename ?? "data.csv"}\`).
   - Print one file at a time, then move to the next.

5. **Do not** print summary stats, plots, or extra commentary between markers —
   just the raw CSV content.

## Quality bar

Before printing, validate inside Python that:
- Row counts match the plan's targets.
- No column is entirely null or constant.
- Foreign-key relationships hold (e.g., every \`customer_id\` in orders.csv exists in customers.csv).
- Date ranges are realistic (no 2099 timestamps).
- Distributions look like the plan's "data shape" description.

## Quality criteria the judge will check

${plan.qualityCriteria.map((q) => `- ${q}`).join("\n")}
${judgeSection}${priorFilesSection}

## Output

Run the code in the sandbox. Your final visible output (after all markers) should
be only the marker-delimited CSV files. Do not wrap the markers in markdown
fences or commentary.`;
}
