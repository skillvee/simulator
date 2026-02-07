# PRD: Recruiter Candidates Dashboard Redesign

## Overview

Restructure the recruiter's candidate evaluation experience from a flat, cross-simulation candidate list into a simulation-scoped, 3-level information architecture with an Apple-style comparison view. This is a **UI/UX restructuring and data surfacing** effort — the backend evaluation pipeline, rubric system, percentile calculator, and scoring are already fully implemented.

**Design principle:** SkillVee measures objectively. Recruiters decide. No hire/no-hire recommendations — the assessment is role-agnostic raw measurement. The recruiter brings the context of what they need.

## Goals

- Let recruiters quickly identify top candidates within a simulation without opening individual profiles
- Enable meaningful apples-to-apples comparison by scoping candidates to the same simulation
- Provide an Apple-style comparison view that makes dimension-by-dimension evaluation effortless
- Surface existing data (dimension scores, green/red flags, summaries, confidence, timestamps, metrics) that is currently stored but buried in detail pages
- Replace the incorrect 5-dot score circles with a 4-segment bar matching the actual 1-4 scoring scale

## What Already Exists (Do NOT Recreate)

The following systems are fully implemented and should be used as data sources, not rebuilt:

- **Video evaluation service** (`src/lib/analysis/video-evaluation.ts`) — Gemini 3 Pro integration extracting per-dimension scores, green/red flags, rationale, timestamps, confidence, observable behaviors, overall summary
- **Rubric/dimensions system** (`prisma/schema.prisma`, `prisma/seed-rubrics.ts`, `src/lib/rubric/load-rubric.ts`) — 6 role families, universal + role-specific dimensions, 4-level behavioral anchors
- **Evaluation prompt** (`src/prompts/analysis/rubric-evaluation.ts`) — v2.0.0, dynamically built from DB rubric data
- **Percentile calculator** (`src/lib/candidate/percentile-calculator.ts`) — per-dimension + overall percentiles, stored in `assessment.report.percentiles`
- **Embeddings & search** (`src/lib/candidate/embeddings.ts`) — pgvector semantic search on observable behaviors + summary
- **Types** (`src/types/assessment.ts`) — `VideoEvaluationResult`, `VideoDimensionScore`, `RubricAssessmentOutput`, `DetectedRedFlag`, etc.
- **Comparison API** (`src/app/api/recruiter/candidates/compare/route.ts`) — returns scores, percentiles, strength levels, dimension scores (needs extension, not rewrite)
- **Candidate detail page** (`src/app/recruiter/candidates/[assessmentId]/`) — scores, dimension breakdown, green/red flags, video timestamps

## Route Restructuring

| Current Route | New Route | Purpose |
|---------------|-----------|---------|
| `/recruiter/candidates` (flat list) | `/recruiter/candidates` | **Level 1:** Simulation picker |
| *(new)* | `/recruiter/candidates/s/[simulationId]` | **Level 2:** Candidates for that simulation |
| `/recruiter/candidates/[assessmentId]` | `/recruiter/candidates/s/[simulationId]/[assessmentId]` | Candidate detail (moved under simulation) |
| `/recruiter/candidates/compare` | `/recruiter/candidates/s/[simulationId]/compare?ids=A,B,C` | **Level 3:** Apple-style comparison |

The existing `[assessmentId]` detail page moves under `s/[simulationId]/` to avoid Next.js dynamic segment conflicts and create a clean hierarchy where everything flows through the simulation context.

**Naming note:** The URL param is `simulationId` (user-facing term), but the database model is `Scenario` (`db.scenario`). In server code, look up the simulation via `db.scenario.findUnique({ where: { id: simulationId } })`. The `simulationId` value IS a `Scenario.id`.

**Sidebar:** "Candidates" nav item continues to link to `/recruiter/candidates` (now the simulation picker). "Simulations" nav item remains separate for admin/creation.

## User Stories

### US-001: Simulation Picker Page — UI

**Description**: As a recruiter, I want to see my simulations listed with candidate stats so that I can choose which simulation's candidates to review.

**Acceptance Criteria**:

- [ ] `/recruiter/candidates` renders a grid of simulation cards (replace the current flat candidate table)
- [ ] Each card shows: simulation name, candidate count breakdown (e.g. "8 completed, 4 in progress"), score range of completed candidates (e.g. "Scores: 1.8 – 3.9"), top candidate preview (name + score of highest scorer), last activity date
- [ ] Cards sorted by last activity date (most recent first)
- [ ] Clicking a card navigates to `/recruiter/candidates/s/[simulationId]`
- [ ] Empty state when no simulations exist, with link to "Create Simulation"
- [ ] Uses existing shadcn Card component, consistent with blue theme

