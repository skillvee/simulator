# Ralph Progress Summary

Condensed learnings from 39 issues (US-001 through US-039). For detailed per-issue logs, see git history.

---

## 1. Project Overview

**Skillvee Simulator** is a developer assessment platform simulating a realistic "day at work." Candidates experience an AI-powered assessment flow while their screen is recorded.

### Assessment Flow
```
Consent → HR Interview → Congratulations → Screen Permission → Welcome (Slack DM)
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
├── contexts/      # React contexts (screen recording)
└── server/        # Database client
prisma/            # Schema + seed data
ralph/             # Autonomous task runner
tests/e2e/         # E2E tests using agent-browser
```

### Database Models
- **User** - id, email, name, role (USER/ADMIN), password, dataDeleteRequestedAt
- **Scenario** - id, name, companyName, companyDescription, taskDescription, repoUrl, techStack[], isPublished
- **Coworker** - id, scenarioId, name, role, personaStyle, knowledge (JSON)
- **Assessment** - id, userId, scenarioId, status, cvUrl, prUrl, prSnapshot, ciStatus, codeReview, report, consentGivenAt, startedAt, completedAt
- **Conversation** - id, assessmentId, coworkerId, type (text/voice/kickoff/defense), transcript (JSON)
- **HRInterviewAssessment** - communicationScore, cvConsistencyScore, professionalismScore, verifiedClaims, etc.
- **Recording** - id, assessmentId, with RecordingSegment children for chunks
- **SegmentAnalysis** - activityTimeline, toolUsage, stuckMoments, focusScore

---

## 3. Core Features Implemented

### Authentication (Issues #1-3)
- Google OAuth + email/password via NextAuth v5 with JWT strategy
- Sign-in/sign-up pages, profile page with assessment history
- Admin role check utilities (`requireAdmin()`, `checkIsAdmin()`)

### Voice Conversations (Issues #5-6, #11-12, #18, #20)
- **HR Interview** - Sarah Mitchell persona, verifies CV claims
- **Manager Kickoff** - Alex Chen, intentionally vague briefing
- **Coworker Calls** - Dynamic personas with knowledge injection
- **PR Defense** - Manager with full context (PR, conversations, screen analysis)
- Uses Gemini Live API with ephemeral tokens for client-side connections

### Text Chat (Issues #10-11, #13)
- Slack-like chat UI with coworker sidebar
- Gemini Flash for responses with persona injection
- Conversation memory with summarization for long contexts
- Cross-coworker awareness

### Screen Recording (Issues #14-17)
- Permission flow with re-prompt guard when sharing stops
- VP9 codec, 1 Mbps, 10-second chunk uploads
- Periodic screenshots (30s) for AI analysis
- Segment-based recording with interruption handling
- Incremental analysis via Gemini vision

### Assessment Reports (Issues #26-30)
- 8 skill categories scored (1-5): Communication, Problem Decomposition, AI Leverage, Code Quality, XFN Collaboration, Time Management, Technical Decision-Making, Presentation
- Narrative feedback + actionable recommendations via Gemini
- Email delivery via Resend
- Results page with score visualization

### Admin Features (Issues #31-34, #36)
- Protected admin routes with role checks
- Scenario CRUD APIs with coworker management
- Conversational scenario builder using Gemini
- Analytics dashboard: signups, completions, funnel, phase durations
- Scenario preview/testing with skip-to options

### Privacy & Data (Issues #37-38)
- Consent screen before assessment
- Privacy policy page
- Data deletion: scheduled (30-day grace) or immediate
- Soft delete pattern for users

### External Integrations (Issues #21, #23-25)
- **flowboard-task repo** - Real coding task repo with 70+ files, CI, tests
- **GitHub API** - PR closing, CI status fetching, diff retrieval
- **Code Review** - AI analysis of PR diff for quality/security/patterns

---

## 4. Key Technical Patterns

