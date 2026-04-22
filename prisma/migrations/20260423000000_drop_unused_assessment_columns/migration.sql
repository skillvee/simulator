-- Drop 4 unused columns on Assessment.
--
-- These columns were restored in prod via two out-of-band migrations on
-- 2026-04-22 (20260422000000_restore_assessment_columns and
-- 20260422000001_restore_assessment_columns_2) whose SQL files never landed in
-- git. The columns were originally removed in commit 67b7845 ("feat: remove
-- PR/CI infrastructure") and main's code no longer reads them:
--
--   ciStatus                 - 0 non-null rows; code refs are for an unrelated
--                              PrCiStatus runtime type (src/lib/external/github/client.ts)
--   prSnapshot               - 0 non-null rows; no code refs
--   prUrl                    - 0 non-null rows; code refs are fields on the same
--                              PrCiStatus runtime type, not this column
--   managerMessagesStarted   - 98 rows populated but only referenced by a comment
--                              at src/components/chat/chat.tsx:202
--
-- No FKs, no indexes on any of them. Safe to drop.

ALTER TABLE "Assessment"
  DROP COLUMN IF EXISTS "ciStatus",
  DROP COLUMN IF EXISTS "managerMessagesStarted",
  DROP COLUMN IF EXISTS "prSnapshot",
  DROP COLUMN IF EXISTS "prUrl";
