# PRD: Candidate Assessment System

## Overview

A two-stage assessment system that evaluates candidates after completing the Skillvee simulation. Stage 1 produces role-agnostic dimension scores from the simulation video using Gemini 3 Pro. Stage 2 dynamically interprets these scores through archetype weights and seniority thresholds when hiring managers search for candidates.

**Key Principle:** Candidates are scored once, consistently and fairly. Role-specific interpretation happens at search time, never during assessment.

## Goals

- Automatically assess candidates across 6 dimensions immediately after simulation completion
- Provide hiring managers with evidence-backed, timestamped evaluations
- Enable natural language search that interprets intent and matches candidates to roles
- Create searchable candidate profiles with video evidence links
- Maintain separation between raw assessment and role-specific interpretation
- Provide comprehensive admin diagnostics with full audit trail of prompts, responses, and timing

## User Stories

### US-001: Trigger Assessment on Simulation Completion
**Description:** As the system, I want to automatically trigger an assessment when a candidate completes all 4 simulation stages so that evaluations happen without manual intervention.

**Acceptance Criteria:**
- [ ] Assessment triggers when simulation status changes to "completed" (all 4 stages done)
- [ ] System retrieves the screen+audio recording URL from Supabase storage
- [ ] Assessment job is queued with candidate_id and video_url
- [ ] Candidate profile shows "Assessment in progress" status
- [ ] Failed assessments are logged and can be manually retried

---

### US-002: Create Assessment Database Schema
**Description:** As a developer, I want database tables to store assessment results so that scores and evidence are persisted and queryable.

**Acceptance Criteria:**
- [ ] Create `assessments` table with columns: id, candidate_id, video_url, status (pending/processing/completed/failed), created_at, completed_at
- [ ] Create `dimension_scores` table with columns: id, assessment_id, dimension (enum), score (1-5), observable_behaviors (text), timestamps (jsonb array), trainable_gap (boolean)
- [ ] Create `assessment_summaries` table with columns: id, assessment_id, overall_summary (text), raw_ai_response (jsonb, internal only)
- [ ] Add foreign key constraints and indexes on candidate_id and assessment_id
- [ ] Add RLS policies: candidates see own assessments, hiring managers see all completed assessments

---

### US-003: Build Gemini Video Evaluation Service
**Description:** As the system, I want to send simulation videos to Gemini 3 Pro for evaluation so that candidates receive dimension scores with evidence.

**Acceptance Criteria:**
- [ ] Create server-side service that calls Gemini 3 Pro (model: `gemini-3-pro-preview`) with video URL
- [ ] Use evaluation prompt that enforces the 6-dimension rubric (see Appendix A)
- [ ] Parse JSON response into dimension_scores and assessment_summaries records
- [ ] Extract timestamps for each observable behavior (format: MM:SS or HH:MM:SS)
- [ ] Handle API errors with retry logic (max 3 attempts, exponential backoff)
- [ ] Store raw AI response in assessment_summaries.raw_ai_response (never exposed to users)

---

### US-004: Define Evaluation Prompt for Gemini
**Description:** As the system, I want a structured prompt that produces consistent, evidence-based evaluations so that all candidates are scored fairly.

**Acceptance Criteria:**
- [ ] Prompt includes the full 6-dimension rubric with level definitions (1-5)
- [ ] Prompt requires timestamps for each observable behavior
- [ ] Prompt enforces JSON output schema (see Appendix B)
- [ ] Prompt explicitly prohibits hallucination and requires video evidence
- [ ] Prompt includes rules: no seniority assumptions, no role assumptions, dimension-independent scoring
- [ ] Store prompt as a versioned constant (for audit trail)

---

### US-005: Create Candidate Profile Page
**Description:** As a candidate, I want a profile page showing my assessment results so that I can see my scores and understand my strengths.

**Acceptance Criteria:**
- [ ] Display candidate name, email, simulation completion date
- [ ] Show 6 dimension scores as visual indicators (1-5 scale)
- [ ] Display overall summary text
- [ ] Show "searchable by hiring managers" status (default: public)
- [ ] Include link to view simulation recording
- [ ] Page accessible at `/candidate/[id]` route
- [ ] **Browser validation:** Use agent-browser to navigate to `/candidate/[id]`, verify all elements render correctly, scores display properly, and no console errors

