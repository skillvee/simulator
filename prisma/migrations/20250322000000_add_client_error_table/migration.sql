-- CreateEnum
CREATE TYPE "ClientErrorType" AS ENUM ('UNHANDLED_EXCEPTION', 'CONSOLE_ERROR', 'CONSOLE_WARN', 'CONSOLE_LOG', 'REACT_BOUNDARY');

-- CreateTable
CREATE TABLE "ClientError" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT,
    "userId" TEXT,
    "errorType" "ClientErrorType" NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "componentName" TEXT,
    "url" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientError_assessmentId_timestamp_idx" ON "ClientError"("assessmentId", "timestamp");

-- CreateIndex
CREATE INDEX "ClientError_errorType_timestamp_idx" ON "ClientError"("errorType", "timestamp");

-- AddForeignKey
ALTER TABLE "ClientError" ADD CONSTRAINT "ClientError_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientError" ADD CONSTRAINT "ClientError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
