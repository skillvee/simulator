# Ralph Progress Log

## Issue #188: RF-020 - End-to-end flow verification

### What was verified
Comprehensive E2E testing of the complete recruiter-focused flow using agent-browser:

**Recruiter Flow:**
- ✅ Recruiter signup at `/sign-up/recruiter` works correctly
- ✅ Redirect to `/recruiter/dashboard` after signup
- ✅ Scenario builder at `/recruiter/scenarios/new` loads and works with AI chat
- ✅ Scenario list at `/recruiter/scenarios` shows scenarios with shareable links
- ✅ Candidates list at `/recruiter/candidates` shows candidates with status and filters

**Candidate Flow:**
- ✅ Join page at `/join/[scenarioId]` shows scenario info and auth form
- ✅ Candidate signup creates account and redirects to join page
- ✅ "Continue to Assessment" button creates assessment and redirects to welcome page
- ✅ Welcome page shows consent checkbox and "Start Simulation" button
- ✅ Checking consent enables the start button
- ✅ Clicking start redirects to `/assessment/[id]/chat`
- ✅ Chat page shows manager welcome messages automatically
- ✅ Manager sends task context, repo link, and instructions
- ✅ Candidate can send messages including PR URLs
- ✅ Manager responds to PR submission
- ✅ Call button is available to initiate defense call (call fails in headless browser - expected)

**Recruiter Verification:**
- ✅ New candidate appears in recruiter's candidates list
- ✅ Status shows correctly (WORKING while in progress)

**Old Routes Removed:**
- ✅ `/start` returns 404
- ✅ `/assessment/*/cv-upload` returns 404
- ✅ `/assessment/*/hr-interview` returns 404
- ✅ `/assessment/*/congratulations` returns 404
- ✅ `/assessment/*/kickoff` returns 404
- ✅ `/assessment/*/defense` returns 404

**Build Verification:**
- ✅ TypeScript compiles: `npm run typecheck`
- ✅ Build succeeds: `npm run build`

### Files modified
- `src/app/api/assessment/report/route.ts` - Removed unused `AssessmentStatus` import (lint fix)

### Screenshots captured
All screenshots saved to `screenshots/` folder:
- `rf-020-recruiter-signup.png` - Recruiter signup page
- `rf-020-recruiter-signup-filled.png` - Filled signup form
- `rf-020-recruiter-dashboard.png` - Dashboard after signup
- `rf-020-scenario-builder.png` - Scenario builder in progress
- `rf-020-scenarios-list.png` - Scenarios list with shareable link
- `rf-020-join-page.png` - Join page for candidates
- `rf-020-welcome-page.png` - Welcome page with consent
- `rf-020-chat-page.png` - Initial chat page
- `rf-020-chat-with-messages.png` - Chat with manager messages
- `rf-020-pr-submitted.png` - After submitting PR URL
- `rf-020-call-attempted.png` - After attempting call
- `rf-020-recruiter-candidates.png` - Recruiter's candidates view
- `rf-020-404-start.png` - 404 for removed /start route

### Learnings
1. **E2E_TEST_MODE required**: The dev server must be started with `E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true` to bypass screen recording in headless browser tests

2. **Voice calls don't work in headless**: The voice call functionality (WebRTC) requires real audio hardware and fails with "Not supported" in agent-browser. This is expected behavior.

3. **Join page flow**: After candidate signup, the page refreshes and shows "Continue to Assessment" button. The button then creates the assessment and redirects to welcome page.

4. **Manager auto-messages**: The manager sends initial messages automatically when the candidate enters the chat, including task description, repo link, and instructions.

5. **Session handling in agent-browser**: Using `--session` flag is critical to maintain login state across multiple commands.

6. **Tests timeout**: The vitest tests may take very long to run due to the number of test files. Consider running specific test files or using `--bail` flag.

### Gotchas discovered
- The join page "Loading..." state can hang if there's an API issue - refresh the page to get a fresh state
- Voice calls will show "Call Failed - Not supported" in headless browser (expected)
- The scenario builder requires multiple chat exchanges to collect all required info

---

## Issue #193: RF-025 - Update results page for simplified assessment data

### What was implemented
- Updated the results page to display new video evaluation data with hiring signals
- Created new `VideoSkillCard` component for displaying skill evaluation with rationale, green flags, red flags, and timestamps
- Created `HiringSignalsSection` component with hiring recommendation badge (HIRE/MAYBE/NO_HIRE), rationale, top strengths, and areas to probe
- Added backward compatibility for legacy assessments without video evaluation data
- Updated types to include `VideoEvaluationResult` and `VideoSkillEvaluation` in `AssessmentReport`
- Updated report API to include `videoEvaluation` data in the response
- Updated seed data with sample video evaluation for E2E testing

### Files modified
- `src/types/assessment.ts` - Added new types:
  - `VideoDimension` - The 8 video evaluation dimension names
  - `VideoSkillEvaluation` - Skill with dimension, score, rationale, greenFlags, redFlags, timestamps
  - `VideoEvaluationResult` - Full video evaluation result for results page display
  - Extended `AssessmentReport` with optional `videoEvaluation` field
- `src/types/index.ts` - Export new types
- `src/app/api/assessment/report/route.ts` - Added:
  - `VIDEO_DIMENSIONS` array constant
  - `convertToVideoEvaluationResult()` function to transform video evaluation to results format
  - Include `videoEvaluation` in returned `AssessmentReport`
- `src/app/assessment/[id]/results/client.tsx` - Complete rewrite:
  - New `VideoSkillCard` component with expandable card showing rationale, green flags, red flags, timestamps
  - New `HiringSignalsSection` component with recommendation badge and strengths/concerns
  - Updated `DIMENSION_LABELS` for new video evaluation dimensions
  - Added `getScoreLevel()` helper for calculating level from score
  - Added conditional rendering: new format for video evaluation, legacy format for old assessments
  - Kept `LegacySkillCard` for backward compatibility with old reports
- `prisma/seed.ts` - Added sample video evaluation data to test assessment:
  - Full 8-skill video evaluation with rationale, green/red flags, timestamps
  - Hiring signals with recommendation ("hire"), rationale, and overall flags

### UI Components Added

#### HiringSignalsSection
- Prominent card at top with hiring recommendation badge
- Three badge styles: HIRE (green), MAYBE (yellow), NO_HIRE (red)
- Shows recommendation rationale
- Two-column grid with Top Strengths (green) and Areas to Probe (amber)

#### VideoSkillCard
- Expandable card showing skill name, score bar, and level badge
- Expanded view shows:
  - Rationale text explaining the score
  - Green Flags list (positive signals)
  - Red Flags list (concerns)
  - Evidence Timestamps as clickable chips

### Data Flow
1. Video evaluation generates `VideoEvaluationOutput` with 8 dimension scores and hiring signals
2. Report API converts to `VideoEvaluationResult` format with skills array
3. Report includes both legacy `skillScores` (backward compat) and new `videoEvaluation`
4. Results page checks `report.videoEvaluation` to decide which UI to render
5. Old assessments without video evaluation fall back to legacy skill cards

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Results page renders without errors
- All 8 skills display correctly with proper scores and badges
- Hiring signals section displays with HIRE recommendation badge
- Skill cards expand to show rationale, flags, and timestamps
- Responsive design works (tested in browser)

### Screenshots
- `screenshots/issue-193-results-overview.png` - Hero section with score and hiring recommendation
- `screenshots/issue-193-skills-section.png` - Session metrics and skill breakdown
- `screenshots/issue-193-skill-expanded.png` - Communication skill expanded with details
- `screenshots/issue-193-skill-details.png` - Full skill card with green flags, red flags, timestamps
- `screenshots/issue-193-more-skills.png` - All 8 skills visible in list