---

### US-006: Display Dimension Details with Video Timestamps
**Description:** As a hiring manager, I want to see observable behaviors with clickable timestamps so that I can verify the evidence directly.

**Acceptance Criteria:**
- [ ] Each dimension score shows expandable details section
- [ ] Details include: score (1-5), observable behaviors text, trainable gap indicator
- [ ] Timestamps render as clickable links (format: "2:34", "15:07")
- [ ] Clicking timestamp opens video player at that specific time
- [ ] Video player appears in modal or inline expand (not new page)
- [ ] **Browser validation:** Use agent-browser to expand dimension details, click timestamp links, verify video player opens at correct time, and test all interactive elements

---

### US-007: Build Conversational Search Interface
**Description:** As a hiring manager, I want a chat-centric search interface so that I can describe the profile I'm looking for in natural language.

**Acceptance Criteria:**
- [ ] Clean, chat-centric interface with prompt: "Hi there, please describe the profile you're looking for."
- [ ] Example placeholder text showing complex query (e.g., "Software Engineers in NYC with 3+ years of experience, skilled in React and Node, has experience with ML / LLMs and working at an early stage VC backed startup")
- [ ] Large text entry box with purple send button (arrow icon)
- [ ] Context tags displayed below input showing what AI is extracting: Location, Job Title, Years of Experience, Industry, Skills
- [ ] Tags highlight/fill in real-time as user types (visual feedback of entity extraction)
- [ ] Page accessible at `/candidate_search` route
- [ ] **Browser validation:** Use agent-browser to navigate to `/candidate_search`, verify prompt and example text display, type a query and verify context tags highlight as entities are detected

---

### US-008: Implement Real-Time Entity Extraction
**Description:** As the system, I want to parse natural language search queries into structured entities in real-time so that users see visual feedback as they type.

**Acceptance Criteria:**
- [ ] Extract entities from unstructured text input:
  - Job Titles (e.g., "Software Engineer", "ML Engineer")
  - Location (e.g., "SF", "San Francisco", "NYC", "remote")
  - Years of Experience (e.g., "5+", "3+ years", "senior")
  - Skills/Keywords (e.g., "Python", "LLMs", "React", "Node")
  - Company Types/Attributes (e.g., "startup", "VC backed", "enterprise")
  - Industry (e.g., "retail", "fintech", "healthcare")
- [ ] Use Gemini to parse query into structured intent: { job_title, location, years_experience, skills[], industry[], company_type[] }
- [ ] Map extracted data to archetype enum when job title matches (Frontend, Backend, Full Stack, AI/ML, DevOps/SRE, Architect/Tech Lead)
- [ ] Infer seniority from years of experience (Junior: 0-2, Mid: 3-5, Senior: 6+)
- [ ] Return structured filter object for downstream matching
- [ ] Entity extraction should complete within 500ms for responsive UI feedback

---

### US-008b: Display Search Loading States
**Description:** As a hiring manager, I want to see progress indicators while search is processing so that I know the system is working.

**Acceptance Criteria:**
- [ ] Upon clicking send, UI transitions to loading state
- [ ] Display sequential status messages:
  - "Processing your search criteria..."
  - "Looking for profiles that match your criteria..."
- [ ] Show animated loading indicator (spinner or progress bar)
- [ ] Loading state persists until results are ready
- [ ] **Browser validation:** Use agent-browser to submit a search query, verify loading messages appear in sequence, verify smooth transition to results

---

### US-009: Apply Archetype Weights at Search Time
**Description:** As the system, I want to apply role-specific dimension weights when matching candidates so that fit scores reflect the target role.

**Acceptance Criteria:**
- [ ] Define weight configurations for each archetype (see Appendix C)
- [ ] Weights are: Very High (1.5x), High (1.25x), Medium (1.0x)
- [ ] Calculate weighted fit score: sum of (dimension_score * weight) / max_possible
- [ ] Fit score normalized to 0-100 scale
- [ ] Weights are applied dynamically at query time, never stored with assessment

---

### US-010: Apply Seniority Thresholds at Search Time
**Description:** As the system, I want to filter candidates by seniority thresholds so that hiring managers find appropriately leveled candidates.

