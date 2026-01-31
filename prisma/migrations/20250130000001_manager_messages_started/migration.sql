-- RF-015: Add manager messages started flag to Assessment
-- This field tracks whether the manager's initial auto-start messages have been sent
-- to prevent duplicate messages on page refresh or revisit

ALTER TABLE "Assessment" ADD COLUMN "managerMessagesStarted" BOOLEAN NOT NULL DEFAULT false;
