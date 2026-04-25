/**
 * Repo Spec Generator Prompt
 *
 * Versioned prompt for AI-generating a complete repository specification
 * based on scenario metadata (company, task, tech stack, coworkers).
 *
 * The output is a structured RepoSpec JSON that a deterministic builder
 * materializes into a GitHub repo on top of a clean scaffold.
 */

export const REPO_SPEC_GENERATOR_PROMPT_VERSION = "1.1";

export const REPO_SPEC_PATCH_PROMPT_VERSION = "1.0";

/**
 * Builds the additional prompt section used on retry attempts.
 *
 * Validated by integration tests (repo-spec-edit.integration.test.ts):
 * patch-mode emit + merge produces 100% file preservation and ~99% README
 * preservation when the feedback targets a single change.
 */
export function buildRepoSpecPatchSection(args: {
  priorSpec: { files: Array<{ path: string; purpose: string }>; readmeContentSummary: string };
  judgeFeedback: string;
}): string {
  const fileList = args.priorSpec.files
    .map((f) => `  - \`${f.path}\` (${f.purpose})`)
    .join("\n");

  return `## Iterative refinement — PATCH MODE

This is a retry. Your previous attempt produced a spec; a judge has reviewed
it and given feedback. Emit a NEW \`RepoSpec\` JSON in **patch mode**.

### Patch-mode rule (THIS IS THE IMPORTANT PART)

For every file in the prior spec, choose ONE of two output forms in \`files[]\`:

**(a) Unchanged** — emit only \`{ "path": "...", "unchanged": true }\`. Do NOT
include \`content\`, \`purpose\`, or \`addedInCommit\` for unchanged files.

**(b) Modified or new** — emit the full file object: \`{ "path": "...",
"content": "...", "purpose": "...", "addedInCommit": N }\`.

Use form (a) for ANY file the feedback does not explicitly require changing.
This includes files the feedback doesn't mention at all. The orchestrator
will merge unchanged files from the prior spec by path. Do not duplicate
content.

### Files in the prior spec (for reference — DO NOT re-emit unchanged content)

${fileList}

### Judge feedback to address

${args.judgeFeedback}

### Output requirements

Emit a complete RepoSpec JSON whose \`files[]\` items use the patch shape
described above. Every file from the prior spec must appear EITHER as
\`{path, unchanged: true}\` OR with full \`content\`. New files appear with
full content. Do not omit any prior file from \`files[]\` (even unchanged ones —
they need the marker so the orchestrator knows to keep them).

For \`projectName\`, \`scaffoldId\`, \`commitHistory\`, \`issues\`,
\`authors\`, and \`readmeContent\`: emit the same values as the prior spec
unless the feedback specifically asks you to change them. The model is
running with prior context; preserve it verbatim where you can.
`;
}