**Acceptance Criteria:**
- [ ] Define seniority thresholds per archetype (see Appendix D)
- [ ] Junior: no minimum thresholds
- [ ] Mid: key dimensions >= 3
- [ ] Senior: key dimensions >= 4
- [ ] Thresholds vary by archetype (e.g., Senior Backend needs System Design >= 4)
- [ ] Candidates not meeting threshold are filtered out (not just ranked lower)

---

### US-011: Implement Semantic Search on Candidate Data
**Description:** As the system, I want to match skill and experience keywords against candidate profiles so that domain-specific searches work.

**Acceptance Criteria:**
- [ ] Generate text embeddings for: observable_behaviors, overall_summary
- [ ] Store embeddings in Supabase using pgvector extension
- [ ] Generate query embedding from extracted skills and experience domains
- [ ] Perform cosine similarity search on embeddings
- [ ] Combine semantic similarity with archetype fit score for final ranking

---

### US-012: Create Candidate Search Result Card
**Description:** As a hiring manager, I want informative candidate cards in search results so that I can quickly evaluate matches.

**Acceptance Criteria:**
- [ ] Card displays: candidate name, fit score (0-100), archetype match
- [ ] Show 6 dimension scores as compact visual (e.g., bar chart or dots)
- [ ] Highlight dimensions that exceed seniority threshold (green) or fall short (amber)
- [ ] Display 1-sentence summary excerpt
- [ ] "View Profile" button links to full candidate profile
- [ ] Card fits in grid layout (3-4 per row on desktop)
- [ ] **Browser validation:** Use agent-browser to view search results, verify card layout is responsive (test desktop and mobile widths), check dimension score visuals render correctly, and click through to profile

---

### US-012b: Implement Candidate Rejection with Feedback
**Description:** As a hiring manager, I want to reject candidates with feedback so that the search automatically refines to better match my needs.

**Acceptance Criteria:**
- [ ] Each candidate card has a "Not a fit" or "Reject" button
- [ ] Clicking reject opens a feedback modal asking "Why isn't this candidate a fit?"
- [ ] Feedback input accepts free-form text (e.g., "Need 8+ years, not 5", "Looking for more frontend focus")
- [ ] System parses feedback to extract constraint updates (e.g., years_experience: "8+")
- [ ] Search query is automatically updated with new constraints
- [ ] Results refresh with updated criteria (rejected candidate removed, new matches shown)
- [ ] Show toast notification: "Search updated based on your feedback"
- [ ] **Browser validation:** Use agent-browser to reject a candidate with feedback, verify search updates, confirm rejected candidate is removed and new results appear

---

### US-012c: Display Current Search Filters
**Description:** As a hiring manager, I want to see my current search filters so that I understand what criteria are being applied.

**Acceptance Criteria:**
- [ ] Show active filters as removable chips/tags above results (e.g., "Location: SF", "Experience: 5+ years", "Skills: Python, LLMs")
- [ ] Each filter chip has an "x" button to remove that constraint
- [ ] Removing a filter immediately updates search results
- [ ] Show "Clear all filters" link when multiple filters are active
- [ ] Filters persist during the search session
- [ ] Show "Refined by feedback" indicator if filters were updated via rejection feedback
- [ ] **Browser validation:** Use agent-browser to verify filter chips display correctly, test removing individual filters, test "Clear all filters", verify results update immediately

---

### US-013: Show Role-Specific Highlights on Profile
**Description:** As a hiring manager viewing a candidate profile from search, I want to see role-relevant highlights so that I understand fit for my specific role.

**Acceptance Criteria:**
- [ ] When accessed from search, profile shows "Viewing as [Archetype] role" banner
- [ ] Emphasize dimensions with highest weight for that archetype
- [ ] Show fit score and how it was calculated (which dimensions contributed most)
- [ ] De-emphasize (but still show) lower-weight dimensions
- [ ] "View raw assessment" toggle shows unweighted scores
- [ ] **Browser validation:** Use agent-browser to navigate from search results to profile with archetype context, verify banner displays correct role, test "View raw assessment" toggle, confirm emphasized/de-emphasized dimension styling

