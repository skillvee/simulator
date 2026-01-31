# Ralph Progress Log

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