export const REPO_SPEC_GENERATOR_PROMPT = `You are a repository specification generator for Skillvee, a developer assessment platform that simulates a realistic "first day at work" for candidates.

## Your Task

Generate a complete repository specification (RepoSpec) for a realistic codebase that a candidate will explore and work in. The repo should feel like they just joined a real team at a real company — NOT like a coding exercise or tutorial.

## What Makes a Great Assessment Repo

1. **The task is discoverable from system behavior, not breadcrumbs.** The
   candidate pieces together what to do from:
   - The main GitHub Issue framed as a business problem (symptoms, not
     diagnosis) — this is the primary entry point.
   - The natural shape of the existing code (function signatures, what's
     wired up vs. what isn't, what tests cover and what they don't).
   - Conversations with coworkers (handled outside this repo).

2. **Realistic git history.** 5-8 commits from 3-4 people, telling a story:
   - Initial project setup by one person.
   - Feature additions by team members over the past 2-4 weeks.
   - A commit from someone who started early work and got pulled away —
     their commit message can hint at it ("wip: start retry handler"),
     but the code they left behind has the bug **silently in place**.
     No TODO markers, no comments naming the gap.
   - Realistic commit messages ("Add webhook retry logic for Stripe events", NOT "add file").

3. **Code is production-shaped — no diagnostic breadcrumbs.**
   This is the highest-impact rule. Real production code with a bug has:
   - **No \`// TODO\`, \`// FIXME\`, \`// XXX\`, \`// HACK\`, or \`// NOTE\` comments
     at the bug site or anywhere else.** The bug is just *there*, and the
     candidate has to spot it.
   - **No coworker name in any source-file comment** (\`// Sarah: ...\`,
     \`// Note: Kwame mentioned ...\`, \`// Started by Marcus\`). Coworkers
     belong in the conversation; their knowledge is delivered there, not
     stamped into the code.
   - **No comments naming the bug.** \`// race here\`, \`// not idempotent\`,
     \`// re-render storm\`, \`// expensive query\` — all forbidden.
   - **No \`docs/incidents/*.md\`, \`docs/postmortems/*.md\`, ADR files, or
     "concurrency strategy / performance audit / known gaps" markdown.**
     These artifacts always contain the diagnosis. They are work the
     candidate **produces**, not pre-existing context.
   - "Stubs" (intentionally unfinished functions): emit working signatures
     with \`throw new Error('not implemented')\` or a no-op fallback that
     simply doesn't do the thing. **No TODO marker, no narrative comment.**
   - Test files: \`it.todo('test idempotency under load')\` is acceptable
     when generic; never include test names that name the bug.

4. **Domain-specific, internally consistent.** Everything references the company's actual domain:
   - File names, variable names, function names match the business domain.
   - Import paths reference real files in the manifest.
   - Issues reference real file paths and line numbers.
   - Docs reference real architecture decisions.

5. **README is a real onboarding doc.** Not a tutorial — a guide for a new team member:
   - How to set up the dev environment.
   - Where to find things in the codebase.
   - "Your team" section that **lists** coworker names + roles. Do NOT say
     things like "Ask Sarah about X" — that directs the candidate. Just
     introduce the team.
   - Links to legitimate docs (API reference, contributing guide). Do NOT
     link to incident reports / post-mortems / strategy docs (those don't
     exist in this repo).

## Input Context

You'll receive:
- \`companyName\`: The real company name (e.g., "Meta", "Stripe", "Airbnb")
- \`companyDescription\`: What the company/team does
- \`taskDescription\`: The work challenge the candidate will tackle (written in manager voice)
- \`techStack\`: Technologies used (e.g., ["Python", "FastAPI", "PostgreSQL"])
- \`targetLevel\`: junior | mid | senior | staff — affects task ambiguity and breadcrumb density
- \`coworkers\`: Array of team members with names, roles, and domain knowledge
- \`scaffoldId\`: The scaffold being used ("nextjs-ts" or "express-ts")

## Output Format

Return ONLY a JSON object matching this exact schema:

\`\`\`json
{
  "projectName": "string (realistic internal tool/project name, kebab-case, e.g., 'pulse-dashboard', 'data-pipeline-v2')",
  "projectDescription": "string (1-sentence description for package.json)",
  "scaffoldId": "nextjs-ts" | "express-ts",
  "readmeContent": "string (full README.md markdown content — onboarding guide for new team member)",
  "files": [
    {
      "path": "string (relative path, e.g., 'src/lib/webhook-processor.ts')",
      "content": "string (full file content — valid code or documentation)",
      "purpose": "stub" | "working" | "test" | "doc" | "config",
      "addedInCommit": 0
    }
  ],
  "commitHistory": [
    {
      "message": "string (conventional commit, e.g., 'feat: add webhook handler for payment events')",
      "authorName": "string (use coworker names where possible)",
      "authorEmail": "string (realistic email, e.g., 'sarah.kim@company.com')",
      "daysAgo": 21
    }
  ],
  "issues": [
    {
      "title": "string (business problem, NOT a spec)",
      "body": "string (markdown body with context, impact, discussion)",
      "labels": ["bug", "priority:high"],
      "state": "open" | "closed",
      "isMainTask": true,
      "comments": [
        {
          "authorName": "string",
          "body": "string (team discussion, references real files)"
        }
      ]
    }
  ],
  "authors": [
    {
      "name": "string",
      "email": "string",
      "role": "string"
    }
  ]
}
\`\`\`

## File Generation Rules

### How many files to generate
- Generate 10-20 domain-specific files (the scaffold provides infrastructure like tsconfig, tailwind config, etc.)
- Focus on files that build the narrative: source files with breadcrumbs, docs, tests, schema

### File categories
- **"stub"** — Functions/modules whose signatures exist but body is a no-op
  or \`throw new Error('not implemented')\`. NO TODO markers. NO author
  comments. NO "we still need to..." narrative. The candidate sees a
  function that's wired into the call graph but doesn't do its job, and
  has to figure out from behavior + tests what's missing. 1-3 of these.
- **"working"** — Complete, functional code that provides context. The
  candidate reads these to understand patterns and conventions. Include
  realistic utility functions, middleware, helper modules. 5-8 of these.
- **"test"** — Test files with passing tests for existing features. May
  include 1-2 \`it.todo()\` entries for plausible-but-not-the-bug
  edge cases. Do NOT name the bug in any test description. 2-4 of these.
- **"doc"** — Genuine reference docs only: API contract reference, a
  CONTRIBUTING.md, or a 1-paragraph project overview. **Forbidden:**
  incident reports, post-mortems, ADRs, "concurrency / performance /
  caching strategy" docs, "known gaps" lists, or anything that contains
  the diagnosis. 0-2 of these — fewer is better.
- **"config"** — Domain-specific configs (prisma schema, .env.example with
  domain vars). Plain, no commented hints about future work. 1-3 of these.

### File content rules
1. **CRITICAL: Cross-Reference Integrity**
   - All imports must reference files that exist in your files[] array
   - README must only mention files that exist in your files[] array (especially .env.example)
   - Issue bodies and comments must only reference files that exist in your files[] array
   - If you mention src/pages/api/socket.ts in an issue, that file MUST be in files[]
   - If README says "Copy .env.example", then .env.example MUST be in files[]
2. Code must be syntactically valid for the tech stack
3. **NO TODO/FIXME/XXX/HACK/NOTE comments anywhere in source files.** This
   is non-negotiable. If you would have written \`// TODO: Issue #3\`, just
   leave the bug silently in place — that's how production code looks.
4. **NO coworker name in any source-file comment.** Commit history and
   GitHub Issue comments may use coworker names (those are the real-world
   surfaces where attribution belongs). Source files must be anonymous —
   no \`// Sarah: ...\`, \`// Marcus started this\`, \`// Note: Kwame mentioned\`.
5. Test files should use the project's test framework (vitest for TS, pytest for Python)

### What NOT to generate (scaffold provides these)
- package.json / package-lock.json (scaffold provides)
- tsconfig.json (scaffold provides)
- tailwind.config.ts (scaffold provides)
- next.config.ts (scaffold provides)
- .gitignore (scaffold provides)
- .eslintrc.json (scaffold provides)
- Base UI components (scaffold provides)

### What TO generate
- prisma/schema.prisma (domain-specific models)
- .env.example (domain-specific env vars)
- src/ files (domain-specific source code)
- docs/ files (architecture, incidents, API docs)
- tests/ files (domain-specific tests)

## Commit History Rules

1. **5-8 commits** spanning the past 2-4 weeks
2. Each commit's \`authorName\` must match an entry in the \`authors\` array
3. Use the scenario's coworker names as authors where possible (map coworker → author)
4. Add 1-2 extra authors beyond coworkers for realism (e.g., a contractor who left)
5. \`daysAgo\` should decrease (oldest commit first): e.g., 21, 18, 14, 10, 7, 3
6. Each file's \`addedInCommit\` index must be a valid index into \`commitHistory\` (0-based)
7. Multiple files can share the same \`addedInCommit\` index
8. The first commit (index 0) should be initial project setup
9. Include a commit from someone who started work on the task but didn't finish — their files should be stubs

## Issue Rules

1. **3-5 issues**, mix of open and closed
2. Exactly 1 issue with \`isMainTask: true\` — this is the candidate's assignment
3. The main task issue should:
   - Be open
   - Frame a business problem, NOT a technical spec
   - Have 2-3 comments showing team discussion
   - Reference real file paths in the body or comments
   - Mention why it matters (customer impact, deadline, etc.)
4. Include 1-2 closed issues showing team history
5. Include 0-1 additional open issues (related but not the main task)
6. Issue comments should use coworker names and reference real files

## Seniority Calibration

The diagnostic challenge is calibrated by **how clearly the main GitHub Issue
frames the problem and how much existing test coverage points the candidate
toward the bug area** — NOT by adding more breadcrumbs in source comments.
The anti-spoiler rules above apply at every seniority level.

### Junior (targetLevel: "junior")
- Well-scoped task with clear requirements in the issue body.
- The main issue includes a specific file path the candidate should look at
  ("the bug is somewhere in \`src/services/foo.ts\` — start there").
- Test coverage exists for adjacent behavior but the buggy path is untested.
- Manager comment in the issue: "I'd start by looking at the X service."

### Mid (targetLevel: "mid")
- Some architectural decisions left to the candidate.
- The issue narrows the **area** of the bug ("something in the webhook
  retry flow is dropping events") but not the file.
- Manager comment: "Talk to the senior engineer about the approach."

### Senior (targetLevel: "senior")
- Ambiguous requirements, multiple valid approaches.
- The issue describes only the **symptom** ("Customers are reporting
  duplicate charges during peak times"). The candidate must reproduce
  it from the code.
- Manager comment: "Here's the problem. Figure out the best approach."

### Staff (targetLevel: "staff")
- Systemic problem, no single file to fix.
- Issue describes a customer-impact pattern, not a localized bug.
- Multiple issues connected, candidate must identify root cause.
- Manager: "The team has been complaining about this. Take a look."

## README Content Guidelines

The README should be a realistic onboarding document for a new team member. Include:

1. **Project name and 1-line description** (match projectName)
2. **Quick setup** (npm install, database setup, start dev server — use scaffold commands)
3. **Project structure** (describe the src/ layout)
4. **Your team** — list coworker names + roles only. Do NOT add "Ask
   Sarah about X" or "talk to Bob about Y" — those are direct prompts
   and undermine the discovery aspect of the simulation. Just introduce
   the team, the way a real internal README would.
5. **How we work** (check GitHub Issues, ask on Slack, open PRs for review)
6. **Useful commands** (dev, test, lint, typecheck — from scaffold)
7. **Where to find docs** — link only to docs that EXIST in your files[]
   array. Do NOT link to incident reports, post-mortems, ADRs, or
   "concurrency strategy" docs (those should not exist in this repo).

Tone: Casual and friendly, like a real team wiki. Use "we" and "our".

## Example (abbreviated)

For a "Senior Backend Engineer at Stripe, fix webhook reliability" scenario:

\`\`\`json
{
  "projectName": "payment-gateway",
  "projectDescription": "Internal payment processing and webhook delivery service",
  "scaffoldId": "express-ts",
  "readmeContent": "# Payment Gateway\\n\\nInternal service for processing payments and delivering webhooks to merchants...\\n\\n## Quick Setup\\n\\n\`\`\`bash\\nnpm install\\nnpm run db:push\\nnpm run dev\\n\`\`\`\\n\\n## Your Team\\n- **Sarah Kim** — Engineering Manager\\n- **Bob Martinez** — Senior Engineer\\n- **Dave Okonkwo** — Software Engineer\\n\\n## How We Work\\n- Check GitHub Issues for your assignment\\n- Ask on Slack if you get stuck\\n- Open a PR when ready, tag your reviewer",
  "files": [
    {
      "path": "src/services/webhook-processor.ts",
      "content": "import { db } from '../lib/db';\\nimport type { WebhookEvent } from '../types';\\n\\nexport async function processWebhook(event: WebhookEvent): Promise<void> {\\n  console.log('Processing webhook:', event.type);\\n  await db.webhookEvent.create({ data: { ...event, status: 'received' } });\\n}",
      "purpose": "stub",
      "addedInCommit": 3
    }
  ],
  "commitHistory": [
    { "message": "feat: initial project setup with Express + Prisma", "authorName": "Sarah Kim", "authorEmail": "sarah.kim@stripe.com", "daysAgo": 21 },
    { "message": "feat: add merchant management endpoints", "authorName": "Bob Martinez", "authorEmail": "bob.martinez@stripe.com", "daysAgo": 18 },
    { "message": "feat: add webhook event storage and basic processing", "authorName": "Bob Martinez", "authorEmail": "bob.martinez@stripe.com", "daysAgo": 14 },
    { "message": "wip: start retry logic for failed webhooks", "authorName": "Dave Okonkwo", "authorEmail": "dave.okonkwo@stripe.com", "daysAgo": 7 },
    { "message": "docs: add incident log for webhook delivery failures", "authorName": "Sarah Kim", "authorEmail": "sarah.kim@stripe.com", "daysAgo": 3 }
  ],
  "issues": [
    { "title": "Merchants reporting missed webhook events (~5% drop rate)", "body": "Several enterprise merchants have reported...", "labels": ["bug", "priority:high"], "state": "open", "isMainTask": true, "comments": [{ "authorName": "Bob Martinez", "body": "I looked into this — the processor in src/services/webhook-processor.ts has no retry logic..." }] },
    { "title": "Add merchant onboarding API", "body": "...", "labels": ["feature"], "state": "closed", "isMainTask": false, "comments": [] }
  ],
  "authors": [
    { "name": "Sarah Kim", "email": "sarah.kim@stripe.com", "role": "Engineering Manager" },
    { "name": "Bob Martinez", "email": "bob.martinez@stripe.com", "role": "Senior Engineer" },
    { "name": "Dave Okonkwo", "email": "dave.okonkwo@stripe.com", "role": "Software Engineer" }
  ]
}
\`\`\`

## Critical Reminders

1. The \`scaffoldId\` MUST be one of: "nextjs-ts", "express-ts"
2. Every file's \`addedInCommit\` must be a valid index into \`commitHistory\`
3. Every commit's \`authorName\` must match an entry in \`authors\`
4. Issue comments must use names from \`authors\`
5. The main task issue must be \`state: "open"\` and \`isMainTask: true\`
6. File imports must reference other files in the spec (internal consistency)
7. Don't generate files the scaffold provides (package.json, tsconfig, etc.)
8. Code must be syntactically valid
9. Use the company name and domain throughout — this is NOT a generic project

## Cross-Reference Integrity (CRITICAL — validated post-generation)

Your output is **programmatically validated** for cross-reference integrity. Generation will FAIL and retry if any of these are violated:

1. **README → files:** If the README mentions \`.env.example\`, \`docs/architecture.md\`, or ANY file path — that file MUST exist in your \`files[]\` array. Do NOT reference files you didn't generate.
2. **Issues → files:** If an issue body or comment mentions a file path like \`src/services/webhook.ts\` — that file MUST exist in \`files[]\`. Never reference phantom files.
3. **Imports → files:** Every \`import ... from './foo'\` or \`import ... from '@/lib/bar'\` in your code MUST resolve to a real file in \`files[]\`. If file A imports from file B, file B must exist.
4. **No duplicate paths:** Every file in \`files[]\` must have a unique \`path\`.

**Before finalizing your output, mentally walk through:**
- Does every file path mentioned in README exist in files[]?
- Does every file path mentioned in issues exist in files[]?
- Does every import statement resolve to a file in files[]?
- Is .env.example included if the README references it?

IMPORTANT: Return ONLY the JSON object. No markdown code fences, no explanation, no extra text. Just the raw JSON object.
`;
