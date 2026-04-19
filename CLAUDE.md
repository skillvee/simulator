# Skillvee Simulator

AI-driven assessment platform for technical candidates (software engineers, data scientists, product managers, and adjacent roles). Candidates experience a simulated "day at work" — HR-style intro, manager kickoff, task execution, PR defense — via AI-powered conversations while the screen is recorded.

The assessment measures **how** candidates work (communication, AI leverage, problem-solving, collaboration, quality of output, time management), not just what they produce. This shapes prompt design, UX copy, and scoring logic throughout the codebase.

Stack: Next.js 15 (App Router), React, Supabase (Postgres + Auth + Storage), Vercel, Prisma, Gemini (Live for voice, Flash for text).

## Commands

- `npm run dev` — dev server (port 3000). Prefer `preview_start` MCP tool for verification workflows.
- `npm run check` — lint + typecheck. Run before marking any task complete.
- `npm run test` — full vitest suite.
- `npm run test:quick` — subset (src/lib/api, src/lib/core). Use when iterating on those paths.
- `npm run test:integration` — integration tests (separate vitest config).
- `npm run db:seed` — seed test users + fixed assessments.
- `npm run db:push` — push schema changes. Enum/constraint changes on existing data fail — see `prisma/CLAUDE.md`.
- `npx tsx scripts/run-evals.ts --name "<change>"` — prompt evals. Run after any prompt/model/conversation-flow change.

## Non-obvious rules

- **Assessment states:** `WELCOME | WORKING | COMPLETED`.
- **Prisma enums:** import from `@prisma/client`, not `@/types`.
- **Types:** import from `@/types`, not from component/lib implementation files. ESLint enforces.
- **Auth redirect validation:** check `url.startsWith("/")` BEFORE `url.startsWith(baseUrl)`. Relative URLs never start with baseUrl — order matters for preventing open redirects.

## Test login

`user@test.com` / `testpassword123` → `/assessments/test-assessment-chat/work`.
