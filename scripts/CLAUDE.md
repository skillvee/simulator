# scripts/

Utility scripts run via `npx tsx scripts/<name>.ts` unless noted otherwise.

## Categories

### Evaluation & Prompt Testing
- `run-evals.ts` — prompt evals across 15 scenarios. Flags: `--name`, `--category`, `--scenarios`, `--prompt-file`, `--list`, `--verbose`.
- `compare-prompt-versions.ts <scenarioId>` — diff Step 1+2 outputs before/after prompt change (no DB writes). `--step1-only` to skip Step 2.
- `eval-resource-quality.ts` — evaluate generated resources for quality. `--runs N`, `--scenario <index>`.
- `test-resource-quality.ts` — generate resources for 10 roles and check quality metrics.
- `test-video-evaluation.ts` — upload local video to Gemini File API and validate evaluation prompt + JSON parsing (no DB).
- `run-real-assessment.ts` — full pipeline: upload video → evaluate → create fake candidate → store on recruiter dashboard.
- `test-cv-parser.ts` — debug CV parsing with Gemini.

### Scenario Management
- `trigger-v2-pipeline.ts <scenarioId> [<scenarioId>...]` — run v2 resource pipeline (Steps 1–4), bypasses auth.
- `regenerate-plan-and-docs.ts <scenarioId>` — re-run Step 1 only with current prompt.
- `create-test-scenario.ts <preset>` — create v2 test scenario from hand-crafted JD-style input.
- `seed-challenges.ts` — idempotent: one challenge scenario per role archetype for /candidates.
- `seed-data-archetypes.ts` — verify data archetypes (data_analyst, data_scientist, analytics_engineer) exist.
- `setup-scenario-data-bucket.ts` — idempotent Supabase Storage bucket provisioning for scenario CSV uploads.

### Assessment State & Diagnostics
- `diagnose-assessment.ts <id>` — dump everything about an assessment's report pipeline.
- `inspect-raw.ts <id>` — inspect VideoAssessment raw AI response (status, summary, scores).
- `clear-report.ts <id>` — nullify the report field for an assessment.
- `reset-video-assessment.ts <id>` — reset stuck VideoAssessment to PENDING with retryCount=0.
- `demo-reset.ts` — reset demo assessment to fresh WELCOME state. Also available as `npm run demo:reset`.
- `read-sim.ts <scenarioId> [summary|full|repo|docs]` — read scenario data in various formats.

### Data Backfill & Maintenance
- `backfill-embeddings.ts` — backfill embeddings for COMPLETED VideoAssessments. Dry-run by default; `--run` or `<id>` to apply.
- `backfill-recording-seekability.ts [id]` — fix merged.webm seekability. Dry-run by default; `--apply` to write.
- `generate-avatar-pool.ts` — batch generate ~80 profile photos via Imagen 4 (8 ethnic groups × 2 genders × 5).

### Localization
- `create-spanish-assessment.ts` — create assessment for Spanish scenario.
- `check-scenario-language.ts` — check language setting for test-scenario-mobile.
- `update-scenario-language.ts` — update test-scenario-mobile language to Spanish.
- `run-i18n-coverage.ts` — start dev server and run i18n coverage tests.
- `test-spanish-results.ts` — test Spanish localization results.

## Non-obvious rules

- **Dry-run by default:** `backfill-embeddings.ts` and `backfill-recording-seekability.ts` require explicit flags to apply changes.
- **Pipeline scripts bypass auth:** `trigger-v2-pipeline.ts` calls the pipeline directly — it does not go through API routes.
- **Evals after prompt changes:** Always run `npx tsx scripts/run-evals.ts --name "<change>"` after modifying prompts or conversation flow.
- **`record-hero/` and `yc-outreach/`** are subdirectories with their own tooling, not standalone scripts.
