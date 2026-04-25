-- Slice 1 of the 4-phase assessment restructure.
-- Adds three new AssessmentStatus values and per-phase timestamp columns.
--
-- Existing values (WELCOME, WORKING, COMPLETED) are preserved — no remapping
-- of existing rows is needed. New rows will flow through the new states via
-- the application layer.
--
-- MANUAL APPLICATION (per prisma/CLAUDE.md):
--   cat prisma/migrations/20260424000000_assessment_phase_states/migration.sql \
--     | npx prisma db execute --stdin
--   npx prisma migrate resolve --applied 20260424000000_assessment_phase_states

-- Step 1: Extend the AssessmentStatus enum (additive — safe on existing data).
-- Using ADD VALUE IF NOT EXISTS so re-running the migration is idempotent.
ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'REVIEW_MATERIALS';
ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'KICKOFF_CALL';
ALTER TYPE "AssessmentStatus" ADD VALUE IF NOT EXISTS 'WALKTHROUGH_CALL';

-- Step 2: Add per-phase timestamp columns on Assessment.
-- All nullable — legacy assessments that pre-date the new flow stay on
-- workingStartedAt; the application reads `reviewStartedAt ?? workingStartedAt`
-- when computing total session elapsed time.
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "reviewStartedAt"     TIMESTAMP(3);
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "kickoffStartedAt"    TIMESTAMP(3);
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "kickoffEndedAt"      TIMESTAMP(3);
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "workStartedAt"       TIMESTAMP(3);
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "walkthroughStartedAt" TIMESTAMP(3);
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "walkthroughEndedAt"   TIMESTAMP(3);

-- Step 3: Backfill reviewStartedAt for existing in-flight rows so the new
-- phase helpers can compute elapsed time without a fallback branch.
UPDATE "Assessment"
SET    "reviewStartedAt" = "workingStartedAt"
WHERE  "workingStartedAt" IS NOT NULL
  AND  "reviewStartedAt" IS NULL;
