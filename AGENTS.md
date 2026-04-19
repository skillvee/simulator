# AGENTS.md

Canonical project instructions live in [CLAUDE.md](./CLAUDE.md) — read that first.
The sections below are review-specific guidance for automated reviewers
(primarily Codex Cloud) so they know what to flag and what to ignore.

## Stack

Next.js 15 (App Router) · React · Prisma · Supabase (Postgres + Auth + Storage) · Gemini (Live for voice, Flash for text) · Vitest · shadcn/ui.

## How to structure every review

Review the diff from three distinct lenses. Post ONE comment with three
sections in this order. If a lens has nothing substantive to flag, say so
in one line — don't pad with filler.

### 1. Correctness

Logic bugs, edge cases, race conditions, off-by-one errors, broken
invariants, incorrect error handling, wrong conditions on early returns.
Ignore style. Especially watch for:

- **Auth redirect ordering:** any `url.startsWith(baseUrl)` check BEFORE `url.startsWith("/")` is an open-redirect hole (relative URLs never start with baseUrl).
- **Assessment state transitions:** only `WELCOME | WORKING | COMPLETED` are valid. Flag any hand-rolled string.
- **Idempotency:** finalization paths (assessment completion, recording upload, video analysis) must be safe to call twice. Flag non-idempotent side effects.
- **Async boundaries:** DB calls inside `ReadableStream.start()` must be `.catch()`-wrapped or they kill SSE streams. Same for fire-and-forget promises.
- **Session user:** `session.user.id` can be undefined even after `requireAuth()` — always null-check.

### 2. Test coverage

Flag changed code paths without matching tests. Unit tests live co-located
as `*.test.ts`/`*.test.tsx`. Specifically watch for:

- **Missing tests** for new branches, error paths, or edge cases introduced by the diff.
- **Weak assertions** — tests that only check "no throw" or shallow shape when the change affects logic.
- **Mocked dependencies that should be real.** Integration tests must hit a real database — mocking the DB in an integration test has caused prior incidents.
- **`vi.mock` hoisting issues:** mock functions used inside `vi.mock()` factories must be declared with `vi.hoisted()`.
- **Next.js `useTranslations`:** components calling `useTranslations` render fine under test because `src/test/setup.tsx` provides a global `next-intl` mock — don't add per-file duplicates unless overriding specific strings.

### 3. Simplicity

Flag overengineering. CLAUDE.md's "don't add features beyond what the task requires" is the bar. Specifically:

- **Premature abstractions**, dead code, unused exports.
- **Backwards-compatibility shims** for code that has no old callers.
- **Comments that restate what the code does** — only `WHY` comments earn their keep (hidden constraints, subtle invariants, workarounds for specific bugs).
- **Error handling / validation for scenarios that can't happen** — trust internal code and framework guarantees; only validate at system boundaries.
- **Half-finished implementations** or TODOs introduced by the diff.

## Intentional patterns — do NOT flag these

These look unusual but are correct by design:

- **Prisma JSON columns:** reads cast `as unknown as Type`, writes cast `as unknown as Prisma.InputJsonValue`. Any other shape is what's actually wrong.
- **pgvector:** raw SQL only. Prisma helpers don't support vector ops.
- **`wrapAICall`:** all Gemini/AI calls must be wrapped for structured error context. Raw calls without it are the smell, not the wrapper.
- **`useVoiceBase`:** the ~400 LOC shared voice hook is deliberate consolidation. Don't suggest extracting/duplicating it.
- **API route responses:** must use `success()`, `error()`, `validationError()` from `@/lib/api`. Plain `NextResponse.json` in an API route is the smell.
- **Type imports:** app code imports types from `@/types`, never from component/lib implementation files. Prisma enums are the exception — those come from `@prisma/client`.

## Never flag these

- Style, formatting, import ordering — Prettier + ESLint handle it.
- Minor naming preferences.
- Missing JSDoc or docstrings.
- Suggestions to add comments that restate the code.
- Types that TypeScript already infers — don't suggest adding explicit annotations for locals or return types unless the inference is actually wrong.
- Missing translation keys in `src/messages/es.json` or `en.json` — the separate `i18n-coverage` workflow handles this.

## Severity

- **Blocker:** security issue, data-loss risk, broken auth/redirect logic, regression in a critical path (assessment flow, recording upload, scoring, reports).
- **Non-blocker:** missing test for a new branch, overengineering, unclear naming in non-hot paths.
- **Nit:** skip it. Don't post nits.

End every review with `No blockers` or `Blockers: <list>`.