---

### US-014: Video Player with Timestamp Navigation
**Description:** As a hiring manager, I want to watch candidate simulation videos with easy timestamp navigation so that I can verify evidence quickly.

**Acceptance Criteria:**
- [ ] Embed video player on candidate profile page
- [ ] Player supports seeking to specific timestamps via URL parameter (e.g., ?t=134)
- [ ] Clicking timestamp link in dimension details seeks player to that time
- [ ] Player shows current timestamp and total duration
- [ ] Basic controls: play/pause, volume, fullscreen, playback speed
- [ ] **Browser validation:** Use agent-browser to test video player controls (play, pause, seek), verify timestamp URL parameter works (e.g., `?t=134`), test playback speed controls, ensure player loads without errors

---

### US-015: Handle Assessment Failures Gracefully
**Description:** As the system, I want to handle assessment failures so that candidates aren't stuck in limbo.

**Acceptance Criteria:**
- [ ] If Gemini API fails after 3 retries, mark assessment as "failed"
- [ ] Log failure reason to assessment record
- [ ] Show "Assessment unavailable" message on candidate profile
- [ ] Admin can manually trigger reassessment via Supabase dashboard
- [ ] Send alert/notification when assessment fails (console log for MVP)
- [ ] **Browser validation:** Use agent-browser to view a candidate profile with failed assessment status, verify "Assessment unavailable" message displays correctly and gracefully

---

### US-016: Create Assessment Logs Database Schema
**Description:** As a developer, I want database tables to store detailed assessment logs so that admins can diagnose issues and audit the system.

**Acceptance Criteria:**
- [ ] Create `assessment_logs` table with columns: id, assessment_id, event_type (enum: started, prompt_sent, response_received, parsing_started, parsing_completed, error, completed), timestamp, duration_ms (nullable), metadata (jsonb, for additional context)
- [ ] Create `assessment_api_calls` table with columns: id, assessment_id, request_timestamp, response_timestamp, duration_ms, prompt_text, prompt_tokens (nullable), response_text, response_tokens (nullable), model_version, status_code, error_message (nullable), stack_trace (nullable)
- [ ] Add index on assessment_id and timestamp for efficient querying
- [ ] Add RLS policies: only admins can view logs and API call records

---

### US-017: Build Admin Assessment Diagnostics Page
**Description:** As an admin, I want a diagnostics page to view detailed logs for any assessment so that I can debug failures and monitor system health.

**Acceptance Criteria:**
- [ ] Page accessible at `/admin/assessments` route (admin-only, protected by auth)
- [ ] List view shows all assessments with: candidate name, status, created_at, total_duration_ms, error indicator (red badge if failed)
- [ ] Filter by status (pending, processing, completed, failed)
- [ ] Filter by date range (last 24h, last 7 days, last 30 days, custom)
- [ ] Search by candidate name, email, or assessment ID
- [ ] Click row to expand/navigate to detailed view
- [ ] Show aggregate stats at top: total assessments, success rate, avg duration, failed count
- [ ] **Browser validation:** Use agent-browser to navigate to `/admin/assessments`, verify list renders with correct data, test all filters and search, verify stats display correctly

---

### US-018: Display Assessment Timeline and Logs
**Description:** As an admin viewing an assessment, I want to see a timeline of all events so that I can understand exactly what happened step by step.

**Acceptance Criteria:**
- [ ] Show visual timeline of assessment events (started → prompt_sent → response_received → parsing_started → parsing_completed → completed/error)
- [ ] Display duration between each step in human-readable format (e.g., "2.3s", "45ms")
- [ ] Highlight errors in red with full error message and stack trace (expandable)
- [ ] Show total assessment duration prominently at top
- [ ] Display link to video recording for context
- [ ] Show candidate info: name, email, simulation completion date
- [ ] **Browser validation:** Use agent-browser to view assessment details, verify timeline renders with correct events and durations, check error highlighting works for failed assessments, verify video link works

---

### US-019: Display Gemini API Call Details
**Description:** As an admin, I want to see the exact prompts sent to Gemini and responses received so that I can diagnose AI-related issues.

