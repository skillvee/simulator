-- AlterTable
-- Make repoUrl nullable (system-managed, provisioned asynchronously)
-- Existing rows keep their values
ALTER TABLE "Scenario" ALTER COLUMN "repoUrl" DROP NOT NULL;