### US-002: Simulation Picker — Server Data Fetching

**Description**: As a developer, I need to refactor the server page to fetch simulation-level stats instead of individual candidates.

**Acceptance Criteria**:

- [ ] `src/app/recruiter/candidates/page.tsx` fetches all simulations (Scenario records) owned by the authenticated recruiter (using existing `requireRecruiter()`)
- [ ] For each simulation, aggregates from its assessments: total candidate count, completed count, in-progress count, min/max overall score among completed video-assessed candidates, top candidate (highest overall score) name and score, most recent assessment `completedAt` or `createdAt` date
- [ ] Passes simulation stats array to the client component as props
- [ ] Reuses existing DB queries where possible (the current page already fetches scenarios + assessments)

### US-003: Cross-Simulation Candidate Search

**Description**: As a recruiter, I want to search for a specific candidate by name or email across all simulations so I can find them without knowing which simulation they took.

**Acceptance Criteria**:

- [ ] Search bar at the top of the simulation picker page
- [ ] Searches candidate name and email across all recruiter's simulations
- [ ] Results dropdown shows: candidate name, email, simulation name, status, overall score (if completed)
- [ ] Clicking a result navigates to `/recruiter/candidates/s/[simulationId]` and highlights that candidate
- [ ] Search is debounced (300ms)
- [ ] Empty state: "No candidates found"

### US-004: Scoped Candidate Table — Layout and Columns

**Description**: As a recruiter, I want to see candidates for a specific simulation in a rich table so I can quickly triage who is worth a deeper look.

**Acceptance Criteria**:

- [ ] New route `src/app/recruiter/candidates/s/[simulationId]/page.tsx` + `client.tsx`
- [ ] Page header shows simulation name with back link to `/recruiter/candidates`
- [ ] Table columns: Avatar+Name+Email, Status badge, Overall Score (1-4 bar), Percentile ("Top X%"), Strength badge, Dimension Mini-Scores (US-005), 1-line Summary + Red Flags + Confidence (US-006), Completed Date
- [ ] Overall Score renders as a **4-segment visual bar** matching the 1-4 scale (not the current 5-dot circles)
- [ ] Non-completed candidates show status badge and "—" for score columns
- [ ] "Simulation" column removed (implicit from navigation)
- [ ] "Started" column removed
- [ ] Row click navigates to `/recruiter/candidates/s/[simulationId]/[assessmentId]`

### US-005: Dimension Mini-Scores in Table Rows

**Description**: As a recruiter, I want to see a candidate's top 3 dimension scores inline so I can see their "shape" (specialist vs. generalist) at a glance.

**Acceptance Criteria**:

- [ ] Each completed row shows 3 mini score indicators: highest dimension, lowest dimension, and one mid-range
- [ ] Each shows: abbreviated dimension name (e.g. "Comm", "Tech", "Design") and score (e.g. "3.8")
- [ ] Color-coded: green for >= 3.5, blue for 2.5–3.4, orange for < 2.5
- [ ] If fewer than 3 dimensions scored, show as many as available
- [ ] Tooltip on hover shows full dimension name
- [ ] Data sourced from DimensionScore records already fetched for overall score calculation

### US-006: Summary, Red Flags, and Confidence in Table Rows

**Description**: As a recruiter, I want to see a 1-line summary, red flag count, and confidence indicator per candidate for quick go/no-go decisions.

**Acceptance Criteria**:

- [ ] 1-line summary: first ~120 characters of `overallSummary` from VideoAssessmentSummary, truncated with ellipsis
- [ ] Red flag count badge: total red flags across all dimensions from `assessment.report.videoEvaluation.skills[].redFlags`. Red-tinted badge (e.g. "3 flags"). Hidden when count is 0
- [ ] Confidence: subtle icon — filled circle (high), half circle (medium), empty circle (low). Sourced from `assessment.report.videoEvaluation.evaluationConfidence`
- [ ] Tooltip on confidence shows "Evaluation confidence: High/Medium/Low"
- [ ] Only render for completed candidates with video assessments

### US-007: Scoped Table — Server Data Fetching

**Description**: As a developer, I need the server page to fetch all candidate data including dimension scores, summaries, red flags, and confidence for the scoped table.

**Acceptance Criteria**:

