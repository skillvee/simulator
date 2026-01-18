# Ralph Progress Summary

Condensed learnings from 82 issues. For detailed per-issue logs, see git history.

---

## 1. Project Overview

**Skillvee Simulator** is a developer assessment platform simulating a realistic "day at work." Candidates experience an AI-powered assessment flow while their screen is recorded.

### Assessment Flow

```
CV Upload → HR Interview → Congratulations → Welcome (Slack DM with screen share modal)
→ Manager Kickoff → Coworker Chat/Call → PR Submission → Final Defense → Processing → Results
```

### What It Assesses

- Communication & professionalism
- Problem decomposition & AI leverage
- Code quality & technical decisions
- Cross-functional collaboration
- Time management & presentation skills

---

## 2. Tech Stack & Architecture

**Stack:** Next.js 15, React, Supabase (Postgres + Auth + Storage), Prisma, Vercel, Gemini Live (voice), Gemini Flash (text)

**Design System:** Neo-brutalist - 0px radius, no shadows, black/white/gold (#f7da50) palette, DM Sans + Space Mono fonts

### Key Directories

```
src/
├── app/           # Next.js pages + API routes
├── components/    # React components
├── hooks/         # Custom React hooks (voice, screen recording)
├── lib/           # Utilities (gemini, audio, storage, analytics, etc.)
├── prompts/       # AI prompts organized by domain (hr/, manager/, coworker/, analysis/)
├── contexts/      # React contexts (screen recording)
└── server/        # Database client
prisma/            # Schema + seed data
ralph/             # Autonomous task runner
tests/e2e/         # E2E tests using agent-browser
```

### Database Models

- **User** - id, email, name, role (USER/ADMIN), cvUrl, parsedProfile
- **Scenario** - id, name, companyName, companyDescription, taskDescription, repoUrl, techStack[], isPublished
- **Coworker** - id, scenarioId, name, role, personaStyle, knowledge (JSON)
- **Assessment** - id, userId, scenarioId, status, cvUrl, prUrl, prSnapshot, ciStatus, codeReview, report, supersededBy
- **VideoAssessment** - id, candidateId, assessmentId, videoUrl, status, isSearchable, retryCount, lastFailureReason
- **DimensionScore** - 8 dimensions (COMMUNICATION, PROBLEM_SOLVING, TECHNICAL_KNOWLEDGE, COLLABORATION, ADAPTABILITY, LEADERSHIP, CREATIVITY, TIME_MANAGEMENT)
- **CandidateEmbedding** - pgvector embeddings for semantic search

---

## 3. Core Patterns

### Gemini Live Voice

```typescript
// Server: Generate ephemeral token with transcription enabled
const authToken = await gemini.authTokens.create({
  config: {
    liveConnectConstraints: {
      model: LIVE_MODEL,
      config: {
        systemInstruction,
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {}, // REQUIRED for transcript capture
        outputAudioTranscription: {}, // REQUIRED for transcript capture
      },
    },
  },
});
// Client: Connect with token as apiKey
const client = new GoogleGenAI({ apiKey: ephemeralToken });
```

### Prisma JSON Fields

```typescript
// Always double-cast for type safety
const data = assessment.report as unknown as AssessmentReport;
await db.assessment.update({
  data: { report: reportData as unknown as Prisma.InputJsonValue },
});
```

### Test Mocking Pattern

```typescript
// Define mock functions BEFORE vi.mock() due to hoisting
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));
```

### Server/Client Component Split

```typescript
// page.tsx - Server component fetches data
export default async function Page({ params }) {
  const data = await db.assessment.findUnique({ where: { id } });
  return <ClientComponent data={serializeDates(data)} />;
}

// client.tsx - Client component handles interactivity
"use client";
export function ClientComponent({ data }) { ... }
```

---

## 4. Critical Learnings

### Gemini Integration

- Gemini Live API requires `v1alpha` for ephemeral token creation
- **Transcription MUST be enabled server-side** in ephemeral token config, not just client-side
- Use `Modality.AUDIO` import from `@google/genai` - string "AUDIO" fails type check
- For text chat, `systemInstruction` param not supported - include as first message pair
- Clean JSON markdown formatting from responses before parsing
- Use `result.text` directly on Gemini response (not `result.response?.text?.()`)
- Gemini 3 Flash: `gemini-3-flash-preview` (text), Gemini 2.5 Flash: `gemini-2.5-flash-native-audio-latest` (voice)

### Next.js 15 / React

- NextAuth v5 with Credentials provider requires **JWT strategy** (not database)
- `useSearchParams()` requires Suspense boundary
- API routes can ONLY export HTTP methods - constants/helpers must be in separate lib files
- Server components use `redirect()` from "next/navigation" which throws
- Next.js 15 params are async - must `await params` before using

### Prisma / Database

- JSON fields require `as unknown as Type` double cast
- Use `upsert` pattern for idempotent operations
- `Prisma.JsonNull` needs value import, not type import
- pgvector uses `Unsupported("vector(768)")` - requires raw SQL for operations
- Cascade deletes (`onDelete: Cascade`) handle related records automatically

### Testing

- Vitest mock hoisting: define mock functions inside `vi.mock()` factory
- Test redirects with `expect().rejects.toThrow()` pattern
- jsdom's File/Blob `arrayBuffer()` hangs with large files - skip in unit tests
- MediaRecorder doesn't work in Node.js - mock for unit tests
- Global fetch mock needs `beforeEach`/`afterEach` cleanup

### Voice Conversations

- AudioContext requires user interaction to resume from suspended state
- Session callbacks need `sessionConnected` flag since refs can be stale in closures
- Track "ended" event on MediaStream to detect when user stops browser sharing
- Voice system prompts should include filler words, natural pauses guidelines

---

## 5. Important Gotchas

| Issue                                | Solution                                                   |
| ------------------------------------ | ---------------------------------------------------------- |
| Build fails with useSearchParams     | Wrap component in Suspense boundary                        |
| Gemini systemInstruction not working | Use first user/model message pair instead                  |
| Prisma JSON type errors              | Double cast: `as unknown as Type`                          |
| Tests fail with mock errors          | Define mock functions inside `vi.mock()` factory           |
| API route exports constant           | Move constants to `src/lib/` files                         |
| AudioContext suspended               | Require user interaction (button click) first              |
| File upload tests timeout            | Skip integration tests in jsdom, use mocks                 |
| GitHub can't delete PRs              | Use close (PATCH with `state: "closed"`) instead           |
| Supabase storage 404                 | Create `recordings` and `screenshots` buckets first        |
| Transcript not captured              | Enable transcription in server-side ephemeral token config |
| pgvector operations fail             | Use raw SQL (`$executeRaw`, `$queryRaw`) not Prisma ORM    |
| Clear `.next/` cache                 | After removing Prisma fields or major changes              |

---

## 6. Prompts Organization

All AI prompts are in `src/prompts/` organized by domain:

```
src/prompts/
├── index.ts          # Central exports
├── hr/
│   └── interview.ts  # HR phone screen (natural, curious)
├── manager/
│   ├── kickoff.ts    # Task briefing (intentionally vague)
│   └── defense.ts    # PR defense (evaluative)
├── coworker/
│   └── persona.ts    # Chat + voice guidelines
└── analysis/
    ├── code-review.ts
    ├── cv-parser.ts
    ├── recording.ts
    ├── assessment.ts
    └── video-evaluation.ts
```

**Key principles:**

- Voice: Use filler words ("um", "so"), react naturally ("mm-hmm", "gotcha")
- Chat: Keep messages short (1-3 sentences), don't write paragraphs
- Gradual context: Don't front-load info, build through back-and-forth

---

## 7. Video Assessment System

### 8 Assessment Dimensions

1. COMMUNICATION - Verbal and written clarity
2. PROBLEM_SOLVING - Analytical approach
3. TECHNICAL_KNOWLEDGE - Domain expertise
4. COLLABORATION - Working with others
5. ADAPTABILITY - Response to changes
6. LEADERSHIP - Taking initiative
7. CREATIVITY - Novel approaches
8. TIME_MANAGEMENT - Prioritization

### Archetype Weights

Weights applied at search time (never stored):

- VERY_HIGH (1.5x) - Critical for role
- HIGH (1.25x) - Important for role
- MEDIUM (1.0x) - Standard

### Seniority Thresholds

- JUNIOR: No minimum
- MID: Key dimensions >= 3
- SENIOR: Key dimensions >= 4

### Semantic Search

- pgvector for similarity search
- Combined score: 40% semantic + 60% fit score
- Embeddings generated async after video evaluation

---

## 8. Admin Features

### Pages

- `/admin/scenarios` - Scenario CRUD with coworker management
- `/admin/assessments` - Diagnostics with logs and API calls
- `/admin/assessments/[id]` - Timeline view with expandable details
- `/admin/users` - User management with assessment counts
- `/admin/analytics` - Dashboard metrics

### Key Patterns

- Protected by `requireAdmin()` in layout
- Server/client split for data fetching + interactivity
- Serialized dates (ISO strings) passed to client
- Stats grid with aggregate calculations
- Expandable rows for detailed views

---

## 9. Environment Variables

```
# Database
DATABASE_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# AI
GEMINI_API_KEY=

# Optional
GITHUB_TOKEN=           # For PR operations
RESEND_API_KEY=         # For email delivery
```

---

## 10. Recent Implementation Patterns

### CV Parsing (Issue #41-45)

- Gemini 2.0 Flash supports vision for PDF parsing
- Use `inlineData` with base64 for non-text files
- Async parsing with `.then().catch()` for non-blocking
- Store on User (not just Assessment) for profile page access

### Slack-like Layout (Issues #54-56)

- `SlackLayout` component with sidebar + main content
- `CallContext` for managing call state across components
- `FloatingCallBar` for Slack huddles-style voice calls
- Mobile responsive with hamburger menu

### Candidate Search (Issues #65-77)

- Entity extraction from natural language queries
- Archetype weights + seniority thresholds for filtering
- Semantic search with pgvector embeddings
- Rejection feedback loop for refining search
- Role-specific profile views with fit scores

### Admin Diagnostics (Issues #78-82)

- Timeline view combining logs and API calls
- Expandable prompt/response viewing with copy buttons
- Manual reassessment with `supersededBy` chain
- Error highlighting and status indicators

---

## 11. Testing

- **850+ unit tests** via Vitest (`npm test`)
- **E2E tests** via agent-browser (`npm run test:e2e`)
- Screenshots saved to `screenshots/issue-<number>.png` for PR verification

### Test Patterns

```typescript
// Server component with notFound
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
await expect(Page({ params })).rejects.toThrow("NOT_FOUND");

// Vitest mock hoisting
vi.mock("@/lib/db", () => ({
  db: { assessment: { findUnique: vi.fn() } },
}));
const mockDb = (await import("@/lib/db")).db as {
  assessment: { findUnique: ReturnType<typeof vi.fn> };
};
```

---

## 12. Neo-Brutalist Design Rules

- No rounded corners (0px radius everywhere)
- No shadows
- 2px black borders
- Gold (#f7da50) for accents
- DM Sans for text, Space Mono for labels/code
- Instant state changes (no transitions)
- High contrast throughout

---

## Issue #83: US-022 Simplify Sidebar Contact Interaction

- Simplified sidebar by removing Chat/Call buttons, making entire person box clickable for chat
- Replaced call button text with Headphones icon (Slack-style) in top-right of person box
- Removed "online/offline" text labels, kept only green/red dot indicators
- Added `cursor-pointer` and hover states to indicate clickability
- Used `e.stopPropagation()` on call button to prevent triggering chat navigation when clicking call
- Files changed: `src/components/slack-layout.tsx`, `src/components/coworker-sidebar.tsx`
- Imported `Headphones` icon from lucide-react

## Issue #91: REF-001 Add Missing Configuration Files

- Created explicit config files for linting and formatting tools
- **Files created:**
  - `.prettierrc.json` - Prettier config with semi, double quotes, tabWidth 2, es5 trailing comma, tailwind plugin
  - `eslint.config.mjs` - Next.js 15 flat config format using FlatCompat for backwards compatibility
  - `.editorconfig` - Cross-IDE settings (indent, charset, newlines, trailing whitespace)
  - `.prettierignore` - Excludes node_modules, .next, .vercel, lock files, dist/build
- **Scripts added to package.json:**
  - `npm run format` - Format entire codebase with Prettier
  - `npm run format:check` - CI check for formatting without modifying
- **Lint fixes applied:**
  - Unused imports removed across test files (beforeEach, fireEvent, etc.)
  - Unused variables prefixed with `_` (e.g., `_transcript`, `_isLoading`)
  - JSX entities escaped (e.g., `'` → `&apos;`)
  - ESLint disable comments added where necessary (e.g., `<a href="/">` needing html link)
- **Key learnings:**
  - ESLint 9 requires flat config format for Next.js 15
  - Use FlatCompat to extend legacy configs (`next/core-web-vitals`, `next/typescript`)
  - Prettier plugin order matters - tailwind plugin should be last
  - Prefix unused variables with `_` to satisfy `@typescript-eslint/no-unused-vars` rule

## Issue #93: REF-003 Create Centralized Type Definitions

- Created `src/types/` directory with centralized domain type definitions
- **Files created:**
  - `src/types/index.ts` - Re-exports all types for `@/types` imports
  - `src/types/assessment.ts` - CodeReviewData, HRAssessmentData, VideoAssessmentData
  - `src/types/conversation.ts` - ChatMessage, TranscriptMessage, ConversationWithMeta, CoworkerMemory
  - `src/types/coworker.ts` - CoworkerPersona, CoworkerKnowledge, PersonalityStyle, DecorativeTeamMember
  - `src/types/cv.ts` - ParsedProfile, WorkExperience, Education, Skill, etc.
  - `src/types/api.ts` - ApiResponse<T>, ApiSuccess<T>, ApiError with helper functions
  - `src/types/CLAUDE.md` - Documentation for type organization
- **Files modified for backwards compatibility:**
  - `src/lib/conversation-memory.ts` - Re-exports types from @/types
  - `src/lib/gemini.ts` - Re-exports TranscriptMessage from @/types
  - `src/lib/coworker-persona.ts` - Re-exports persona types from @/types
  - `src/lib/code-review.ts` - Re-exports CodeReviewData from @/types
  - `src/lib/cv-parser.ts` - Added re-exports for cv types
- **Key learnings:**
  - Maintain backwards compatibility with re-exports so existing imports continue to work
  - Zod schemas in lib files define runtime validation, type files define compile-time interfaces
  - Keep both in sync but Zod schemas are source of truth for validation
  - Use `export type {}` syntax for type-only re-exports

## Issue #92: REF-002 Create README.md

- Created comprehensive README.md at project root
- **Sections included:**
  - Project name and one-line description
  - Quick Start with 4 numbered setup steps (clone, env, db, run)
  - Architecture section with `src/` directory overview
  - Available Scripts table documenting all npm scripts
  - Database section explaining Prisma + Supabase setup
  - Environment Variables section referencing `.env.example`
  - Documentation section linking to `docs/prd.md` and CLAUDE.md files
  - Tech Stack summary
  - Design System overview (neo-brutalist)
- **Key learnings:**
  - README should be concise but complete - developers should be able to onboard quickly
  - Reference existing documentation (CLAUDE.md, progress.md, prd.md) rather than duplicating content
  - Table format works well for scripts documentation
  - Environment variables section should show structure but not actual values

## Issue #94: REF-004 Standardize API Response Format

- Created `src/lib/api-response.ts` with `success<T>()`, `error()`, and `validationError()` helpers
- Helpers return `NextResponse` with standardized shape:
  - Success: `{ success: true, data: T }`
  - Error: `{ success: false, error: string, code?: string, details?: unknown }`
- Migrated 5 representative routes to use new helpers:
  - `interview/token` - voice interview token generation
  - `chat` - coworker chat with Gemini
  - `assessment/complete` - PR submission and phase transition
  - `code-review` - AI code review analysis
  - `admin/scenarios` - admin scenario CRUD
- Updated route tests to use new response format (access data via `json.data.*`)
- Documented migration pattern in `src/app/api/CLAUDE.md`
- **Key learnings:**
  - When renaming `error` parameter in catch blocks, use `err` to avoid conflict with `error` helper
  - Tests expecting old format (`data.property`) need updating to new format (`json.data.property`)
  - Types from `@/types/api.ts` (ApiSuccess, ApiError) are reused by the new helpers
  - `validationError()` formats Zod errors with path and message for each issue
- **Files created:** `src/lib/api-response.ts`, `src/lib/api-response.test.ts`
- **Files modified:** 5 route files, 5 route test files, `src/app/api/CLAUDE.md`
