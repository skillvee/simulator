-- v2 resource pipeline — additive only
-- Run: psql $DIRECT_URL -f prisma/migrations/20260424_v2_resource_pipeline.sql

-- 1. Add v2 fields to Scenario
ALTER TABLE "Scenario"
  ADD COLUMN IF NOT EXISTS "plan" JSONB,
  ADD COLUMN IF NOT EXISTS "docs" JSONB,
  ADD COLUMN IF NOT EXISTS "resourcePipelineMeta" JSONB,
  ADD COLUMN IF NOT EXISTS "pipelineVersion" TEXT NOT NULL DEFAULT 'v1';

-- 2. Create ScenarioDataFile
CREATE TABLE IF NOT EXISTS "ScenarioDataFile" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "bucket" TEXT NOT NULL DEFAULT 'scenario-data',
  "rowCount" INTEGER,
  "byteSize" INTEGER,
  "sha256" TEXT,
  "schemaJson" JSONB,
  "previewRows" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScenarioDataFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScenarioDataFile_scenarioId_idx" ON "ScenarioDataFile"("scenarioId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScenarioDataFile_scenarioId_fkey'
  ) THEN
    ALTER TABLE "ScenarioDataFile"
      ADD CONSTRAINT "ScenarioDataFile_scenarioId_fkey"
      FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
