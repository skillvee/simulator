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
}

export function buildDataArtifactPrompt(input: DataArtifactPromptInput): string {
  const { plan, docs, scenario, judgeFeedback, attempt } = input;

  const planSection = plan.resources
    .map(
      (r, i) => `${i + 1}. **${r.label}** (\`${r.filename}\`)
   - Objective: ${r.objective}
   - Candidate usage: ${r.candidateUsage}
   - Target rows: ${r.targetRowCount ?? "n/a"}
   - Data shape: ${r.dataShape ?? "n/a"}`
    )
    .join("\n\n");

  const docNames = docs.map((d) => `"${d.name}"`).join(", ");

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

  return `You are a senior data engineer at ${scenario.companyName} preparing a realistic candidate exercise for a ${scenario.seniorityLevel} ${scenario.roleName}.

## Task

The candidate will be analyzing the following datasets to address this business problem:

${scenario.taskDescription}

The candidate also has these markdown documents: ${docNames}. Make sure your CSV
data is **internally consistent** with what those docs describe (the data
dictionary in particular).

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

3. Caps each CSV at **5,000 rows max** (the sandbox stdout has a ~1 MB limit).
   Pick a row count inside the planned range that respects this cap.

4. Prints each CSV between markers, exactly:

\`\`\`
=== FILE: <filename.csv> ===
<header,row1
data,row1
…>
=== END ===
\`\`\`

   - Use \`print(df.to_csv(index=False))\` between the markers.
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
${judgeSection}

## Output

Run the code in the sandbox. Your final visible output (after all markers) should
be only the marker-delimited CSV files. Do not wrap the markers in markdown
fences or commentary.`;
}
