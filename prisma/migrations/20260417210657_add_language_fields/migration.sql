-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'en';