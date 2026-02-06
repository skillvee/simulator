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
- `ralph/progress.md` - Learnings from 83+ issues

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

## Skills

- `frontend-design` - Modern blue theme UI (auto-activates)
- `prd` - Generate PRDs
- `ralph` - Autonomous issue runner
- `react-best-practices` - Performance optimization
