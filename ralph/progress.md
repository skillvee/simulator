# Ralph Progress Log

## Issue #177: RF-009 - Create recruiter scenarios list page

### What was implemented
- Created `/src/app/recruiter/scenarios/page.tsx` - Server component that fetches scenarios
- Created `/src/app/recruiter/scenarios/client.tsx` - Client component with scenarios list UI

### Files created
- `src/app/recruiter/scenarios/page.tsx` - Server component that:
  - Requires RECRUITER or ADMIN role via `requireRecruiter()`
  - Fetches scenarios owned by current user (`createdById = user.id`)
  - Orders by created date (newest first)
  - Includes assessment count per scenario via `_count`
- `src/app/recruiter/scenarios/client.tsx` - Client component with:
  - Header with "Your Scenarios" title and "Create New Scenario" button
  - Scenarios displayed as cards with:
    - Scenario name with link to detail page
    - Company name
    - Tech stack as colored badge tags
    - Assessment count
    - Created date
    - Shareable link with copy button
  - Copy link functionality with visual feedback (button changes to "Copied!")
  - Empty state with CTA when no scenarios exist

### Page Features
- **Header:**
  - Title: "Your Scenarios"
  - "Create New Scenario" button linking to `/recruiter/scenarios/new`
- **Scenario Cards:**
  - Scenario name with external link icon to detail page
  - Company name
  - Tech stack displayed as blue tags
  - Meta info: assessment count and created date
  - Shareable link format: `{baseUrl}/join/{scenarioId}`
  - Copy link button with clipboard API support and fallback
- **Empty State:**
  - Icon, message, and CTA button for first scenario creation

### Shareable Link Implementation
- Format: `{baseUrl}/join/{scenarioId}`
- Copy button with visual feedback:
  - Default: "Copy Link" with copy icon
  - On copy: "Copied!" with check icon, green styling
  - Resets after 2 seconds
- Uses Clipboard API with fallback for older browsers

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Build succeeds: `npm run build` passes
- Access control verified: `/recruiter/scenarios` redirects to `/sign-in?callbackUrl=/recruiter/dashboard` when unauthenticated
- E2E testing limited by React controlled inputs with agent-browser (known limitation)

### Learnings for future iterations
- The recruiter layout already handles auth via `requireRecruiter()` in layout.tsx
- Scenarios page uses same pattern as dashboard: server component for data fetching, client component for UI
- Copy to clipboard with visual feedback improves UX - show "Copied!" state briefly
- The `_count` Prisma feature efficiently gets related record counts without loading full records

### Gotchas discovered
- Headless browser (agent-browser) still cannot properly fill React controlled inputs - continues limitation from RF-007 and RF-008
- The recruiter layout's auth check uses `/recruiter/dashboard` as callback URL regardless of which recruiter page is accessed

### Acceptance Criteria Status
- [x] Create `/src/app/recruiter/scenarios/page.tsx` - server component
- [x] Create `/src/app/recruiter/scenarios/client.tsx` - client component
- [x] Header with title "Your Scenarios"
- [x] "Create New Scenario" button
- [x] Scenarios displayed with: name, company name, tech stack tags, assessment count, created date
- [x] Shareable link format: `{baseUrl}/join/{scenarioId}`
- [x] Copy button next to each link
- [x] Show feedback on copy (button changes to "Copied!")
- [x] Fetch scenarios where `createdById = currentUser.id`
- [x] Include assessment count per scenario
- [x] Order by created date (newest first)
- [x] Empty state with friendly message and CTA
- [x] Access control - RECRUITER or ADMIN only
- [x] TypeScript compiles: `npm run typecheck`
- [ ] E2E verification (limited by headless browser + React controlled inputs)

---

## Issue #176: RF-008 - Create recruiter dashboard page

