-- Slice 5 cleanup: drop deliverable upload columns.
-- The walkthrough is now a live screen-share, not a file upload, so these
-- fields are dead. The /api/assessment/deliverable route and the
-- uploadDeliverable client helper have already been removed.
--
-- Safe drop: any in-flight assessments don't depend on these. No FK refs.

ALTER TABLE "Assessment" DROP COLUMN IF EXISTS "deliverablePath";
ALTER TABLE "Assessment" DROP COLUMN IF EXISTS "deliverableFilename";
ALTER TABLE "Assessment" DROP COLUMN IF EXISTS "deliverableSummary";