- [ ] `src/app/recruiter/candidates/s/[simulationId]/page.tsx` verifies recruiter owns this simulation (reuse existing ownership pattern from `db.scenario`)
- [ ] Fetches assessments for this simulation with: user (name, email), videoAssessment (status, scores with dimension+score, summary with overallSummary), assessment report JSON (for videoEvaluation red flags, confidence, percentiles)
- [ ] Computes per candidate: overall score (avg of dimension scores), percentile (from stored report.percentiles.overall), strength level, top/mid/bottom dimensions, red flag count (sum across `videoEvaluation.skills[].redFlags.length`), evaluation confidence
- [ ] Returns 404 if simulation not found or not owned by recruiter

### US-008: Table Sorting and Filtering

**Description**: As a recruiter, I want to sort and filter the scoped table to focus on the most relevant candidates.

**Acceptance Criteria**:

- [ ] Default sort: Highest score (descending), with most recent completion as tiebreaker. Non-scored at bottom
- [ ] Sort options: "Highest score" (default), "Most recent", "Name A-Z"
- [ ] Filter by status: All / Completed / Working / Welcome
- [ ] Filter by strength level: All / Exceptional / Strong / Proficient / Developing
- [ ] Filter by minimum score: dropdown with thresholds (1.0, 2.0, 2.5, 3.0, 3.5)
- [ ] Active filters shown as dismissable chips
- [ ] Count updates: "Showing 5 of 12 candidates"

### US-009: Compare Mode Selection (Scoped)

**Description**: As a recruiter, I want to select 2-4 candidates for comparison from the scoped table.

**Acceptance Criteria**:

- [ ] "Compare" button in table header toggles compare mode (reuse existing compare mode pattern)
- [ ] Checkboxes appear next to completed candidates with video scores only
- [ ] Min 2, max 4 selections
- [ ] Floating action bar: "N selected" + "Compare N candidates" button
- [ ] Navigates to `/recruiter/candidates/s/[simulationId]/compare?ids=A,B,C`
- [ ] Selection persisted in URL params
- [ ] "Cancel" exits compare mode

### US-010: Comparison View — Apple-Style Layout and Overview

**Description**: As a recruiter, I want an Apple-style side-by-side comparison with sticky headers and winner highlighting so I can evaluate candidates effortlessly.

**Acceptance Criteria**:

- [ ] New route: `src/app/recruiter/candidates/s/[simulationId]/compare/page.tsx` + `client.tsx`
- [ ] Replaces the existing radar-chart comparison with a row-based Apple-style layout
- [ ] Fixed columns (one per candidate, 2-4), rows aligned horizontally
- [ ] Sticky header: avatar + name per candidate, visible while scrolling
- [ ] Back link to `/recruiter/candidates/s/[simulationId]`
- [ ] **Overview section** (not collapsible): per candidate shows overall score (large circular 1-4 indicator) with strength badge, percentile ("Top X%" with "of N candidates" context), confidence badge (High/Medium/Low), 1-2 sentence summary
- [ ] Highest overall score column gets subtle blue background on score cell
- [ ] URL is shareable — any authenticated recruiter/admin can view by visiting the URL
- [ ] Responsive: on small screens, columns stack with tab switcher

### US-011: Comparison View — Core Dimensions Section

**Description**: As a recruiter, I want to compare candidates dimension by dimension with expandable evidence.

**Acceptance Criteria**:

- [ ] "Core Dimensions" collapsible section with "Expand All" / "Collapse All" buttons
- [ ] One row per dimension (union of all dimensions across selected candidates)
- [ ] **Collapsed** (default): dimension name label, score bar (1-4 visual) + number, percentile badge per candidate. Highest score in each row gets subtle blue highlight
- [ ] "N/A" shown if a candidate wasn't scored on a dimension
- [ ] **Expanded**: adds per candidate — green flags (bulleted, checkmark icon), red flags (bulleted, warning icon), rationale (1-2 sentences), evidence timestamps (clickable badges like "[12:34]")
- [ ] Clicking a timestamp opens video modal (US-014)
- [ ] Rows sorted alphabetically by dimension name

### US-012: Comparison View — Work Style Signals

**Description**: As a recruiter, I want to compare behavioral signals to differentiate candidates with similar scores by how they work.

**Acceptance Criteria**:

- [ ] "Work Style" collapsible section
- [ ] Rows: Total Duration ("X min"), Active Working Time ("X min"), Coworkers Contacted (number), AI Tools Used ("Yes"/"No"), CI Tests ("Passing"/"Failing"/"None"/"Unknown")
- [ ] **No winner highlighting** — these are contextual, not better/worse
- [ ] "—" for missing metrics data
- [ ] Data from `assessment.report.metrics`