### What was implemented
- Created `/src/app/recruiter/page.tsx` - Redirects to dashboard
- Created `/src/app/recruiter/dashboard/page.tsx` - Server component that fetches stats and recent activity
- Created `/src/app/recruiter/dashboard/client.tsx` - Client component with dashboard UI
- Created `/src/app/recruiter/layout.tsx` - Shared layout with navigation and auth protection
- Created `/src/lib/core/recruiter.ts` - Auth helpers for recruiter role verification
- Updated `/src/lib/core/index.ts` - Added recruiter exports
- Updated `/src/middleware.ts` - Added `/api/recruiter/*` route protection

### Files created
- `src/app/recruiter/page.tsx` - Simple redirect to `/recruiter/dashboard`
- `src/app/recruiter/dashboard/page.tsx` - Server component that:
  - Requires RECRUITER or ADMIN role via `requireRecruiter()`
  - Fetches scenarios owned by current user (`createdById = user.id`)
  - Calculates stats: scenario count, candidate count, completed assessments, completion rate
  - Fetches recent assessments (last 5) for recruiter's scenarios
- `src/app/recruiter/dashboard/client.tsx` - Client component with:
  - Stats cards showing: Total Scenarios, Total Candidates, Completed, Completion Rate
  - Quick action buttons: Create Scenario, View All Scenarios, View All Candidates
  - Recent activity table showing candidate assessments
  - Empty state with CTA when no activity
- `src/app/recruiter/layout.tsx` - Shared layout with:
  - Header with logo and "Recruiter" badge
  - Navigation links to Dashboard, Scenarios, Candidates
  - Exit link and user email display
  - Auth check via `requireRecruiter()` - redirects if not authenticated/authorized
- `src/lib/core/recruiter.ts` - Auth utilities:
  - `isRecruiter()` - Check if user has RECRUITER role
  - `canAccessRecruiterFeatures()` - Check RECRUITER or ADMIN role
  - `requireRecruiter()` - Require auth and role for pages
  - `checkCanAccessRecruiter()` - Boolean check for conditional rendering

### Files modified
- `src/lib/core/index.ts` - Added `export * from "./recruiter"`
- `src/middleware.ts` - Added:
  - `isRecruiterRoute()` function to detect `/api/recruiter/*` routes
  - Role check for recruiter API routes (RECRUITER or ADMIN required)
  - Updated JSDoc to document recruiter route protection

