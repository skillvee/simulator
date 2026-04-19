# AGENTS.md

Canonical project instructions live in [CLAUDE.md](./CLAUDE.md) — read that first.
The sections below are review-specific guidance for automated reviewers
(Codex Cloud, Claude Code review) so they know what to flag and what to ignore.

## Stack

Next.js 15 (App Router) · React · Prisma · Supabase (Postgres + Auth + Storage) · Gemini (Live for voice, Flash for text) · Vitest · shadcn/ui.

## Non-obvious rules — flag any violation

- **Type imports:** app code must `import type { … } from "@/types"`, never from component/lib implementation files. ESLint enforces.
- **Prisma enums:** import from `@prisma/client`, not from `@/types`.
- **Auth redirect validation:** check `url.startsWith("/")` BEFORE `url.startsWith(baseUrl)`. Order matters — relative URLs never start with baseUrl, so reversing the checks creates an open-redirect hole.
- **Assessment states:** only `WELCOME | WORKING | COMPLETED` are valid.
- **Prisma JSON columns:** reads are `as unknown as Type`, writes are `as unknown as Prisma.InputJsonValue`. Any other shape is wrong.
- **pgvector:** use raw SQL. Do not wrap with Prisma helpers (they don't support vector ops).
- **AI calls:** wrap with `wrapAICall` for structured error context. Raw Gemini calls without the wrapper should be flagged.
- **Voice hooks:** shared logic lives in `useVoiceBase`. Don't duplicate its ~400 LOC in new hooks.
- **API route responses:** use `success()`, `error()`, `validationError()` from `@/lib/api`. Plain `NextResponse.json` in an API route is a smell.

## What reviewers SHOULD flag

- Logic bugs, edge cases, race conditions, off-by-one errors, broken invariants.
- Code paths added or changed without matching tests (unit tests live co-located as `*.test.ts`).
- Mocked dependencies that should hit a real one (e.g. mocked DB in an integration test — prior incidents caught by this rule).
- Security issues: auth, XSS, SQL injection, secret exposure, open redirects.
- Overengineering: premature abstractions, dead code, unused exports, backwards-compat shims for code that has no old callers, comments that restate what the code does.

## What reviewers SHOULD NOT flag

- Style / formatting / import ordering (Prettier + ESLint handle it).
- Minor naming preferences.
- The intentional patterns listed above (double-cast Prisma JSON, raw SQL for pgvector, `wrapAICall`, `useVoiceBase`, `success/error/validationError` API helpers).
- Suggestions to add comments that restate the code.

## Severity guidance

- **Blocker:** security issue, data-loss risk, broken auth/redirect logic, regression in a critical path (assessment flow, recording upload, scoring).
- **Non-blocker:** missing test for a new branch, overengineering, unclear naming in non-hot paths.
- **Nit:** skip it.

End every review with `No blockers` or `Blockers: <list>`.
