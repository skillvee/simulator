# prisma - Database Schema

Supabase Postgres with Prisma ORM. pgvector for semantic search.

## JSON Fields

Double-cast always: `as unknown as Type` (read), `as unknown as Prisma.InputJsonValue` (write).
For null: use `Prisma.JsonNull` (value import, not type).

## pgvector

Schema: `Unsupported("vector(768)")`. Must use raw SQL for all vector operations.

## Patterns

- Use `upsert` for idempotent operations
- Cascade deletes handle related records automatically
- Clear `.next/` cache after schema changes

## 8 Assessment Dimensions

COMMUNICATION, PROBLEM_SOLVING, TECHNICAL_KNOWLEDGE, COLLABORATION, ADAPTABILITY, LEADERSHIP, CREATIVITY, TIME_MANAGEMENT

## Scores & Percentiles

- Score scale is **1-4**, not 1-5 — VideoAssessment overall and dimension scores
- VideoAssessment has a UNIQUE constraint on `assessmentId` — 1:1 relationship, check existence before creating
- Percentiles stored in `Assessment.report.percentiles.overall` (JSON field), NOT in VideoAssessment table. Computed after video evaluation. Per-dimension at `percentiles.[dimensionSlug]`

## Migrations

- `prisma db push` fails when changing enums or adding constraints with existing data — use raw SQL via `prisma db execute --stdin` instead
