/**
 * Step 1 prompt — plan + 1-3 markdown docs for the v2 resource pipeline.
 *
 * Two layers of context:
 *
 *   1. PLAN — the full internal spec (data schemas, value ranges, anomalies,
 *      methodology). Authoritative for Step 2. Never shown to candidate.
 *   2. DOCS — what the candidate reads. A hurried, deliberately incomplete
 *      curation of (1). Names what exists; coworkers have the specifics.
 *
 * The split exists so candidates have a reason to talk to the team — if the
 * docs already contained every formula, bug detail, and methodology hint, the
 * coworker conversations would be redundant.
 */

import { buildLanguageInstruction, type SupportedLanguage } from "@/lib/core/language";

export const PLAN_AND_DOCS_PROMPT_VERSION = "v2.3";

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
  /**
   * Repo-only: layout/contents of the scaffold the artifact phase will use.
   * Embedded in the prompt so docs reference paths that actually exist.
   */
  scaffoldLayout?: {
    name: string;
    description: string;
    baselineFiles: string[];
  };
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
    scaffoldLayout,
  } = input;

  const langInstruction = buildLanguageInstruction(language);
  const coworkersList = coworkers.length
    ? coworkers.map((c) => `- ${c.name} (${c.role})`).join("\n")
    : "- (no coworkers defined)";

  const scaffoldBlock =
    resourceType === "repo" && scaffoldLayout
      ? `
## Scaffold the candidate will receive — AUTHORITATIVE

The repo will be built on **${scaffoldLayout.name}**, which already ships:

\`\`\`
${scaffoldLayout.baselineFiles.map((f) => `  ${f}`).join("\n")}
\`\`\`

${scaffoldLayout.description}

When you write the docs:
- Use **the exact file paths and idioms above**. If you say "src/pages/" but the
  scaffold uses "src/app/", the candidate will see a broken doc.
- Don't tell the candidate to create files the scaffold already provides
  (\`package.json\`, \`tsconfig.json\`, \`prisma/schema.prisma\`, etc.).
- Don't reference setup steps that depend on files NOT in the scaffold
  (\`docker-compose.yml\`, \`prisma/seed.ts\`) unless your task description
  explicitly requires the artifact phase to add them.
`
      : "";

  const planRules =
    resourceType === "repo"
      ? `
### Plan rules — engineering archetype (resourceType=repo)

Step 2 will generate a real GitHub repository (source files, git history, issues).
Your \`plan.resources\` entries describe **2-4 of the most important artifacts the
candidate will interact with** — typically:

  1. The repository itself (type="repository").
  2. A primary source file the candidate edits (type="document").
  3. (Optional) A supporting handoff doc (type="document").
  4. (Optional) A second touchpoint file or test the candidate must update.

Each entry includes \`id\`, \`type\` ("repository" | "document"), \`label\`,
\`filename\`, \`objective\`, \`candidateUsage\`. No row counts.

The repo's README + GitHub issues already carry most of the project narrative,
so your candidate-facing docs (below) are deliberately minimal.`
      : `
### Plan rules — data archetype (resourceType=data)

Step 2 will generate **2-5 CSV files** with realistic distributions in a Python
sandbox. Your \`plan.resources\` entries describe each CSV. Each entry MUST include:

  - id (stable kebab-case)
  - type ("csv")
  - label (human-readable, e.g. "Sales Transactions Q4 2025")
  - filename (e.g. "sales_transactions.csv")
  - objective (one sentence — why this dataset exists for the candidate)
  - candidateUsage (one sentence — how the candidate uses it)
  - targetRowCount (a numeric string between "500" and "2000" — emit as a JSON string like "1500", not a bare number — the sandbox stdout cap forces small datasets; do not promise more rows in docs than will be generated)
  - dataShape (free text describing distributions, key relationships, the *signal* in the data, ANY anomalies or known issues. **This is internal; the candidate will not see it directly. Be exhaustive.** e.g. "lognormal order_value, 60% repeat customers, weekly seasonality, ~3% fraud rows clustered around weekends")

#### Inputs vs deliverables — non-CSV artifacts the task mentions

Step 2 only generates **CSVs**. It does NOT generate dbt models, SQL queries,
notebooks, dashboards, BI views, ML models, or any other "the candidate will
write this" artifact.

If the task description references artifacts like \`dbt models\`, \`SQL queries\`,
\`Looker dashboards\`, \`Hex notebooks\`, \`Amplitude funnels\` — those are
**deliverables the candidate produces**, not inputs the platform provides.
Do NOT add them to \`plan.resources\` and do NOT list them in the data dictionary.

The kickoff doc CAN mention them, but only as work items ("you'll probably need
to write a few dbt models on top of these tables"), never as files the candidate
opens. The judge has been instructed not to penalize their absence.
`;

  const docVoice = `
### Voice — onboarding doc, hurried but structured

Think Google Doc your manager wrote between meetings on day one — not a Slack
DM, not a corporate template. Hurried but scannable. Brief opener (1-2 lines),
2-4 H2 sections with functional names like "What you're working on", "How
things fit together", "Who to talk to", "Where things live" — pick what fits,
don't force all four. Mostly complete sentences; personal voice ("we" / "you"
/ "I") is fine. Acknowledge the haste once at most; don't apologize through
the whole doc.

Use these when they earn it:
- Flat bullet lists for concrete lists (files, people, key links, flows)
- Tables for columned info (files × purpose, people × expertise, steps × where)
- Inline code spans for paths, commands, identifiers

Length: ~400-600 words per doc. Long enough for structure, short enough to
scan in under two minutes.

Avoid:
- "Executive Summary" / "Strategic Context" / "Methodological Guidelines"
- "BLUF" / consulting templates / phased timelines / "30-day plan"
- Numbered hierarchies > 1 level deep (flat lists / tables only)
- Word-count-padding adverbs ("rigorously", "comprehensively", "robustly")
- "See Also" cross-references between docs
- Multi-paragraph "Welcome to the team" intros (one friendly line is plenty)`;

  const antiSpoiler = `
### Anti-spoiler rule — NON-NEGOTIABLE

The whole point of the docs is that they're INCOMPLETE. The candidate has to
talk to coworkers to get the rest. Things that MUST live with coworkers, never in docs:

  - Specific numbers, weights, thresholds, formulas (e.g. "view = 0.1, comment = 5.0")
  - Bug or anomaly specifics (when it happened, what's broken, how to handle it)
  - Methodology hints, frameworks-with-values, "common pitfalls", "watch out for X"
  - Step-by-step instructions or week-by-week plans
  - Communication-style prescriptions ("follow BLUF, present bullets")
  - Direct instructions like "ask Marcus about the LTV formula" — see "soft hints" below

What you CAN say in docs:
  - The business question (why this exists, what's at stake)
  - Where to find data / repo (filenames, schemas if you include a dictionary)
  - Names of people on the team and the rough area they live in (soft hints, see below)
  - Vague framing of unknowns ("there's something off with the recent data
    — Priya's been digging") — never the diagnosis itself
  - Light "I think" / "we suspect" framing for hypotheses, not answers

### Soft hints, not directives

Mention coworkers naturally, the way you'd reference them in a real handoff:

  ❌ "Ask Marcus for the LTV weighting formula before you start."
  ✅ "Marcus has been thinking a lot about how we measure incremental engagement."

  ❌ "Priya can give you the deep dive on the reshare logging bug."
  ✅ "Priya's been deep in the engagement-infra weeds lately — worth a chat."

The candidate should infer "I should reach out" without being told to.`;

  const docsRules =
    resourceType === "repo"
      ? `
### Doc rules — engineering (resourceType=repo)

Generate **exactly 1 doc**: a kickoff note from a senior IC.

  - Filename: \`kickoff.md\` (or similar — your call, stay realistic)
  - Length: ~400-600 words. Scannable in under two minutes.
  - Shape: 2-4 H2 sections (e.g. *What you're working on*, *How the system
    fits together*, *Who to talk to*). Use tables / flat bullets where they
    earn their keep — see Voice section.
  - Content: business problem; where to start (repo URL is elsewhere, just
    say "the repo"); soft pointers about the team; open ending ("ping me
    if anything blocks you"). NO methodology, NO bug specifics.

The repo itself has the README, issues, and code — those carry the rest. Your
doc orients the candidate in human terms.`
      : `
### Doc rules — data (resourceType=data)

Generate **1 or 2 docs** — your call based on what the scenario actually needs:

  - **REQUIRED — kickoff note** (filename: \`kickoff.md\` or similar):
    ~400-600 words. Hurried-but-structured voice. 2-4 H2 sections covering
    the business question, where the data lives, soft pointers to coworkers,
    open ending. NO methodology, NO numbers, NO bug specifics.

  - **OPTIONAL — data dictionary** (filename: \`data_dictionary.md\` or similar):
    Include this ONLY if the schemas need a reference (e.g., 3+ files,
    ambiguous column names, units that aren't obvious). ~250-500 words.
    Use a table per file (column × type × 1-line description). Strictly
    factual: NO known issues, NO methodology, NO joining strategy. Just
    the schema.

If a single CSV with self-explanatory columns is the whole input, skip the
dictionary entirely — the kickoff note is enough.`;

  return `${langInstruction}

You are a ${seniorityLevel} ${roleName} at ${companyName} preparing onboarding
materials for a new hire (archetype: ${archetypeName}). The new hire starts
today; you're squeezing this in between meetings.

## Inputs

**Company:** ${companyName}
**Company description:** ${companyDescription}
**Tech stack:** ${techStack.join(", ") || "n/a"}
**Resource type:** ${resourceType}
${scaffoldBlock}

**The task the new hire will work on:**
${taskDescription}

**Their team (people they can talk to):**
${coworkersList}

## Two layers of context — read carefully

You're producing TWO things:

**1) PLAN — the internal source of truth (Step 2 reads this)**

The plan is the artifact-generation contract. Step 2 (which builds the actual
repo / CSVs the candidate works with) reads the plan and matches it precisely.
The candidate NEVER sees the plan directly.

The plan is where ALL the specifics live: column names, value ranges,
distribution shapes, foreign-key relationships, anomalies, intentional bugs,
target row counts, methodology that must be reflected in the data. Be
exhaustive — under-specified plans cause Step 2 to invent things that don't
match the docs/coworkers.

**2) DOCS — what the candidate reads (curated subset of the plan)**

The docs are written by you, in-character, for the new hire. They are
deliberately INCOMPLETE. Anything the docs do commit to (filenames, column
names, the business question) becomes a hard constraint that Step 2 will
match — so be careful what you commit to. Anything the docs DON'T commit to
(methodology, exact values, bug specifics) gets filled in by the candidate
talking to coworkers.
${docVoice}
${antiSpoiler}
${planRules}
${docsRules}

## Quality criteria

Output 3-6 \`qualityCriteria\` strings — what Step 2's artifacts must demonstrate
for the candidate to succeed. The judge scores against these. Examples:

  - "CSVs match the schema in the data dictionary; row counts within targets."
  - "The reshare-on-Reels anomaly is present in the data and matches the
    behavior Priya describes (silent drops in recent weeks)."
  - "Repo's main task issue is open and references real file paths from the
    spec; README's setup steps actually work."

Quality criteria CAN reference internal-only details (the bug specifics, the
formula). The judge sees them; the candidate doesn't.

## Output

Strict JSON only. The schema:

\`\`\`json
{
  "plan": {
    "resources": [
      { "id": "...", "type": "...", "label": "...", "filename": "...", "objective": "...", "candidateUsage": "..."${
        resourceType === "data" ? `, "targetRowCount": "1500", "dataShape": "..."` : ""
      } }
    ],
    "qualityCriteria": ["..."]
  },
  "docs": [
    { "id": "...", "name": "...", "filename": "...", "objective": "...", "markdown": "..." }
  ]
}
\`\`\`

Doc count: ${
    resourceType === "repo"
      ? "exactly 1 doc."
      : "1 or 2 docs (your call — kickoff is required, data dictionary only if schemas warrant it)."
  }

No commentary, no markdown wrapper around the JSON.`;
}
