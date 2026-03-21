-- CreateIndex
CREATE INDEX "Coworker_scenarioId_idx" ON "Coworker"("scenarioId");

-- CreateIndex
CREATE INDEX "Assessment_userId_idx" ON "Assessment"("userId");

-- CreateIndex
CREATE INDEX "Assessment_scenarioId_userId_idx" ON "Assessment"("scenarioId", "userId");

-- CreateIndex
CREATE INDEX "Recording_assessmentId_idx" ON "Recording"("assessmentId");