### Gemini Live Voice
```typescript
// Server: Generate ephemeral token
const authToken = await gemini.authTokens.create({ config: { ... } });
// Client: Connect with token as apiKey
const client = new GoogleGenAI({ apiKey: ephemeralToken });
const session = await client.live.connect(modelId, { config });
```

### Audio Handling
- Input: 16kHz PCM via AudioWorklet
- Output: 24kHz PCM via AudioContext
- Files: `src/lib/audio.ts`, `src/hooks/use-voice-conversation.ts`

### Prisma JSON Fields
```typescript
// Always double-cast for type safety
const data = assessment.report as unknown as AssessmentReport;
await db.assessment.update({
  data: { report: reportData as unknown as Prisma.InputJsonValue }
});
```

### Test Mocking Pattern
```typescript
// Define mock functions BEFORE vi.mock() due to hoisting
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: mockAuth }));
```

### Neo-Brutalist Components
- Square avatars with gold background and initials
- `clipPath` for geometric shapes (triangles, parallelograms)
- `bg-secondary` = gold (#f7da50)
- No rounded corners, no shadows

---

## 5. Critical Learnings

### Gemini Integration
- Gemini Live API requires `v1alpha` for ephemeral token creation
- Enable `inputAudioTranscription` and `outputAudioTranscription` in config
- Use `Modality.AUDIO` import from `@google/genai` - string "AUDIO" fails type check
- For text chat, `systemInstruction` param not supported - include as first message pair in history
- Clean JSON markdown formatting from responses before parsing

### Next.js / React
- NextAuth v5 with Credentials provider requires **JWT strategy** (not database)
- `useSearchParams()` requires Suspense boundary in Next.js 15
- API routes can ONLY export HTTP methods - constants/helpers must be in separate lib files
- Server components can directly query database with Prisma
- Use `redirect()` from "next/navigation" for server component redirects

### Prisma / Database
- JSON fields require `as unknown as Type` double cast for TypeScript
- Use `upsert` pattern for idempotent operations
- Cascade deletes (`onDelete: Cascade`) handle related records automatically
- Prisma env vars need to be exported before `prisma db push`

### Testing
- Vitest mock hoisting: define mock functions BEFORE `vi.mock()` calls
- jsdom's File/Blob `arrayBuffer()` hangs with large files - skip in unit tests
- MediaRecorder doesn't work in Node.js - mock for unit tests
- Test redirects with `expect().rejects.toThrow()` pattern
- Global fetch mock needs `beforeEach`/`afterEach` cleanup

### Voice Conversations
- AudioContext requires user interaction to resume from suspended state
- Session callbacks need `sessionConnected` flag since refs can be stale in closures
- Track "ended" event on MediaStream to detect when user stops browser sharing
- Voice system prompts should include filler words, natural pauses guidelines

### Error Handling
- Error categorization determines retry strategy (permission errors shouldn't retry)
- Exponential backoff with jitter prevents thundering herd
- localStorage provides simple persistence for session recovery

---

## 6. Important Gotchas

| Issue | Solution |
|-------|----------|
| Build fails with useSearchParams | Wrap component in Suspense boundary |
| Gemini systemInstruction not working | Use first user/model message pair instead |
| Prisma JSON type errors | Double cast: `as unknown as Type` |
| Tests fail with mock errors | Define mock functions before `vi.mock()` |
| API route exports constant | Move constants to `src/lib/` files |
| AudioContext suspended | Require user interaction (button click) first |
| File upload tests timeout | Skip integration tests in jsdom, use mocks |
| GitHub can't delete PRs | Use close (PATCH with `state: "closed"`) instead |
| Supabase storage 404 | Create `recordings` and `screenshots` buckets first |

---

## 7. External Dependencies

### Environment Variables Required
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

### External Repos
- **flowboard-task**: https://github.com/skillvee/flowboard-task - Assessment coding task repo with 70+ files, GitHub Actions CI, 60+ tests

### Supabase Storage Buckets
Create these buckets in Supabase dashboard:
- `resumes` - CV/resume uploads
- `recordings` - Video chunks
- `screenshots` - Periodic screenshots

---

## 8. Test Coverage

- **657+ unit tests** via Vitest (`npm test`)
- **5 E2E tests** via agent-browser (`npm run test:e2e`)
- **CI workflow** at `.github/workflows/e2e.yml`

### E2E Tests
- `create-account.sh` - Sign-up flow
- `login.sh` - Sign-in with credentials
- `logout.sh` - Sign-out and verification
- `assessment-start.sh` - Profile page assessments
- `coworker-directory.sh` - Team directory component

---

## 9. Files Reference

### Voice Infrastructure
- `src/lib/gemini.ts` - Gemini client, ephemeral tokens, persona prompts
- `src/lib/audio.ts` - Browser audio utilities (capture/playback)
- `src/hooks/use-voice-conversation.ts` - HR interview voice hook
- `src/hooks/use-coworker-voice.ts` - Coworker call hook
- `src/hooks/use-manager-kickoff.ts` - Kickoff call hook
- `src/hooks/use-defense-call.ts` - PR defense call hook

### Recording
- `src/lib/screen.ts` - Screen capture utilities
- `src/lib/video-recorder.ts` - MediaRecorder wrapper
- `src/contexts/screen-recording-context.tsx` - Global recording state
- `src/lib/recording-analysis.ts` - Gemini vision analysis

### Assessment
- `src/lib/assessment-aggregation.ts` - Report generation with 8 skills
- `src/lib/code-review.ts` - AI code review analysis
- `src/lib/conversation-memory.ts` - Memory + summarization
- `src/lib/coworker-persona.ts` - Persona system prompt builder

### Admin
- `src/lib/admin.ts` - Role check utilities
- `src/lib/analytics.ts` - Dashboard metrics
- `src/lib/scenario-builder.ts` - Conversational scenario creation

### Utilities
- `src/lib/storage.ts` - Supabase storage helpers
- `src/lib/email.ts` - Resend email service
- `src/lib/github.ts` - GitHub API integration
- `src/lib/error-recovery.ts` - Retry logic, categorization
- `src/lib/pr-validation.ts` - PR URL validation
- `src/lib/cv-parser.ts` - CV parsing and LinkedIn-style profile extraction

---

## Issue #41: US-040: CV Parsing & LinkedIn-Style Profile

**What was implemented:**
- `parsedProfile` JSON field added to Assessment model for storing parsed CV content
- CV parsing service (`src/lib/cv-parser.ts`) using Gemini Flash with vision capabilities
- Zod schemas for structured profile data: work experience, education, skills, certifications, languages
- Async CV parsing triggered after upload in `/api/upload/cv`
- Updated `/api/interview/token` to include formatted profile in HR interviewer system prompt
- HR interviewer now receives actual CV content directly instead of just a URL (AI cannot access URLs)
- 30 unit tests for cv-parser module

**Files created:**
- `src/lib/cv-parser.ts` - CV parsing service with Gemini integration
- `src/lib/cv-parser.test.ts` - 30 unit tests for schemas and utilities

**Files changed:**
- `prisma/schema.prisma` - Added `parsedProfile Json?` field to Assessment model
- `src/app/api/upload/cv/route.ts` - Trigger async CV parsing after upload
- `src/app/api/upload/cv/route.test.ts` - Added mocks for new dependencies
- `src/app/api/interview/token/route.ts` - Include formatted profile in system prompt
- `src/app/api/interview/token/route.test.ts` - Tests for parsed profile context

**Data model:**
```typescript
ParsedProfile {
  name?: string
  email?: string
  phone?: string
  location?: string
  linkedIn?: string
  github?: string

  summary: string
  workExperience: WorkExperience[]
  education: Education[]
  skills: Skill[] // Categorized: programming_language, framework, database, cloud, tool, soft_skill, methodology
  certifications: Certification[]
  languages: Language[] // With proficiency levels

  totalYearsOfExperience?: number
  seniorityLevel?: "junior" | "mid" | "senior" | "lead" | "principal" | "unknown"
  parsedAt: string
  parseQuality: "high" | "medium" | "low"
  parseNotes?: string[]
}
```

**Learnings:**
1. Gemini 2.0 Flash supports vision - can parse PDFs by sending base64 inline data
2. For non-text files (PDF, DOC), convert to base64 and use `inlineData` format in contents
3. AI cannot access URLs - must pass actual content in system prompts
4. Async parsing pattern: trigger with `.then().catch()` to not block upload response
5. Use `result.text` directly on Gemini response (not `result.response?.text?.()`)
6. `formatProfileForPrompt()` creates LinkedIn-style structured text for AI context
7. Skills should be grouped by category for better readability in prompts
8. Fallback handling important when parsedProfile is null but cvUrl exists

**Architecture patterns:**
- CV parsing is fire-and-forget after upload (async, non-blocking)
- Profile stored in assessment record for persistence
- Interview token endpoint checks for parsed profile first, falls back to basic info
- Zod schemas ensure type safety and validation for AI responses

**Gotchas:**
- Gemini SDK response uses `result.text` not `result.response?.text?.()`
- Need to clean JSON markdown formatting from Gemini response before parsing
- Tests need mocks for cv-parser, db, and supabase modules

---

## Issue #42: US-041: Style Markdown Rendering in Simulator Creator

**What was implemented:**
- Neo-brutalist styled Markdown component using `react-markdown`
- GitHub Flavored Markdown support via `remark-gfm` (tables, strikethrough, etc.)
- Syntax highlighting for code blocks via `rehype-highlight`
- Custom syntax theme matching the black/white/gold design system
- Integration in scenario builder chat messages and preview panel
- Integration in scenario detail view for company/task descriptions
- 29 unit tests for the Markdown component

**Files created:**
- `src/components/markdown.tsx` - Neo-brutalist styled Markdown renderer
- `src/components/markdown.test.tsx` - 29 unit tests

**Files changed:**
- `src/app/globals.css` - Added syntax highlighting theme (neo-brutalist colors)
- `src/app/admin/scenarios/builder/client.tsx` - Use Markdown for chat messages and preview
- `src/app/admin/scenarios/[id]/client.tsx` - Use Markdown for scenario details display
- `package.json` - Added react-markdown, remark-gfm, rehype-highlight dependencies

**Markdown Component Features:**
- Headings (h1-h6) with appropriate sizing and h1 border-bottom
- Paragraphs with proper spacing
- Lists (ul/ol) with gold square (■) bullets
- Links with gold underline decoration
- Bold, italic, strikethrough text
- Inline code with gold tint background
- Code blocks with black background, white text, syntax highlighting
- Blockquotes with gold left border
- Tables with inverted header
- Images with borders
- Horizontal rules

**Syntax Highlighting Theme:**
```css
/* Light mode: black background, white text */
- Keywords: gold (#f7da50)
- Strings: white
- Comments: gray (#888888)
- Functions: bold white

/* Dark mode: inverted (white background, black text) */
- Keywords: dark gold (#8c6d00)
- Strings: black
- Comments: dark gray (#666666)
```

**Neo-Brutalist Design Compliance:**
- No rounded corners (0px radius)
- No shadows
- Sharp borders (1px or 2px black)
- High contrast (black on white, white on black)
- Gold (#f7da50) for accent/emphasis
- DM Sans for prose, Space Mono for code

**Learnings:**
1. `react-markdown` requires `remark-gfm` plugin for GitHub Flavored Markdown (tables, strikethrough)
2. `rehype-highlight` provides syntax highlighting, works with highlight.js CSS classes
3. Custom component overrides via `components` prop allow full styling control
4. CSS pseudo-elements (`before:content-['■']`) work well for custom list bullets
5. `transition: none` important for neo-brutalist hover states (instant color flip)
6. Dark mode code blocks can use inverted colors (white bg, black text) for contrast
