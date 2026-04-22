-- Reconstructed migration: add Coworker gender + ethnicity enums.
--
-- HISTORY NOTE: This migration was applied to production via out-of-band SQL
-- on 2026-04-19 (recorded in _prisma_migrations) but its migration.sql file
-- was never committed to git. The end state below is reconstructed from the
-- current production schema and matches what main's prisma/schema.prisma
-- describes (Coworker.gender, Coworker.ethnicity, and the two enums).
--
-- The original migration may have used a different intermediate representation
-- (e.g., TEXT columns converted to enums in a later commit — see 78de050
-- "refactor: make Coworker gender/ethnicity Prisma enums"). For fresh-DB
-- deployments only the end state matters, which this file produces correctly.
--
-- Verified: `prisma migrate diff --from-migrations prisma/migrations
--            --to-url $DIRECT_URL` returns an empty diff after this file
--            lands, confirming the reconstruction matches prod.

-- CreateEnum
CREATE TYPE "CoworkerGender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "CoworkerEthnicity" AS ENUM (
    'east_asian',
    'south_asian',
    'southeast_asian',
    'white',
    'black',
    'hispanic',
    'middle_eastern',
    'mixed'
);

-- AlterTable
ALTER TABLE "Coworker"
    ADD COLUMN "gender" "CoworkerGender",
    ADD COLUMN "ethnicity" "CoworkerEthnicity";
