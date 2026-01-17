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

---

## Issue #52: US-001: Add decorative offline team members

**What was implemented:**
- Added 8 decorative offline team members to `src/lib/coworker-persona.ts`
- Created `DecorativeTeamMember` interface with name, role, and optional initials
- Added `getInitials()` utility function for avatar display
- Updated `CoworkerSidebar` component to display offline members below interactive ones
- Offline members have muted styling (gray avatar, muted text, "offline" status)
- No action buttons for offline members (not interactive)
- Updated footer to show "X online · Y total" format

**Team members added:**
1. Maya Torres - Product Designer
2. Derek Washington - Data Scientist
3. Priya Sharma - DevOps Engineer
4. Marcus Lee - Frontend Engineer
5. Sofia Andersson - UX Researcher
6. James O'Brien - Backend Engineer
7. Nina Volkov - Engineering Manager
8. Carlos Mendez - Machine Learning Engineer

**Files changed:**
- `src/lib/coworker-persona.ts` - Added DecorativeTeamMember interface, DECORATIVE_TEAM_MEMBERS array, getInitials function
- `src/components/coworker-sidebar.tsx` - Added OfflineTeamMember component and integrated decorative members

**Learnings:**
1. Decorative elements don't need full persona data - just display info (name, role)
2. Visual distinction for offline status: muted colors, reduced opacity, different status indicator
3. The existing `EXAMPLE_COWORKERS` pattern made it easy to add a parallel `DECORATIVE_TEAM_MEMBERS` array
4. Utility functions like `getInitials()` can be reused across components when extracted to lib
5. Neo-brutalist styling applies to offline elements too - just with muted variants of the color palette

---

## Issue #53: US-002: Add online/offline status indicators to sidebar

**What was implemented:**
- Changed online status dot from gold (`bg-secondary`) to green (`bg-green-500`) for interactive coworkers
- Changed offline status dot from gray (`bg-muted-foreground/30`) to red (`bg-red-500`) for decorative members
- Added native HTML `title="Unavailable"` tooltip on hover for offline coworkers
- Added `cursor-default` class to offline members to indicate they are not clickable

**Files changed:**
- `src/components/coworker-sidebar.tsx` - Updated status dot colors and added tooltip

**Learnings:**
1. Native HTML `title` attribute provides a simple, accessible tooltip without additional dependencies
2. `cursor-default` class communicates non-interactive state visually
3. Tailwind's color palette (`bg-green-500`, `bg-red-500`) provides consistent, recognizable status colors
4. The Slack-like bottom-right positioning of status dots was already implemented in issue #52
5. Small visual changes (color updates) can have significant UX impact for status communication

---

## Issue #54: US-003: Create unified Slack-like layout component

**What was implemented:**
- Created new `SlackLayout` component (`src/components/slack-layout.tsx`) that provides a unified Slack-like layout
- Component includes sidebar (team directory) on left + main content area on right
- Sidebar shows online coworkers (interactive) and offline decorative team members
- Header displays "Team" label
- Clicking online coworker navigates to their chat page
- Selected coworker highlighted with gold left border + background accent
- Responsive design: sidebar collapses on mobile with hamburger menu toggle
- Loading skeleton shown during Suspense boundary resolution

**Files created:**
- `src/components/slack-layout.tsx` - Unified Slack-like layout with sidebar + main content

**Files changed:**
- `src/app/assessment/[id]/welcome/page.tsx` - Fetch all coworkers and pass to client
- `src/app/assessment/[id]/welcome/client.tsx` - Use SlackLayout instead of custom layout
- `src/app/assessment/[id]/chat/client.tsx` - Use SlackLayout instead of CoworkerSidebar
- `src/app/assessment/[id]/call/client.tsx` - Use SlackLayout instead of CoworkerSidebar

**Component features:**
1. **Sidebar** - Fixed width (w-64), shows online and offline team members
2. **Header** - "Team" label with neo-brutalist styling
3. **Footer** - Shows "X online · Y total" count
4. **Selection** - Gold left border (border-l-4 border-l-secondary) + bg-accent
5. **Mobile** - Hamburger menu with overlay, slide-in animation
6. **Suspense** - Built-in Suspense boundary for useSearchParams()

**Architecture decisions:**
- Wrapped component in Suspense boundary since useSearchParams() requires it in Next.js 15
- Created skeleton component for loading state
- Layout only used on "working" pages (welcome, chat, call) - not kickoff, defense, etc.
- Kept existing CoworkerSidebar component for backwards compatibility

**Responsive behavior:**
- Desktop (md+): Sidebar always visible
- Mobile: Sidebar hidden by default, hamburger button in top-left
- Click hamburger → sidebar slides in from left with overlay
- Click overlay or select coworker → sidebar closes