**Acceptance Criteria:**
- [ ] Show expandable section for each API call made during assessment
- [ ] Display full prompt text with syntax highlighting (collapsible, default collapsed for long prompts)
- [ ] Display full response JSON with syntax highlighting and proper formatting (collapsible)
- [ ] Show token counts (prompt_tokens and response_tokens) if available from API
- [ ] Show request timestamp, response timestamp, and duration_ms
- [ ] Show model version used (e.g., `gemini-3-pro-preview`)
- [ ] Show HTTP status code and any error messages
- [ ] Copy-to-clipboard button for prompt text
- [ ] Copy-to-clipboard button for response JSON
- [ ] **Browser validation:** Use agent-browser to expand API call details, verify prompt and response display correctly with syntax highlighting, test copy buttons work, verify all metadata displays correctly

---

### US-020: Log All Assessment Events in Real-Time
**Description:** As the system, I want to log every significant event during assessment processing so that diagnostics are comprehensive and timing is accurate.

**Acceptance Criteria:**
- [ ] Log event when assessment job starts (event_type: started, include job_id in metadata)
- [ ] Log event when prompt is constructed and sent to Gemini (event_type: prompt_sent, include prompt_length in metadata)
- [ ] Log event when response is received from Gemini (event_type: response_received, include response_length and status_code in metadata)
- [ ] Log event when JSON parsing begins (event_type: parsing_started)
- [ ] Log event when parsing completes successfully (event_type: parsing_completed, include parsed dimension count in metadata)
- [ ] Log event on any error with full error message and stack trace (event_type: error)
- [ ] Log event when assessment completes successfully (event_type: completed)
- [ ] Calculate and store duration_ms for each step (time since previous event)
- [ ] Store full API call details (prompt, response, tokens, timing) in assessment_api_calls table
- [ ] All timestamps stored in UTC with millisecond precision

---

### US-021: Admin Manual Reassessment
**Description:** As an admin, I want to manually trigger a reassessment from the diagnostics page so that I can retry failed assessments without accessing Supabase directly.

**Acceptance Criteria:**
- [ ] "Retry Assessment" button visible for failed or completed assessments
- [ ] Clicking button shows confirmation dialog with warning that this will create a new assessment
- [ ] New assessment creates fresh records (does NOT overwrite old assessment - preserves history)
- [ ] Old assessment marked with `superseded_by` reference to new assessment ID
- [ ] New assessment logs show "triggered_by: admin_retry" in metadata
- [ ] Display toast notification when reassessment is queued successfully
- [ ] Button disabled while reassessment is processing (show spinner)
- [ ] **Browser validation:** Use agent-browser to click retry button on failed assessment, verify confirmation dialog appears, confirm reassessment, verify new assessment appears in list with correct status

---

## Functional Requirements

1. The system shall automatically trigger assessment within 60 seconds of simulation completion
2. The system shall use Gemini 3 Pro (model: `gemini-3-pro-preview`) for video evaluation
3. The system shall extract timestamps in MM:SS or HH:MM:SS format for all observable behaviors
4. The system shall store raw AI responses but never expose them to end users
5. The system shall apply archetype weights only at search/view time, never during assessment
6. The system shall filter candidates by seniority thresholds, not just rank them
7. The system shall support natural language search queries up to 500 characters
8. The system shall generate embeddings for semantic search using Supabase pgvector
9. The system shall normalize fit scores to 0-100 scale for consistent display
10. The system shall make all candidates searchable by default (public profiles)
11. The system shall extract search entities (job title, location, experience, skills, industry, company type) in real-time as users type
12. The system shall display visual feedback (context tags) showing which entities have been detected
13. The system shall parse rejection feedback and automatically update search constraints
14. The system shall complete entity extraction within 500ms for responsive UI
15. The system shall log all assessment events with millisecond-precision timestamps
16. The system shall store complete Gemini API call details (prompts, responses, tokens, timing)
17. The system shall provide admin-only access to assessment logs and diagnostics
18. The system shall preserve assessment history when reassessments are triggered (never overwrite)

## Non-Goals

- Custom weight adjustments by hiring managers (pre-configured only)
- Candidate opt-out from searchability (future feature)
- PDF report export (future feature)
- Candidate-facing feedback/coaching recommendations (separate PRD)
- Webcam feed analysis (screen+audio only for MVP)
- Manual timestamp tagging by reviewers
- Real-time assessment during simulation (post-completion only)
- Comparison to benchmark/peer scores