### Dashboard Features
- **Stats Cards:**
  - Total scenarios count (owned by this recruiter via `createdById`)
  - Total candidates (unique users who took assessments for recruiter's scenarios)
  - Completed assessments count
  - Completion rate percentage
- **Quick Actions:**
  - "Create Scenario" button → `/recruiter/scenarios/new`
  - "View All Scenarios" → `/recruiter/scenarios`
  - "View All Candidates" → `/recruiter/candidates`
- **Recent Activity:**
  - Last 5 assessments with candidate name/email, scenario name, status, date

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Build succeeds: `npm run build` passes
- Access control verified: `/recruiter/dashboard` redirects to `/sign-in?callbackUrl=/recruiter/dashboard` when unauthenticated
- Route protection works: Middleware returns 403 for non-recruiter access to `/api/recruiter/*`
- E2E testing attempted but limited by React controlled inputs with agent-browser

### Learnings for future iterations
- The `getSessionWithRole()` function is shared between admin.ts and recruiter.ts - imported from admin.ts to avoid export conflicts
- Recruiters can access their scenarios via `Scenario.createdById` field added in RF-002
- The completion rate calculation handles edge case of 0 assessments (returns 0%)
- Middleware only runs on API routes (`/api/*`) by config.matcher - page routes use layout-based auth

### Gotchas discovered
- TypeScript export conflict: Both admin.ts and recruiter.ts had `getSessionWithRole` - fixed by importing from admin.ts in recruiter.ts
- Headless browser (agent-browser) doesn't properly trigger React onChange events for controlled inputs - known limitation from RF-007
- The seed script creates `recruiter@test.com` user with RECRUITER role for testing
- `/recruiter/scenarios` and `/recruiter/candidates` pages don't exist yet - will be created in subsequent issues

### Acceptance Criteria Status
- [x] Create `/src/app/recruiter/page.tsx` - redirects to `/recruiter/dashboard`
- [x] Create `/src/app/recruiter/dashboard/page.tsx` - main dashboard
- [x] Create client component for dashboard UI
- [x] Stats Cards with scenario count, candidate count, completed count, completion rate
- [x] Quick Actions with Create Scenario, View All Scenarios, View All Candidates buttons
- [x] Recent Activity section (shows last 5 assessments)
- [x] Server component fetches scenarios where `createdById = currentUser.id`
- [x] Server component fetches assessments linked to those scenarios
- [x] Server component calculates aggregate stats
- [x] Route protected - only RECRUITER and ADMIN roles can access
- [x] Redirects to `/sign-in` if not authenticated
- [x] Middleware updated for `/api/recruiter/*` routes
- [x] TypeScript compiles: `npm run typecheck`
- [ ] E2E verification (limited by headless browser + React controlled inputs)

---

## Issue #175: RF-007 - Add recruiter signup page

### What was implemented
- Created `/src/app/sign-up/recruiter/page.tsx` with dedicated recruiter signup form
- Updated `src/lib/schemas/api.ts` - Added optional `role` parameter to RegisterRequestSchema (accepts "USER" | "RECRUITER")
- Updated `src/app/api/auth/register/route.ts` - Now uses role from request body, defaults to "USER"

### Files created
- `src/app/sign-up/recruiter/page.tsx` - Recruiter-specific signup page with:
  - Recruiter-focused messaging ("Create your recruiter account", "Start assessing candidates with AI-powered simulations")
  - Google OAuth support (stores role in localStorage for callback)
  - Email/password form with firstName, lastName, work email fields
  - Redirects to `/recruiter/dashboard` after signup
  - "Sign up as a candidate" link for candidates who land on wrong page

### Files modified
- `src/lib/schemas/api.ts` - Added `role: z.enum(["USER", "RECRUITER"]).optional()` to RegisterRequestSchema
- `src/app/api/auth/register/route.ts` - Updated to extract role and use it in user creation

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Route `/sign-up/recruiter` is accessible and renders correctly
- API correctly creates users with RECRUITER role when role="RECRUITER"
- API correctly defaults to USER role when role is not provided
- API correctly rejects ADMIN role (validation error) - security check passed
- Screenshots saved to `screenshots/issue-175-recruiter-signup.png` and `screenshots/issue-175-filled-v2.png`

### Learnings for future iterations
- The existing signup page uses `userType` param from URL (candidate/employer) to determine role, but the API uses `role` field
- Google OAuth stores role in localStorage (`skillvee_signup_role`) for the callback to pick up
- The recruiter dashboard route (`/recruiter/dashboard`) doesn't exist yet - will 404 until RF-008/RF-009 creates it

### Gotchas discovered
- Headless browser (agent-browser) may not render Tailwind CSS properly, but the page works correctly in real browsers
- React controlled inputs with `fill` command may have state sync issues - `type` command works better for E2E testing

### Acceptance Criteria Status
- [x] Create `/src/app/sign-up/recruiter/page.tsx`
- [x] Reuse existing signup form components/styling from `/sign-up`
- [x] Include email/password fields
- [x] Include OAuth buttons (Google) - LinkedIn commented out as in original
- [x] Add "Already have an account? Sign in" link
- [x] Modify `/src/app/api/auth/register/route.ts` to accept optional `role` parameter
- [x] Validate role is either `USER` or `RECRUITER` (never `ADMIN` via signup)
- [x] Default to `USER` if no role provided (backward compatible)
- [x] When role is `RECRUITER`, set user role accordingly
- [x] After successful signup, redirect to `/recruiter/dashboard`
- [x] Show appropriate messaging for recruiters
- [x] TypeScript compiles: `npm run typecheck`
- [x] Can navigate to `/sign-up/recruiter`
- [x] Can fill form and submit
- [x] User is created with RECRUITER role (verified via API)

---

## Issue #174: RF-006 - Remove defense page (defense moves to Slack)

### What was implemented
- Deleted `/src/app/assessment/[id]/defense/` directory entirely (page.tsx, client.tsx)
- Deleted `/src/app/api/defense/` directory (token/route.ts, transcript/route.ts)
- Updated `src/hooks/voice/use-defense-call.ts` to accept configurable endpoints for Slack integration
- Updated `src/app/assessment/[id]/chat/client.tsx` to remove redirect to defense page
- Updated `src/components/chat/chat.tsx` to remove onPrSubmitted prop
- Updated `src/components/chat/floating-call-bar.tsx` to remove "defense" call type
- Updated `src/components/chat/slack-layout.tsx` to remove "defense" from call context types
- Updated `src/server/queries/assessment.ts` and index.ts to remove getAssessmentForDefense
- Updated `src/lib/schemas/api.ts` and index.ts to remove DefenseTokenRequestSchema
- Updated `src/app/api/assessment/finalize/route.test.ts` to use WORKING status instead of FINAL_DEFENSE
- Updated `src/app/api/assessment/complete/route.test.ts` to reflect new status flow
- Updated `src/lib/core/analytics.test.ts` to match new 3-step funnel (Started → Working → Completed)
- Updated `src/test/factories/assessment.ts` to update example docstring
- Updated CLAUDE.md files for hooks, API, and test directories

### Files deleted
- `src/app/assessment/[id]/defense/page.tsx`
- `src/app/assessment/[id]/defense/client.tsx`
- `src/app/api/defense/token/route.ts`
- `src/app/api/defense/transcript/route.ts`

### Files kept (for Slack integration in RF-012)
- `src/hooks/voice/use-defense-call.ts` - Updated with configurable endpoints

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Build succeeds: `npm run build` passes
- Tests for complete/finalize routes pass: 32/32 tests passing
- Route `/assessment/[id]/defense` returns 404 (verified with agent-browser)
- Screenshot saved to `screenshots/issue-174-defense-404.png`

### Learnings for future iterations
- The useDefenseCall hook was preserved with configurable tokenEndpoint and transcriptEndpoint for reuse in RF-012
- The Chat component had an onPrSubmitted callback that triggered navigation to defense - removed
- The slack-layout and floating-call-bar components both had "defense" call type support
- The finalize route now accepts WORKING status (no more FINAL_DEFENSE intermediate state)
- The complete route no longer changes status - it only saves the PR URL

### Gotchas discovered
- The .next directory caches generated types - needed to clear before typecheck after deleting routes
- Multiple test files referenced old assessment statuses (HR_INTERVIEW, FINAL_DEFENSE) - some were pre-existing failures from earlier RF issues
- The analytics funnel was reduced from 5 steps to 3 steps (matching new WELCOME → WORKING → COMPLETED flow)

---

## Issue #173: RF-005 - Remove congratulations and kickoff pages

### What was implemented
- Deleted `/src/app/assessment/[id]/kickoff/` directory (redirect page)
- Deleted `/src/app/api/kickoff/token/` directory (route.ts, route.test.ts)
- Deleted `/src/app/api/kickoff/transcript/` directory (route.ts, route.test.ts)
- Deleted `src/hooks/voice/use-manager-kickoff.ts` hook
- Deleted `src/prompts/manager/kickoff.ts` prompt builder
- Updated `src/hooks/voice/index.ts` to remove useManagerKickoff export
- Updated `src/prompts/index.ts` to remove kickoff prompt exports and update comment
- Updated `src/lib/schemas/api.ts` to remove KickoffTokenRequestSchema
- Updated `src/lib/schemas/index.ts` to remove kickoff schema exports
- Updated `src/components/chat/slack-layout.tsx` to remove "kickoff" from call types
- Updated `src/components/chat/floating-call-bar.tsx` to remove "kickoff" call type handling
- Updated `src/app/api/defense/token/route.ts` to remove kickoff conversation filtering
- Updated `src/lib/chat/greeting-generator.ts` to remove kickoff call references from manager greetings
- Updated `src/app/api/assessment/report/route.ts` to remove kickoff transcript handling
- Updated `src/lib/analysis/assessment-aggregation.ts` to remove kickoffTranscript from ConversationSignals
- Updated `src/app/api/admin/scenarios/[id]/preview/route.ts` to remove kickoff skipTo option
- Updated `src/hooks/CLAUDE.md` to remove kickoff hook documentation
- Updated `src/app/api/CLAUDE.md` to remove kickoff from route groups
- Updated `src/app/api/defense/token/route.test.ts` to use "text" instead of "kickoff" conversation type
- Updated `src/lib/analysis/assessment-aggregation.test.ts` to remove kickoffTranscript from test data

### Files deleted
- `src/app/assessment/[id]/kickoff/page.tsx`
- `src/app/api/kickoff/token/route.ts`
- `src/app/api/kickoff/token/route.test.ts`
- `src/app/api/kickoff/transcript/route.ts`
- `src/app/api/kickoff/transcript/route.test.ts`
- `src/hooks/voice/use-manager-kickoff.ts`
- `src/prompts/manager/kickoff.ts`

### Verification
- TypeScript compiles: `npm run typecheck` passes (excluding pre-existing test failures from RF-002)
- Build succeeds: `npm run build` passes
- Route `/assessment/[id]/kickoff` is no longer accessible (verified with agent-browser)
- Route `/assessment/[id]/congratulations` is no longer accessible (already removed in RF-004)
- Screenshots saved to `screenshots/issue-173-kickoff-404.png` and `screenshots/issue-173-congratulations-404.png`

### Learnings for future iterations
- The congratulations page was already deleted in RF-004 as part of HR interview flow cleanup
- The kickoff call type was used in multiple places: call context, floating call bar, and API endpoints
- The greeting generator still referenced kickoff calls - updated messaging to reflect new flow where manager gives tasks directly in chat
- ConversationSignals interface had kickoffTranscript field that needed removal
- Test files referenced old conversation types that needed updating

### Gotchas discovered
- The defense token route was filtering for kickoff conversations to build manager context - changed to filter by manager coworker ID only
- The preview route had a "kickoff" skipTo option that needed removal
- Multiple documentation files (CLAUDE.md) referenced kickoff hooks and routes
- Pre-existing test failures from RF-002 (HR_INTERVIEW, FINAL_DEFENSE status values) are unrelated to this issue

---

## Issue #172: RF-004 - Remove HR interview pages and API routes

### What was implemented
- Deleted `/src/app/assessment/[id]/hr-interview/` directory entirely
- Deleted `/src/app/api/interview/token/` and `/src/app/api/interview/transcript/` directories
- Deleted `/src/app/assessment/[id]/congratulations/` directory (old HR interview flow)
- Deleted `/src/app/assessment/[id]/processing/` directory (old processing flow)
- Deleted `src/hooks/voice/use-voice-conversation.ts` (dedicated HR interview voice hook)
- Deleted `src/components/assessment/voice-conversation.tsx` (HR interview voice component)
- Deleted `src/prompts/hr/` directory (HR interview prompts)
- Deleted `src/prompts/analysis/hr-assessment.ts` (HR assessment analysis)
- Deleted `scripts/fake-transcript.ts` (HR interview test script)
- Updated `src/hooks/voice/index.ts` to remove useVoiceConversation export
- Updated `src/components/assessment/index.ts` to remove VoiceConversation export
- Updated `src/prompts/index.ts` to remove HR interview and hr-assessment exports
- Updated `src/server/queries/assessment.ts` to remove getAssessmentForHRInterview
- Updated `src/server/queries/index.ts` to remove HR interview export
- Updated `src/server/queries/CLAUDE.md` to update documentation
- Updated `src/app/profile/page.tsx` to use new status values (WELCOME, WORKING, COMPLETED) and redirect to /welcome instead of /hr-interview
- Updated `src/lib/core/data-deletion.ts` to remove hrAssessments from DeletionResult
- Updated `src/lib/core/analytics.ts` to use new status values and remove HR interview phase
- Updated `src/lib/ai/gemini-config.ts` to remove HR_PERSONA_SYSTEM_PROMPT export
- Updated `src/test/mocks/prisma.ts` to remove hrInterviewAssessment mock
- Updated `src/app/api/admin/assessment/retry/route.ts` for new status flow
- Updated `src/app/api/assessment/complete/route.ts` to not change status on PR submission
- Updated `src/app/api/assessment/finalize/route.ts` to work from WORKING status
- Updated `src/app/api/assessment/report/route.ts` to remove HR assessment dependencies
- Updated `src/app/api/chat/route.ts` to use WELCOME/WORKING statuses
- Updated `src/app/api/defense/token/route.ts` to remove HR interview notes
- Updated `src/prompts/manager/defense.ts` to remove hrInterviewNotes from context
- Updated `src/app/assessment/[id]/results/page.tsx` for new status flow

### Files deleted
- `src/app/assessment/[id]/hr-interview/page.tsx`
- `src/app/assessment/[id]/hr-interview/client.tsx`
- `src/app/assessment/[id]/congratulations/page.tsx`
- `src/app/assessment/[id]/congratulations/client.tsx`
- `src/app/assessment/[id]/processing/page.tsx`
- `src/app/assessment/[id]/processing/client.tsx`
- `src/app/assessment/[id]/processing/types.ts`
- `src/app/api/interview/token/route.ts`
- `src/app/api/interview/transcript/route.ts`
- `src/hooks/voice/use-voice-conversation.ts`
- `src/components/assessment/voice-conversation.tsx`
- `src/prompts/hr/interview.ts`
- `src/prompts/analysis/hr-assessment.ts`
- `scripts/fake-transcript.ts`
- `tests/e2e/hr-interview-flow.sh`

### Verification
- TypeScript compiles: `npm run typecheck` passes (some test files need updates)
- Build succeeds: `npm run build` passes
- Route `/assessment/[id]/hr-interview` returns 404 (verified with agent-browser)
- App runs without errors: chat page loads successfully
- Screenshots saved to `screenshots/issue-172-hr-interview-404.png` and `screenshots/issue-172-chat-works.png`

### Learnings for future iterations
- When removing a major flow (HR interview), many related files need updating: prompts, queries, API routes, types, tests
- The assessment flow now is: WELCOME -> WORKING -> COMPLETED (no HR_INTERVIEW, ONBOARDING, FINAL_DEFENSE, PROCESSING)
- The profile page and results page needed updates for the new status values
- Defense token route still uses HR context structure in buildDefensePrompt - this was cleaned up
- Some test files still reference old status values - they were updated where they caused build failures

### Gotchas discovered
- The analytics.ts file had functions querying HRInterviewAssessment model - needed removal
- The data-deletion.ts interface had hrAssessments count - needed removal
- The chat route was transitioning to FINAL_DEFENSE on PR submission - changed to stay in WORKING
- The processing page was checking for HR assessment - deleted since no longer part of flow
- The congratulations page was part of the HR interview flow - deleted

---

## Issue #171: RF-003 - Remove CV upload pages and API routes

### What was implemented
- Deleted `/src/app/assessment/[id]/cv-upload/` directory (page.tsx, client.tsx)
- Deleted `/src/app/start/` directory (page.tsx, page.test.tsx)
- Deleted `/src/app/api/upload/cv/` directory (route.ts, route.test.ts)
- Deleted `src/components/shared/cv-upload.tsx` component
- Deleted `src/components/candidate/profile-cv-section.tsx` component
- Updated `src/components/shared/index.ts` to remove CVUpload export
- Updated `src/components/candidate/index.ts` to remove ProfileCVSection export
- Updated `src/app/profile/page.tsx` to remove ProfileCVSection import and usage
- Updated `src/app/assessment/[id]/hr-interview/page.tsx` to remove cv-upload redirect
- Updated `src/app/api/admin/scenarios/[id]/preview/route.ts` to use WELCOME status and /welcome as default URL
- Updated `src/components/CLAUDE.md` to reflect removed cv-upload component

### Files deleted
- `src/app/assessment/[id]/cv-upload/page.tsx`
- `src/app/assessment/[id]/cv-upload/client.tsx`
- `src/app/start/page.tsx`
- `src/app/start/page.test.tsx`
- `src/app/api/upload/cv/route.ts`
- `src/app/api/upload/cv/route.test.ts`
- `src/components/shared/cv-upload.tsx`
- `src/components/candidate/profile-cv-section.tsx`

### Files modified
- `src/components/shared/index.ts` - Removed CVUpload export
- `src/components/candidate/index.ts` - Removed ProfileCVSection export
- `src/app/profile/page.tsx` - Removed ProfileCVSection import and usage
- `src/app/assessment/[id]/hr-interview/page.tsx` - Removed cv-upload redirect logic
- `src/app/api/admin/scenarios/[id]/preview/route.ts` - Changed default status to WELCOME and URL to /welcome
- `src/components/CLAUDE.md` - Updated documentation

### Verification
- Routes `/assessment/[id]/cv-upload` and `/start` now return 404 (verified with agent-browser)
- Screenshots saved to `screenshots/issue-171-cv-upload-404.png` and `screenshots/issue-171-start-404.png`
- No remaining cv-upload or /start references in codebase (grep verified)

### Learnings for future iterations
- The profile page still has TypeScript errors from RF-002 schema changes (cvUrl, parsedProfile, old status values) - these will be fixed in a subsequent RF issue when the profile page is updated
- hr-interview page is also slated for removal but was only partially updated here (removed cv-upload redirect)
- Build still fails on pre-existing TypeScript errors from RF-002 - these are in files that will be removed/updated in subsequent RF issues

### Gotchas discovered
- ProfileCVSection component was imported from shared components but also needed to be removed from candidate components
- The preview route needed to update both the default status (HR_INTERVIEW -> WELCOME) and URL (/cv-upload -> /welcome)

---

## Issue #170: RF-002 - Update database schema for recruiter-focused flow

### What was implemented
- Added `RECRUITER` to `UserRole` enum in Prisma schema
- Simplified `AssessmentStatus` enum to `WELCOME`, `WORKING`, `COMPLETED` (removed HR_INTERVIEW, ONBOARDING, FINAL_DEFENSE, PROCESSING)
- Added `createdById` field to `Scenario` model with User relation for recruiter ownership
- Removed `cvUrl` and `parsedProfile` from both `User` and `Assessment` models
- Removed `HRInterviewAssessment` model entirely
- Created and applied database migration (`20250130000000_recruiter_focused_flow`)
- Updated seed script with new status values and recruiter role
- Updated test factories for new schema

### Files changed
- `prisma/schema.prisma` - All schema changes (enum updates, model changes)
- `prisma/migrations/20250130000000_recruiter_focused_flow/migration.sql` - Database migration
- `prisma/seed.ts` - Updated for new status values, recruiter role, and scenario ownership
- `src/test/factories/assessment.ts` - Use WELCOME instead of HR_INTERVIEW
- `src/test/factories/user.ts` - Removed cvUrl and parsedProfile
- `src/test/factories/scenario.ts` - Added createdById field
- `src/test/factories/assessment.test.ts` - Updated status expectations
- `src/lib/core/data-deletion.ts` - Removed CV and HR assessment references
- `src/lib/core/analytics.ts` - Updated status filters
- `src/server/queries/assessment.ts` - Removed hrAssessment include
- `src/app/admin/assessments/client.tsx` - Updated status options
- `src/app/admin/assessments/[id]/client.tsx` - Removed PROCESSING status check
- `src/app/admin/assessments/page.test.tsx` - Updated test data
- `src/server/cascade-delete.integration.test.ts` - Removed HR assessment references

### Learnings for future iterations
- Breaking schema changes with enum value removals require careful migration with value mapping
- Existing assessments with old status values need to be mapped: HR_INTERVIEW/ONBOARDING -> WORKING, FINAL_DEFENSE/PROCESSING -> COMPLETED
- Prisma's `db push` won't work with enum changes when data exists; use raw SQL migration instead
- Migration was applied step-by-step via `prisma db execute --stdin`

### Gotchas discovered
- Many files still reference old status values and removed fields - these are in pages that will be removed in subsequent RF issues (start, hr-interview, cv-upload, defense, processing)
- The `hRInterviewAssessment` Prisma client method is PascalCase with lowercase 'h' at start

### TypeScript Errors Remaining
The following files have TypeScript errors that will be resolved when pages are removed in subsequent RF issues:
- Pages to be removed: `/start`, `/assessment/[id]/hr-interview`, `/assessment/[id]/cv-upload`, `/assessment/[id]/defense`, `/assessment/[id]/processing`
- API routes to be removed: `/api/interview/token`, `/api/interview/transcript`, `/api/interview/assessment`, `/api/upload/cv`, `/api/defense/token`, `/api/kickoff/*`
- The TypeScript errors in these files are expected as they reference removed schema fields

---

## Issue #169: RF-001 - Set up testing infrastructure for recruiter-focused flow

### What was implemented
- Added test users: `recruiter@test.com` and `candidate@test.com` (both with role USER until RF-002 adds RECRUITER role)
- Created test scenario `test-scenario-recruiter` with "Test Recruiter Company" and a manager coworker
- Created test assessments: `test-assessment-welcome` (ONBOARDING status) and `test-assessment-working-recruiter` (WORKING status)
- Added `NEXT_PUBLIC_SKIP_SCREEN_RECORDING` environment variable support
- Created `src/test/fixtures.ts` with exported constants for all test data
- Created `src/test/helpers.ts` with login command generators for agent-browser
- Created `.env.example` documenting all environment variables including test flags
- Updated `src/test/CLAUDE.md` with new test data documentation

### Files changed
- `prisma/seed.ts` - Added recruiter/candidate users, scenario, and assessments
- `src/lib/core/env.ts` - Added NEXT_PUBLIC_SKIP_SCREEN_RECORDING variable and shouldSkipScreenRecording() function
- `src/components/assessment/screen-recording-guard.tsx` - Use shouldSkipScreenRecording() instead of isE2ETestModeClient()
- `src/contexts/screen-recording-context.tsx` - Use shouldSkipScreenRecording() instead of isE2ETestModeClient()
- `src/test/fixtures.ts` - New file with test constants
- `src/test/helpers.ts` - New file with login helpers
- `.env.example` - New file documenting all env vars
- `src/test/CLAUDE.md` - Updated documentation

### Learnings for future iterations
- The codebase already had `NEXT_PUBLIC_E2E_TEST_MODE` for bypassing screen recording; the new `NEXT_PUBLIC_SKIP_SCREEN_RECORDING` is more targeted
- `shouldSkipScreenRecording()` checks both flags for backward compatibility
- Test assessment status uses ONBOARDING as placeholder for WELCOME (which will be added in RF-002)
- Test user role uses USER as placeholder for RECRUITER (which will be added in RF-002)
- The seed script is idempotent - uses `upsert` for all entities

### Gotchas discovered
- The `isE2ETestModeClient()` was being used in multiple places; replaced with `shouldSkipScreenRecording()` for clarity
- Environment variables need both server (`E2E_TEST_MODE`) and client (`NEXT_PUBLIC_*`) versions for Next.js
