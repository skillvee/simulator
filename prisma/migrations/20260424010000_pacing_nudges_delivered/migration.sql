-- Slice 4: pacing-nudge idempotency marker
-- Adds an array column on Assessment listing which pacing nudges have already
-- been delivered (values: 'checkin', 'wrapup', 'cap'). The nudge endpoint
-- checks this before generating + persisting a message so reloads don't
-- double-fire.

ALTER TABLE "Assessment"
  ADD COLUMN IF NOT EXISTS "pacingNudgesDelivered" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
