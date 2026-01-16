# Skillvee Simulator

## What

Developer assessment platform simulating a realistic "day at work." Candidates experience HR interview → manager kickoff → coding task → PR defense, all via AI-powered conversations while screen is recorded.

**Stack:** Next.js, React, Supabase (Postgres + Auth + Storage), Vercel, Gemini Live (voice), Gemini Flash (text)

**Key directories:**
- `src/` - Next.js app (when created)
- `tasks/` - PRDs and planning docs
- `.claude/skills/` - Project-specific Claude skills

## Why

Assesses HOW developers work, not just WHAT they produce. Evaluates: communication, AI leverage, problem-solving approach, XFN collaboration, code quality, time management, technical decisions, presentation skills.

B2C MVP: developers practice realistic scenarios and get actionable feedback.

## How

**Design system:** Neo-brutalist. Sharp corners (0 radius), no shadows, black/white/gold palette, DM Sans + Space Mono fonts. See `.claude/skills/frontend-design/SKILL.md`.

**Code reuse:** Port Gemini Live client and auth from https://github.com/skillvee/skillvee

**Key docs:**
- `tasks/prd-skillvee-simulator.md` - Full PRD with user stories
- `.claude/skills/frontend-design/SKILL.md` - Design system rules
- `.claude/skills/prd/SKILL.md` - PRD creation process

## CLIs

`vercel` and `supabase` CLIs are installed and linked to this project.

## Skills

- `frontend-design` - Neo-brutalist UI (auto-activates for frontend work)
- `prd` - Generate PRDs for features
- `ralph` - Autonomous GitHub Issues runner (see `ralph/CLAUDE.md`)
- `react-best-practices` - React/Next.js performance optimization (45 rules from Vercel)
