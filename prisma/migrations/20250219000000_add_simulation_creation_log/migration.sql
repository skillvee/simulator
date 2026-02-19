-- CreateEnum
CREATE TYPE "SimulationCreationStatus" AS ENUM ('STARTED', 'GENERATING', 'SAVING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SimulationCreationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SimulationCreationStatus" NOT NULL DEFAULT 'STARTED',
    "roleTitle" TEXT,
    "companyName" TEXT,
    "techStack" TEXT[],
    "seniorityLevel" TEXT,
    "archetypeId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'guided',
    "scenarioId" TEXT,
    "failedStep" TEXT,
    "errorMessage" TEXT,
    "errorDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SimulationCreationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimulationCreationLog_userId_idx" ON "SimulationCreationLog"("userId");

-- CreateIndex
CREATE INDEX "SimulationCreationLog_status_idx" ON "SimulationCreationLog"("status");

-- CreateIndex
CREATE INDEX "SimulationCreationLog_createdAt_idx" ON "SimulationCreationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SimulationCreationLog" ADD CONSTRAINT "SimulationCreationLog_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationCreationLog" ADD CONSTRAINT "SimulationCreationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
