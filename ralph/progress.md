# Ralph Progress Summary

Condensed learnings from 39 issues (US-001 through US-039). For detailed per-issue logs, see git history.

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
- **Assessment** - id, userId, scenarioId, status, cvUrl, prUrl, prSnapshot, ciStatus, codeReview, report, startedAt, completedAt
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

---

## Issue #43: US-041: Visual LinkedIn-Style Profile Display

**What was implemented:**
- `ParsedProfileDisplay` component that renders `ParsedProfile` data visually
- Displays on `/profile` page after CV is parsed (when `parsedProfile` exists)
- Shows all sections: Summary, Work Experience, Education, Skills, Certifications, Languages
- Work experience with company, title, dates, duration, highlights, technologies used
- Skills grouped by category (programming languages, frameworks, databases, cloud, tools, soft skills, methodologies)
- Seniority level badge (junior/mid/senior/lead/principal) with gold background
- Parse quality indicator shown for non-high quality parses
- Graceful handling when `parsedProfile` is null (component renders nothing)
- 57 unit tests for the component
- Test seed data with comprehensive parsed profile for visual testing

**Files created:**
- `src/components/parsed-profile-display.tsx` - LinkedIn-style profile renderer
- `src/components/parsed-profile-display.test.tsx` - 57 unit tests

**Files changed:**
- `src/app/profile/page.tsx` - Import and integrate ParsedProfileDisplay component
- `prisma/seed.ts` - Add test assessment with parsed profile for test user

**Component sections:**
1. **Header** - Name, email, phone, location + contact links (LinkedIn, GitHub, Website)
2. **Seniority Badge** - Gold background badge showing level
3. **Parse Quality Warning** - Shown for medium/low quality parses
4. **Summary** - Professional summary text
5. **Work Experience** - Timeline with gold left border accent, duration badges, highlights with gold squares, technology tags
6. **Education** - Institution, degree, field, GPA, honors badges
7. **Skills** - Grouped by category with proficiency levels
8. **Certifications** - Name, issuer, date with gold left border
9. **Languages** - Language and proficiency in bordered boxes