**Learnings:**
1. `useSearchParams()` requires Suspense boundary in Next.js 15
2. Transform + transition provides smooth slide-in animation for mobile sidebar
3. Fixed positioning (fixed inset-y-0 left-0) keeps sidebar full height on mobile
4. Overlay (fixed inset-0 bg-black/50) blocks interaction with main content when sidebar open
5. z-index layering: overlay (z-30) < sidebar (z-40) < hamburger button (z-50)
6. Neo-brutalist mobile menu button: border-2, bg-background, hover:bg-accent

**Gotchas:**
- Remember to add spacer element in main content header on mobile to account for fixed hamburger button
- Sidebar height should be `h-screen` on mobile (fixed) but `h-auto` on desktop (in flow)
- Close sidebar after navigation on mobile for better UX

---

## Issue #55: US-004: Refactor welcome page to unified layout with auto-select

**What was implemented:**
- Added `selectedCoworkerId` prop to `SlackLayout` component for auto-selection override
- Auto-select Alex Chen (Engineering Manager) on welcome page load
- Fixed typing indicator bug: indicator now disappears after all messages are displayed
- Replaced "Join Kickoff Call" button with standard call icon in chat header
- Call icon works same as other coworkers (initiates kickoff call with Alex)

**Files changed:**
- `src/components/slack-layout.tsx` - Added `selectedCoworkerId` optional prop, uses nullish coalescing to prefer prop over URL param
- `src/app/assessment/[id]/welcome/page.tsx` - Extract manager info separately, pass `managerId` to client
- `src/app/assessment/[id]/welcome/client.tsx` - Accept `managerId` prop, filter typing messages when done, replace footer button with header call icon

**Key changes:**

1. **SlackLayout selectedCoworkerId prop:**
   ```typescript
   interface SlackLayoutProps {
     selectedCoworkerId?: string; // Optional override
   }
   // Use: prop ?? URL param ?? null
   const selectedCoworkerId = overrideSelectedId ?? searchParams.get("coworkerId") ?? null;
   ```

2. **Typing indicator fix:**
   ```typescript
   const [allMessagesShown, setAllMessagesShown] = useState(false);

   // In useEffect when all messages done:
   setAllMessagesShown(true);

   // Filter out typing indicators when done:
   const displayMessages = allMessagesShown
     ? messages.filter((m) => !m.isTyping)
     : messages;
   ```

3. **Call icon in header:**
   ```tsx
   <button onClick={handleScheduleCall} className="p-2 border-2 ...">
     <Phone size={20} />
   </button>
   ```

**Learnings:**
1. Nullish coalescing (`??`) is better than `||` for prop overrides since it only falls back on `null`/`undefined`, not empty strings
2. Filtering out typing indicators when done is cleaner than trying to remove them from state during the typewriter effect
3. The call icon in header matches Slack UI patterns better than a large footer button
4. Passing the manager's ID from server component allows the sidebar to highlight the correct coworker

**Gotchas:**
- The `isTyping` messages get added and removed during the typewriter effect, but there can be a brief moment where a typing message remains in state. Using `allMessagesShown` flag + filtering is a reliable way to ensure no typing indicators show after completion.
- Manager fallback defaults (`"default-manager"`, `"Alex Chen"`) are used when no coworker with "manager" in their role exists

---

## Issue #56: US-005: Implement floating call bar in sidebar (Slack huddles style)

**What was implemented:**
- Created `FloatingCallBar` component (`src/components/floating-call-bar.tsx`) for Slack huddles-style voice calls
- Component appears at bottom of sidebar when a call is active, keeping chat visible
- Audio-only experience (no transcript displayed) for realistic simulation
- Visual indicators: gold ring around avatar when AI is speaking, mic icon when listening
- Neo-brutalist styling: sharp corners, black/white/gold palette, no shadows
- Integrated with `SlackLayout` via `CallContext` for managing call state across the layout
- Removed old split-view call layouts (call/client.tsx, kickoff/client.tsx)
- Call and kickoff pages now redirect to chat/welcome where floating bar works

**Files created:**
- `src/components/floating-call-bar.tsx` - Slack huddles-style floating call bar with full voice functionality

**Files deleted:**
- `src/app/assessment/[id]/call/client.tsx` - Old split-view call layout
- `src/app/assessment/[id]/kickoff/client.tsx` - Old split-view kickoff layout

**Files changed:**
- `src/components/slack-layout.tsx` - Added `CallContext` for managing call state, integrated `FloatingCallBar`
- `src/app/assessment/[id]/call/page.tsx` - Now redirects to chat page
- `src/app/assessment/[id]/kickoff/page.tsx` - Now redirects to welcome page
- `src/app/assessment/[id]/welcome/client.tsx` - Uses `useCallContext()` to trigger kickoff calls

**FloatingCallBar features:**
1. **States**: idle, requesting-permission, connecting, connected, error, ended
2. **Connected UI**: Avatar with initials, name, status text, mute button, end call button
3. **Visual indicators**:
   - Speaking: gold ring around avatar + Volume2 icon badge + "Speaking..." text
   - Listening: Mic icon badge + "In call" text
   - Muted: No badge + "Muted" text
