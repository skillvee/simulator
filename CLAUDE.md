# Skillvee Simulator

## What

Developer assessment platform simulating a realistic "day at work." Candidates experience HR interview → manager kickoff → coding task → PR defense, all via AI-powered conversations while screen is recorded.

**Stack:** Next.js 15, React, Supabase (Postgres + Auth + Storage), Vercel, Gemini Live (voice), Gemini Flash (text)

## Why

Assesses HOW developers work, not just WHAT they produce: communication, AI leverage, problem-solving, collaboration, code quality, time management.

## Key Directories

- `src/app/` - Pages and API routes (Next.js app router)
- `src/components/` - React components (Modern blue theme)
- `src/hooks/` - Voice conversation and recording hooks
- `src/lib/` - Utilities (Gemini, storage, analytics, etc.)
- `src/prompts/` - AI prompt templates by domain
- `prisma/` - Database schema
- `tests/` - E2E tests with agent-browser
- `ralph/` - Autonomous GitHub Issues runner

Each has its own CLAUDE.md with specific patterns and gotchas.

## How

**Design:** Modern blue theme with shadcn/ui - rounded corners, subtle shadows, blue (#237CF1) primary. See `.claude/skills/frontend-design/SKILL.md`.

**Key docs:**

- `docs/prd.md` - PRD summary
- Closed GitHub issues - Learnings from 83+ Ralph iterations (in issue comments)

## Assessment Flow

The assessment lifecycle is **WELCOME → WORKING → COMPLETED**. No intermediate states — HR_INTERVIEW, ONBOARDING, FINAL_DEFENSE, and PROCESSING were all removed. Some old code may still reference them.

## Prisma Enums

Import Prisma enums from `@prisma/client`, not `@/types`:

```typescript
import { AssessmentDimension } from "@prisma/client";
```

## Auth Security

When handling redirect callbacks, validate `url.startsWith("/")` BEFORE checking `url.startsWith(baseUrl)` to prevent open redirects. Relative URLs don't start with baseUrl, so order matters.

## CLIs

`vercel` and `supabase` CLIs are installed and linked.

## Type Imports

Import types from `@/types`, not from component or lib implementation files.

**Preferred:**

```typescript
import { ChatMessage, CodeReviewData, ParsedProfile } from "@/types";
```

**Avoid:**

```typescript
// Don't import types from component files
import { ChatMessage } from "@/components/chat/chat";

// Don't import types from lib implementation files
import { ParsedProfile } from "@/lib/candidate/cv-parser";
```

ESLint will warn when importing from implementation files. See `src/types/CLAUDE.md` for full documentation.

## E2E Test Data

Run `npx tsx prisma/seed.ts` to create test users and a fixed assessment:

- **Login:** `user@test.com` / `testpassword123`
- **Work page:** `/assessments/test-assessment-chat/work`

See `src/test/CLAUDE.md` and `.claude/skills/agent-browser/SKILL.md` for full E2E testing docs.

## Prompt Evals

**Run evals after any change to prompts, models, or conversation flow.** This catches regressions.

```bash
npx tsx scripts/run-evals.ts --name "description-of-change"   # Full suite (23 scenarios)
npx tsx scripts/run-evals.ts --category voice                  # Voice only (8 multi-turn)
npx tsx scripts/run-evals.ts --category manager                # Manager chat only (6)
```

- **23 scenarios**: 15 chat (single-turn) + 8 voice (multi-turn with simulated candidates)
- **3 Gemini 2.5 Pro judges** (with thinking enabled) per scenario, scoring 6 dimensions: naturalness, persona consistency, brevity, conversational flow, info discipline, AI-isms
- Results stored in DB, viewable at `/admin/evals` and via `GET /api/admin/evals/[id]`
- Current baseline: **4.52/5** (strict judges with flaws-first prompting)
- Key files: `src/lib/evals/`, `src/prompts/build-agent-prompt.ts`, `scripts/run-evals.ts`

## Skills

- `frontend-design` - Modern blue theme UI (auto-activates)
- `prd` - Generate PRDs
- `ralph` - Autonomous issue runner
- `react-best-practices` - Performance optimization