## Technical Considerations

### Dependencies
- Gemini 3 Pro API access with video input support
- Supabase pgvector extension for embeddings
- Video storage in Supabase Storage (already exists from simulation)

### Integration Points
- Simulation completion webhook/trigger (needs to be added)
- Existing candidate and simulation tables in Supabase

### Performance
- Video assessment may take 2-5 minutes; use async job queue
- Embedding generation should happen post-assessment, not blocking
- Search queries should return in <2 seconds

### Data Privacy
- Raw AI responses stored but never exposed via API
- Archetype weights and seniority thresholds are internal logic
- Confidence scores (if any) are internal only

## Success Metrics

- 95% of assessments complete successfully within 10 minutes
- Search queries return results in <2 seconds (p95)
- Hiring managers can find relevant candidates in <3 search attempts
- Timestamp links accurately jump to correct video position (±5 seconds)

---

## Appendix A: Evaluation Rubric

| Dimension | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
|-----------|---------|---------|---------|---------|---------|
| Problem Decomposition | Struggles to identify problem components; relies heavily on guidance | Can identify major problem parts but misses subtleties | Breaks problem into logical subcomponents; sequences steps | Anticipates hidden dependencies; plans for edge cases | Expert structuring; considers long-term maintainability and multiple solutions |
| Technical Execution | Code often incorrect; cannot run without help | Writes working code but inefficient or brittle | Produces correct, clean code; handles edge cases | Efficient, idiomatic, maintainable code; modular | Expert-level coding; optimized, scalable, extensible; minimal bugs |
| System Design | Cannot articulate components; vague or disconnected | Understands basic patterns; small system design | Designs moderately complex systems; handles trade-offs | Designs robust systems; anticipates failure modes; considers scalability | Expert system architect; designs for scale, reliability, maintainability |
| Communication | Struggles to express ideas; frequent misunderstandings | Basic clarity; limited adaptation | Clear and structured; listens actively | Persuasive; adapts to audience; anticipates questions | Inspires confidence; mentors others; aligns multiple stakeholders |
| Practical Maturity | Ignores constraints; over-engineers or under-delivers | Some awareness; occasional misjudgments | Balanced judgment; considers trade-offs | Mature judgment; anticipates long-term impact | Expert judgment; shapes technical/business decisions across teams |
| Learning Velocity | Slow to adapt; repeats mistakes | Learns basic new concepts with help | Learns independently; applies lessons | Rapid learning; generalizes concepts across contexts | Exceptional adaptability; mentors others; quickly integrates novel concepts |

---

## Appendix B: Gemini Output Schema

```json
{
  "dimensions": {
    "problem_decomposition": {
      "score": 4,
      "observable_behaviors": "Candidate broke the task into 3 phases: data fetching, transformation, and rendering. Identified the caching dependency before starting implementation.",
      "timestamps": ["3:24", "7:15", "12:02"],
      "trainable_gap": false
    },
    "technical_execution": {
      "score": 3,
      "observable_behaviors": "Code was functional and handled the main use case. Missed error handling for network failures. Used appropriate React patterns.",
      "timestamps": ["8:45", "14:30", "18:22"],
      "trainable_gap": true
    },
    "system_design": {
      "score": 3,
      "observable_behaviors": "Articulated component boundaries clearly. Did not discuss scalability or failure modes when asked.",
      "timestamps": ["5:10", "20:15"],
      "trainable_gap": true
    },
    "communication": {
      "score": 4,
      "observable_behaviors": "Explained thought process clearly throughout. Asked clarifying questions before starting. Summarized approach at the end.",
      "timestamps": ["1:00", "6:30", "22:45"],
      "trainable_gap": false
    },
    "practical_maturity": {
      "score": 3,
      "observable_behaviors": "Made reasonable trade-off decisions. Chose simpler solution when time was limited. Did not over-engineer.",
      "timestamps": ["9:20", "16:00"],
      "trainable_gap": true
    },
    "learning_velocity": {
      "score": 4,
      "observable_behaviors": "Quickly understood the unfamiliar API documentation. Applied a pattern from earlier in the session to a new problem.",
      "timestamps": ["11:30", "19:00"],
      "trainable_gap": false
    }
  },
  "overall_summary": "Candidate demonstrated strong problem decomposition and communication skills, methodically breaking down tasks and explaining their approach. Technical execution was solid but would benefit from more attention to error handling and edge cases."
}
```