### US-013: Comparison View — Strengths, Growth Areas, and Key Evidence

**Description**: As a recruiter, I want to see each candidate's strengths, growth areas, and key video moments side by side.

**Acceptance Criteria**:

- [ ] "Strengths & Growth Areas" collapsible section
- [ ] Top 3 Strengths per candidate: derived from highest-scoring dimensions' green flags. Each bullet shows dimension name + specific green flag
- [ ] Growth Areas per candidate: derived from lowest-scoring dimensions' red flags. Each bullet shows dimension name + specific red flag
- [ ] "Key Evidence" collapsible section
- [ ] Per candidate: 2-3 timestamped moments from highest and lowest scoring dimensions with 1-line descriptions from rationale
- [ ] Timestamps clickable → video modal (US-014)

### US-014: Video Modal in Comparison View

**Description**: As a recruiter, I want to watch video evidence without losing my comparison context.

**Acceptance Criteria**:

- [ ] Clicking any timestamp in comparison opens a modal overlay (shadcn Dialog)
- [ ] Modal shows: candidate name in header, HTML5 video player starting at clicked timestamp, playback speed controls (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x), close button + click-outside-to-close
- [ ] Comparison view state preserved when modal closes (no unmount)
- [ ] Reuse video player pattern from existing candidate detail page (`src/app/candidate/[id]/client.tsx`)
- [ ] Video URL from candidate's videoAssessment record

### US-015: Comparison API — Extend Response

**Description**: As a developer, I need to extend the existing comparison API to return flags, rationale, timestamps, metrics, summary, confidence, and video URL for the Apple-style comparison.

**Acceptance Criteria**:

- [ ] Extend `GET /api/recruiter/candidates/compare` (at `src/app/api/recruiter/candidates/compare/route.ts`)
- [ ] Keep existing fields: assessmentId, candidateName, overallScore, overallPercentile, strengthLevel, dimensionScores (score + percentile)
- [ ] Add to each dimension score object: `greenFlags: string[]`, `redFlags: string[]`, `rationale: string`, `timestamps: string[]` — sourced from `assessment.report.videoEvaluation.skills[]`
- [ ] Add per candidate: `summary: string` (from VideoAssessmentSummary.overallSummary)
- [ ] Add per candidate: `metrics: { totalDurationMinutes, workingPhaseMinutes, coworkersContacted, aiToolsUsed, testsStatus }` (from assessment.report.metrics)
- [ ] Add per candidate: `confidence: string` (from assessment.report.videoEvaluation.evaluationConfidence)
- [ ] Add per candidate: `videoUrl: string` (from videoAssessment.videoUrl)
- [ ] Add `simulationId` to request params for validation that all candidates belong to same simulation
- [ ] Remove `biggestGap` field (trainable gaps removed)
- [ ] Remove `topStrength` field (replaced by derived strengths in frontend)

### US-016: Move Candidate Detail Under Simulation Scope

**Description**: As a developer, I need to move the candidate detail route under the simulation-scoped path to resolve the Next.js dynamic segment conflict.

**Acceptance Criteria**:

- [ ] Move `src/app/recruiter/candidates/[assessmentId]/` to `src/app/recruiter/candidates/s/[simulationId]/[assessmentId]/`
- [ ] Server page receives both `simulationId` and `assessmentId` from params
- [ ] Verify candidate belongs to the given simulation (security check)
- [ ] Update all internal links that point to `/recruiter/candidates/[assessmentId]` to include the simulationId prefix
- [ ] Delete the old `[assessmentId]` directory after migration
- [ ] Candidate detail page content remains unchanged (no UI changes)

### US-017: Cleanup — Remove Trainable Gaps and Hiring Signals from UI

**Description**: As a developer, I need to remove trainable gaps and hiring signals UI references since these features are no longer active.

**Acceptance Criteria**:

- [ ] Remove trainable gap badge from candidate detail page
- [ ] Remove `biggestGap` display from comparison client
- [ ] Remove hiring signals display from candidate detail page (the `HiringSignals` component/section)
- [ ] Remove hiring signals extraction from candidate detail API (`src/app/api/recruiter/candidate/[assessmentId]/route.ts`) — the Gemini prompt doesn't generate this data anyway
- [ ] Do NOT remove database columns (`trainableGap` on DimensionScore) — only UI references
- [ ] Do NOT remove type definitions — they may be used for future features