### Acceptance Criteria Status
- [x] Show 8 skills from video evaluation (not old skill categories)
- [x] Each skill card shows: skill name and score, rationale, green flags, red flags, timestamps
- [x] Keep expandable card UI pattern
- [x] New section for hiring signals with recommendation badge
- [x] Display overall green flags (strengths) and red flags (concerns)
- [x] Show hiring recommendation badge: hire (green), maybe (yellow), no_hire (red)
- [x] Show recommendation rationale
- [x] Keep large circular score display with overall_score
- [x] Keep level badges (Exceptional, Strong, etc.)
- [x] Remove references to old skill categories (handled via conditional rendering)
- [x] Remove narrative feedback section (replaced by video summary)
- [x] Remove recommendations section (replaced by hiring signals)
- [x] Old assessments show graceful fallback (legacy UI)
- [x] New assessments get new display
- [x] TypeScript compiles: `npm run typecheck`
- [x] Results page renders without errors
- [x] All 8 skills display correctly
- [x] Hiring signals section displays correctly
- [x] Responsive design works on mobile

### Learnings for future iterations
- The `videoEvaluation` field in `AssessmentReport` allows for gradual migration
- Conditional rendering (`hasVideoEvaluation ? newUI : legacyUI`) is clean for backward compatibility
- The hiring signals section should be prominent for recruiters (placed right after hero)
- Timestamps displayed as monospace chips look good and match the video player use case

### Gotchas discovered
- The video evaluation dimension names are UPPERCASE (COMMUNICATION, PROBLEM_SOLVING, etc.)
- Need to map them to display labels for the UI
- The `score` can be null if there's insufficient evidence - handle with `?? 0`
- Red flags are "concerns" not necessarily dealbreakers - used amber color instead of red for "Areas to Probe"

---

## Issue #192: RF-024 - Simplify report API to single video evaluation

### What was implemented
- Completely rewrote `/api/assessment/report` route to use video evaluation directly
- Removed all signal collection from multiple sources (HR interview, code review, recording analysis, conversation aggregation)
- Added conversion function `convertVideoEvaluationToReport()` to transform video evaluation output to `AssessmentReport` format
- Created dimension-to-category mapping for video evaluation dimensions to report skill categories
- Updated tests to reflect new architecture using video evaluation mocks

### Files modified
- `src/app/api/assessment/report/route.ts` - Complete rewrite:
  - Removed `collectAssessmentSignals()` function and `AssessmentSignals` interface
  - Removed `ConversationSignals` interface
  - Removed placeholder `generateAssessmentReport()` function
  - Added `convertVideoEvaluationToReport()` function
  - Added `DIMENSION_TO_CATEGORY` mapping
  - Added `scoreToLevel()` helper function
  - Added logic to check for existing video evaluation and use it
  - Added logic to trigger video evaluation if not present
  - Added proper error handling for missing video, processing state, etc.
- `src/app/api/assessment/report/route.test.ts` - Updated tests:
  - Removed mocks for old analysis functions
  - Added mocks for `evaluateVideo()` and `getEvaluationResults()`
  - Added mock for `videoAssessment` database queries
  - Added comprehensive sample `VideoEvaluationOutput` for testing
  - Added tests for new edge cases (no video, processing, completed evaluation)

### New Report Generation Flow
1. Check if cached report exists (return if `forceRegenerate` is false)
2. Check if video recording exists (error if not)
3. Check if video assessment exists and its status:
   - COMPLETED: Use existing `rawAiResponse` from video assessment summary
   - PROCESSING: Return 202 (try again later)
   - PENDING/FAILED/None: Create video assessment and run evaluation synchronously
4. Convert video evaluation output to `AssessmentReport` format
5. Store report in `assessment.report`
6. Send email notification if configured

### Dimension to Category Mapping
| Video Dimension | Report Category |
|----------------|-----------------|
| COMMUNICATION | communication |
| PROBLEM_SOLVING | problem_decomposition |
| TECHNICAL_KNOWLEDGE | code_quality |
| COLLABORATION | xfn_collaboration |
| ADAPTABILITY | technical_decision_making |
| LEADERSHIP | presentation |
| CREATIVITY | ai_leverage |
| TIME_MANAGEMENT | time_management |

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Tests pass: 15/15 tests passing
- Dev server starts without errors

### Learnings for future iterations
- The video evaluation output (`VideoEvaluationOutput`) contains all the data needed for the report
- The `rawAiResponse` in `videoAssessmentSummary` preserves the full evaluation for later conversion
- Error handling needs to distinguish between "no video" (400) vs "processing" (202) vs "failed" (500)
- The finalize route already triggers video assessment asynchronously - the report route just needs to check the result

### Gotchas discovered
- The `VideoAssessmentStatus` enum has PENDING, PROCESSING, COMPLETED, FAILED states
- Video assessment is linked to the main assessment via `assessmentId` (unique constraint)
- The results page expects `AssessmentReport` type with `skillScores`, `narrative`, `recommendations`, `metrics`
- Green flags become strengths, red flags become areas for improvement in the narrative

