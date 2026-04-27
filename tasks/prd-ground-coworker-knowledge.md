# PRD: Ground Coworker Knowledge in the Resource Pipeline

## Overview

Today, AI coworker personas are generated during scenario creation in the wizard, *before* the v2 resource pipeline runs Step 1 (plan + docs). Their generation prompt sees only `taskDescription`, `companyDescription`, and `techStack` — never the actual artifacts the candidate will look at. As a result, coworkers regularly reference concrete files (`docker-compose.yml`), DB engines (MySQL when the task is Oracle), and schemas that don't exist in the bundle. When the candidate chats with a coworker during the simulation, the persona doubles down on the hallucination and the simulation breaks ("I can't find the docker-compose.yml you mentioned" → "It's in the engine's tests folder" — the file doesn't exist).

PR [#418](https://github.com/skillvee/simulator/pull/418) shipped the near-term backstops — the judge now sees coworker knowledge, and a deterministic regex validator flags missing path references in `Step 3`. This PRD is the long-term fix: re-ground coworker knowledge against the finalized bundle so hallucinations can't form in the first place.

## Goals

- Eliminate concrete-artifact hallucinations in coworker chat (referenced files / DB engines / schemas / endpoints all exist in the bundle).
- Step 3 coworker validator passes on ≥ 95% of newly created simulations (vs. the current rate, which we'll measure as a baseline before launch).
- No measurable regression in scenario-creation latency from the recruiter's perspective during the wizard step. Pipeline median end-to-end time may grow by ≤ 30s.
- No new manual recruiter action — the regrounding is automatic.

## User Stories

### US-001: Grounded coworker generator library

**Description**: As a developer, I want a `groundCoworkerKnowledge()` function that takes a scenario's existing coworkers + plan + docs + artifact summary and returns refreshed `knowledge` arrays grounded in the actual bundle.

**Acceptance Criteria**:

- [ ] New file `src/lib/scenarios/coworker-grounder.ts` exports `groundCoworkerKnowledge(input): Promise<GroundCoworkerResult>`.
- [ ] Input is `{ scenarioId, coworkers: CoworkerIdentity[], plan, docs, artifactSummary }`. `CoworkerIdentity` is `{ id, name, role, personaStyle, personality, language }` — only fields needed to keep persona consistent.
- [ ] Output is `{ updates: Array<{ coworkerId, knowledge: KnowledgeEntry[] }> }`. One entry per input coworker, in the same order. `knowledge` matches the existing `Coworker.knowledge` JSON shape (`{ topic, response, isCritical?, triggerKeywords? }`).
- [ ] New prompt file `src/prompts/recruiter/coworker-grounder.ts` exports `COWORKER_GROUNDER_PROMPT_VERSION` = `"v1.0"` and `buildCoworkerGrounderPrompt()`. The prompt receives the existing coworker name + role + persona style, the scenario context, the plan, the docs, and a list of concrete artifact references it MUST stay within (file tree, CSV filenames, DB engines mentioned in artifacts).
- [ ] The prompt instructs the model to only generate knowledge entries that reference artifacts present in the bundle. Forbid inventing new files, DB engines, or schemas.
- [ ] Uses `gemini-3.1-pro-preview` with `thinkingLevel: "high"` (matches judge model) for higher fidelity.
- [ ] Output is validated against a Zod schema; parse errors throw with a descriptive message.
- [ ] Unit test in `src/lib/scenarios/coworker-grounder.test.ts` covers: schema validation success path, schema validation failure path, identity-preservation expectation (caller-side test that fields outside `knowledge` are not included in the result).

### US-002: Wire grounded regeneration into the orchestrator

**Description**: As a developer, I want `runArtifactPipeline` to run the coworker grounder as a final step after the judge passes, so coworker knowledge is refreshed against the finalized bundle.

**Acceptance Criteria**:

- [ ] In `src/lib/scenarios/orchestrator.ts`, after the judge returns `passed: true && score >= 0.85 && blockingIssues.length === 0`, the orchestrator runs a new `runStep5_groundCoworkers()` step before setting `status: "passed"`.
- [ ] `runStep5_groundCoworkers()` loads the scenario's coworkers from the DB, calls `groundCoworkerKnowledge()`, and updates each coworker's `knowledge` field via `db.coworker.update`. All other coworker fields (`name`, `role`, `personaStyle`, `voiceName`, `personality`, `gender`, `ethnicity`, `avatarUrl`, `language`) MUST remain unchanged.
- [ ] If the Step 3 coworker validator (`validateCoworkerKnowledge` from #418) returned zero errors for the most recent attempt, `runStep5_groundCoworkers()` is skipped — no Pro call, no DB writes.
- [ ] The grounder uses the fail-fast retry pattern from #418: up to 3 attempts; abort if attempt N's failure fingerprint (thrown error message OR identical Zod error path) matches attempt N-1.
- [ ] If all 3 attempts fail, the pipeline still completes successfully — `status` is set to `"passed"` and `isPublished: true`. The original ungrounded coworker knowledge is preserved. The failure is logged at `warn` level with `{ scenarioId, lastError }`.
- [ ] `pipelineMeta` gains a new optional field `coworkersGrounded: boolean` (set true on success, false or missing on fall-back) so we can measure adoption.
- [ ] `ResourcePipelineStatus` gains a new value `"grounding_coworkers"` between `"judging"` and `"passed"`. Recruiter UI maps this to the existing "Generating" status (no new badge).

### US-003: Tests for the orchestrator integration

**Description**: As a developer, I want integration tests that verify the orchestrator's coworker grounding step behaves correctly in the success, skip, and fall-back paths.

**Acceptance Criteria**:

- [ ] New test file `src/lib/scenarios/coworker-grounder.integration.test.ts`.
- [ ] Test 1: Step 5 runs and persists updated knowledge when Step 3 coworker validator reports errors. Mocks `judgeArtifacts` to return passing verdict, mocks `groundCoworkerKnowledge` to return canned updates. Verifies `db.coworker.update` is called once per coworker with new `knowledge` and no other field touched.
- [ ] Test 2: Step 5 is skipped when Step 3 coworker validator returns zero errors. Verifies `groundCoworkerKnowledge` is not invoked and `db.coworker.update` is not called.
- [ ] Test 3: Step 5 falls back gracefully when `groundCoworkerKnowledge` throws on all attempts. Verifies the scenario still ends in `status: "passed"`, `isPublished: true`, and original knowledge is intact.
- [ ] Test 4: identity-preservation invariant. Asserts the only field in the `db.coworker.update` data object is `knowledge`.

### US-004: Remove the "Regenerate coworkers" button from settings

**Description**: As a recruiter, I see a single mental model — "regenerate the bundle to refresh anything" — instead of a separate "regenerate coworkers" control that drifts from the artifact-grounded path.

**Acceptance Criteria**:

- [ ] The "Regenerate coworkers" button (or equivalent control) on `/recruiter/simulations/[id]/settings` is removed. (Find via: any client-side `fetch` call to `/api/recruiter/simulations/generate-coworkers` from a settings-page component.)
- [ ] The `/api/recruiter/simulations/generate-coworkers` route itself remains in place — it's still called by the wizard's pre-pipeline preview generation in `src/app/[locale]/recruiter/simulations/new/client.tsx`. Add a code comment to the route's handler stating: "This route is wizard-internal. Do not surface as a recruiter-facing control after publish — coworkers regenerate via the pipeline."
- [ ] Translation keys for the removed button (in `src/messages/en.json` and `src/messages/es.json`) are removed if not referenced elsewhere.
- [ ] No regression in the wizard flow: creating a new simulation still surfaces coworker preview cards (`previewData.coworkers.length` works; `isReadyToCreate` gating works).

### US-005: Surface grounding status in the recruiter resources panel

**Description**: As a recruiter, when I'm watching the resources panel during simulation creation, I see that coworkers are part of the bundle being prepared, not just files.

**Acceptance Criteria**:

- [ ] `src/components/recruiter/resource-pipeline-status.tsx` adds a new row to the file list named "Team members" (data branch) or matching the existing copy convention. Subtitle: `"{N} coworkers — refining knowledge"` while the pipeline is in any pre-`passed` status; `"{N} coworkers ready"` once `status === "passed"`.
- [ ] The row uses the same `pending` / `ready` state styling as the other rows (Loader2 spinner while pending, no view button — coworkers are visible elsewhere on the settings page).
- [ ] No new badge or status text in the panel header — `grounding_coworkers` maps to the existing "Generating" badge.
- [ ] Snapshot test or RTL test in the existing `resource-pipeline-status.test.tsx` (or a new file) verifies the row renders in `judging`, `grounding_coworkers`, and `passed` states.

### US-006: Telemetry to measure impact post-launch

**Description**: As a developer, I can measure whether the grounding pass is actually reducing coworker hallucinations in production.

**Acceptance Criteria**:

- [ ] On every pipeline run, log a `coworker_grounding` event with: `{ scenarioId, skipped: boolean, attempts: number, success: boolean, validatorErrorsBefore: number, validatorErrorsAfter: number, durationMs }`. Use the existing `logger.info` mechanism — no new infra.
- [ ] After grounding succeeds, re-run `validateCoworkerKnowledge` on the new knowledge and include `validatorErrorsAfter` in the log. (Goal: confirm the grounded version actually passes the validator.)
- [ ] Document the success metric query in the PR description: count of pipeline runs in the last 7 days where `validatorErrorsBefore > 0 && validatorErrorsAfter === 0`.

## Functional Requirements

1. The system shall run a coworker-grounding pass after Step 4 (judge) passes and before `pipelineMeta.status` is set to `"passed"`.
2. The grounding pass shall be skipped when the Step 3 coworker validator reported zero errors on the most recent attempt.
3. The grounding pass shall use Gemini Pro with `thinkingLevel: "high"` and a structured output schema.
4. The grounding pass shall preserve all `Coworker` fields except `knowledge`. Identity (name, role, persona, voice, personality, demographics, avatar) is immutable across grounding.
5. The grounding pass shall use the fail-fast retry pattern: max 3 attempts; abort early if attempt N's failure fingerprint matches N-1.
6. If the grounding pass fails after retries, the scenario shall still publish (`status: "passed"`, `isPublished: true`) with the original ungrounded coworker knowledge intact. The failure shall be logged but shall not block the recruiter.
7. The recruiter-facing "Regenerate coworkers" button on the settings page shall be removed.
8. The wizard's pre-pipeline coworker preview generation shall continue to work unchanged.
9. The resources panel shall display coworkers as a row in the file list with the same `pending` / `ready` state styling as other artifacts.
10. The system shall log a `coworker_grounding` telemetry event per pipeline run sufficient to measure the change in validator error rate.

## Non-Goals

- Backfill of existing simulations created before this ships. Existing scenarios keep their original ungrounded coworker knowledge; only newly created or re-run scenarios get grounded knowledge.
- Manual "regenerate coworkers" control on the settings page. Recruiters who want to refresh coworker knowledge will re-run the entire pipeline (e.g., via simulation clone or full regeneration), not a partial refresh.
- Changes to the wizard preview UX. The wizard continues to show `gemini-3-flash-preview`-generated coworker cards as soon as the JD is parsed.
- Changes to candidate-side chat UX. The candidate's experience is automatically improved (no hallucinated `docker-compose.yml`) without any UI changes.
- Replacing PR [#418](https://github.com/skillvee/simulator/pull/418)'s deterministic validator. The validator stays in Step 3 as a backstop and as the gate that determines whether grounding is needed in the first place.

## Technical Considerations

- **Order of operations**. Grounding must run AFTER `buildRepoArtifactSummary` / `buildDataArtifactSummary` (Step 4 already builds these). The same `ArtifactSummary` instance can be reused as input to `groundCoworkerKnowledge` — no extra GitHub fetches.
- **Identity preservation invariant**. `db.coworker.update` data object MUST contain exactly `{ knowledge }`. Enforced by tests in US-003. Code review should treat any field beyond `knowledge` in this update as a bug.
- **Skip-when-clean optimization**. The Step 3 coworker validator's result is the gate. We need to thread that result through to Step 5 — currently `runValidators` returns `{ ok, errors }` but doesn't break errors out by source. Add a field `coworkerErrorCount: number` to the result so Step 5 can branch on it without string parsing.
- **Failure handling**. The pipeline must NOT regress to `status: "failed"` when grounding fails after retries. The bundle is shippable; coworkers stay ungrounded; #418's validator already flagged the issues for visibility. Treat grounding as a quality boost, not a gate.
- **Cost.** Per-simulation Pro call cost increases by one `judge`-equivalent call when grounding runs. Skip-when-clean keeps this off the critical path for already-clean scenarios.
- **Latency.** Grounding adds ~10-30s to pipeline end-to-end. Recruiter sees this as an extended "Generating" period; the existing copy ("This usually takes ~5-8 min") absorbs it.
- **Migration / cleanup**. The `pipelineMeta.coworkersGrounded` boolean is additive — no migration needed. Old scenarios with no value default to `undefined` (treated as "ungrounded").

## Success Metrics

- **Primary**: 7-day count of pipeline runs where `validatorErrorsBefore > 0 && validatorErrorsAfter === 0` is ≥ 50% of pipeline runs that triggered grounding (measures: grounding pass actually fixes the hallucinations the validator caught).
- **Step 3 coworker validator pass rate** on newly created simulations is ≥ 95% within 30 days of launch (measures: when candidates open chats, coworkers don't reference missing artifacts). Baseline rate to be measured pre-launch.
- **No latency regression**: pipeline median end-to-end time grows by ≤ 30s from the pre-launch baseline.
- **No recruiter regression**: zero recruiter support tickets in the first 30 days about "missing regenerate coworkers button" or about coworkers changing unexpectedly.
