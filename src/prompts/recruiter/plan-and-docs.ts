/**
 * Step 1 prompt — plan + 3 markdown docs for the v2 resource pipeline.
 *
 * Produces a structured plan describing what artifacts Step 2 should build
 * (a repo for SWE archetypes, CSVs for data archetypes) plus 3 candidate-facing
 * markdown documents (project brief, data dictionary / setup guide, etc.).
 */

import { buildLanguageInstruction, type SupportedLanguage } from "@/lib/core/language";

export const PLAN_AND_DOCS_PROMPT_VERSION = "v2.0";

export interface PlanAndDocsInput {
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  techStack: string[];
  roleName: string;
  seniorityLevel: string;
  archetypeName: string;
  resourceType: "repo" | "data";
  coworkers: Array<{ name: string; role: string }>;
  language: SupportedLanguage;
}

export function buildPlanAndDocsPrompt(input: PlanAndDocsInput): string {
  const {
    companyName,
    companyDescription,
    taskDescription,
    techStack,
    roleName,
    seniorityLevel,
    archetypeName,
    resourceType,
    coworkers,
    language,
  } = input;

  const langInstruction = buildLanguageInstruction(language);
  const coworkersList = coworkers.length
    ? coworkers.map((c) => `- ${c.name} (${c.role})`).join("\n")
    : "- (no coworkers defined)";

  const artifactSpecificRules =
    resourceType === "repo"
      ? `
## Plan rules — engineering archetype (resourceType=repo)

The artifact phase will generate a **GitHub repository** with realistic source files,
git history, and issues. Your "plan.resources" entries describe the **3 most
important artifacts the candidate will interact with** — typically:

  1. The repository itself (type="repository").
  2. A primary source file the candidate edits (type="document", or another "repository" entry naming the file path).
  3. A supporting doc (type="document") — onboarding / handoff / spec.

Each entry includes:
  - id (stable kebab-case)
  - type ("repository" | "document")
  - label (human-readable)
  - filename (e.g. "README.md", "src/server/api/widgets.ts")
  - objective (one sentence — why this exists for the candidate)
  - candidateUsage (one sentence — how the candidate engages with it)
`
      : `
## Plan rules — data archetype (resourceType=data)

The artifact phase will generate **2-5 CSV files** with realistic distributions
using a Python sandbox. Your "plan.resources" entries describe **the CSV files the
candidate analyzes**. Each entry MUST include:

  - id (stable kebab-case)
  - type ("csv")
  - label (human-readable, e.g. "Sales Transactions Q4 2025")
  - filename (e.g. "sales_transactions.csv")
  - objective (one sentence — why this dataset exists for the candidate)
  - candidateUsage (one sentence — how the candidate uses it)
  - targetRowCount (integer between 1000 and 5000)
  - dataShape (free text describing distributions, key relationships, the *signal* in the data — e.g. "lognormal order_value, 60% repeat customers, weekly seasonality, ~3% fraud rows clustered around weekends")
`;

  const docsRules =
    resourceType === "repo"
      ? `
Each markdown document is ≥700 words, no external URLs, no placeholder/TODO text.
Cross-reference the other docs by name in a "See Also" section at the end.
For engineering archetypes the 3 docs are typically:

  1. **Project Brief** — what the candidate is building, why it matters, success criteria.
  2. **Architecture / Codebase Tour** — key files, conventions, how to run locally.
  3. **Onboarding Memo** — coworker context, expectations, how to ask for help.
`
      : `
Each markdown document is ≥700 words, no external URLs, no placeholder/TODO text.
Cross-reference the other docs by name in a "See Also" section at the end.
For data archetypes the 3 docs are typically:

  1. **Project Brief** — the business question, why it matters, deliverable expectations.
  2. **Data Dictionary** — REQUIRED: must reference EVERY CSV from plan.resources by filename, describing every column, types, units, and known caveats.
  3. **Onboarding Memo** — coworker context, what stakeholders care about, how to communicate findings.
`;

  return `${langInstruction}

You are a senior IC at ${companyName} prepping a realistic candidate exercise for a ${seniorityLevel} ${roleName} (archetype: ${archetypeName}).

## Inputs

**Company:** ${companyName}
**Company description:** ${companyDescription}
**Tech stack:** ${techStack.join(", ") || "n/a"}
**Task the candidate will work on:**
${taskDescription}

**Coworkers (the candidate can talk to):**
${coworkersList}

**Resource type:** ${resourceType}

## Why your docs matter for what comes next

A subsequent step generates the artifacts the candidate uses (a real GitHub
repo for engineering, real CSV files for data). That generator treats your
docs as the authoritative spec — every concrete name (column, file path,
class, env var, schema field), every enum value, every row count, every
relationship you commit to becomes a hard constraint on what gets built.

Two implications you must respect:

1. **Be specific where it matters.** When you name a column, table, file,
   class, or value enum in a doc, you ARE deciding the schema. Pick names
   that fit the role/scenario and use them consistently. Don't list two
   competing names for the same thing in different docs.
2. **Don't over-commit.** If a number or detail won't actually be checkable
   against the artifact, don't make a precise claim about it. Say "a few
   thousand rows" instead of "exactly 4500" if you don't need exactly 4500;
   say "a few backend routes" instead of naming five routes you won't use.
   Anything you make precise becomes a constraint the judge will verify.
${artifactSpecificRules}

## Doc rules (apply to all 3 docs)

${docsRules}

## Quality criteria

In addition to the plan and docs, output 3-6 \`qualityCriteria\` strings — what the
generated artifacts must demonstrate for the candidate to succeed. The judge will
score against these. Examples:

- "CSV row counts match plan; distributions look realistic, not uniform random."
- "README explains run commands; main task is reachable from issues."
- "Cross-references between docs are consistent; data dictionary covers every CSV."

## Output

Strict JSON only. The schema:

{
  "plan": {
    "resources": [
      { "id": "...", "type": "...", "label": "...", "filename": "...", "objective": "...", "candidateUsage": "..."${
        resourceType === "data" ? `, "targetRowCount": 0, "dataShape": "..."` : ""
      } }
    ],
    "qualityCriteria": ["..."]
  },
  "docs": [
    { "id": "...", "name": "...", "filename": "...", "objective": "...", "markdown": "..." }
  ]
}

Exactly 3 plan.resources entries and exactly 3 docs entries. No commentary, no markdown wrapper around the JSON.`;
}
