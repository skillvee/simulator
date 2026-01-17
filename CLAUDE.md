# Skillvee Simulator

## What

Developer assessment platform simulating a realistic "day at work." Candidates experience HR interview → manager kickoff → coding task → PR defense, all via AI-powered conversations while screen is recorded.

**Stack:** Next.js, React, Supabase (Postgres + Auth + Storage), Vercel, Gemini Live (voice), Gemini Flash (text)

**Key directories:**
- `src/` - Next.js app with app router, components, hooks, lib utilities
  - `src/app/` - Pages and API routes (Next.js app router)
  - `src/app/api/` - Backend API routes
  - `src/components/` - React components (17 files)
  - `src/hooks/` - Custom React hooks (voice, screen recording)
  - `src/lib/` - Utilities (see "src/lib/ Organization" section below)
  - `src/prompts/` - AI prompt templates organized by domain
  - `src/contexts/` - React contexts (screen recording)
  - `src/server/` - Database client
- `docs/` - PRD documentation
- `prisma/` - Database schema and seed data
- `ralph/` - Autonomous GitHub Issues runner (see `ralph/CLAUDE.md`)
- `tests/e2e/` - E2E tests using agent-browser
- `scripts/` - Utility scripts (CV parser testing, etc.)
- `screenshots/` - Issue verification screenshots (for PR comments)
- `.claude/skills/` - Project-specific Claude skills

## Why

Assesses HOW developers work, not just WHAT they produce. Evaluates: communication, AI leverage, problem-solving approach, XFN collaboration, code quality, time management, technical decisions, presentation skills.

B2C MVP: developers practice realistic scenarios and get actionable feedback.

## How

**Design system:** Neo-brutalist. Sharp corners (0 radius), no shadows, black/white/gold palette, DM Sans + Space Mono fonts. See `.claude/skills/frontend-design/SKILL.md`.

**Code reuse:** Port Gemini Live client and auth from https://github.com/skillvee/skillvee

**Key docs:**
- `docs/prd-work-simulation.md` - Full PRD with user stories (64KB, detailed)
- `docs/prd.md` - Condensed PRD summary (21KB)
- `.claude/skills/frontend-design/SKILL.md` - Design system rules
- `.claude/skills/prd/SKILL.md` - PRD creation process
- `ralph/progress.md` - Learnings from all completed issues (reference for patterns)

## CLIs

`vercel` and `supabase` CLIs are installed and linked to this project.

## src/lib/ Organization

The `src/lib/` directory contains utilities organized by domain:

**AI & Gemini:**
- `gemini.ts` - Gemini client, ephemeral tokens, model constants
- `cv-parser.ts` - CV parsing with Gemini vision
- `conversation-memory.ts` - Conversation summarization
- `recording-analysis.ts` - Screenshot/recording analysis
- `assessment-aggregation.ts` - Report generation (8 skill categories)
- `code-review.ts` - AI code review analysis
- `scenario-builder.ts` - Conversational scenario creation
- `coworker-persona.ts` - Coworker persona system prompts

**External Services:**
- `storage.ts` - Supabase storage helpers
- `supabase.ts` - Supabase client
- `email.ts` - Resend email service
- `github.ts` - GitHub API integration

**Recording:**
- `audio.ts` - Browser audio utilities (capture/playback)
- `screen.ts` - Screen capture utilities
- `video-recorder.ts` - MediaRecorder wrapper

**Other:**
- `admin.ts` - Admin role check utilities
- `analytics.ts` - Dashboard metrics
- `data-deletion.ts` - User data deletion
- `error-recovery.ts` - Retry logic, error categorization
- `pr-validation.ts` - PR URL validation
- `env.ts` - Environment variable helpers

## API Routes Structure

API routes are organized under `src/app/api/`:

**Assessment Flow:**
- `/api/interview/` - HR interview (token generation, transcript, assessment)
- `/api/kickoff/` - Manager kickoff call
- `/api/call/` - Coworker voice calls
- `/api/chat/` - Coworker text chat
- `/api/defense/` - PR defense call
- `/api/assessment/` - Assessment status management

**File Operations:**
- `/api/upload/` - CV and file uploads
- `/api/recording/` - Recording chunks and screenshots

**External Integrations:**
- `/api/ci/` - GitHub CI status
- `/api/code-review/` - Code review analysis

**Admin:**
- `/api/admin/scenarios/` - Scenario CRUD
- `/api/admin/analytics/` - Dashboard metrics

**Auth & User:**
- `/api/auth/` - NextAuth endpoints
- `/api/user/` - User profile and data deletion

## Screenshots

Two screenshot locations exist:
- `screenshots/` (root) - Issue verification screenshots for PR comments
- `tests/e2e/screenshots/` - E2E test screenshots

Convention: Issue screenshots go to `screenshots/issue-<number>.png`

## Skills

- `frontend-design` - Neo-brutalist UI (auto-activates for frontend work)
- `prd` - Generate PRDs for features
- `ralph` - Autonomous GitHub Issues runner (see `ralph/CLAUDE.md`)
- `react-best-practices` - React/Next.js performance optimization (45 rules from Vercel)
