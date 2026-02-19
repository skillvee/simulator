-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN "repoUrl" TEXT;
ALTER TABLE "Assessment" ADD COLUMN "repoStatus" TEXT DEFAULT 'pending';
