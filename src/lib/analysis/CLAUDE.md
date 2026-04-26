# src/lib/analysis/

Report generation pipeline: video evaluation → scoring → narrative → persistence.

## Pipeline flow

```
fetchAssessmentForReport()          # report-data.ts — gather assessment + timing + conversations + recordings
        ↓
evaluateVideo()                     # video-evaluation.ts — send merged recording to Gemini 3 Pro with role rubric
        ↓
convertRubricToReport()             # report-scoring.ts — map role-specific dimensions → generic categories
        ↓
generateCandidateNarrative()        # candidate-narrative.ts — second LLM pass (Gemini Flash) for growth-framed feedback
        ↓
reportToPrismaJson()                # report-scoring.ts — serialize and persist to assessment row
```

**Entry points:** `generateOrFetchReport()` (server RSC helper) and `resolveReportStatus()` (candidate polling with self-healing).

## Scoring

- **Scale:** 1–4 rubric scores from Gemini evaluation.
- **Level mapping:** `≥3.5` exceptional, `≥2.5` strong, `≥1.5` adequate, `<1.5` needs_improvement.
- **Dimension → category mapping:** `RUBRIC_DIM_TO_CATEGORY` maps role-family-specific slugs (e.g. `technical_execution`) to generic report categories (e.g. `code_quality`). When multiple dimensions map to the same category, the highest score wins.
- **Recommendations** auto-generated for skills scoring ≤2.
- **Notable observations:** top 5 highest-scoring behaviors (≥3) with timestamps.

## Video evaluation

- **Model:** `gemini-3-pro-preview` with role-specific rubric from `@/lib/rubric`.
- **Merge:** `mergeRecordingChunks()` concatenates all chunks into single WebM (max 500 MB in-memory), uploads to Gemini File API, polls for ACTIVE status (timeout 120s).
- **Status machine:** `PENDING → PROCESSING → COMPLETED | FAILED`. Max 3 attempts. Stuck >10 min in PROCESSING → auto-FAILED.
- **Post-evaluation:** fires `generateAndStoreEmbeddings()` for candidate search.

## Self-healing status resolver

`resolveReportStatus()` handles every edge case during candidate polling:
- Report present → ready.
- No recording → build minimal no-evidence fallback → ready.
- VideoAssessment missing → create PENDING + trigger evaluation.
- FAILED with retries left → reset + retrigger.
- COMPLETED but report null → finalize (convert + narrative + persist).

## No-evidence fallback

When screen recording is missing, the pipeline returns a complete but minimal report: empty `dimensionScores`, hardcoded bilingual message (EN/ES) as summary, `overallScore: null`, `evaluationConfidence: "low"`. Skips Gemini narrative pass.

## Multilingual support

- `getDimensionLabel()` / `getLevelLabel()` use `next-intl/server` with `assessment.dimensions` / `assessment.levels` namespaces.
- Language propagated through pipeline from scenario → report → candidate narrative prompt.
- No-evidence fallback has hardcoded EN/ES messages (not from i18n).

## Migration (report-migration.ts)

`migrateVideoEvaluationToRubric()` converts legacy v1 format (`skill_scores` object) to current `RubricAssessmentOutput`. Defaults `roleFamilySlug` to `"engineering"` for legacy data. Returns `null` for unrecognizable formats.

## Logging

Two separate systems:
- `VideoAssessmentLogger` (assessment-logging.ts) — tracks video evaluation events and state transitions.
- `logAICall()` (ai-call-logging.ts) — tracks AI API calls with prompt versions.

## Non-obvious rules

- **Barrel export excludes** `auto-report.ts` and `report-status.ts` — import those directly by path.
- **Candidate narrative is a second LLM pass** (Gemini Flash, not Pro) that softens and reframes the recruiter-facing rubric output. Falls back to recruiter summary on failure.
- **`reportToPrismaJson()`** handles the Prisma JSON double-cast pattern (`as unknown as Prisma.InputJsonValue`).