## Functional Requirements

1. The simulation picker (Level 1) shall display all simulations owned by the authenticated recruiter with aggregated candidate statistics
2. The candidate table (Level 2) shall only show candidates belonging to the selected simulation
3. Overall score shall render as a 4-segment visual bar on a 1-4 scale throughout all views
4. Percentile display shall include pool size context (e.g. "Top 12% of 25 candidates")
5. The comparison view (Level 3) shall use a row-based Apple-style layout (not radar charts)
6. Winner highlighting (blue background on highest value) shall apply to overall score and per-dimension scores but NOT to work style signals
7. The comparison view shall show a union of all dimensions across selected candidates
8. Video modals shall overlay the comparison view without destroying state
9. Comparison URLs shall be shareable between authenticated users
10. All score displays shall use the 1-4 scale consistently (no 5-dot circles)
11. The existing `/candidate_search` page shall remain unchanged

## Non-Goals

- Hire / No Hire / Maybe recommendations (SkillVee measures, recruiters decide)
- Role-specific or archetype-based scoring overlays (that's the candidate search flow)
- Seniority gating or threshold filtering
- Trainable gap indicators (removed)
- Changes to the candidate search page (`/candidate_search`)
- Changes to the video evaluation pipeline or Gemini prompts
- Changes to the rubric system, percentile calculator, or embeddings
- PDF export or report generation
- Candidate notes, tags, or shortlisting workflow
- Mobile-first design (responsive is sufficient, desktop is primary)

## Technical Considerations

### Files to Modify

- `src/app/recruiter/candidates/page.tsx` — refactor to fetch simulation stats instead of flat candidate list
- `src/app/recruiter/candidates/client.tsx` — replace flat table with simulation picker grid
- `src/app/api/recruiter/candidates/compare/route.ts` — extend response with flags, rationale, metrics, summary, videoUrl, confidence
- `src/app/api/recruiter/candidate/[assessmentId]/route.ts` — remove hiring signals extraction
- Internal links throughout recruiter pages — update to new `/s/[simulationId]/` paths

### Files to Create

- `src/app/recruiter/candidates/s/[simulationId]/page.tsx` — scoped candidate table server page
- `src/app/recruiter/candidates/s/[simulationId]/client.tsx` — scoped candidate table client
- `src/app/recruiter/candidates/s/[simulationId]/compare/page.tsx` — comparison server page
- `src/app/recruiter/candidates/s/[simulationId]/compare/client.tsx` — Apple-style comparison client
- `src/app/recruiter/candidates/s/[simulationId]/[assessmentId]/page.tsx` — moved candidate detail server page
- `src/app/recruiter/candidates/s/[simulationId]/[assessmentId]/client.tsx` — moved candidate detail client

### Files to Delete (After Migration)

- `src/app/recruiter/candidates/[assessmentId]/page.tsx`
- `src/app/recruiter/candidates/[assessmentId]/client.tsx`
- `src/app/recruiter/candidates/compare/page.tsx`
- `src/app/recruiter/candidates/compare/client.tsx`

### Data Sources (All Existing)

| Data | Source | Already Stored |
|------|--------|----------------|
| Dimension scores (1-4) | `DimensionScore` table | Yes |
| Green/red flags per dimension | `assessment.report.videoEvaluation.skills[]` | Yes |
| Rationale per dimension | `assessment.report.videoEvaluation.skills[]` | Yes |
| Timestamps per dimension | `DimensionScore.timestamps` | Yes |
| Overall summary | `VideoAssessmentSummary.overallSummary` | Yes |
| Percentiles (dimension + overall) | `assessment.report.percentiles` | Yes |
| Evaluation confidence | `assessment.report.videoEvaluation.evaluationConfidence` | Yes |
| Metrics (duration, coworkers, AI, tests) | `assessment.report.metrics` | Yes |
| Video URL | `VideoAssessment.videoUrl` | Yes |
| Strength level | Derived from overall score at query time | Yes (logic exists) |

### Dependencies

- shadcn/ui (already installed): Card, Table, Badge, Button, Tooltip, Dialog, Collapsible
- No new external dependencies required

## Success Metrics

- Recruiter identifies top 3 candidates within 30 seconds of viewing the scoped table
- Recruiter compares 2-3 finalists and identifies per-dimension leaders within 60 seconds
- All stored candidate data (scores, flags, summaries, timestamps) surfaced without navigating to detail pages
- Comparison URLs work when shared between team members
- Score scale is consistently 1-4 across all views