---

## Appendix C: Archetype Dimension Weights

| Archetype | Problem Decomposition | Technical Execution | System Design | Communication | Practical Maturity | Learning Velocity |
|-----------|----------------------|---------------------|---------------|---------------|-------------------|-------------------|
| Frontend Engineer | Medium (1.0x) | High (1.25x) | Medium (1.0x) | Medium (1.0x) | Medium (1.0x) | Medium (1.0x) |
| Backend Engineer | High (1.25x) | High (1.25x) | High (1.25x) | Medium (1.0x) | Medium (1.0x) | Medium (1.0x) |
| Full Stack Engineer | High (1.25x) | High (1.25x) | Medium (1.0x) | Medium (1.0x) | Medium (1.0x) | Medium (1.0x) |
| AI/ML Engineer | High (1.25x) | High (1.25x) | Medium (1.0x) | Medium (1.0x) | Medium (1.0x) | High (1.25x) |
| DevOps/SRE Engineer | Medium (1.0x) | High (1.25x) | High (1.25x) | Medium (1.0x) | High (1.25x) | Medium (1.0x) |
| Software Architect / Tech Lead | Very High (1.5x) | Medium (1.0x) | Very High (1.5x) | Very High (1.5x) | High (1.25x) | Medium (1.0x) |

---

## Appendix D: Seniority Thresholds by Archetype

### Junior (No minimum thresholds)
All candidates qualify regardless of scores.

### Mid-Level
| Archetype | Required Thresholds |
|-----------|---------------------|
| Frontend Engineer | Technical Execution >= 3 |
| Backend Engineer | Technical Execution >= 3, System Design >= 3 |
| Full Stack Engineer | Technical Execution >= 3, Problem Decomposition >= 3 |
| AI/ML Engineer | Technical Execution >= 3, Learning Velocity >= 3 |
| DevOps/SRE Engineer | Technical Execution >= 3, System Design >= 3 |
| Software Architect / Tech Lead | System Design >= 3, Communication >= 3, Problem Decomposition >= 3 |

### Senior
| Archetype | Required Thresholds |
|-----------|---------------------|
| Frontend Engineer | Technical Execution >= 4, Communication >= 3 |
| Backend Engineer | Technical Execution >= 4, System Design >= 4 |
| Full Stack Engineer | Technical Execution >= 4, Problem Decomposition >= 4 |
| AI/ML Engineer | Technical Execution >= 4, Learning Velocity >= 4 |
| DevOps/SRE Engineer | Technical Execution >= 4, System Design >= 4, Practical Maturity >= 4 |
| Software Architect / Tech Lead | System Design >= 4, Communication >= 4, Problem Decomposition >= 4, Practical Maturity >= 4 |

---

## Appendix E: Gemini Evaluation Prompt

```
You are an expert software engineering interviewer evaluating a candidate's simulation recording.

## Input
Video recording of a candidate completing a simulated work day: HR interview → manager kickoff → coding task → PR defense.

## Your Task
Evaluate the candidate across 6 dimensions using ONLY observable behaviors from the video. Do not hallucinate or infer anything not directly shown.

## Scoring Rubric
[Insert full rubric from Appendix A]

## Instructions
For each dimension:
1. Assign a score 1–5 strictly following the rubric above
2. Describe specific observable behaviors that justify your score
3. Include timestamps (MM:SS format) for each key behavior
4. Mark trainable_gap = true if the skill can be improved with coaching

## Rules
1. ONLY evaluate what is directly observable in the video
2. Do NOT assume role, seniority, or background
3. Do NOT average scores across dimensions
4. Each dimension must be scored independently
5. Every score must have specific video evidence with timestamps
6. If a dimension cannot be evaluated (no relevant content), score as null with explanation

## Output Format
Return valid JSON matching this schema exactly:
[Insert schema from Appendix B]
```