**Neo-Brutalist Design Compliance:**
- No rounded corners (0px radius)
- No shadows
- 2px black borders for sections
- Gold (#f7da50) for accents: seniority badge, left borders, skill tags
- Monospace font (Space Mono) for dates and metadata
- DM Sans for prose text
- Sharp 90° corners everywhere

**Learnings:**
1. Prisma JSON `not null` filter requires `{ not: Prisma.JsonNull }` syntax (not `{ not: null }`)
2. Import `Prisma` as value (not type) when using `Prisma.JsonNull` in queries
3. `profileFromPrismaJson()` utility handles null and validates against Zod schema
4. TDD approach: wrote 57 tests first, then implemented component to pass them
5. Component returns `null` when profile is null/undefined for graceful handling
6. Group skills by category before rendering for organized display
7. Use gold left border accent (border-l-4 border-secondary) for visual hierarchy
8. Seed script useful for visual testing with comprehensive mock data

**Prisma JSON Filter Pattern:**
```typescript
// Correct - filter for non-null JSON field
const assessmentWithProfile = await db.assessment.findFirst({
  where: {
    userId: user.id,
    parsedProfile: { not: Prisma.JsonNull },
  },
});
```

**Gotchas:**
- `import type { Prisma }` won't work for `Prisma.JsonNull` - need value import
- Run seed with `export $(grep -v '^#' .env.local | xargs) && npx tsx prisma/seed.ts`
- Test user needs assessment with `parsedProfile` to see the visual component

---

## Issue #44: US-042: Assessment Start Flow for Regular Users

**What was implemented:**
- `/start` page with smart redirect logic for assessment start flow
- New users auto-start assessment after sign-up (redirect to `/start` instead of `/`)
- Returning users resume in-progress assessments based on status
- Handle edge case when no published scenarios exist (display message)
- 13 unit tests for the `/start` page

**Files created:**
- `src/app/start/page.tsx` - Smart redirect page with assessment creation logic
- `src/app/start/page.test.tsx` - 13 unit tests

**Files changed:**
- `src/app/sign-up/page.tsx` - Redirect to `/start` after sign-up (both credentials and Google OAuth)
- `src/app/page.tsx` - "Start Practicing" button links to `/start` instead of `/sign-in`

**User Flows:**

1. **New User Flow:**
   - Sign up → Auto redirect to `/start`
   - `/start` finds first published scenario → Creates assessment
   - Redirects to `/assessment/[id]/consent`

2. **Returning User Flow (no in-progress):**
   - Click "Start Practicing" → `/start`
   - If not authenticated → `/sign-in?callbackUrl=/start`
   - If authenticated → Creates new assessment → `/assessment/[id]/consent`

3. **Returning User Flow (resume):**
   - Click "Start Practicing" → `/start`
   - Finds most recent in-progress assessment
   - Redirects based on status:
     - HR_INTERVIEW → `/assessment/[id]/hr-interview`
     - ONBOARDING → `/assessment/[id]/congratulations`
     - WORKING → `/assessment/[id]/welcome`
     - FINAL_DEFENSE → `/assessment/[id]/defense`
     - PROCESSING → `/assessment/[id]/processing`

**Status-to-Page Mapping:**
```typescript
switch (status) {
  case HR_INTERVIEW: return '/assessment/[id]/hr-interview';
  case ONBOARDING: return '/assessment/[id]/congratulations';
  case WORKING: return '/assessment/[id]/welcome';
  case FINAL_DEFENSE: return '/assessment/[id]/defense';
  case PROCESSING: return '/assessment/[id]/processing';
}
```

**Key decisions:**
- Multiple in-progress assessments → resume most recent (orderBy: createdAt desc)
- Default scenario selected by createdAt asc (oldest published = first available)
- Home page stays static - no auth check, just link destination changed
- New assessments start at CV Upload (consent removed in Issue #46)

**Learnings:**
1. Server components use `redirect()` from "next/navigation" which throws to trigger redirect
2. Testing server component redirects: mock redirect to throw, use `expect().rejects.toThrow()` pattern
3. Prisma `status: { not: COMPLETED }` filter works for excluding single enum value
4. No need for separate API endpoint - server component can create assessment directly
5. Keep home page simple - all logic in `/start` page keeps concerns separated

**Gotchas:**
- `redirect()` throws an error (NEXT_REDIRECT) - don't try to catch it
- Test mocks need to throw to simulate redirect: `throw new Error(\`REDIRECT:\${url}\`)`
- Session may exist but have no user.id - check both

---

## Issue #45: US-043: Move parsedProfile from Assessment to User table

**What was implemented:**
- Added `cvUrl` and `parsedProfile` fields to User model in Prisma schema
- Updated `/api/upload/cv` to always parse CV and save to User (not just Assessment)
- Kept backwards compatibility by also saving to Assessment when assessmentId is provided
- Updated `/profile` page to read `parsedProfile` from User instead of Assessment
- Updated `ProfileCVSection` to pass initial CV URL from User
- Updated HR interview token route to fallback to User's `parsedProfile` when Assessment doesn't have one

**Problem solved:**
CV uploads from `/profile` page were not being parsed because the endpoint only triggered parsing when `assessmentId` was provided. This caused the ParsedProfileDisplay to never show for users who uploaded their CV from the profile page.

**Files changed:**
- `prisma/schema.prisma` - Added `cvUrl` and `parsedProfile` fields to User model
- `src/app/api/upload/cv/route.ts` - Always parse CV and save to User, plus backwards compatibility for Assessment
- `src/app/profile/page.tsx` - Read `parsedProfile` from User instead of Assessment
- `src/app/api/interview/token/route.ts` - Fallback to User's `parsedProfile` if Assessment doesn't have one

**Data flow (after fix):**
```
User uploads CV on /profile → File stored in Supabase → CV parsed → parsedProfile saved to User → Profile displayed
```

**Key changes:**
1. CV is always parsed and stored on User record (regardless of assessmentId)
2. If assessmentId is provided, CV is also saved to Assessment (backwards compatibility)
3. Profile page reads from User.parsedProfile (not Assessment.parsedProfile)
4. HR interview token route checks Assessment.parsedProfile first, then User.parsedProfile as fallback

**Learnings:**
1. When moving data between models, maintain backwards compatibility by writing to both places during transition
2. Use fallback pattern (`assessment.parsedProfile || assessment.user.parsedProfile`) for graceful migration
3. The Prisma include with select works for getting related user fields: `include: { user: { select: { cvUrl: true, parsedProfile: true } } }`
4. Async parsing pattern: trigger with `.then().catch()` to not block the upload response
5. Keep Assessment model's `parsedProfile` for historical records - don't remove during migration

**Gotchas:**
- Remember to include user fields in the Prisma query when using fallback pattern
- The `import type { Prisma }` import is sufficient for type usage but won't work for runtime value `Prisma.JsonNull`

---

## Issue #46: US-046: Replace Consent Page with Screen Share Modal

**What was implemented:**
- Deleted `/assessment/[id]/consent/` page directory and `/api/assessment/consent/` API
- Removed `consentGivenAt` field from Assessment model in Prisma schema
- Updated all redirects to go to CV Upload instead of Consent page
- Removed "Consent" step from progress indicators on assessment pages
- Enhanced `ScreenRecordingGuard` component to show an initial consent modal before recording starts
- Deleted `/assessment/[id]/screen-permission/` page (replaced by modal)
- Updated `congratulations` page to redirect directly to `/welcome` instead of `/screen-permission`

**New Assessment Flow:**
```
Start → CV Upload → HR Interview → Manager Kickoff → Coding Task (modal here) → PR Defense
```

**Screen Share Modal:**
- Appears immediately when user lands on coding task page (welcome page)
- Shows Monitor + Mic icons with gold backgrounds (neo-brutalist style)
- Explains screen recording + voice recording will happen
- Single "Accept & Continue" button (no close button or X)
- After clicking: dismisses modal → triggers browser's screen share request
- No database tracking needed - purely client-side

**Files deleted:**
- `src/app/assessment/[id]/consent/page.tsx`
- `src/app/assessment/[id]/consent/client.tsx`
- `src/app/api/assessment/consent/route.ts`
- `src/app/api/assessment/consent/route.test.ts`
- `src/app/assessment/[id]/screen-permission/page.tsx`
- `src/app/assessment/[id]/screen-permission/client.tsx`

**Files changed:**
- `prisma/schema.prisma` - Remove `consentGivenAt DateTime?` field
- `src/app/start/page.tsx` - Remove consent redirect logic
- `src/app/assessment/[id]/cv-upload/page.tsx` - Remove consent check and step from progress
- `src/app/assessment/[id]/hr-interview/page.tsx` - Remove consent check
- `src/app/assessment/[id]/congratulations/client.tsx` - Redirect to welcome instead of screen-permission
- `src/app/assessment/[id]/welcome/page.tsx` - Pass companyName to wrapper
- `src/components/assessment-screen-wrapper.tsx` - Accept companyName prop
- `src/components/screen-recording-guard.tsx` - Add initial consent modal alongside stopped modal
- `src/app/api/admin/scenarios/[id]/preview/route.ts` - Remove consentGivenAt

**ScreenRecordingGuard modal logic:**
```typescript
// Fresh start (never recorded) → show initial consent modal
if (state === "idle" && !wasRecording) {
  setShowInitialModal(true);
}

// Recording stopped (was active) → show re-prompt modal
if (wasRecording === "active" && state === "stopped") {
  setShowStoppedModal(true);
}
```

**Learnings:**
1. SessionStorage tracks whether recording was ever started (`screen-recording-{assessmentId}`)
2. Can reuse existing `ScreenRecordingGuard` component to show both initial and re-prompt modals
3. Initial modal uses `startRecording()`, re-prompt uses `retryRecording()` - same underlying logic
4. Passing `companyName` prop through wrapper allows personalized modal text
5. When removing database fields, clear `.next` cache before typecheck to avoid stale type errors
6. Simple modal notification is sufficient for recording consent - no database tracking needed

**Gotchas:**
- Must clear `.next/` cache after removing Prisma fields (stale generated types)
- Update all test files that reference removed field/routes
- The "coding task" page refers to `/welcome` in the codebase (first page of WORKING phase)

---

## Issue #47: US-047: Redesign Homepage with Anti-LeetCode Messaging

**What was implemented:**
- Complete homepage redesign with anti-LeetCode messaging and value proposition
- New Hero section with "Stop grinding LeetCode." headline (LeetCode in gold)
- 3 bullet points with checkmark icons highlighting key benefits
- Social Proof Banner showing "500+ professionals on early access" and Stanford StartX backing
- Company Logos Section with 8 company logos (Airbnb, Microsoft, Google, Spotify, Netflix, Apple, Meta, Amazon)
- Comparison Section with two-column layout: "The LeetCode Grind" vs "Skillvee Simulator"
- FAQ Section with 5 common questions and answers
- Final CTA Section with inverted colors and gold "Start Your Simulation" button
- Updated Footer with Skillvee link and email contact

**Files created:**
- `public/airbnb.png` - Company logo
- `public/amazon-small.png` - Company logo
- `public/apple-small.png` - Company logo
- `public/google-small.png` - Company logo
- `public/meta-small.png` - Company logo
- `public/microsoft-small.png` - Company logo
- `public/netflix.png` - Company logo
- `public/Spotify.png` - Company logo
- `public/skillvee-logo.png` - Skillvee logo

**Files changed:**
- `src/app/page.tsx` - Complete homepage redesign with all new sections

**Homepage Sections:**
1. **Hero** - Badge, anti-LeetCode headline, subheadline, 3 bullet points, dual CTAs, geometric decorations
2. **Social Proof Banner** - Full-width with border-y, background accent color
3. **Company Logos** - 8-logo grid, grayscale with hover color effect
4. **How It Works** - 4-step FeatureCard grid (kept from original)
5. **Comparison** - Two-column: LeetCode problems (X icons, muted) vs Skillvee advantages (checkmarks, gold border)
6. **FAQ** - 5 Q&A items in neo-brutalist card style
7. **Final CTA** - Inverted colors (black bg, white text), gold button
8. **Footer** - Skillvee branding, Part of Skillvee link, email, tagline

**Design Compliance:**
- Neo-brutalist style: 0px border-radius, no shadows, sharp borders
- Gold (#f7da50) accent color for highlights
- Black/white/gold palette throughout
- CheckCircle and X icons from lucide-react
- Next.js Image component for company logos with proper sizing
- Grayscale logos that reveal color on hover

**Learnings:**
1. Use `gh api repos/{owner}/{repo}/contents/{path} --jq '.content' | base64 -d > {dest}` to download files from GitHub
2. Next.js Image component requires explicit width/height, use `className="object-contain h-10 w-auto"` for flexible sizing
3. Grayscale + opacity combo (`grayscale opacity-60`) creates muted logo effect
4. `bg-secondary/10` creates subtle gold tint background for sections
5. Inverted color sections use `bg-foreground text-background` for contrast
6. Gold underline decoration: `underline decoration-secondary decoration-2 underline-offset-2`
7. Keep inline components (FAQItem, FeatureCard) in same file for simplicity unless they exceed ~50 lines
8. agent-browser `--viewport` flag sets window size when opening URL

**Gotchas:**
- Company logo files have different naming conventions (some have `-small` suffix)
- Spotify.png has capital S - filename case matters
- Use `&apos;` for apostrophes in JSX to avoid build warnings

---

## Issue #48: US-047: Upgrade Gemini Flash model from 2.0 to 3.0

**What was implemented:**
- Updated all text-based AI operations from `gemini-2.0-flash` to `gemini-3-flash-preview`
- Added centralized `TEXT_MODEL` constant in `src/lib/gemini.ts` for easier future updates
- Updated 10 files across the codebase (lib utilities, API routes, test files, scripts)

**Files changed:**
- `src/lib/gemini.ts` - Added `TEXT_MODEL = "gemini-3-flash-preview"` constant
- `src/lib/cv-parser.ts` - CV parsing
- `src/lib/assessment-aggregation.ts` - Narrative feedback and recommendations (2 occurrences)
- `src/lib/code-review.ts` - Code review analysis
- `src/lib/conversation-memory.ts` - Conversation summarization
- `src/lib/recording-analysis.ts` - Screenshot/recording analysis
- `src/app/api/interview/assessment/route.ts` - HR interview assessment API
- `src/app/api/chat/route.ts` - Coworker chat API
- `src/app/api/admin/scenarios/builder/route.ts` - Scenario builder chat
- `src/app/api/chat/route.test.ts` - Updated test expectation
- `scripts/test-cv-parser.ts` - CV parser test script

**Model update:**
- Previous: `gemini-2.0-flash`
- New: `gemini-3-flash-preview`
- Voice model unchanged: `gemini-2.5-flash-native-audio-latest` (already up-to-date)

**Why upgrade:**
- Gemini 3 Flash is Google's most balanced model built for speed, scale, and frontier intelligence
- Gemini 2.0 Flash is being deprecated March 3, 2026
- Latest capabilities and improved accuracy

**Learnings:**
1. Simple find-and-replace task - model ID is a string constant in each file
2. The `TEXT_MODEL` constant provides centralized management but isn't used by all files (some define their own `CHAT_MODEL` or `SUMMARY_MODEL` constants)
3. Voice model (`LIVE_MODEL`) was already on the latest version (`gemini-2.5-flash-native-audio-latest`)
4. Test file expectations need to be updated to match the new model ID

**Architecture note:**
The codebase has two model constants in `src/lib/gemini.ts`:
- `LIVE_MODEL` - For voice/audio conversations (Gemini Live API)
- `TEXT_MODEL` - For text-based AI operations (new constant added in this issue)

Individual API routes often define their own `CHAT_MODEL` or `SUMMARY_MODEL` constants locally. A future refactoring could import `TEXT_MODEL` from the central location.

---

## Issue #49: BUG-049: HR Interview Transcript Not Being Captured

**What was implemented:**
- Fixed the root cause of transcript capture failure in Gemini Live voice conversations
- Added `inputAudioTranscription` and `outputAudioTranscription` config to ephemeral token generation
- Updated E2E test to wait longer for AI to speak before ending interview

**Root Cause:**
The `generateEphemeralToken` function in `src/lib/gemini.ts` was creating ephemeral tokens with `liveConnectConstraints` that did NOT include transcription configuration. When using ephemeral tokens with constrained connections, the server-side token constraints take precedence over client-side config.

The client-side code in `use-voice-conversation.ts` was correctly setting `inputAudioTranscription: {}` and `outputAudioTranscription: {}`, but these settings were being ignored because the ephemeral token's constraints didn't include them.

**The Fix:**
Added transcription config to the server-side token generation:
```typescript
// In generateEphemeralToken() - src/lib/gemini.ts
liveConnectConstraints: {
  model: LIVE_MODEL,
  config: {
    systemInstruction: config?.systemInstruction,
    responseModalities: [Modality.AUDIO],
    // Enable transcription for both input (user speech) and output (model speech)
    // This is REQUIRED for transcript capture - must be set here, not just client-side
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    speechConfig: { ... }
  }
}
```

**Files changed:**
- `src/lib/gemini.ts` - Added transcription config to ephemeral token generation
- `tests/e2e/hr-interview-flow.sh` - Updated to wait for AI to speak before ending

**Impact:**
This fix affects ALL voice conversations in the app since they all use `generateEphemeralToken`:
- HR Interview (`/api/interview/token`)
- Manager Kickoff (`/api/kickoff/token`)
- Coworker Calls (`/api/call/token`)
- PR Defense (`/api/defense/token`)

**Learnings:**
1. **Ephemeral token constraints override client-side config** - When using `liveConnectConstraints` in `authTokens.create()`, those constraints lock in the configuration. Client-side `ai.live.connect()` config may be ignored or partially overridden.
2. **Transcription must be enabled server-side** - `inputAudioTranscription` and `outputAudioTranscription` must be included in the ephemeral token's `liveConnectConstraints.config`, not just in the client's `live.connect()` config.
3. **Empty object `{}` enables default transcription** - Both `inputAudioTranscription: {}` and `outputAudioTranscription: {}` use empty objects to enable transcription with default settings.
4. **Debug logging was helpful** - The existing console logs (`[Gemini] Message types:`, `[Transcript] Added...`) helped trace where the issue was occurring.

**Gotchas:**
- Client-side transcription config alone is NOT sufficient when using ephemeral tokens
- The client code may appear correct but the server-side token constraints take precedence
- All voice endpoints use the same `generateEphemeralToken` function, so the fix applies universally

**Testing Notes:**
- E2E tests need to wait for AI to speak (5-10+ seconds) before ending the interview
- Ending the interview immediately after starting will result in empty transcript
- Use the fake-transcript.ts script to test the flow without waiting for actual audio

---

## Issue #51: US-050: Organize prompts and make AI conversations more natural

**What was implemented:**
- Created `src/prompts/` directory with domain-based structure (hr/, manager/, coworker/, analysis/)
- Centralized all AI prompts from scattered locations into dedicated prompt files
- Made voice conversations feel like natural phone calls with filler words and casual speech
- Made chat conversations feel like Slack messages - short, conversational, not essay-length
- All prompts now instruct AI to build context through back-and-forth, not dump info upfront

**Files created:**
- `src/prompts/index.ts` - Central export for all prompts
- `src/prompts/hr/interview.ts` - HR phone screen prompt (natural, curious, conversational)
- `src/prompts/manager/kickoff.ts` - Manager briefing prompt (intentionally vague, busy manager)
- `src/prompts/manager/defense.ts` - PR defense prompt (tech lead review, curious but evaluative)
- `src/prompts/coworker/persona.ts` - Coworker chat/voice prompts with Slack/phone guidelines
- `src/prompts/analysis/code-review.ts` - Code review analysis prompt
- `src/prompts/analysis/cv-parser.ts` - CV parsing prompt
- `src/prompts/analysis/recording.ts` - Screenshot analysis prompt
- `src/prompts/analysis/assessment.ts` - Narrative and recommendations prompts

**Files changed:**
- `src/lib/gemini.ts` - Re-exports HR prompt from centralized location
- `src/lib/cv-parser.ts` - Imports prompt from centralized location
- `src/lib/recording-analysis.ts` - Uses centralized screenshot analysis prompt
- `src/lib/assessment-aggregation.ts` - Imports narrative/recommendations prompts
- `src/lib/conversation-memory.ts` - Uses centralized conversation summary prompt
- `src/lib/code-review.ts` - Uses centralized code review context builder
- `src/app/api/interview/token/route.ts` - Uses buildHRInterviewPrompt
- `src/app/api/kickoff/token/route.ts` - Uses buildManagerKickoffPrompt
- `src/app/api/defense/token/route.ts` - Uses buildDefensePrompt
- `src/app/api/call/token/route.ts` - Uses buildVoicePrompt for coworker calls
- `src/app/api/chat/route.ts` - Uses buildChatPrompt for coworker chat
- Updated test files to match new prompt wording

**Key prompt design principles:**

1. **Voice (phone calls):**
   - Use filler words: "um", "so", "you know", "basically"
   - React naturally: "mm-hmm", "right", "gotcha", "interesting"
   - Keep responses concise for voice medium
   - Sound like a real person on a call, not a script

2. **Chat (Slack-like):**
   - Keep messages short (1-3 sentences usually)
   - Don't write paragraphs - break things up
   - React naturally: "oh yeah", "hmm", "gotcha"
   - Ask clarifying questions before long answers

3. **Gradual context:**
   - Don't front-load all information
   - Build understanding through back-and-forth
   - Ask follow-ups, reference prior exchanges
   - Let conversation unfold naturally

**Directory structure:**
```
src/prompts/
├── index.ts          # Central exports
├── hr/
│   └── interview.ts  # HR phone screen
├── manager/
│   ├── kickoff.ts    # Task briefing (vague)
│   └── defense.ts    # PR defense
├── coworker/
│   └── persona.ts    # Chat + voice guidelines
└── analysis/
    ├── code-review.ts
    ├── cv-parser.ts
    ├── recording.ts
    └── assessment.ts
```

**Learnings:**
1. Prompt files should separate concerns: persona, context, guidelines
2. Voice and chat need different conversation styles (medium matters)
3. Builder functions allow dynamic context injection while keeping base prompts clean
4. Tests need to match exact wording in prompts - use grep to verify strings exist
5. Comments in code are not part of the prompt string - only template literals matter
6. Centralized prompts make it easier to maintain consistent AI behavior across endpoints
7. Re-exporting prompts (e.g., `export { X as Y }`) maintains backwards compatibility

**Gotchas:**
- Test expectations need to match actual prompt wording after refactoring
- The `buildX` pattern works well for dynamic prompts with context injection
- Import statements at module scope run before function bodies - can import mid-file in TypeScript