4. **Error handling**: Red background with error message and dismiss button
5. **Connecting**: Spinner animation with status text

**CallContext API:**
```typescript
interface CallContextValue {
  activeCall: {
    coworkerId: string;
    callType: "coworker" | "kickoff" | "defense";
  } | null;
  startCall: (coworkerId: string, callType: "coworker" | "kickoff" | "defense") => void;
  endCall: () => void;
}

// Usage in child components:
const { startCall, activeCall } = useCallContext();
startCall(managerId, "kickoff");
```

**Neo-Brutalist Design Compliance:**
- No rounded corners (0px radius)
- No shadows
- 2px black borders
- Gold (#f7da50) for speaking indicator ring and accent
- High contrast status text
- Instant state changes (no transitions on speaking indicator)

**Architecture decisions:**
- Call state managed in `SlackLayout` to keep it accessible from any child component
- `FloatingCallBar` auto-connects on mount for seamless UX
- Transcript saved to server on call end but not displayed during call
- Call buttons in sidebar start calls in-place instead of navigating to separate pages

**Learnings:**
1. React Context (`CallContext`) allows call state to be shared between sidebar and main content
2. `useCallContext()` hook provides type-safe access to call state
3. Keeping transcript refs separate from display allows saving without showing
4. Auto-connect pattern: check `callState === "idle"` in useEffect to start connection on mount
5. Redirect pattern for backwards compatibility: old routes redirect to new pages where functionality lives
6. Neo-brutalist "listening" indicator works best with inverted colors (bg-foreground with light text)

**Gotchas:**
- Context must be created outside the component that provides it
- `useCallContext()` throws if used outside `SlackLayout` - ensure all consumers are children
- Call type must be specified when starting call ("coworker", "kickoff", or "defense")
- The coworker being called must exist in the `coworkers` array passed to `SlackLayout`

---

## Issue #57: CHORE-001: Repository organization for AI agent navigation

**What was implemented:**
- Updated CLAUDE.md with comprehensive key directories listing (docs/, prisma/, ralph/, tests/, scripts/, screenshots/)
- Fixed key docs references (was pointing to non-existent `tasks/prd-skillvee-simulator.md`)
- Added "src/lib/ Organization" section explaining file domains (AI & Gemini, External Services, Recording, Other)
- Added "API Routes Structure" section documenting endpoint organization
- Added "Screenshots" section documenting the two screenshot locations and conventions
- Moved `docs/test-resume.pdf` to `tests/fixtures/test-resume.pdf`
- Updated E2E test to use new fixture path

**Files changed:**
- `CLAUDE.md` - Major documentation update
- `tests/fixtures/test-resume.pdf` - Moved from docs/
- `tests/e2e/hr-interview-flow.sh` - Updated CV path reference

**Learnings:**
1. Test fixtures belong in `tests/fixtures/`, not `docs/`
2. AI agents benefit from explicit domain grouping in documentation (e.g., "AI & Gemini", "External Services")
3. API routes should be documented by functional area (Assessment Flow, File Operations, etc.)
4. Two screenshot directories serve different purposes: root `screenshots/` for issue verification, `tests/e2e/screenshots/` for E2E tests
5. Key docs section should reference actual file paths - outdated references cause confusion

**Architecture decisions:**
- Kept both PRD files (`docs/prd.md` and `docs/prd-work-simulation.md`) since they serve different purposes
- Did not move code files or restructure directories (documentation-only changes)
- Used relative paths in E2E tests (`../fixtures/`) to keep scripts portable

---

## Issue #58: US-002: Create Assessment Database Schema

**What was implemented:**
- Added `VideoAssessment` table for video-based candidate assessments
- Added `DimensionScore` table with 8 assessment dimensions (COMMUNICATION, PROBLEM_SOLVING, TECHNICAL_KNOWLEDGE, COLLABORATION, ADAPTABILITY, LEADERSHIP, CREATIVITY, TIME_MANAGEMENT)
- Added `VideoAssessmentSummary` table for AI-generated summaries
- Created enums: `VideoAssessmentStatus` (PENDING, PROCESSING, COMPLETED, FAILED), `AssessmentDimension`
- Added foreign key constraints with cascade deletes
- Added indexes on candidateId, assessmentId, and status for efficient querying
- Added unique constraint on (assessmentId, dimension) to ensure one score per dimension
- Created RLS policies for row-level security (candidates see own, admins see all completed)

**Files changed:**
- `prisma/schema.prisma` - Added VideoAssessment, DimensionScore, VideoAssessmentSummary models, enums, and updated User model

**Files created:**
- `supabase/migrations/20260116_video_assessment_rls.sql` - RLS policies for video assessment tables

**Schema design:**
```
VideoAssessment (id, candidateId, videoUrl, status, createdAt, completedAt)
  └── DimensionScore (id, assessmentId, dimension, score 1-5, observableBehaviors, timestamps[], trainableGap)
  └── VideoAssessmentSummary (id, assessmentId, overallSummary, rawAiResponse)
```

**RLS Policy Summary:**
- `VideoAssessment`: Candidates view own, admins view all completed
- `DimensionScore`: Candidates view own via assessment join, admins view completed via assessment join
- `VideoAssessmentSummary`: Same pattern as DimensionScore
- All tables: service_role has full access for API operations

**Learnings:**
1. Named new tables `VideoAssessment` (not `assessments`) to avoid conflict with existing `Assessment` model which serves a different purpose
2. Used `@@unique([assessmentId, dimension])` to ensure one score per dimension per assessment
3. RLS policies require joins to parent tables for child record access control
4. Supabase RLS uses `auth.uid()::text` to cast the UUID to match Prisma's cuid() strings
5. `service_role` policies enable API routes to bypass RLS for system operations
6. Enum values in Prisma use SCREAMING_SNAKE_CASE convention
7. `timestamps Json` field stores array of timestamps where behaviors were observed
8. `trainableGap Boolean` flag identifies skill gaps that can be improved through training

**Gotchas:**
- Existing `Assessment` model handles work simulation flow, new `VideoAssessment` is separate
- RLS policies need to be run directly on Supabase (migration file created but must be executed manually)
- User model needed relation update for `videoAssessments VideoAssessment[]`

---

## Issue #59: US-016: Create Assessment Logs Database Schema

**What was implemented:**
- Added `AssessmentLog` table for event tracking with columns: id, assessmentId, eventType (enum), timestamp, durationMs (nullable), metadata (jsonb)
- Added `AssessmentApiCall` table for API call tracking with columns: id, assessmentId, requestTimestamp, responseTimestamp, durationMs, promptText, promptTokens (nullable), responseText, responseTokens (nullable), modelVersion, statusCode, errorMessage (nullable), stackTrace (nullable)
- Created `AssessmentLogEventType` enum with values: STARTED, PROMPT_SENT, RESPONSE_RECEIVED, PARSING_STARTED, PARSING_COMPLETED, ERROR, COMPLETED
- Added indexes on assessmentId and timestamp for efficient querying
- Added composite index on (assessmentId, timestamp) for common query patterns
- Created RLS policies: only admins can view logs and API call records
- Added relations from Assessment model to new log tables

**Files changed:**
- `prisma/schema.prisma` - Added AssessmentLog, AssessmentApiCall models, AssessmentLogEventType enum, updated Assessment relations

**Files created:**
- `supabase/migrations/20260116_assessment_logs_rls.sql` - RLS policies for admin-only access

**Schema design:**
```
Assessment
  └── AssessmentLog (id, assessmentId, eventType, timestamp, durationMs?, metadata?)
  └── AssessmentApiCall (id, assessmentId, requestTimestamp, responseTimestamp?, durationMs?, promptText, promptTokens?, responseText?, responseTokens?, modelVersion, statusCode?, errorMessage?, stackTrace?)
```

**RLS Policy Summary:**
- `AssessmentLog`: Only admins can SELECT
- `AssessmentApiCall`: Only admins can SELECT
- Both tables: service_role has full CRUD access for API operations

**Learnings:**
1. Enum values in Prisma use SCREAMING_SNAKE_CASE convention (PROMPT_SENT, not prompt_sent)
2. Use `@db.Text` for long string fields like promptText, responseText, stackTrace
3. Separate indexes on individual columns (assessmentId, timestamp) plus composite index provides flexibility
4. Admin-only RLS is simpler than user-filtered RLS - just check role in User table
5. Nullable fields for timing data allow logging to start before response is received
6. `Json?` type maps to jsonb in PostgreSQL for efficient metadata storage
7. Cascade deletes ensure logs are cleaned up when assessment is deleted

**Architecture decisions:**
- Logs are tied to existing Assessment model (work simulation), not VideoAssessment
- service_role policies allow API routes to write logs without RLS restrictions
- Timestamp with default `@default(now())` enables automatic logging without explicit timestamp setting
- durationMs stored as Int (milliseconds) rather than float for consistency

**Gotchas:**
- RLS policies must be run manually on Supabase after schema push
- Prisma env vars need `export $(grep -v '^#' .env.local | xargs)` before `prisma db push`
- The `metadata Json?` field is nullable to keep logs lightweight when no extra context is needed

---

## Issue #60: US-004: Define Evaluation Prompt for Gemini

**What was implemented:**
- Created `src/prompts/analysis/video-evaluation.ts` with structured evaluation prompt
- 8-dimension rubric aligned with database schema (`AssessmentDimension` enum)
- Each dimension has 5-level definitions (1-5 scale) with observable criteria
- JSON output schema requiring timestamps for every scored behavior
- Anti-hallucination rules explicitly prohibiting inferred behaviors
- Scoring independence rules preventing cross-dimension influence
- No seniority/role assumption rules for unbiased evaluation
- Versioned constant (`EVALUATION_PROMPT_VERSION = "1.0.0"`) for audit trail
- TypeScript interface for type-safe evaluation output

**Files created:**
- `src/prompts/analysis/video-evaluation.ts` - Complete evaluation prompt with rubric, schema, and types

**Files changed:**
- `src/prompts/index.ts` - Export new prompt, version, types, and builder function

**8 Assessment Dimensions:**
1. COMMUNICATION - Verbal and written clarity
2. PROBLEM_SOLVING - Analytical approach to challenges
3. TECHNICAL_KNOWLEDGE - Domain expertise demonstrated
4. COLLABORATION - Working with others, seeking help
5. ADAPTABILITY - Response to changes and obstacles
6. LEADERSHIP - Taking initiative, guiding direction
7. CREATIVITY - Novel approaches and solutions
8. TIME_MANAGEMENT - Prioritization and efficiency

**JSON Output Schema:**
```typescript
{
  evaluation_version: string;
  overall_score: number; // 1.0-5.0
  dimension_scores: {
    [dimension]: {
      score: number | null;
      observable_behaviors: string;
      timestamps: string[]; // MM:SS format
      trainable_gap: boolean;
    }
  };
  key_highlights: Array<{
    timestamp: string;
    type: "positive" | "negative";
    dimension: string;
    description: string;
    quote: string | null;
  }>;
  overall_summary: string;
  evaluation_confidence: "high" | "medium" | "low";
  insufficient_evidence_notes: string | null;
}
```

**Key Prompt Design Principles:**
1. **Evidence-based**: Every score must cite specific timestamps from the video
2. **No hallucination**: Only observable behaviors can be evaluated
3. **No assumptions**: Cannot infer seniority, background, or role from appearance
4. **Independent scoring**: Each dimension evaluated separately without cross-influence
5. **Trainable gaps**: Flag skills that can be improved through training
6. **Null scores**: Dimensions with insufficient evidence get null, not guessed scores

**Learnings:**
1. Issue mentioned "6-dimension rubric" but database schema has 8 dimensions - always align with authoritative source (database)
2. Versioned prompts (semantic versioning) enable audit trail and A/B testing
3. TypeScript interfaces alongside prompts enable type-safe result handling
4. Builder function pattern allows optional context injection (video duration, task description)
5. Template literal with embedded version constant keeps prompt and version in sync
6. Explicit validation checklist in prompt helps AI self-verify output quality
7. `trainable_gap` field distinguishes between fixed traits and developable skills

**Gotchas:**
- PRD Appendix B shows 5 dimensions, database schema has 8 - schema is authoritative
- JSON in template literals needs escaped backticks or code block formatting
- Prompt should return ONLY JSON without markdown code blocks for easier parsing
- `evaluation_confidence` field helps downstream consumers gauge reliability

---

## Issue #61: US-003: Build Gemini Video Evaluation Service

**What was implemented:**
- Created `src/lib/video-evaluation.ts` service for evaluating videos with Gemini 3 Pro
- Sends video URL to `gemini-3-pro-preview` model for evaluation
- Uses the 8-dimension rubric from US-004 (video-evaluation prompt)
- Parses JSON response into `DimensionScore` and `VideoAssessmentSummary` database records
- Extracts and validates timestamps (MM:SS or HH:MM:SS format) for each observable behavior
- Retry logic with exponential backoff (max 3 attempts, 1s base, 30s max)
- Stores raw AI response in `rawAiResponse` field for auditing
- Updates assessment status through PROCESSING → COMPLETED/FAILED lifecycle
- 25 unit tests covering success, error handling, and edge cases

**Files created:**
- `src/lib/video-evaluation.ts` - Video evaluation service with Gemini integration
- `src/lib/video-evaluation.test.ts` - 25 unit tests

**Key Functions:**
- `evaluateVideo(options)` - Main function: sends video to Gemini, stores results
- `getEvaluationStatus(assessmentId)` - Check evaluation progress and completion
- `getEvaluationResults(assessmentId)` - Retrieve full evaluation with scores and summary
- `parseEvaluationResponse(responseText)` - Parse and validate Gemini JSON response
- `formatTimestamps(timestamps)` - Validate and filter timestamps to MM:SS format

**Service Flow:**
```
1. Update status to PROCESSING
2. Build evaluation prompt (with optional video context)
3. Call Gemini 3 Pro with video URL and prompt (with retry)
4. Parse JSON response
5. Upsert DimensionScore for each non-null dimension
6. Upsert VideoAssessmentSummary with raw response
7. Update status to COMPLETED
```

**Error Handling:**
- Uses `withRetry()` from error-recovery module (max 3 attempts)
- Exponential backoff: 1s base delay, up to 30s max delay
- Invalid JSON responses caught and returned as error
- Status set to FAILED on any unrecoverable error
- Error message returned in result for debugging

**Timestamp Validation:**
```typescript
// Regex: /^(\d{1,2}:)?\d{1,2}:\d{2}$/
// Valid: "01:23", "5:45", "1:23:45"
// Invalid: "invalid", "not-a-time"
```

**Learnings:**
1. Use `fileData` with `fileUri` for video input to Gemini (not inlineData for large files)
2. Gemini responses often include markdown code blocks - clean with `cleanJsonResponse()`
3. `withRetry()` from error-recovery handles exponential backoff automatically
4. Map dimensions from string keys to Prisma enum using explicit mapping
5. Only upsert scores for non-null dimensions - null means insufficient evidence
6. Cast Prisma JSON fields with double cast: `evaluation as unknown as Prisma.InputJsonValue`
7. Test mocking pattern: import mocked modules after `vi.mock()` calls, then cast to `vi.fn()`

**Architecture patterns:**
- Service pattern: single module exports all related functions
- Result type with `success: boolean` and optional `error` for graceful failure handling
- Map type for dimension scores allows easy lookup by dimension enum
- Upsert pattern ensures idempotent operations (can retry without duplicates)

**Model used:**
```typescript
const VIDEO_EVALUATION_MODEL = "gemini-3-pro-preview";
```

**Gotchas:**
- Issue mentioned "6-dimension rubric" but we correctly use 8 dimensions from database schema
- Timestamp regex allows both MM:SS and HH:MM:SS formats
- mimeType is hardcoded to "video/mp4" - may need to be configurable for other formats
- The `rawAiResponse` field stores the full evaluation (never exposed to users)

---

## Issue #62: US-020: Log All Assessment Events in Real-Time

**What was implemented:**
- Created `src/lib/assessment-logging.ts` service for comprehensive event logging
- Added `VideoAssessmentLog` and `VideoAssessmentApiCall` tables to Prisma schema
- Integrated logging into `evaluateVideo()` function with all 7 event types
- Created `createVideoAssessmentLogger()` factory for tracking events with automatic duration calculation
- API call tracking with prompt, response, timing, and error details
- All timestamps stored in UTC with millisecond precision
- 27 unit tests for the logging service
- 10 additional tests for video-evaluation logging integration
- RLS migration for admin-only access to log tables

**Files created:**
- `src/lib/assessment-logging.ts` - Logging service with logger factory and convenience functions
- `src/lib/assessment-logging.test.ts` - 27 unit tests for logging functionality
- `supabase/migrations/20260116_video_assessment_logs_rls.sql` - RLS policies for log tables

**Files changed:**
- `prisma/schema.prisma` - Added VideoAssessmentLog, VideoAssessmentApiCall models with relations to VideoAssessment
- `src/lib/video-evaluation.ts` - Integrated logging throughout evaluateVideo() function
- `src/lib/video-evaluation.test.ts` - Added 10 tests for logging behavior

**Event Types Logged:**
1. `STARTED` - Job begins, includes job_id in metadata
2. `PROMPT_SENT` - Prompt constructed, includes prompt_length in metadata
3. `RESPONSE_RECEIVED` - AI response received, includes response_length and status_code
4. `PARSING_STARTED` - JSON parsing begins
5. `PARSING_COMPLETED` - Parsing succeeds, includes parsed_dimension_count
6. `ERROR` - Any error with full message and stack trace
7. `COMPLETED` - Assessment finishes successfully

**Logger Factory Pattern:**
```typescript
const logger = createVideoAssessmentLogger(assessmentId);

// Logs event and auto-calculates duration from previous event
await logger.logEvent(AssessmentLogEventType.STARTED, { job_id });

// Track API calls with timing
const tracker = logger.startApiCall(prompt, modelVersion);
try {
  const response = await gemini.generateContent(...);
  await tracker.complete({ responseText, statusCode: 200 });
} catch (error) {
  await tracker.fail(error);
}
```

**Schema additions:**
```prisma
model VideoAssessmentLog {
  id                  String                  @id @default(cuid())
  videoAssessmentId   String
  eventType           AssessmentLogEventType
  timestamp           DateTime                @default(now())
  durationMs          Int?                    // Duration since previous event
  metadata            Json?                   // Additional context
  videoAssessment     VideoAssessment         @relation(...)
}

model VideoAssessmentApiCall {
  id                  String          @id @default(cuid())
  videoAssessmentId   String
  requestTimestamp    DateTime
  responseTimestamp   DateTime?
  durationMs          Int?
  promptText          String          @db.Text
  promptTokens        Int?
  responseText        String?         @db.Text
  responseTokens      Int?
  modelVersion        String
  statusCode          Int?
  errorMessage        String?         @db.Text
  stackTrace          String?         @db.Text
  videoAssessment     VideoAssessment @relation(...)
}
```

**Learnings:**
1. Use logger factory pattern to track state (lastEventTimestamp) across multiple log calls
2. Duration calculation: `durationMs = now.getTime() - previousTimestamp.getTime()` gives millisecond precision
3. API call tracking requires two-phase approach: create record on start, update on completion
4. Separate log tables for VideoAssessment vs Assessment keeps concerns isolated
5. Node.js crypto module is difficult to mock in vitest - use simple string concat for job IDs instead of randomUUID
6. ApiCallTracker pattern with `complete()` and `fail()` methods provides clean error handling
7. Always await logger calls to ensure ordering - don't fire-and-forget

**RLS Policy Pattern:**
```sql
-- Only admins can view logs
CREATE POLICY "admins_view_logs" ON "VideoAssessmentLog"
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM "User" WHERE id = auth.uid()::text AND role = 'ADMIN'));

-- Service role has full access for API operations
CREATE POLICY "service_role_full_access" ON "VideoAssessmentLog"
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

**Test Coverage:**
- 27 tests for assessment-logging.ts (logger factory, convenience functions, duration calculation, timestamp precision)
- 10 tests for video-evaluation logging (event order, metadata contents, error logging, API call tracking)
- Total: 35 tests for video-evaluation.ts including original tests

**Gotchas:**
- Existing AssessmentLog/AssessmentApiCall tables are for work simulation (Assessment model), not video evaluation (VideoAssessment model)
- Need separate VideoAssessmentLog/VideoAssessmentApiCall tables with their own relations
- Vitest has trouble mocking Node.js built-in modules like crypto - use alternatives
- RLS policies must be run manually on Supabase after schema push
- First event in a sequence has null durationMs since there's no previous event

---

## Issue #63: US-001: Trigger Assessment on Simulation Completion

**What was implemented:**
- Added `assessmentId` optional field to `VideoAssessment` model linking it to work simulation `Assessment`
- Created `triggerVideoAssessment()` function that creates VideoAssessment records and starts evaluation asynchronously
- Created `getVideoAssessmentStatusByAssessment()` function to check video assessment status by simulation assessment ID
- Created `retryVideoAssessment()` function to manually retry failed video assessments
- Modified `/api/assessment/finalize` to automatically trigger video assessment when simulation completes
- Added admin-only `/api/admin/video-assessment/retry` endpoint (GET lists failed, POST retries one)
- Updated processing page to display video assessment status (PENDING, PROCESSING, COMPLETED, FAILED)
- Added 22 new tests for video-evaluation functions
- Added 8 tests for the admin retry endpoint
- Added 3 tests for video assessment trigger in finalize route

**Files created:**
- `src/app/api/admin/video-assessment/retry/route.ts` - Admin retry endpoint
- `src/app/api/admin/video-assessment/retry/route.test.ts` - 8 tests

**Files changed:**
- `prisma/schema.prisma` - Added `assessmentId` field to VideoAssessment, added relation to Assessment model
- `src/lib/video-evaluation.ts` - Added triggerVideoAssessment, getVideoAssessmentStatusByAssessment, retryVideoAssessment
- `src/lib/video-evaluation.test.ts` - Added 22 tests for new functions
- `src/app/api/assessment/finalize/route.ts` - Added video assessment trigger logic
- `src/app/api/assessment/finalize/route.test.ts` - Added 3 tests, updated mocks
- `src/app/assessment/[id]/processing/page.tsx` - Added videoAssessment to ProcessingStats, fetch from database
- `src/app/assessment/[id]/processing/client.tsx` - Display video assessment status with appropriate icons

**VideoAssessment Status Flow:**
```
Simulation Completes (FINAL_DEFENSE → COMPLETED)
  ↓
triggerVideoAssessment() called
  ↓
VideoAssessment created (status: PENDING)
  ↓
evaluateVideo() runs asynchronously (status: PROCESSING)
  ↓
On success: status → COMPLETED
On failure: status → FAILED (can be retried via admin endpoint)
```

**Processing Page Status Display:**
- PENDING: "Video assessment queued" (gray Video icon)
- PROCESSING: "Video assessment in progress" (gold Video + spinning Loader icon)
- COMPLETED: "Video assessment complete" (green CheckCircle icon)
- FAILED: "Video assessment failed - will be retried" (red AlertCircle icon)

**Learnings:**
1. Fire-and-forget pattern: `.catch()` on async function prevents unhandled rejection while allowing non-blocking execution
2. Unique constraint on `assessmentId` ensures one-to-one mapping between Assessment and VideoAssessment
3. Using `@unique` on optional relation field allows `findUnique({ where: { assessmentId } })` lookups
4. TriggerVideoAssessmentResult type should be exported for proper typing in consuming code
5. Admin retry endpoint provides diagnostic GET (lists failed) and action POST (retries one)
6. Status display with icons provides clear visual feedback during processing phase
7. Graceful degradation: finalize route succeeds even if video assessment trigger fails

**Schema Pattern (one-to-one optional relation):**
```prisma
model VideoAssessment {
  assessmentId  String?               @unique
  assessment    Assessment?           @relation(fields: [assessmentId], references: [id], onDelete: SetNull)
}

model Assessment {
  videoAssessment VideoAssessment?
}
```

**Test Coverage:**
- 68 total tests for modified files (46 video-evaluation + 14 finalize + 8 admin retry)
- All acceptance criteria verified

**Gotchas:**
- Import type with `import type { X }` when only using for type annotations
- Need both `success: boolean` and `error?: string` in result type for proper error reporting
- Processing page Prisma query needs `include: { videoAssessment: { select: {...} } }` for nested relation
- Lucide icons: Video, Loader2, CheckCircle2, AlertCircle for status display

---

## Issue #64: US-015: Handle Assessment Failures Gracefully

**What was implemented:**
- Added `retryCount` and `lastFailureReason` fields to VideoAssessment model for tracking failures
- Updated `evaluateVideo()` to increment retry count and store failure reason on each failure
- Assessment marked as permanently FAILED after 3 total retry attempts
- Console alerts logged when assessment fails (for MVP notification)
- Added "Assessment unavailable" message display on candidate profile page for failed video assessments
- Created `forceRetryVideoAssessment()` function for admin manual reassessment (resets retry count)
- Updated admin retry endpoint to support `force` parameter for bypassing the 3-retry limit
- Added 8 new tests (3 for forceRetryVideoAssessment, 1 for force retry endpoint, 4 for updated retry behavior)

**Files changed:**
- `prisma/schema.prisma` - Added `retryCount Int @default(0)` and `lastFailureReason String? @db.Text` to VideoAssessment model
- `src/lib/video-evaluation.ts` - Updated error handling in `evaluateVideo()`, added `forceRetryVideoAssessment()`, updated `retryVideoAssessment()` to check retry limit
- `src/lib/video-evaluation.test.ts` - Added tests for retry tracking and forceRetryVideoAssessment
- `src/app/profile/page.tsx` - Added "Assessment unavailable" message display for failed video assessments
- `src/app/api/admin/video-assessment/retry/route.ts` - Added `force` parameter support and imported `forceRetryVideoAssessment`
- `src/app/api/admin/video-assessment/retry/route.test.ts` - Added test for force retry

**Failure Tracking Flow:**
```
evaluateVideo() fails
  ↓
Get current retryCount from database
  ↓
Increment retryCount (newRetryCount = currentRetryCount + 1)
  ↓
Update: status=FAILED, retryCount=newRetryCount, lastFailureReason=errorMessage
  ↓
Console alert: "[ASSESSMENT FAILURE ALERT] Video assessment {id} failed (attempt {n}/3)"
  ↓
If retryCount >= 3: "[ASSESSMENT FAILURE ALERT] ... has failed 3 times and will not be automatically retried"
```

**Admin Retry Options:**
1. **Normal retry** (`POST /api/admin/video-assessment/retry` with `videoAssessmentId`): Only works if retryCount < 3
2. **Force retry** (`POST /api/admin/video-assessment/retry` with `videoAssessmentId` and `force: true`): Resets retryCount to 0 and restarts evaluation

**Profile Page Display:**
```tsx
{assessment.videoAssessment?.status === "FAILED" && (
  <div className="bg-red-50 border-2 border-red-200 dark:bg-red-950 dark:border-red-800">
    <AlertTriangle className="text-red-600" />
    <p>Assessment unavailable</p>
    <p>Video assessment could not be processed after {retryCount} attempts.</p>
    <p>Reason: {lastFailureReason}</p>
  </div>
)}
```

**Learnings:**
1. Track failures at the assessment level (retryCount) not the individual API call level - each `evaluateVideo()` call includes internal retries via `withRetry()`
2. Use `forceRetryVideoAssessment()` pattern for admin override that resets state completely
3. Console alerts serve as MVP notification - can be replaced with proper alerting system (PagerDuty, Slack) later
4. Neo-brutalist error display: red background tint, red border, AlertTriangle icon, monospace for technical details
5. VideoAssessment query needs to include `retryCount` and `lastFailureReason` for display
6. TypeScript Prisma client regeneration required after schema changes (`npx prisma generate`)

**Test Coverage:**
- 59 total tests in video-evaluation.test.ts and admin retry route tests
- All acceptance criteria verified with browser validation screenshot

**Gotchas:**
- Must run `npx prisma generate` after adding fields to schema before TypeScript will recognize them
- The `retryCount` starts at 0 and gets incremented to 1 on first failure (so "after 3 attempts" means retryCount === 3)
- Profile page needs to import VideoAssessmentStatus type from Prisma for proper typing
- AlertTriangle icon from lucide-react provides the warning indicator