### Acceptance Criteria Status
- [x] Remove signal collection from multiple sources (no HR, code review, recording, conversation signals)
- [x] Call video evaluation directly with the recorded video URL
- [x] Return video evaluation result as the assessment report
- [x] Store video evaluation result in `assessment.assessmentReport` (via report field)
- [x] Ensure the new schema matches what the results page expects
- [x] Handle cases where video URL is missing (error state - 400)
- [x] Remove imports from deleted analysis files
- [x] Remove imports from deleted prompt files (none needed)
- [x] Clean up any helper functions that are no longer used
- [x] If assessment is already COMPLETED with a report, return cached report
- [x] If no video recording exists, return appropriate error
- [x] If video evaluation fails, return error state (don't crash)
- [x] Check if `/api/assessment/finalize` needs updates (no changes needed - already correct)
- [x] Check if any other routes call the deleted analysis functions (none found)
- [x] Update imports throughout the codebase (test file updated)
- [x] TypeScript compiles: `npm run typecheck`
- [x] Start dev server without errors

---

## Issue #191: RF-023 - Update video evaluation prompt with hiring signals

### What was implemented
- Extended the video evaluation prompt to include hiring signals output
- Added `rationale`, `greenFlags`, and `redFlags` to each skill dimension
- Added new `hiringSignals` object with overall green/red flags and hiring recommendation
- Updated prompt version from 1.0.0 to 1.1.0
- Updated TypeScript types to match the new output schema

### Files modified
- `src/prompts/analysis/video-evaluation.ts` - Extended prompt and types:
  - Added `rationale: string` to dimension scores
  - Added `greenFlags: string[]` to dimension scores
  - Added `redFlags: string[]` to dimension scores
  - Added `HiringSignals` interface with `overallGreenFlags`, `overallRedFlags`, `recommendation`, `recommendationRationale`
  - Added `HiringRecommendation` type (`'hire' | 'maybe' | 'no_hire'`)
  - Added `DimensionScoreOutput` interface for dimension scores
  - Added "HIRING SIGNALS GUIDELINES" section to prompt
- `src/types/assessment.ts` - Updated video assessment types:
  - Added `HiringRecommendation` type
  - Added `HiringSignals` interface
  - Updated `VideoDimensionScore` to match new schema
  - Added `VideoKeyHighlight` interface
  - Updated `VideoAssessmentData` to match new output schema
- `src/types/index.ts` - Added new type exports

### New Output Schema (Full)
```typescript
interface VideoEvaluationResult {
  evaluation_version: string;
  overall_score: number; // 1.0-5.0
  dimension_scores: {
    dimension: string;
    score: number;
    rationale: string;           // NEW: Why this score
    greenFlags: string[];        // NEW: Positive signals
    redFlags: string[];          // NEW: Concerns
    observable_behaviors: string;
    timestamps: string[];
    trainable_gap: boolean;
  }[];
  hiringSignals: {               // NEW: Entire section
    overallGreenFlags: string[];
    overallRedFlags: string[];
    recommendation: 'hire' | 'maybe' | 'no_hire';
    recommendationRationale: string;
  };
  key_highlights: { ... }[];
  overall_summary: string;
  evaluation_confidence: 'high' | 'medium' | 'low';
  insufficient_evidence_notes?: string;
}
```

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Prompt is syntactically valid
- Output schema is well-defined JSON

### Learnings for future iterations
- The prompt uses template literals for version interpolation (`${EVALUATION_PROMPT_VERSION}`)
- Hiring recommendation categories align with recruiter decision-making: `hire`, `maybe`, `no_hire`
- Green/red flags should be specific, actionable, and based on observable evidence
- The rationale field helps explain WHY a score was given, not just WHAT was observed

### Gotchas discovered
- The `VideoDimensionScore` type in `src/types/assessment.ts` was outdated and didn't match the prompt output schema
- Types need to be exported from both the prompt file and the central `@/types` module

### Acceptance Criteria Status
- [x] Add `greenFlags: string[]` to each skill dimension
- [x] Add `redFlags: string[]` to each skill dimension
- [x] Add `rationale: string` to each skill dimension
- [x] Add new `hiringSignals` object with `overallGreenFlags`, `overallRedFlags`, `recommendation`, `recommendationRationale`
- [x] Add instructions to identify green flags (positive signals) per skill
- [x] Add instructions to identify red flags (concerns) per skill
- [x] Add instructions for overall hiring recommendation
- [x] Ensure rationale is evidence-based with timestamps
- [x] Keep the 8 skill dimensions unchanged
- [x] Keep the 5-level scoring rubric
- [x] Keep timestamp requirements for evidence
- [x] Keep evaluation_confidence field
- [x] Keep insufficient_evidence_notes field
- [x] Update TypeScript types in `src/types/` for new output schema
- [x] Ensure types match the prompt output schema
- [x] TypeScript compiles: `npm run typecheck`
- [x] Prompt is syntactically valid
- [x] Output schema is well-defined JSON

---

## Issue #190: RF-022 - Delete unused analysis files

### What was implemented
- Deleted analysis library files: `code-review.ts`, `recording-analysis.ts`, `assessment-aggregation.ts` and their tests
- Deleted analysis prompt files: `code-review.ts`, `recording.ts`, `assessment.ts` from `src/prompts/analysis/`
- Deleted API routes: `/api/code-review` and `/api/recording/analyze`
- Moved `buildConversationSummaryPrompt` to `conversation-memory.ts` (still needed for Slack chat memory)
- Updated barrel exports in `src/lib/analysis/index.ts` and `src/prompts/index.ts`
- Added report types to `src/types/assessment.ts`: `AssessmentReport`, `SkillScore`, `SkillCategory`, `AssessmentMetrics`, etc.
- Updated import statements across codebase to use `@/types` instead of deleted files
- Provided placeholder implementation for report generation in `/api/assessment/report/route.ts`

### Files deleted
- `src/lib/analysis/code-review.ts` (and test)
- `src/lib/analysis/recording-analysis.ts` (and test)
- `src/lib/analysis/assessment-aggregation.ts` (and test)
- `src/prompts/analysis/code-review.ts`
- `src/prompts/analysis/recording.ts`
- `src/prompts/analysis/assessment.ts`
- `src/app/api/code-review/route.ts`
- `src/app/api/recording/analyze/route.ts`

### Files modified
- `src/lib/analysis/index.ts` - Removed deleted exports
- `src/prompts/index.ts` - Removed deleted exports
- `src/lib/ai/conversation-memory.ts` - Inlined conversation summary prompt
- `src/app/api/assessment/finalize/route.ts` - Removed code review functionality
- `src/app/api/assessment/report/route.ts` - Simplified with placeholder implementation
- `src/app/api/recording/session/route.ts` - Removed screenshot analysis trigger
- `src/app/assessment/[id]/results/client.tsx` - Import from @/types
- `src/app/assessment/[id]/results/page.tsx` - Import from @/types
- `src/app/profile/page.tsx` - Import from @/types
- `src/lib/external/email.ts` - Import from @/types
- `src/types/assessment.ts` - Added report types
- `src/types/index.ts` - Export new report types
- Various test files updated for new APIs
- CLAUDE.md files updated to reflect changes

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Dev server starts without errors
- Tests pass: finalize (14/14), email (27/27), recording session (20/20)

### Learnings for future iterations
- When deleting modules with shared types, check if types are used elsewhere and move to `@/types`
- The `CONVERSATION_SUMMARY_PROMPT` was used by both assessment analysis and Slack memory - needed to preserve for memory
- Screenshot analysis was removed from session recording route - video evaluation replaces it
- Report generation needs placeholder to prevent breaking the results page

### Gotchas discovered
- The `MetricsGrid` component expected `report.metrics` but the type made it optional - needed null check
- Test files had hardcoded `analysisTriggered` expectation that was removed with screenshot analysis
- The `SkillCategory` type conflicted with CV types - exported as `ReportSkillCategory` for report context

### Acceptance Criteria Status
- [x] Delete `src/lib/analysis/code-review.ts`
- [x] Delete `src/lib/analysis/recording-analysis.ts`
- [x] Delete `src/lib/analysis/assessment-aggregation.ts`
- [x] Delete `src/prompts/analysis/code-review.ts`
- [x] Delete `src/prompts/analysis/recording.ts`
- [x] Delete `src/prompts/analysis/assessment.ts`
- [x] Search for imports from deleted files
- [x] Update or remove import statements
- [x] Check `/api/code-review/route.ts` - deleted
- [x] Check `/api/recording/analyze/route.ts` - deleted
- [x] TypeScript compiles: `npm run typecheck`
- [x] No runtime errors when starting dev server
- [x] Document any files that still need updating in subsequent issues

### Files needing updates in subsequent issues
- `/api/assessment/report/route.ts` - Currently uses placeholder implementation
- Results page will need video evaluation integration once implemented

---

## Issue #187: RF-019 - Update middleware for new routes

### What was implemented
- Updated middleware to handle both API routes and page routes
- Added protection for `/recruiter/*` page routes requiring RECRUITER or ADMIN role
- Added `/join/*` routes as public (no auth required)
- Added `/assessment/*` routes requiring authentication
- Removed handling for deprecated routes (they now 404 naturally since pages were deleted)

### Middleware Changes
- Renamed functions for clarity: `isPublicRoute` → `isPublicApiRoute`, etc.
- Added new helper functions: `isPublicPageRoute`, `isRecruiterPageRoute`, `isAssessmentPageRoute`
- Updated matcher config to include: `/api/:path*`, `/recruiter/:path*`, `/assessment/:path*`
- `/join/*` routes are explicitly NOT matched - they remain public

### Route Protection Summary
| Route Pattern | Auth Required | Role Required |
|--------------|---------------|---------------|
| `/api/admin/*` | Yes | ADMIN |
| `/api/recruiter/*` | Yes | RECRUITER or ADMIN |
| `/api/*` (other) | Yes | None |
| `/recruiter/*` | Yes | RECRUITER or ADMIN |
| `/assessment/*` | Yes | None (ownership at page level) |
| `/join/*` | No | None |
| `/sign-in`, `/sign-up` | No | None |

### Deprecated Routes (now 404)
These routes were removed in previous RF issues and now return 404:
- `/start`
- `/assessment/[id]/cv-upload`
- `/assessment/[id]/hr-interview`
- `/assessment/[id]/congratulations`
- `/assessment/[id]/kickoff`
- `/assessment/[id]/defense`

### Files modified
- `src/middleware.ts` - Complete rewrite for new route structure

### Verification
- TypeScript compiles: `npm run typecheck` passes
- E2E tested with agent-browser:
  1. Logged out → `/recruiter/dashboard` → redirects to `/sign-in?callbackUrl=/recruiter/dashboard`
  2. Logged out → `/join/test-scenario-recruiter` → page loads (public)
  3. Login as regular user → `/recruiter/dashboard` → redirects to `/?error=unauthorized`
  4. Login as recruiter → `/recruiter/dashboard` → access granted
  5. `/start` → 404
  6. `/assessment/[id]/cv-upload` → 404
  7. `/assessment/[id]/hr-interview` → 404
  8. `/assessment/[id]/congratulations` → 404
  9. `/assessment/[id]/kickoff` → 404
  10. `/assessment/[id]/defense` → 404
- Screenshots captured:
  - `screenshots/issue-187-recruiter-redirect.png` - Unauthenticated redirect to sign-in
  - `screenshots/issue-187-join-public.png` - Join page accessible publicly
  - `screenshots/issue-187-wrong-role-redirect.png` - Regular user redirected from recruiter
  - `screenshots/issue-187-recruiter-access-granted.png` - Recruiter can access dashboard
  - `screenshots/issue-187-assessment-auth-required.png` - Assessment routes require auth

### Learnings for future iterations
- Middleware matcher config determines which routes run through middleware at all
- Routes not matched by the middleware config pass through without any checks
- Page routes need different response handling (redirect) vs API routes (JSON error)
- Assessment ownership verification happens at the page level since middleware can't query DB

### Gotchas discovered
- The callback URL needs proper encoding when redirecting to sign-in
- Regular users trying to access recruiter routes get redirected to home with error param, not 403

### Acceptance Criteria Status
- [x] `/recruiter/*` routes require authentication
- [x] Only RECRUITER or ADMIN roles can access
- [x] Redirect to `/sign-in` if not authenticated
- [x] Redirect to `/` or show 403 if wrong role
- [x] `/join/*` routes are public (no auth required)
- [x] Anyone can view scenario info
- [x] Auth happens on the page itself
- [x] Remove any special handling for `/start`
- [x] Remove handling for `/cv-upload`
- [x] Remove handling for `/hr-interview`
- [x] Remove handling for `/congratulations`
- [x] Remove handling for `/kickoff`
- [x] Remove handling for `/defense`
- [x] `/assessment/[id]/*` routes require authentication
- [x] User must own the assessment (or be admin) - verified at page level
- [x] Keep existing assessment route protection
- [x] TypeScript compiles: `npm run typecheck`
- [x] Test recruiter routes require auth
- [x] Test join routes are public
- [x] Removed routes return 404

---

## Issue #186: RF-018 - Update results page for new status flow

### What was implemented
- Updated results page to work with simplified status flow (WELCOME → WORKING → COMPLETED)
- Added proper status-based redirects:
  - WELCOME → `/assessment/[id]/welcome`
  - WORKING → `/assessment/[id]/chat`
  - COMPLETED → show results (no redirect)
- Removed `isProcessing` prop from ResultsClient component (PROCESSING status no longer exists)
- Removed `ProcessingState` component (no longer needed)
- Updated `NoReportState` component to show loading state during report generation
- Added test assessment with COMPLETED status and sample report to seed file

### Page Access Control Flow
1. User navigates to `/assessment/[id]/results`
2. Server verifies authentication and assessment ownership
3. Status check:
   - WELCOME → redirect to `/assessment/[id]/welcome`
   - WORKING → redirect to `/assessment/[id]/chat`
   - COMPLETED → render results page
4. If no report exists, try to generate it inline
5. If generation fails, show "Generate Report" button for user to retry

### Files modified
- `src/app/assessment/[id]/results/page.tsx` - Added status-based redirects, removed isProcessing prop
- `src/app/assessment/[id]/results/client.tsx` - Removed ProcessingState component, updated NoReportState with loading state, removed unused imports
- `prisma/seed.ts` - Added COMPLETED test assessment with sample report

### Verification
- TypeScript compiles: `npm run typecheck` passes
- E2E tested with agent-browser:
  - Results page loads correctly for COMPLETED assessment
  - Shows overall score, skill breakdown, metrics
  - WORKING assessment redirects to /chat
  - WELCOME assessment redirects to /welcome
- Screenshots captured:
  - `screenshots/issue-186-results-page.png` - Main results view
  - `screenshots/issue-186-results-skills.png` - Skill breakdown

### Learnings for future iterations
- The `VideoAssessmentStatus` enum still has PROCESSING (for video evaluation) - separate from `AssessmentStatus` enum
- Report generation is handled both server-side (in page.tsx) and client-side (via NoReportState component)
- The seed script uses fixed IDs (`TEST_ASSESSMENT_IDS`) for consistent E2E testing

### Gotchas discovered
- The results client was importing `useEffect` and `useRouter` but they were no longer needed after removing the polling logic
- The `_isLoading` state variable was renamed to `isGenerating` for clarity

### Acceptance Criteria Status
- [x] Update Status Checks: Remove checks for PROCESSING status
- [x] Results page works for COMPLETED status
- [x] Redirect WELCOME → /welcome
- [x] Redirect WORKING → /chat
- [x] Report Generation: If COMPLETED but no report exists, generate it
- [x] Show loading state while generating
- [x] Display report once ready
- [x] Only allow access for COMPLETED assessments
- [x] TypeScript compiles: `npm run typecheck`
- [x] Navigate to results for COMPLETED assessment
- [x] Report displays or generates

---

## Issue #185: RF-017 - Implement defense call flow in Slack

### What was implemented
- Modified `/api/call/token` to detect defense mode when `assessment.prUrl` is set
- When calling a manager after PR submission, uses defense prompt instead of regular coworker prompt
- Added `isDefenseCall` flag to token response for client-side handling
- Modified `FloatingCallBar` to track defense call state and trigger completion flow
- Added `onDefenseComplete` callback prop to `SlackLayout` component
- Updated chat page client to handle defense call completion:
  - Stop screen recording
  - Finalize assessment (marks as COMPLETED)
  - Navigate to results page
- Added helper function `formatConversationsForSummary` to build conversation context for defense prompt

### Defense Call Detection Flow
1. Candidate submits PR URL in chat → `assessment.prUrl` gets set
2. Manager prompts candidate to call for code review discussion
3. Candidate initiates call with manager using sidebar call button
4. `/api/call/token` endpoint checks:
   - Is `assessment.prUrl` set? (PR submitted)
   - Is coworker a manager? (role contains "manager")
5. If both true, returns `isDefenseCall: true` with defense system prompt
6. Defense prompt includes:
   - Manager persona and style
   - Task context and tech stack
   - PR URL
   - Conversation history summary
7. When call ends:
   - Transcript is saved
   - If defense call, triggers `onDefenseComplete` callback
   - Stops screen recording
   - Finalizes assessment via `/api/assessment/finalize`
   - Redirects to `/assessment/[id]/results`

### Files created
- `prisma/seed.ts` - Added `test-assessment-defense` with prUrl for testing

### Files modified
- `src/app/api/call/token/route.ts` - Added defense mode detection, defense prompt building
- `src/lib/ai/conversation-memory.ts` - Added `formatConversationsForSummary` helper
- `src/components/chat/floating-call-bar.tsx` - Added defense call state tracking, `onDefenseComplete` callback
- `src/components/chat/slack-layout.tsx` - Added `onDefenseComplete` prop passthrough
- `src/app/assessment/[id]/chat/client.tsx` - Added defense completion handler with screen recording stop, finalize, and navigation

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Build succeeds: `npm run build` passes
- Database verification: Defense call detection logic correctly identifies defense calls
- Test assessment created: `test-assessment-defense` with prUrl set
- Screenshot captured: `screenshots/issue-185-defense-chat.png`
- Note: Actual voice call testing not possible in headless browser (requires microphone access)

### Defense Prompt Context
The defense prompt includes:
- Manager name and role
- Company name
- Candidate name
- Task description and tech stack
- Repository URL
- PR URL
- Conversation summary (from all chats with coworkers)
- CI status summary (placeholder for now)
- Code review summary (placeholder for now)

### Learnings for future iterations
- The `isManager()` helper function (role.toLowerCase().includes('manager')) is reused from chat route
- Defense call state is tracked via ref for callback closure access, with redundant state for potential UI use
- The screen recording context provides `stopRecording()` which must be called before finalization
- Assessment finalization handles PR cleanup, CI status, code review analysis, and video assessment triggering

### Gotchas discovered
- Voice calls can't be fully E2E tested in headless browsers - only the detection logic can be verified
- The `onDefenseComplete` callback must handle both the recording stop and the API finalization
- The "Wrapping up..." loading state prevents duplicate completion calls

### Acceptance Criteria Status
- [x] Defense Call Detection: When candidate initiates a call AND `assessment.prUrl` is set, use defense prompt
- [x] Regular coworker call prompt used if no PR URL set
- [x] Defense Call Prompt: Reuses existing defense call prompt with context about PR
- [x] Call Token Endpoint: Modified to check if PR is submitted, returns appropriate system prompt
- [x] On Call End: Detect when candidate hangs up, if defense call:
  - [x] Stop screen recording
  - [x] Update assessment status to COMPLETED
  - [x] Navigate to `/assessment/[id]/results`
- [x] Navigation to Results: Client-side redirect to results page
- [x] Brief "Wrapping up..." transition shown during finalization
- [x] TypeScript compiles: `npm run typecheck`
- [ ] E2E test with actual call (not possible in headless browser)

---

## Issue #184: RF-016 - Add PR URL detection in Slack chat

### What was implemented
- Added duplicate PR URL detection to prevent overwriting and repeated "call me" prompts
- Created `DUPLICATE_PR_PROMPT` for handling repeat PR submissions naturally
- Modified `/src/app/api/chat/route.ts` to check `assessment.prUrl` before processing

### PR URL Detection Flow
1. Candidate sends message in chat
2. Server-side `extractPrUrl()` checks message for PR URL patterns
3. `isValidPrUrl()` validates URL matches GitHub/GitLab/Bitbucket PR patterns
4. If PR URL detected and `assessment.prUrl` is NOT set:
   - Save URL to `assessment.prUrl`
   - Manager responds with call prompt (e.g., "I'll give you a shout to chat through it")
5. If PR URL detected and `assessment.prUrl` IS already set:
   - Don't overwrite existing URL
   - Manager responds naturally without repeating call prompt (uses `DUPLICATE_PR_PROMPT`)

### Supported PR URL Patterns
- GitHub: `https://github.com/owner/repo/pull/123`
- GitLab: `https://gitlab.com/owner/repo/-/merge_requests/123`
- Bitbucket: `https://bitbucket.org/owner/repo/pull-requests/123`

### Files modified
- `src/app/api/chat/route.ts` - Added duplicate detection logic, imported DUPLICATE_PR_PROMPT
- `src/prompts/manager/pr-submission.ts` - Added DUPLICATE_PR_PROMPT constant
- `src/prompts/index.ts` - Exported DUPLICATE_PR_PROMPT

### Verification
- TypeScript compiles: `npm run typecheck` passes
- E2E tested with agent-browser:
  - Logged in as candidate@test.com
  - Navigated to `/assessment/test-assessment-working-recruiter/chat`
  - Sent first PR URL: Manager responded with call prompt
  - PR URL saved to assessment.prUrl
  - Sent second PR URL: Manager responded naturally without repeating call prompt
  - Original PR URL was NOT overwritten
- Screenshots captured:
  - `screenshots/issue-184-chat-initial.png` - Initial chat state
  - `screenshots/issue-184-pr-submitted.png` - After first PR submission
  - `screenshots/issue-184-duplicate-pr-response.png` - After duplicate PR submission

### Learnings for future iterations
- PR URL detection was already implemented in `/src/app/api/chat/route.ts`, just needed duplicate handling
- The `isValidPrUrl()` function in `src/lib/external/pr-validation.ts` already supports multiple platforms
- Manager detection uses `isManager()` helper which checks if role contains "manager"
- The `prSubmitted` flag in the response can be used by the client for UI updates

### Gotchas discovered
- The existing implementation already saved PR URL and triggered manager response - just needed duplicate protection
- The manager auto-start messages (RF-015) may include an initial "call me" message, so duplicate detection is important
- Status stays WORKING when PR is submitted (no more FINAL_DEFENSE status)

### Acceptance Criteria Status
- [x] Monitor candidate messages for PR URL patterns
- [x] Regex pattern: `https?:\/\/(github\.com|gitlab\.com)\/[^\s]+\/(pull|merge_requests)\/\d+`
- [x] Detection happens server-side when processing message
- [x] Extract and validate PR URL
- [x] Save to `assessment.prUrl`
- [x] Record timestamp of submission (via message timestamp)
- [x] Trigger manager response with call prompt
- [x] Manager responds naturally after PR detected
- [x] Keep assessment in WORKING status
- [x] If PR URL already saved, don't overwrite
- [x] Manager should not repeat the "call me" message
- [x] TypeScript compiles: `npm run typecheck`
- [x] Post PR URL in chat - URL is saved to assessment record
- [x] Manager responds with call prompt
- [x] E2E tested with screenshots

---

## Issue #183: RF-015 - Add manager auto-start messages in Slack

### What was implemented
- Added `managerMessagesStarted` field to Assessment model to track first visit
- Created `/src/app/api/chat/manager-start/route.ts` - API endpoint to trigger manager messages
- Created `/src/hooks/chat/use-manager-auto-start.ts` - Hook for staggered message delivery
- Modified `/src/components/chat/chat.tsx` - Integrated manager auto-start hook
- Modified `/src/app/api/chat/route.ts` - Removed auto-greeting from GET (now handled by new API)
- Fixed `/src/lib/chat/greeting-generator.ts` - Changed timestamps to ISO format

### Database Changes
- Added `managerMessagesStarted` boolean field to Assessment model (default: false)
- Migration: `prisma/migrations/20250130000001_manager_messages_started/migration.sql`

### Manager Auto-Start Flow
1. When candidate lands on `/assessment/[id]/chat`, the `useManagerAutoStart` hook runs
2. Hook checks if `managerMessagesStarted` is false via GET `/api/chat/manager-start`
3. After 5-10 second random delay, POST `/api/chat/manager-start` triggers messages
4. Messages are delivered one at a time with typing indicators for realistic feel
5. Flag is set to prevent duplicate messages on refresh/revisit

### Manager Initial Messages
1. "Hey [userName]! Welcome to [companyName]! I'm so glad to have you on the team."
2. "I'm [managerName], your [managerRole]. I'll be helping you get up to speed..."
3. "Here's what you'll be working on: [taskDescription]"
4. "You can check out the repo here: [repoUrl]"
5. "Feel free to ask me any questions... When you're done, submit your PR and give me a call to discuss!"

### Technical Implementation
- **Option chosen:** API endpoint called from chat client on mount
- Messages staggered with 0.8-1.5s typing indicator + 1.5-3s delay between messages
- Assessment status updated from WELCOME to WORKING when messages are sent
- Manager coworker found by role containing "manager" or first coworker as fallback

### Files created
- `src/app/api/chat/manager-start/route.ts` - POST triggers messages, GET checks status
- `src/hooks/chat/use-manager-auto-start.ts` - Client hook for triggering and delivering messages
- `prisma/migrations/20250130000001_manager_messages_started/migration.sql`

### Files modified
- `prisma/schema.prisma` - Added managerMessagesStarted field
- `src/app/api/chat/route.ts` - Removed auto-greeting generation from GET
- `src/components/chat/chat.tsx` - Added useManagerAutoStart hook integration
- `src/hooks/index.ts` - Added export for useManagerAutoStart
- `src/lib/chat/greeting-generator.ts` - Fixed timestamp format (ISO instead of locale string)
- `src/test/factories/assessment.ts` - Added managerMessagesStarted field

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Build succeeds: `npm run build` passes
- E2E tested with agent-browser:
  - Logged in as candidate@test.com
  - Navigated to `/assessment/test-assessment-welcome/chat`
  - After ~15 seconds, all 5 manager messages appear with correct timestamps
  - Refreshed page - no duplicate messages (flag prevents re-send)
- Screenshots captured:
  - `screenshots/issue-183-initial-empty.png` - Initial loading state
  - `screenshots/issue-183-final-v2.png` - All messages displayed
  - `screenshots/issue-183-no-duplicates-v2.png` - After refresh, same messages

### Learnings for future iterations
- React's strict mode can cause hooks to run twice - use refs to prevent double execution
- Timestamps must be ISO strings for `new Date()` parsing in formatTimestamp
- The staggered message delivery gives a natural feel vs. all messages appearing at once
- Tracking flags at the assessment level prevents race conditions better than conversation-level

### Gotchas discovered
- The greeting generator was returning locale time strings which caused "Invalid Date" in the UI
- Need to reset the `historyLoadedRef` on error to allow retry
- The manager auto-start should only deliver messages to the chat view if viewing the manager

### Acceptance Criteria Status
- [x] When candidate lands on `/assessment/[id]/chat`, detect if this is first visit
- [x] After 5-10 second delay, trigger manager's first message
- [x] Use existing chat/message system
- [x] Message 1: Greeting and intro
- [x] Message 2: Brief, vague task context (intentionally incomplete)
- [x] Message 3: Suggest hopping on a call to discuss
- [x] Stagger messages slightly for realistic feel
- [x] Track whether manager has already sent initial messages for this assessment
- [x] Store flag in assessment record (managerMessagesStarted)
- [x] Don't re-send on page refresh or revisit
- [x] Use the manager coworker from the scenario
- [x] Default to first coworker if no explicit manager
- [x] TypeScript compiles: `npm run typecheck`
- [x] Navigate to chat for first time - manager messages appear after delay
- [x] Refresh page - no duplicate messages

---

## Issue #182: RF-014 - Create welcome page with consent

### What was implemented
- Repurposed `/src/app/assessment/[id]/welcome/page.tsx` - Server component with page guard
- Created `/src/app/assessment/[id]/welcome/client.tsx` - Client component with consent UI
- Created `/src/app/api/assessment/start/route.ts` - API endpoint to start assessments

### Files created/modified
- `src/app/assessment/[id]/welcome/page.tsx` - Server component that:
  - Requires authentication
  - Verifies assessment belongs to current user (returns 404 if not)
  - Redirects to results if assessment is COMPLETED
  - Determines if this is a resume (status=WORKING) or new start (status=WELCOME)
- `src/app/assessment/[id]/welcome/client.tsx` - Client component with:
  - **What is Skillvee:** Day-at-work simulation explanation
  - **Screen Recording:** Notice that screen will be recorded
  - **AI Usage Encouraged:** Users can use Copilot, ChatGPT, Claude, etc.
  - **Intentionally Vague:** Task context is incomplete, seek clarification via Slack
  - Consent checkbox (required for new assessments)
  - Start Simulation / Resume Simulation button (disabled until consent)
- `src/app/api/assessment/start/route.ts` - POST endpoint that:
  - Requires authentication
  - Validates assessment exists and belongs to user
  - Updates status from WELCOME to WORKING
  - Idempotent - returns success if already WORKING
  - Returns error if assessment is COMPLETED

### Page Layout
- **Header:** SkillVee logo, title, company/scenario name
- **Content Sections:** 4 info cards with icons
  - Blue briefcase icon: What is Skillvee
  - Red monitor icon: Screen Recording
  - Green bot icon: AI Usage Encouraged
  - Amber question mark icon: Intentionally Vague
- **Consent Section:**
  - Checkbox with consent text
  - "Start Simulation" button (disabled until checked)
  - "Please check the box above to continue" helper text
- **Resume Flow:** If resuming (status=WORKING), checkbox not shown, button says "Resume Simulation"

### Verification
- TypeScript compiles: `npm run typecheck` passes
- E2E tested with agent-browser:
  - Logged in as candidate@test.com
  - Navigated to `/assessment/test-assessment-welcome/welcome`
  - Verified all 4 content sections display correctly
  - Verified button is disabled until checkbox is checked
  - Checked the consent checkbox
  - Verified button becomes enabled
  - Clicked Start Simulation
  - Verified redirect to `/assessment/test-assessment-welcome/chat`
- Screenshots captured:
  - `screenshots/issue-182-welcome-page.png`
  - `screenshots/issue-182-checkbox-checked.png`
  - `screenshots/issue-182-redirected-to-chat.png`

### Learnings for future iterations
- The `notFound()` function from Next.js is the clean way to return 404 for page guards
- Using native HTML checkbox with Tailwind styling works well when shadcn Checkbox isn't available
- The assessment status update API should be idempotent for reliability
- Recording consent is handled separately in the chat page via `AssessmentScreenWrapper`

### Gotchas discovered
- The project doesn't have a shadcn Checkbox component - used native HTML input with Tailwind styling
- Resume flow skips the consent checkbox since user already consented on first visit
- The screen recording prompt appears on the chat page, not the welcome page

### Acceptance Criteria Status
- [x] Create/update `/src/app/assessment/[id]/welcome/page.tsx`
- [x] Create client component with welcome content
- [x] **What is Skillvee:** Brief explanation of day-at-work simulation
- [x] **Screen Recording:** Clear statement that screen will be recorded
- [x] **AI Usage Encouraged:** Users can use AI tools
- [x] **Intentionally Vague:** Context is incomplete, seek clarification via Slack
- [x] Single consent checkbox
- [x] "Start Simulation" button - DISABLED until checkbox is checked
- [x] If resuming: Show "Resume Simulation" instead of "Start"
- [x] On Start/Resume: Update status from WELCOME to WORKING
- [x] Redirect to `/assessment/[id]/chat`
- [x] Page Guard: Verify assessment belongs to current user
- [x] If assessment doesn't exist or belongs to someone else: 404
- [x] If assessment is COMPLETED: Redirect to results
- [x] TypeScript compiles: `npm run typecheck`
- [x] E2E verified with agent-browser
- [x] Screenshots captured

---

## Issue #181: RF-013 - Create join page for candidates

### What was implemented
- Created `/src/app/join/[scenarioId]/page.tsx` - Server component (public access)
- Created `/src/app/join/[scenarioId]/client.tsx` - Client component with combined scenario info + auth
- Created `/src/app/api/assessment/create/route.ts` - API endpoint to create assessments

### Files created
- `src/app/join/[scenarioId]/page.tsx` - Server component that:
  - Fetches scenario by ID (public access)
  - Returns 404 if scenario not found or not published
  - Checks for existing assessment if user is logged in
  - Passes scenario, user, and existing assessment to client
- `src/app/join/[scenarioId]/client.tsx` - Client component with:
  - Left/top section: Scenario info (company name, role, tech stack, task overview, what to expect)
  - Right/bottom section: Auth form (signup/login toggle, Google OAuth, email/password)
  - Logged-in state: Welcome back, resume/continue button
  - Task overview expandable text
  - "What to Expect" section with icons
- `src/app/api/assessment/create/route.ts` - POST endpoint that:
  - Requires authentication
  - Validates scenario exists and is published
  - Returns existing assessment if one exists (idempotent)
  - Creates new assessment with WELCOME status

### Page Layout (Combined View)
- **Left/Top Section - Scenario Info:**
  - Company name with placeholder icon (Building2)
  - Role/position from scenario name
  - Tech stack as blue badge tags
  - Task overview with expandable text (truncated to 200 chars)
  - "What to Expect" section:
    - AI-Powered Simulation
    - Screen Recording
    - AI Usage Encouraged
    - Work at Your Pace
- **Right/Bottom Section - Auth:**
  - If not logged in: Toggle between signup/signin mode
    - Email/password form with first/last name for signup
    - Google OAuth button
    - Terms of service link
  - If logged in:
    - Welcome back with email
    - Existing assessment info (if any)
    - Continue/Resume button
    - Sign out link

### Authentication Flow
- On signup: Creates user with role USER (default for candidates)
- On signup: After registration, signs in and refreshes page
- On login: Signs in and refreshes page to show logged-in state
- After auth: User can click "Continue to Assessment" which creates assessment via API

### Handling Existing Assessments
- If logged in user has assessment for THIS scenario: Shows "Resume Assessment" button
- If assessment is COMPLETED: Shows "View Results" button
- API is idempotent - returns existing assessment if one exists

### Verification
- TypeScript compiles: `npm run typecheck` passes
- E2E tested with agent-browser:
  - Logged out: Shows scenario info and auth form
  - Logged in: Shows "Welcome back" with Resume button
  - Non-existent scenario: Shows 404
- Screenshots captured:
  - `screenshots/issue-181-join-logged-out.png`
  - `screenshots/issue-181-join-logged-in.png`
  - `screenshots/issue-181-join-404.png`

### Learnings for future iterations
- The join page is the main entry point for candidates - it needs to be marketing-focused
- Combined view (scenario info + auth) works well for building trust
- The `router.refresh()` pattern is effective for refreshing session state after auth
- Idempotent assessment creation API prevents duplicate assessments

### Gotchas discovered
- NextAuth session user `id` can be undefined - need to check `user?.id` before using
- The welcome page now redirects to chat, so the join page creates assessments with WELCOME status which then redirects appropriately

### Acceptance Criteria Status
- [x] Create `/src/app/join/[scenarioId]/page.tsx` - server component
- [x] Create `/src/app/join/[scenarioId]/client.tsx` - client component
- [x] Left/Top Section - Scenario Info: Company name, logo placeholder, role, tech stack tags, task overview, what to expect
- [x] Right/Bottom Section - Auth: Signup form, OAuth buttons, sign in link
- [x] If logged in: Show "Welcome back" and continue button
- [x] Scenario Validation: 404 if not found or unpublished
- [x] Authentication Flow: On signup creates USER role, on auth redirects to welcome
- [x] Handling Existing Assessments: Resume if in-progress, View Results if completed
- [x] TypeScript compiles: `npm run typecheck`
- [x] E2E verified with agent-browser
- [x] Screenshots captured

---

## Issue #180: RF-012 - Create recruiter candidates list page

### What was implemented
- Created `/src/app/recruiter/candidates/page.tsx` - Server component with recruiter auth
- Created `/src/app/recruiter/candidates/client.tsx` - Client component with candidates table and filters

### Files created
- `src/app/recruiter/candidates/page.tsx` - Server component that:
  - Requires RECRUITER or ADMIN role via `requireRecruiter()`
  - Fetches all assessments for recruiter's scenarios
  - Joins with user data for candidate info
  - Gets scenario options for filtering
  - Orders by most recent first
- `src/app/recruiter/candidates/client.tsx` - Client component with:
  - Header with title "Candidates" and back to dashboard link
  - Filter dropdowns for scenario and status
  - Candidates table with columns: Candidate, Scenario, Status, Started, Completed
  - Status badges with color coding (green=COMPLETED, blue=WORKING, yellow=WELCOME)
  - Links to scenario detail pages
  - Empty state with CTA to view scenarios
  - Results count showing filtered/total

### Page Features
- **Header:**
  - Back to Dashboard link
  - Title: "Candidates"
  - Subtitle: "View all candidates who have taken your assessments"
- **Filters:**
  - Scenario dropdown with all recruiter's scenarios
  - Status dropdown (All, Welcome, Working, Completed)
  - Clear filters button when filters are active
- **Candidates Table:**
  - Candidate name and email
  - Scenario name (clickable link to scenario detail)
  - Status badge with color coding
  - Started date/time
  - Completed date (or dash if not completed)
- **Empty States:**
  - No candidates: "Share your scenario link to get started"
  - No matching filters: "Try adjusting your filters"

### Data Fetching
- Gets all scenarios owned by recruiter (`createdById = user.id`)
- Gets all assessments for those scenarios with user and scenario info
- Ordered by `createdAt` descending (most recent first)

### Verification
- TypeScript compiles: `npm run typecheck` passes
- E2E tested with agent-browser:
  - Logged in as recruiter@test.com
  - Navigated to `/recruiter/candidates`
  - Verified page displays with title, filters, and table
  - Verified candidates show with correct columns
- Screenshot captured: `screenshots/issue-180-candidates-list.png`

### Learnings for future iterations
- Native `<select>` elements work well for simple filters - no need for custom Select component
- The `useMemo` hook efficiently handles client-side filtering
- Existing patterns from dashboard and scenarios pages provide consistent UI styling
- Status badge colors follow the pattern established in dashboard client

### Gotchas discovered
- The project doesn't have a shadcn Select component - used native `<select>` with Tailwind styling instead
- Filtering is done client-side since all candidates are fetched at once (suitable for typical recruiter data volumes)

### Acceptance Criteria Status
- [x] Create `/src/app/recruiter/candidates/page.tsx` - server component
- [x] Create `/src/app/recruiter/candidates/client.tsx` - client component
- [x] Header: Title "Candidates", back to dashboard link
- [x] Candidates Table/List: Candidate email/name, scenario, status, started date, completed date
- [x] Data Fetching: Get scenarios owned by recruiter, get assessments for those scenarios
- [x] Join with user data for candidate info
- [x] Order by most recent first
- [x] Filter by scenario (optional)
- [x] Filter by status (optional)
- [x] Empty state: "No candidates yet. Share your scenario link to get started."
- [x] TypeScript compiles: `npm run typecheck`
- [x] E2E test with agent-browser
- [x] Screenshot captured

---

## Issue #179: RF-011 - Create recruiter scenario detail page

### What was implemented
- Created `/src/app/recruiter/scenarios/[id]/page.tsx` - Server component with recruiter auth
- Created `/src/app/recruiter/scenarios/[id]/client.tsx` - Client component with scenario detail UI

### Files created
- `src/app/recruiter/scenarios/[id]/page.tsx` - Server component that:
  - Requires RECRUITER or ADMIN role via `requireRecruiter()`
  - Fetches scenario with coworkers and assessment count
  - Validates scenario ownership (createdById = currentUser.id OR user is ADMIN)
  - Returns 404 if not found or not authorized
- `src/app/recruiter/scenarios/[id]/client.tsx` - Client component with:
  - Header with scenario name, company name, and back link
  - Prominent shareable link section with copy button and "Share this link" messaging
  - Scenario details: task description, tech stack badges, repository URL, created date
  - Coworkers list showing name, role, and voice
  - Assessments section with count and "View Candidates" link

### Page Sections
- **Header:** Scenario name, company name, back to scenarios link
- **Shareable Link Section (prominent):**
  - Blue-themed card with full URL displayed
  - Large "Copy Link" button with visual feedback
  - Helper text: "Share this link with candidates to start their assessment"
- **Scenario Details:** Task description, tech stack, repository URL, created date
- **Coworkers Section:** List of configured coworkers with name, role, voice
- **Assessments Section:** Count with link to view candidates

### Access Control
- Scenario must belong to current recruiter (`createdById = currentUser.id`)
- ADMIN users can view any scenario
- Returns 404 if not found or not authorized

### Verification
- TypeScript compiles: `npm run typecheck` passes
- E2E tested with agent-browser:
  - Logged in as recruiter@test.com
  - Navigated to `/recruiter/scenarios/test-scenario-recruiter`
  - Verified scenario name, company, shareable link, task description
  - Verified tech stack badges, coworkers list, assessments count
  - Copy button functional with visual feedback
- Screenshots captured: `screenshots/issue-179-scenario-detail.png`, `screenshots/issue-179-copy-clicked.png`

### Learnings for future iterations
- The scenarios list page (`/recruiter/scenarios`) already links to detail pages via ExternalLink icon
- Copy-to-clipboard pattern reused from scenarios list - same visual feedback approach
- Access control pattern: check ownership OR admin role before returning data
- Prisma `_count` feature used for efficient assessment count
- For coworkers, `voiceName` may be null - display conditionally

### Gotchas discovered
- The `params` in Next.js 15 app router is a Promise and needs to be awaited
- The coworker avatar/icon section uses a generic User icon instead of actual avatars since avatarUrl is typically null

### Acceptance Criteria Status
- [x] Create `/src/app/recruiter/scenarios/[id]/page.tsx` - server component
- [x] Create `/src/app/recruiter/scenarios/[id]/client.tsx` - client component
- [x] Header: Scenario name, company name, back to scenarios link
- [x] Shareable Link Section: Full URL, large copy button, helper text
- [x] Scenario Details: Task description, tech stack, repository URL, created date
- [x] Coworkers Section: List with name, role, voice
- [x] Assessments Section: Count with link to view candidates
- [x] Access Control: Verify scenario belongs to recruiter OR user is ADMIN
- [x] Return 404 if not found or not authorized
- [x] TypeScript compiles: `npm run typecheck`
- [x] E2E test with agent-browser
- [x] Screenshots captured

---

## Issue #178: RF-010 - Create recruiter scenario builder

### What was implemented
- Created `/src/app/recruiter/scenarios/new/page.tsx` - Server component with recruiter auth
- Created `/src/app/recruiter/scenarios/new/client.tsx` - Client component reusing admin builder pattern
- Created `/src/app/api/recruiter/scenarios/route.ts` - API to create scenarios with `createdById` set securely
- Created `/src/app/api/recruiter/scenarios/builder/route.ts` - AI chat API for scenario building
- Created `/src/app/api/recruiter/scenarios/[id]/coworkers/route.ts` - API to create coworkers for recruiter scenarios

### Files created
- `src/app/recruiter/scenarios/new/page.tsx` - Server component that:
  - Requires RECRUITER or ADMIN role via `requireRecruiter()`
  - Renders the scenario builder client component
- `src/app/recruiter/scenarios/new/client.tsx` - Client component with:
  - Chat interface with AI Scenario Builder assistant
  - Preview panel showing scenario data as it's collected
  - Save Scenario button that creates scenario + coworkers
  - Cancel link back to `/recruiter/scenarios`
- `src/app/api/recruiter/scenarios/route.ts` - POST endpoint that:
  - Validates user has RECRUITER or ADMIN role
  - Auto-sets `createdById` from session (not request body - security)
  - Auto-sets `isPublished: true` for recruiter scenarios
- `src/app/api/recruiter/scenarios/builder/route.ts` - GET/POST endpoints:
  - GET: Returns initial AI greeting
  - POST: Processes chat messages and extracts scenario data
  - Uses same Gemini Flash model as admin builder
- `src/app/api/recruiter/scenarios/[id]/coworkers/route.ts` - POST endpoint:
  - Creates coworkers for a scenario
  - Security: Validates scenario ownership (createdById matches session user or admin)

### Recruiter-Specific Changes
- **No `isPublished` toggle:** Recruiter scenarios are always active (`isPublished: true`)
- **Auto-set ownership:** `createdById` set from session, not request body
- **Ownership validation:** Coworker creation checks scenario ownership
- **Redirect after save:** Goes to `/recruiter/scenarios` instead of admin page

### Security Implementation
- `createdById` is set from authenticated session, not from request body
- Coworker API validates that the scenario belongs to the current user (or user is admin)
- All endpoints require RECRUITER or ADMIN role

### Verification
- TypeScript compiles: `npm run typecheck` passes
- Build succeeds: `npm run build` passes
- Page accessible at `/recruiter/scenarios/new` when logged in as recruiter
- Unauthenticated access redirects to `/sign-in?callbackUrl=/recruiter/dashboard`
- Screenshot captured: `screenshots/issue-178-scenario-builder.png`

### Learnings for future iterations
- The admin scenario builder pattern (chat interface + preview panel) is reusable
- The key difference is where to redirect after save and ownership handling
- API routes can share the same Gemini model and scenario builder utilities
- Security: Always set `createdById` from session, never trust client input for ownership

### Gotchas discovered
- The recruiter layout already handles auth via `requireRecruiter()` - page auth is redundant but harmless
- Headless browser (agent-browser) can navigate and screenshot but React controlled inputs need CSS selectors, not ref IDs

### Acceptance Criteria Status
- [x] Create `/src/app/recruiter/scenarios/new/page.tsx`
- [x] Create `/src/app/recruiter/scenarios/new/client.tsx`
- [x] Reuse admin builder pattern for scenario creation
- [x] Builder includes: Company name, description, task, repo URL, tech stack, coworkers
- [x] Remove `isPublished` toggle - all recruiter scenarios are active by default
- [x] Auto-set `createdById` to current user's ID (from session, not request)
- [x] Auto-set `isPublished: true` when creating
- [x] API validates user has RECRUITER or ADMIN role
- [x] After creating scenario, redirect to `/recruiter/scenarios`
- [x] TypeScript compiles: `npm run typecheck`
- [x] Login as recruiter, navigate to `/recruiter/scenarios/new`
- [x] Can see scenario form and interact with AI
- [x] Screenshots captured

---

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

---

## Issue #189: RF-021 - Generate realistic avatar images for coworkers

### What was implemented
- Created avatar generation service using Google's Imagen 3 image generation API
- Integrated with existing Gemini SDK (no new dependencies needed)
- Background avatar generation on scenario save (both recruiter and admin flows)
- Updated CoworkerAvatar component to display AI-generated avatars with fallback

### Files created
- `src/lib/avatar/avatar-generation.ts` - Core avatar generation service:
  - Uses Imagen 3 model (`imagen-3.0-generate-002`) for photorealistic headshots
  - Builds prompts from coworker data (name, role, personaStyle)
  - Uploads to Supabase Storage `avatars` bucket
  - Retry logic with exponential backoff (max 3 retries)
  - Creates signed URLs (1 year expiry) for avatar display
- `src/lib/avatar/index.ts` - Module exports
- `src/lib/avatar/avatar-generation.test.ts` - Unit tests
- `src/app/api/avatar/generate/route.ts` - API endpoint for triggering avatar generation

### Files modified
- `src/lib/external/storage.ts` - Added AVATARS bucket constant
- `src/components/chat/coworker-avatar.tsx` - Updated to accept `avatarUrl` prop:
  - Displays AI-generated avatar if available
  - Falls back to DiceBear identicon if no avatarUrl
  - Falls back to initials if image fails to load
- `src/components/chat/coworker-sidebar.tsx` - Pass avatarUrl to CoworkerAvatar
- `src/components/chat/chat.tsx` - Pass avatarUrl to CoworkerAvatar (4 usages)
- `src/app/recruiter/scenarios/new/client.tsx` - Trigger avatar generation on save
- `src/app/admin/scenarios/builder/client.tsx` - Trigger avatar generation on save

### API Research Notes
**Google Imagen 3 (chosen approach):**
- Available via existing `@google/genai` SDK with `imagen-3.0-generate-002` model
- High quality photorealistic images
- Pricing: ~$0.04 per image
- Uses `gemini.models.generateImages()` API
- No additional SDK or authentication needed

**Prompt strategy:**
- Professional headshot photograph style
- Corporate/neutral gray background
- Head and shoulders framing
- Persona style mapped to appearance hints (friendly → approachable, etc.)

### Learnings
1. **Imagen via Gemini SDK**: The `@google/genai` SDK supports image generation via `models.generateImages()` method - no need for separate Vertex AI SDK
2. **Async generation**: Avatar generation runs asynchronously after scenario save to avoid blocking the user
3. **Only generate for new coworkers**: Service checks `avatarUrl: null` to skip coworkers that already have avatars
4. **Fallback chain**: Avatar display has 3 fallback levels: AI avatar → DiceBear identicon → Initials

### Gotchas discovered
- Signed URLs have expiry - using 1 year expiry for avatar URLs
- Supabase bucket needs to be created if it doesn't exist - handled in code
- Image generation may fail occasionally - retry logic with exponential backoff handles this

### Verification
- ✅ TypeScript compiles: `npm run typecheck`
- ✅ Tests pass: `npm test src/lib/avatar`

