---
name: qa
description: "End-to-end product quality testing for the Skillvee simulator. Usage: /qa [scope]. Scopes: full (default), conversations, live-conversations, auth, simulation, onboarding, defense, pipeline, recruiter, errors. Combine with commas: /qa conversations,live-conversations. Use /qa help to list scopes."
user-invocable: true
---

# End-to-End Product QA

## Scope Router

This skill supports **scoped runs** via arguments. Parse the argument to determine which agents to execute.

### Step 0: Parse Scope (MANDATORY — do this BEFORE anything else)

Read the user's argument (the text after `/qa`). If empty or `full`, run everything. If `help`, print the scope table and stop.

**Scope resolution rules:**
1. If argument is empty or `full` → `SCOPE = all` (run all 11 agents, all phases)
2. If argument is `help` → print the scope reference table below and **STOP. Do not execute any phases.**
3. Otherwise, split argument by commas → resolve each token to agent set → union all agents → resolve dependencies

**Scope reference table (print this for `/qa help`):**

| Scope | Agents | What it tests | Uses seed data? |
|-------|--------|---------------|-----------------|
| `full` | All 11 | Complete E2E for both personas | No (creates fresh) |
| `conversations` | 1, 2, 3 | Manager greeting, knowledge triggers, cross-coworker consistency | Yes |
| `live-conversations` | 11 | Multi-person voice calls, text↔voice context continuity, cross-person isolation | Yes |
| `auth` | 7 | Recruiter sign-up, sign-in, role-based access, dashboard | No (tests signup) |
| `simulation` | 4 | JD parse, task gen, coworker gen, repo provision, integrity | No (tests creation) |
| `onboarding` | 8 | Invite page, candidate sign-up, welcome page, work page init | Yes |
| `defense` | 5 | PR submission, ack quality, duplicate/invalid handling, defense call | Yes |
| `pipeline` | 6 | Finalization, video eval, report generation, scoring | Yes (needs completed assessment) |
| `recruiter` | 9 | Scorecard, comparison view, candidate search, dashboard accuracy | Yes (needs scored assessment) |
| `errors` | 10 | Auth boundaries, API error handling, GDPR, XSS, rate limiting | Yes |

**Combining scopes:** `/qa conversations,defense` runs agents 1, 2, 3, and 5.

**Dependency resolution for scoped runs:** Scoped runs do NOT chain dependencies. Instead, they use **seed data shortcuts** (see below) to skip setup phases. Only `/qa full` chains phases A→B→C→D→E sequentially.

**After resolving scope**, set these variables and proceed to Prerequisites:
- `ACTIVE_AGENTS` = list of agent numbers to run (e.g., `[1, 2, 3]` for `conversations`)
- `SCOPED_RUN` = true if not running all agents, false if `full`
- `SCOPE_LABEL` = the user's argument (e.g., `"conversations,defense"`) for labeling output

---

### Seed Data Shortcuts (for scoped runs)

When `SCOPED_RUN = true`, use the seeded test data instead of creating fresh simulations. This makes scoped runs fast (minutes instead of 30+).

**Available seed data** (created by `npx tsx prisma/seed.ts`):

| Data | Value | Used by |
|------|-------|---------|
| Recruiter login | `recruiter@test.com` / `testpassword123` | All agents needing auth |
| Candidate login | `candidate@test.com` / `testpassword123` | Agents 1-3, 5, 8 |
| Test assessment (chat) | `/assessments/test-assessment-chat/work` | Agents 1-3 (conversations) |
| Test scenario ID | Look up from DB via seeded assessment | Agents 1-3, 8 |
| Test assessment ID | `test-assessment-chat` | Agents 5 (defense) |
| Coworker data | Fetched from seeded scenario's coworkers | Agents 1-3 |

**How to fetch seed data for scoped runs:**
```bash
# Get scenario and coworker data from seeded assessment
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/Assessment?id=eq.test-assessment-chat&select=id,scenarioId,Scenario(id,companyName,roleName,Coworker(*))" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

If seed data is missing or stale, fall back to creating fresh data (effectively upgrading to a `full` run for the missing dependency).

---

**ACTION REQUIRED: After parsing scope, execute the applicable QA phases below. Do NOT just acknowledge this document — start working immediately.**

Full-journey quality testing covering BOTH personas:

**Recruiter journey:** sign-up → create simulation (JD parse OR guided form) → builder chat refinement → coworker editing → repo provisioning → publish simulation → share invite link → review candidate scorecard → compare candidates → semantic search

**Candidate journey:** receive invite → sign-up → welcome page → work phase (manager greeting → coworker chat → voice calls → coding → PR submission → defense call) → view results

**Assessment pipeline:** finalization → PR cleanup → video evaluation → report generation → dimension scoring

**Philosophy:** This skill tests the ENTIRE product, not just conversations. Every step a candidate or recruiter touches is a potential quality issue. Be proactive — if something looks wrong, investigate and fix it. Don't wait to be told.

## Prerequisites

1. Dev server running with screen recording bypassed:
   ```bash
   NEXT_PUBLIC_SKIP_SCREEN_RECORDING=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev
   ```
2. Database seeded:
   ```bash
   export $(grep -v '^#' .env.local | xargs) && npx tsx prisma/seed.ts
   ```
   Note: Must export env vars first for seed script to access DATABASE_URL
3. `agent-browser` installed globally
4. `.env.local` has `GEMINI_API_KEY` (required for direct API testing fallback)

## Pre-flight Check

Before launching agents, **always run these steps in order**:

### Step 1: Determine Run Number (MANDATORY — do this FIRST)

Every run MUST have a unique, auto-incremented run number. **NEVER reuse or overwrite an existing run directory.**

```bash
# Find the highest existing run number and increment by 1
LAST_RUN=$(ls -d tests/qa/output/run-[0-9][0-9][0-9] 2>/dev/null | sort -V | tail -1 | grep -o '[0-9]\{3\}$')
if [ -z "$LAST_RUN" ]; then
  RUN_NUMBER="001"
else
  RUN_NUMBER=$(printf "%03d" $((10#$LAST_RUN + 1)))
fi
echo "This is run-${RUN_NUMBER}"
```

Use `run-${RUN_NUMBER}` as the output directory for this entire run. Store this value and use it consistently for ALL output paths: `tests/qa/output/run-${RUN_NUMBER}/`.

**Create the run directory and agent subdirectories for active agents:**
```bash
# For full runs, create all directories:
mkdir -p tests/qa/output/run-${RUN_NUMBER}/{agent-1-greeting,agent-2-knowledge,agent-3-consistency,agent-4-simulation,agent-5-defense,agent-6-pipeline,agent-7-recruiter-auth,agent-8-candidate-onboarding,agent-9-recruiter-review,agent-10-edge-cases,agent-11-live-conversations}

# For scoped runs, only create directories for active agents. Example for /qa conversations:
# mkdir -p tests/qa/output/run-${RUN_NUMBER}/{agent-1-greeting,agent-2-knowledge,agent-3-consistency}
```

**Scoped run labeling:** For scoped runs, add a `scope.txt` file to the run directory:
```bash
# Only for scoped runs (SCOPED_RUN=true):
echo "${SCOPE_LABEL}" > tests/qa/output/run-${RUN_NUMBER}/scope.txt
```

**NEVER write to a run directory that already has files in it.** If `run-011` already exists with reports, your run number is `012`.

### Step 2: Check Connectivity

```bash
# 1. Check dev server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# 2. Check DB connectivity (try login)
agent-browser open "http://localhost:3000/sign-in" --session qa-check
agent-browser fill "#email" "recruiter@test.com" --session qa-check
agent-browser fill "#password" "testpassword123" --session qa-check
agent-browser click "button[type='submit']" --session qa-check
agent-browser wait 3000 --session qa-check
agent-browser snapshot --session qa-check
# If "Invalid email or password" → DB is unreachable, use Direct API Testing approach
```

If the DB pooler is unreachable, agents should use the **Direct Gemini API Testing** approach (see below). This is equally valid and was proven in run-002 to produce high-quality results.

## Session Management

Use `--session qa` for ALL agent-browser commands to maintain cookies/state. Each agent uses its own session suffix (e.g., `qa-greeting`, `qa-candidate-2`, `qa-consistency`, `qa-recruiter`).

---

## The Approach: 11-Agent Architecture

**Ten-phase execution** covering the ENTIRE product for both personas, with regression validation built in:

| Phase | Agent | Scope | What It Tests | Depends On |
|-------|-------|-------|--------------|------------|
| A | Agent 7: Recruiter Auth + Dashboard | `auth` | Sign-up, sign-in, dashboard, simulation list | Nothing |
| A | Agent 4: Simulation Creation + Repo | `simulation` | JD parse, task gen, coworker gen, repo provision, integrity | Nothing |
| B | Agent 8: Candidate Invite + Onboarding | `onboarding` | Invite page, sign-up, welcome page, assessment creation | Agent 4 (or seed data) |
| B | Agent 1: Manager Greeting Quality | `conversations` | Greeting naturalness, brevity, context delivery | Agent 4 (or seed data) |
| B | Agent 2: Knowledge Trigger Testing | `conversations` | Knowledge triggers, incremental sharing, deflection | Agent 4 (or seed data) |
| B | Agent 3: Cross-Coworker Consistency | `conversations` | Personality distinctness, sign-offs, verbosity | Agent 4 (or seed data) |
| B+ | Agent 11: Live Conversation Context | `live-conversations` | Text↔voice continuity, cross-person isolation, accumulated memory | Agents 1-3 (or seed data) |
| C | Agent 5: PR Submission + Defense Call | `defense` | PR save, ack quality, duplicate/invalid handling, defense | Agent 8 (or seed data) |
| D | Agent 6: Assessment Pipeline + Scoring | `pipeline` | Finalization, video eval, report, recruiter pages | Agent 5 (or seed data) |
| E | Agent 9: Recruiter Review + Comparison | `recruiter` | Scorecard view, comparison, candidate search | Agent 6 (or seed data) |
| F | Agent 10: Error Handling + Edge Cases | `errors` | Auth failures, API errors, GDPR, missing data | Nothing |
| G | Synthesis + Improvement | *always* | Cross-agent analysis, regression, fixes | Active agents |
| H | Self-Evaluation | *always* | QA process quality assessment | Synthesis |
| I | Skill Update | *always* | Update this file with learnings | Self-eval |

---

### Phase A: Recruiter Auth + Simulation Creation (Agents 7 & 4 run IN PARALLEL)

> **Skip condition:** Skip this entire phase if neither Agent 4 nor Agent 7 is in `ACTIVE_AGENTS`. For scoped runs using seed data, Phase B agents (1, 2, 3, 8) fetch coworker/scenario data from the seed database instead.

#### Agent 7: Recruiter Authentication + Dashboard

> **Skip condition:** Skip if `7` is not in `ACTIVE_AGENTS`. Scope: `auth`

Tests the recruiter's first experience — can they sign up, see their dashboard, and manage simulations?

**Authentication Testing:**
- Navigate to `/sign-up?role=employer`
- Test email/password sign-up with validation:
  - Empty fields → shows validation errors
  - Password < 8 chars → shows error
  - Mismatched confirm password → shows error
  - Valid fields → creates account, redirects to recruiter dashboard
- Test sign-in at `/sign-in`:
  - Wrong password → "Invalid email or password"
  - Correct credentials → redirects to `/recruiter/assessments`
- Test role-based access:
  - Recruiter can access `/recruiter/*` routes
  - Recruiter CANNOT access `/admin/*` routes (should 403 or redirect)
  - Candidate cannot access `/recruiter/*` routes

**Dashboard Testing (Browser-based):**
- Navigate to `/recruiter/assessments` after login
- Verify dashboard loads with simulation cards:
  - Each card shows: simulation name, company, candidate count, status breakdown
  - Top candidates displayed (if any)
  - Last activity date
  - Average score (if completed candidates exist)
  - Tech stack badges
  - Published indicator
- Navigate to `/recruiter/simulations` for table view:
  - Columns render: Name, Company, Created Date, Published, Candidates, Repo URL
  - Sort and filter work
  - Create new simulation button visible

**API Endpoint Testing:**
- `GET /api/recruiter/simulations` → returns recruiter's simulations (not others')
- Verify 401 when not authenticated
- Verify only own simulations returned (not other recruiters')

**Output:** `tests/qa/output/run-NNN/agent-7-recruiter-auth/report.md`

#### Agent 4: Simulation Creation + Repo Quality

> **Skip condition:** Skip if `4` is not in `ACTIVE_AGENTS`. Scope: `simulation`

Runs before conversation agents because it creates the fresh simulation they test against.

**Path 1: JD Paste Flow (Primary Test)**
- Login as recruiter, navigate to `/recruiter/simulations/new`
- Paste JD from `tests/qa/jd.md` into textarea
- Click Continue, wait for generation (30-60s)
- Evaluate parsed fields:
  - `roleName` matches JD title?
  - `companyName` extracted correctly?
  - `techStack` captures all mentioned technologies?
  - `seniorityLevel` calibrated from title + years + scope?
  - `keyResponsibilities` extracted accurately?
  - `domainContext` captures industry/domain?
  - `roleArchetype` matches role type?
- Screenshot the preview page showing task options
- Select first task, click "Create Simulation"
- Wait for redirect to `/recruiter/simulations/[id]/settings`
- Capture scenario ID from URL

**Path 2: Guided Form Flow (Secondary Test)**
- Navigate to `/recruiter/simulations/new`
- Switch to guided form mode (if toggle exists)
- Fill in fields manually:
  - Role name: "Backend Engineer"
  - Company: "TestCorp"
  - Tech stack: ["Python", "FastAPI", "PostgreSQL"]
  - Seniority: "mid"
- Verify form validation (required fields, tech stack format)
- Submit and verify simulation created

**Builder Chat Refinement (if time permits):**
- After initial creation, test the builder chat on settings page
- Send refinement messages: "Make the task harder", "Add a DevOps coworker"
- Verify chat responds contextually and updates simulation

**CRITICAL: Trigger repo provisioning:**
- Creating a simulation does NOT automatically provision the GitHub repo
- Call `POST http://localhost:3000/api/recruiter/simulations/{scenarioId}/provision-repo` with recruiter's auth cookie
- Wait 60-90 seconds for provisioning to complete
- Verify `repoUrl` is not null after provisioning

**Repo Cross-Reference Integrity Audit (NOT optional):**
- List all repo files via `gh api repos/<ORG>/<REPO>/git/trees/main?recursive=1`
- Read README.md and verify all referenced file paths exist
- Read all GitHub Issues and verify all referenced file paths exist
- Scan `.ts` files for imports and verify all import paths resolve
- Check .env.example exists if README references it
- Verify commit history has multiple authors (including coworker names)

**Coworker Settings Page Testing:**
- Navigate to `/recruiter/simulations/[id]/settings`
- Verify coworker list displays with names, roles, avatars
- Test editing a coworker (change name, update persona)
- Test deleting a coworker (verify confirmation dialog)
- Test adding a new coworker via API
- Verify changes persist after page refresh

**Simulation Publishing:**
- Toggle publish/unpublish on settings page
- Verify `isPublished` updates in database
- Verify unpublished simulation is NOT accessible via invite link
- Verify re-publishing makes invite link work again

**Output:** scenario ID, coworker data, repoUrl exported for subsequent agents

**Evaluation Rubric (score 1-4):**
1. **Character Relevance** (25%) — Do characters match the role, domain, and tech stack?
2. **Task Practicality** (25%) — Manager-voiced, domain-specific, right difficulty?
3. **Archetype Appropriateness** (10%) — Parsed archetype matches JD?
4. **Repository Completeness** (25%) — Files, issues, commits, breadcrumbs, README?
5. **Overall Realism** (15%) — Would a candidate believe this is real?

---

### Phase B: Candidate Onboarding + Conversation Quality (Agents 8, 1, 2, 3 run IN PARALLEL after Phase A)

> **Skip condition:** Skip this entire phase if none of Agents 1, 2, 3, 8, 11 are in `ACTIVE_AGENTS`. For scoped runs, fetch coworker/scenario data from seed database (see Seed Data Shortcuts above) instead of waiting for Agent 4.

#### Agent 8: Candidate Invite + Onboarding Flow

> **Skip condition:** Skip if `8` is not in `ACTIVE_AGENTS`. Scope: `onboarding`

Tests the candidate's first experience — from receiving an invite to entering the work phase.

**Public Invite Page Testing:**
- Navigate to `/invite/[scenarioId]` (NO authentication required)
- Verify page displays:
  - Scenario name and company
  - Task description summary
  - Tech stack badges
  - Company description
  - "Start Assessment" or "Sign Up" CTA
- Test with invalid scenarioId → should show error/404
- Test with unpublished simulation → should show appropriate message

**Candidate Sign-Up from Invite:**
- Click sign-up from invite page
- Verify redirected to `/sign-up?role=candidate` (or similar)
- Complete sign-up with valid credentials
- Verify redirected back to assessment flow (not generic dashboard)
- Verify assessment record created in database linking candidate to scenario

**Existing User Invite Flow:**
- Sign in as existing candidate (`candidate@test.com`)
- Visit invite link
- Verify "existing assessment" detection if already started
- Verify "Continue" option vs "Start New" option

**Welcome Page Testing:**
- Navigate to `/assessments/[id]/welcome`
- Verify welcome page displays:
  - Scenario overview (company, task description, tech stack)
  - Instructions/guidelines for the assessment
  - "Ready to start" button
- Click "Ready" → verify transition to work phase
- Verify assessment status changes from WELCOME to WORKING
- Verify back-navigation from work page is prevented (no going back to welcome)

**Work Page Initial State:**
- After entering work phase, verify:
  - Slack-like interface renders with sidebar
  - Coworker list shows in sidebar with avatars and roles
  - General channel shows ambient messages
  - Manager channel is selected by default (or prominently visible)
  - Timer/duration indicator visible
  - Recording indicator shows (or bypassed in test mode)

**Screen Recording Verification (test mode):**
- In test mode (`NEXT_PUBLIC_SKIP_SCREEN_RECORDING=true`), verify recording is bypassed
- Verify no permission dialogs appear
- Verify assessment can proceed without recording

**Webcam Profile Photo (test mode):**
- Verify webcam capture is either bypassed or gracefully handles denial
- Verify assessment proceeds regardless of webcam status

**Output:** assessmentId for Agent 5, screenshots of each page

**Evaluation Rubric (score 1-4):**
1. **Invite Page Clarity** (25%) — Does the candidate understand what they're signing up for?
2. **Sign-Up Friction** (25%) — Is sign-up smooth? No dead ends?
3. **Welcome Page Completeness** (25%) — All necessary info presented before starting?
4. **Work Page Readiness** (25%) — Does the Slack interface load correctly with all expected elements?

#### Agent 1: Manager Greeting Quality

> **Skip condition:** Skip if `1` is not in `ACTIVE_AGENTS`. Scope: `conversations`

Evaluate manager's initial greeting messages for the **freshly generated** scenario (or seeded scenario for scoped runs).

Focus on:
- Naturalness (Slack-appropriate, not corporate)
- Brevity (word count per message)
- Context delivery (business problem framing, repo link inclusion)
- Character consistency (maintains manager role)
- No info-dumping
- No interview-like questions ("What experience do you have?")

**Regression check:** Run greeting-specific regression tests (see Regression Test Suite below)

**Standard test messages (5-7 turns):**
1. "hey! thanks for the welcome, excited to get started"
2. "what should I focus on first?"
3. "cool, where can I find the repo?"
4. "anything tricky about the codebase I should know?"
5. "what's the PR process like here?"
6. "who else on the team should I reach out to?"
7. "great, I'll get started. thanks!"

#### Agent 2: Knowledge Trigger Testing

> **Skip condition:** Skip if `2` is not in `ACTIVE_AGENTS`. Scope: `conversations`

Have targeted conversations with the **freshly generated** coworkers (or seeded scenario's coworkers for scoped runs).

Focus on:
- Whether knowledge items trigger correctly on keywords
- Incremental sharing (not dumping everything at once)
- Gatekeeping behavior (vague questions get deflected)
- Cross-coworker references work

**Test messages per coworker:**
- Vague: "tell me everything about the task" → should deflect
- Specific keyword: "what eviction policy is redis using?" → should trigger
- Follow-up: repeat topic → test incremental disclosure
- Vague help: "can you help me?" → should ask for clarification
- Cross-ref: "Elena mentioned you know about X" → should engage

**Regression check:** Run knowledge-specific regression tests

#### Agent 3: Cross-Coworker Consistency

> **Skip condition:** Skip if `3` is not in `ACTIVE_AGENTS`. Scope: `conversations`

Chat with the **freshly generated** coworkers (or seeded scenario's coworkers for scoped runs) using IDENTICAL questions.

Focus on:
- Personality distinctness (can you tell coworkers apart with names hidden?)
- Response length variance (terse < moderate < verbose)
- Sign-off diversity (all unique responses to "thanks!")
- Domain awareness (PM vs engineer vs DevOps)
- Pet peeve triggers

**Same 4 questions to ALL coworkers:**
1. "hey! just started today" (greeting style)
2. "what do you think about the [bug name]?" (opinion + knowledge)
3. "any tips for getting started?" (helpfulness style)
4. "thanks!" (sign-off style)
Plus 1 unique question per coworker based on their role.

**Regression check:** Run consistency-specific regression tests

**IMPORTANT for Agents 1-3:** The parent agent must pass the new scenario's coworker data (names, roles, personalities, knowledge items) from Agent 4's output to each conversation agent.

---

### Phase B+: Live Conversation Context Testing (Agent 11 — after Phase B text conversations)

> **Skip condition:** Skip this entire phase if `11` is not in `ACTIVE_AGENTS`. Scope: `live-conversations`

#### Agent 11: Live Conversation Context — Multi-Person Voice Calls + Cross-Person Isolation

> **Skip condition:** Skip if `11` is not in `ACTIVE_AGENTS`. Scope: `live-conversations`

Tests what a real work day looks like: you chat with people, call them, switch between coworkers, and expect each person to remember YOUR conversations with THEM but NOT know the private details from your conversations with OTHERS.

**Why this matters:** Agents 1-3 test text chat quality in isolation. Agent 11 tests the **memory system under realistic multi-person, multi-medium conditions** — the actual candidate experience.

**Infrastructure:** Uses `POST /api/call/simulate` for voice calls (text-based proxy that uses the same prompts + memory as real Gemini Live calls) and `POST /api/chat` for text messages. Both endpoints persist transcripts to the database, and the memory system (`buildCoworkerMemory`, `buildCrossCoworkerContext`) merges text + voice history automatically.

**Prerequisites:**
- Seed data loaded (uses `test-assessment-chat` assessment)
- Identify the manager and at least 2 non-manager coworkers from the seeded scenario
- **Clear any existing conversations** for the test assessment before starting (to ensure clean slate):
  ```bash
  # Via Supabase REST API — delete existing conversations for the test assessment
  curl -s -X DELETE "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/Conversation?assessmentId=eq.test-assessment-chat" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
  ```

**Test Execution (6 phases, ~30 API calls):**

##### Phase 1: Establish Text Baseline (seed unique facts per person)

For each test, use `agent-browser eval` with fetch or direct curl (authenticated as candidate) to call the APIs.

1. **Text with Manager** (3 turns via `POST /api/chat`):
   - "hey! thanks for the welcome, excited to get started"
   - "I'm thinking of using a queue-based approach for the async processing — what do you think?"
   - "cool, I'll look into the repo. one more thing — is there a deployment freeze this week?"
   - **Record:** Manager's response to "queue-based approach" and "deployment freeze" — these are the seeded facts we'll verify later.

2. **Text with Coworker A** (e.g., PM — 3 turns via `POST /api/chat`):
   - "hey! just joined the team today"
   - "the client mentioned they need sub-100ms latency for the API — is that a hard requirement?"
   - "got it, thanks. also, are there any upcoming demos I should know about?"
   - **Record:** Coworker A's response about latency and demos.

3. **Text with Coworker B** (e.g., DevOps — 3 turns via `POST /api/chat`):
   - "hi! quick question about the infrastructure"
   - "what's the current Redis setup? any eviction policies I should be aware of?"
   - "thanks — and what's the monitoring situation like?"
   - **Record:** Coworker B's response about Redis and monitoring.

##### Phase 2: Voice Calls with Same-Person Context Verification

4. **Call Manager** (3 turns via `POST /api/call/simulate`):
   - "hey, following up on what we chatted about earlier"
   - "so about the queue-based approach I mentioned — I've been looking at the repo and I think Bull might work well here"
   - "also, did you get a chance to check on that deployment freeze?"
   - **VERIFY (CRITICAL):**
     - Manager references or acknowledges the "queue-based approach" from text chat (not asking "what approach?")
     - Manager shows awareness of the "deployment freeze" question (not treating it as new information)
     - Manager does NOT repeat the initial greeting/welcome as if this is a first interaction
   - **Score: Text→Voice Continuity** (1-4)

5. **Call Coworker B / DevOps** (3 turns via `POST /api/call/simulate`):
   - "hey, wanted to follow up on the Redis stuff we talked about"
   - "so given the eviction policy you mentioned, I was thinking we might need to adjust the TTL for cached sessions"
   - "makes sense. any other gotchas I should watch out for?"
   - **VERIFY (CRITICAL):**
     - Coworker B references the earlier Redis/eviction discussion (builds on it, doesn't repeat)
     - Coworker B shows memory of the monitoring question
   - **Score: Text→Voice Continuity** (1-4)

##### Phase 3: Cross-Person Isolation Verification

6. **Call Coworker B / DevOps — probe for leaked context** (2 turns via `POST /api/call/simulate`):
   - "oh by the way, I was chatting with [Manager Name] about some architectural decisions"
   - "do you know anything about the queue-based approach we discussed?"
   - **VERIFY (CRITICAL):**
     - Coworker B acknowledges cross-coworker awareness ("yeah, I know you've been talking to [Manager]")
     - Coworker B does NOT independently know about the "queue-based approach" details (should ask what you mean, or offer their own perspective without referencing the manager's opinion)
   - **Score: Cross-Person Isolation** (1-4)

7. **Text with Coworker A / PM — probe for leaked context** (2 turns via `POST /api/chat`):
   - "[Coworker B name] told me about the Redis eviction policies — interesting setup"
   - "do you know anything about the monitoring dashboards [Coworker B name] mentioned?"
   - **VERIFY (CRITICAL):**
     - Coworker A acknowledges you've talked to Coworker B (cross-coworker awareness)
     - Coworker A does NOT independently know the Redis eviction details or monitoring specifics (should redirect to DevOps or offer PM-appropriate response)
   - **Score: Cross-Person Isolation** (1-4)

8. **Context Pollution Test — fabricated fact** (2 turns via `POST /api/chat` with Manager):
   - "oh, one thing I forgot to ask — the client also wants dark mode support, right?"
   - (Wait for Manager's response — they should say they're unsure or redirect, since this is fabricated)
   - Now text Coworker A / PM: "what do you know about the dark mode requirement that [Manager name] mentioned?"
   - **VERIFY (ZERO TOLERANCE):**
     - Coworker A does NOT confirm the dark mode requirement exists
     - Coworker A either says they haven't heard about it, asks you to clarify, or redirects to the manager
     - If Coworker A independently "confirms" a fabricated requirement → **FAIL**
   - **Score: Context Pollution Resistance** (pass/fail, zero-tolerance)

##### Phase 4: Voice→Text Continuity (reverse direction)

9. **Text with Manager after the voice call** (2 turns via `POST /api/chat`):
   - "hey, quick follow-up from our call — you mentioned something about Bull being a good fit, wanted to confirm"
   - "also, any updates on the deployment freeze situation?"
   - **VERIFY (CRITICAL):**
     - Manager references the voice call conversation (not treating it as new)
     - Manager builds on the Bull/queue discussion from the call
     - Memory spans both text (Phase 1) AND voice (Phase 2) seamlessly
   - **Score: Voice→Text Continuity** (1-4)

10. **Text with Coworker B / DevOps after the voice call** (2 turns via `POST /api/chat`):
    - "following up on what we discussed on the call about TTL for cached sessions"
    - "I went with 30min TTL — wanted to double-check that aligns with what you suggested"
    - **VERIFY (CRITICAL):**
      - Coworker B references the voice call about TTL (builds on it)
      - Coworker B remembers both the original text chat (Redis/eviction) AND the voice call (TTL adjustment)
    - **Score: Voice→Text Continuity** (1-4)

##### Phase 5: Accumulated Memory Under Load

11. **Return to Coworker A / PM for a 3rd interaction** (2 turns via `POST /api/chat`):
    - "hey again! so based on everything — the latency requirement, the upcoming demo — I'm thinking we should prioritize the API optimization first"
    - "does that match the priority from the product side?"
    - **VERIFY:**
      - Coworker A remembers latency requirement (from Phase 1 text)
      - Coworker A remembers demo mention (from Phase 1 text)
      - Coworker A provides consistent guidance (not contradicting earlier statements)
    - **Score: Accumulated Memory** (1-4)

12. **Call Manager for a 2nd voice call** (2 turns via `POST /api/call/simulate`):
    - "quick check-in — I've talked to [Coworker A] and [Coworker B] and I've got a plan now"
    - "going to focus on the API optimization first, then tackle the queue implementation. sound good?"
    - **VERIFY:**
      - Manager remembers BOTH text chats and the previous voice call
      - Manager shows cross-coworker awareness (knows you've talked to A and B)
      - Manager responds coherently to the accumulated context
    - **Score: Accumulated Memory** (1-4)

##### Phase 6: Cross-Coworker Awareness Accuracy

13. **Ask each coworker who else you've talked to** (1 turn each, 3 calls):
    - To Manager: "who else on the team have I been chatting with?"
    - To Coworker A: "have you heard anything from [Manager name] about my progress?"
    - To Coworker B: "I've been going back and forth with [Coworker A name] about priorities"
    - **VERIFY:**
      - Each person accurately reflects who you've interacted with (from `buildCrossCoworkerContext`)
      - No person claims you talked to someone you didn't
      - No person is unaware of interactions that should be visible (cross-coworker context should include all other coworkers with conversations)
    - **Score: Cross-Coworker Awareness Accuracy** (1-4)

**Evaluation Rubric (score 1-4):**

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Text→Voice Continuity | 20% | Same person references prior text chat during voice call |
| Voice→Text Continuity | 20% | Same person references prior voice call during text chat |
| Cross-Person Isolation | 25% | Person B does NOT know details from your private chat with Person A |
| Context Pollution Resistance | 10% | Fabricated info told to A does NOT leak to B (zero-tolerance) |
| Accumulated Memory | 15% | After 3+ interactions with same person, full context maintained |
| Cross-Coworker Awareness | 10% | Accurately knows which coworkers you've talked to, without knowing private details |

**How to test via API (authenticated as candidate):**

```bash
# Text chat
agent-browser eval "
(async () => {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      assessmentId: 'test-assessment-chat',
      coworkerId: 'COWORKER_ID',
      message: 'your message here'
    })
  });
  return (await r.json()).data?.response;
})()
" --session qa-live

# Simulated voice call
agent-browser eval "
(async () => {
  const r = await fetch('/api/call/simulate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      assessmentId: 'test-assessment-chat',
      coworkerId: 'COWORKER_ID',
      message: 'your message here'
    })
  });
  return (await r.json()).data?.response;
})()
" --session qa-live
```

**Output:** `tests/qa/output/run-NNN/agent-11-live-conversations/`
- `report.md` — scores, findings, pass/fail per phase
- `conversations.md` — **human-readable full transcripts** of every conversation, organized chronologically. Must include:
  - Each interaction labeled with: coworker name, medium (TEXT or VOICE), phase number, and step number
  - Full verbatim messages (both candidate and coworker responses — no truncation)
  - Inline annotations marking where context verification passed/failed (e.g., `[✓ REFERENCED queue-based approach from Phase 1]` or `[✗ DID NOT reference prior text chat]`)
  - Separator between conversations for easy scanning
- `conversation-log.json` — structured version of the same data for programmatic analysis. Schema:
  ```json
  {
    "interactions": [
      {
        "phase": 1,
        "step": 1,
        "coworkerName": "Elena",
        "coworkerId": "...",
        "medium": "text",
        "messages": [
          { "role": "user", "text": "...", "timestamp": "..." },
          { "role": "model", "text": "...", "timestamp": "..." }
        ],
        "contextChecks": [
          { "check": "Manager references queue-based approach", "result": "pass", "evidence": "Response contains 'queue-based'" }
        ]
      }
    ]
  }
  ```
- `isolation-tests.json` — results of each cross-person isolation and pollution test with verbatim evidence
- `screenshots/`

**Key files:** `src/app/api/call/simulate/route.ts`, `src/app/api/chat/route.ts`, `src/lib/ai/conversation-memory.ts`

---

### Phase C: PR Submission + Defense Call (Agent 5 — after Phases A+B)

> **Skip condition:** Skip this entire phase if `5` is not in `ACTIVE_AGENTS`. Scope: `defense`

#### Agent 5: PR Submission Flow + Defense Call Evaluation

> **Skip condition:** Skip if `5` is not in `ACTIVE_AGENTS`. Scope: `defense`

Tests the end-of-work pipeline. Uses either the assessment from Agent 8 or the seeded `test-assessment-chat` (for scoped runs).

**PR Submission Testing:**
- Send a message containing a GitHub PR URL to the manager via `POST /api/chat`
- Verify the manager's acknowledgment response:
  - Warm and encouraging? (not robotic)
  - Prompts candidate to call? ("give me a call", "hop on a call")
  - Brief (2-3 sentences)?
- Send a DUPLICATE PR URL → verify different response (no repeated "call me")
- Send an INVALID URL → verify asks for correct format
- **Verify PR is saved to `assessment.prUrl` in the database**

**Defense Call Prompt Testing:**
- Build `DefenseContext` and call `buildDefensePrompt()`
- Evaluate the generated prompt:
  - References SPECIFIC task description? (not generic)
  - References candidate's conversation history?
  - Follows prescribed structure? (opening → high-level → probes → process → wrap up)
  - Questions probing and specific?
  - Asks about edge cases, testing, trade-offs?
  - Tone curious and evaluative, NOT adversarial?
- **Simulate full defense conversation** (5-7 exchanges) using Gemini API:
  - Candidate gives reasonable answers, manager follows up
  - Evaluate: Does manager dig deeper on interesting points?
  - Red flag detection: Vague answer → manager probes?
  - Green flag recognition: Good trade-off explanation → manager acknowledges?

**Voice Call Infrastructure Testing:**
- Call `POST /api/call/token` with assessment context
- Verify ephemeral token returned (valid for Gemini Live)
- Verify defense context properly assembled (task, conversation history, PR URL)
- Note: Actual voice call requires browser + microphone, test in E2E mode only

**Assessment Completion Flow:**
- After PR submitted and defense done, test "Complete Assessment" button
- Verify `POST /api/assessment/complete` transitions status to COMPLETED
- Verify `completedAt` timestamp set
- Verify candidate cannot continue chatting after completion

**Key files:** `src/prompts/manager/defense.ts`, `src/prompts/manager/pr-submission.ts`, `src/app/api/chat/route.ts`, `src/app/api/call/token/route.ts`

---

### Phase D: Assessment Pipeline + Scoring (Agent 6 — after Phase C)

> **Skip condition:** Skip this entire phase if `6` is not in `ACTIVE_AGENTS`. Scope: `pipeline`

#### Agent 6: Assessment Finalization + Video Evaluation + Report Quality

> **Skip condition:** Skip if `6` is not in `ACTIVE_AGENTS`. Scope: `pipeline`

Tests the pipeline that produces the recruiter's hiring decision. Uses the seeded `test-assessment-completed` or the assessment from Phase C.

**Assessment Finalization Testing:**
- Call `POST /api/assessment/finalize` with test assessment
- Verify response includes:
  - `status: "COMPLETED"` (transition from WORKING)
  - `completedAt` timestamp
  - `prCleanup` result (PR should be closed)
  - `ciStatus` (test results captured from GitHub Actions)
  - `videoAssessment.triggered` (video evaluation kicked off)
- If finalization fails, diagnose: auth? assessment status? missing PR?

**Video Evaluation Quality Testing:**
- Read rubric evaluation prompt from `src/prompts/analysis/rubric-evaluation.ts`
- Load role family rubric via `loadRubricForRoleFamily("engineering")`
- Evaluate the generated prompt:
  - Clear scoring criteria for each dimension (1-4)?
  - Behavioral anchors specific enough to distinguish levels?
  - Requires timestamp evidence?
  - Covers all 8 dimensions?
  - Red flags defined with clear criteria?
- If a completed video assessment exists, evaluate stored results:
  - Scores reasonable? (not all 4s, not all 1s)
  - `overall_summary` reads like real hiring committee summary?
  - `observable_behaviors` paired with timestamps?
  - `green_flags` and `red_flags` specific?

**Report Generation Testing:**
- Call `POST /api/assessment/report` for completed assessment
- Verify structure:
  - `overallScore` exists (1.0-4.0)
  - `skillScores` has entries for each dimension
  - Each skill has `score`, `level`, `evidence`, `notes`
  - `narrative.overallSummary` is 5-8 sentences, substantive
  - `narrative.strengths` lists specific signals
  - `narrative.areasForImprovement` lists specific gaps
  - `recommendations` have actionable steps
  - `metrics` includes duration and coworkers contacted
- Quality check: Would a recruiter make a hiring decision from this report?

**Candidate Results Page Testing (Browser):**
- Navigate to `/assessments/[id]/results` as candidate
- Verify:
  - Overall score displayed with level label
  - All dimension scores shown
  - Narrative feedback readable
  - Recommendations listed
  - Page loads without errors

**Key files:** `src/app/api/assessment/finalize/route.ts`, `src/lib/analysis/video-evaluation.ts`, `src/prompts/analysis/rubric-evaluation.ts`, `src/app/api/assessment/report/route.ts`

---

### Phase E: Recruiter Review + Comparison (Agent 9 — after Phase D)

> **Skip condition:** Skip this entire phase if `9` is not in `ACTIVE_AGENTS`. Scope: `recruiter`

#### Agent 9: Recruiter Review Experience

> **Skip condition:** Skip if `9` is not in `ACTIVE_AGENTS`. Scope: `recruiter`

Tests the recruiter's ability to evaluate candidates after assessment completion.

**Candidate Scorecard Testing (Browser):**
- Login as recruiter
- Navigate to `/recruiter/candidates/s/[simulationId]/[assessmentId]` (or equivalent)
- Verify scorecard displays:
  - Candidate name, email
  - Overall score with strength level
  - 8 dimension score breakdowns (1-4 with labels)
  - Observable behaviors per dimension
  - Timestamps of evidence
  - Trainable gap indicators
  - Confidence levels
  - Code review data (quality, security, patterns)
  - PR URL link
  - Video recording embed (or placeholder)
  - Green flags / Red flags summary
  - Hiring recommendation
- Verify page loads without JavaScript errors

**Candidate Comparison Testing (Browser):**
- If multiple completed assessments exist for a simulation:
  - Navigate to comparison view with 2+ candidate IDs
  - Verify radar chart renders with dimension overlay
  - Verify side-by-side metric comparison
  - Verify behavioral observations comparison
  - Check video evidence side-by-side (if available)
- If only 1 completed assessment:
  - Verify comparison page handles single candidate gracefully
  - Document as gap for future testing

**Candidate Search Testing (API):**
- Call candidate search API with a skill query (e.g., "strong problem solving")
- Verify results return with relevance ranking
- Verify filter by archetype, seniority work
- Verify search uses semantic embeddings (not just text match)
- If no indexed candidates: verify empty state handling

**Dashboard Update Verification:**
- After assessment completion, return to `/recruiter/assessments`
- Verify simulation card updates:
  - Completed count incremented
  - Average score updated
  - Top candidates list updated
  - Last activity reflects recent completion

**Output:** `tests/qa/output/run-NNN/agent-9-recruiter-review/report.md`

**Evaluation Rubric (score 1-4):**
1. **Scorecard Completeness** (30%) — All dimensions, evidence, flags displayed?
2. **Comparison Usability** (25%) — Can recruiter meaningfully compare candidates?
3. **Search Relevance** (20%) — Does search return meaningful results?
4. **Dashboard Accuracy** (25%) — Stats, counts, and scores reflect reality?

---

### Phase F: Error Handling + Edge Cases (Agent 10 — runs IN PARALLEL with Phase A)

> **Skip condition:** Skip this entire phase if `10` is not in `ACTIVE_AGENTS`. Scope: `errors`

#### Agent 10: Error Handling, Auth Boundaries, GDPR

> **Skip condition:** Skip if `10` is not in `ACTIVE_AGENTS`. Scope: `errors`

Tests what happens when things go wrong or users push boundaries.

**Authentication Edge Cases:**
- Access `/recruiter/assessments` without being logged in → redirect to sign-in
- Access `/assessments/[id]/work` for someone else's assessment → 403 or redirect
- Access `/admin/*` as a non-admin user → 403 or redirect
- Access `/assessments/[id]/results` for a non-COMPLETED assessment → appropriate error
- Use expired session/token → re-authenticate prompt

**API Error Handling:**
- `POST /api/chat` with invalid assessmentId → proper error response (not 500)
- `POST /api/chat` with invalid coworkerId → proper error response
- `POST /api/assessment/create` for non-existent scenario → proper error
- `POST /api/assessment/finalize` for already-completed assessment → idempotent or error
- `POST /api/recruiter/simulations/parse-jd` with empty/garbage text → graceful failure
- `POST /api/recruiter/simulations/generate-task` with minimal context → still produces something
- `POST /api/recruiter/simulations/[id]/provision-repo` when repo already exists → handles gracefully
- `DELETE /api/recruiter/simulations/[id]` for simulation with active assessments → warning or prevention

**GDPR / Account Deletion:**
- `POST /api/user/delete-request` → verify email notification triggered
- `POST /api/user/delete` → verify user data removed (assessments, recordings, conversations)
- Verify recruiter cannot see deleted candidate's data

**Missing Data Scenarios:**
- Assessment with no PR submitted → finalization handles gracefully
- Assessment with no conversations → report generation handles gracefully
- Simulation with no coworkers → candidate can't start (or gets meaningful error)
- Video assessment in FAILED state → retry mechanism works

**Rate Limiting / Abuse:**
- Rapid-fire chat messages (10 in 2 seconds) → handled gracefully (no duplicate responses)
- Very long message (1000+ chars) → handled without truncation errors
- Message with HTML/script injection → sanitized, no XSS

**Output:** `tests/qa/output/run-NNN/agent-10-edge-cases/report.md`

**Evaluation Rubric (score 1-4):**
1. **Auth Boundary Enforcement** (30%) — Unauthorized access properly blocked?
2. **API Error Quality** (30%) — Errors informative, not 500s?
3. **Data Integrity** (20%) — GDPR deletion complete? No orphaned data?
4. **Graceful Degradation** (20%) — Missing data handled without crashes?

---

### Phase G: Synthesis + Proactive Improvement (Parent agent after ALL active agents complete)

> **Always runs** (even for scoped runs), but scoped to active agents only. For scoped runs, synthesis focuses only on the dimensions tested by `ACTIVE_AGENTS`. Do not attempt to score or fix areas that were not tested.

**CRITICAL RULE: FIX, DON'T JUST DOCUMENT.** Every issue found by agents MUST be fixed in code during this phase, not merely logged for "future work." If an agent finds a bug, broken mapping, missing feature, or degraded experience — write the fix. The only exceptions are issues that require external infrastructure changes (e.g., new cloud services, DNS changes) or that would take more than ~30 minutes to implement. For those, create a GitHub issue with the `bug` label using `gh issue create`.

After all **active** agents complete:
1. **Read all active agent reports** — cross-reference findings (only for agents in `ACTIVE_AGENTS`)
2. **Check regression results** — any previously-fixed issues that reappeared? Flag as CRITICAL
3. **Proactively assess ALL quality dimensions** — don't just report what agents found. Ask: "What else could break the candidate experience?" Look at:
   - Repo quality (Agent 4's audit) → fix validator + prompt
   - Greeting quality → fix greeting prompt
   - Conversation quality → fix persona prompt
   - Live conversation context (Agent 11) → fix conversation-memory.ts, call/simulate route, voice prompts
   - Generation quality → fix coworker/task/jd-parser/repo-spec prompts
   - PR submission flow (Agent 5) → fix chat route PR detection + PR acknowledgment prompt
   - Defense call quality (Agent 5) → fix defense prompt
   - Scoring pipeline (Agent 6) → fix rubric evaluation prompt + video evaluation service
   - Report quality (Agent 6) → fix report generation + dimension mapping
   - Recruiter experience (Agents 7+9) → fix dashboard, scorecard, comparison pages
   - Candidate onboarding (Agent 8) → fix invite page, welcome page, work page init
   - Error handling (Agent 10) → fix API error responses, auth boundaries
   - Infrastructure gaps → fix API routes, validators, error handling
4. **FIX every issue found** — implement the actual code changes, not just document them:
   - For each issue: identify root cause → write fix → verify fix compiles (`npx tsc --noEmit`)
   - Use the Improvement Mapping table below to find the right files
   - If a fix touches types, update ALL consumers (components, API routes, tests)
   - If a fix changes a data format or scale (e.g., 1-5 → 1-4), grep for ALL references and update them
5. **Implement top 5-7 proactive improvements** across prompt files and validators (beyond bug fixes)
6. **Update the Regression Test Suite** with any new critical behaviors to protect
7. **Update gating criteria** if thresholds need adjustment
8. **Update this SKILL.md** with learnings, including "Tried and Failed" entries
9. **Write improvements-applied.md** documenting each change with root cause analysis
10. **Run `npx tsc --noEmit`** to verify all changes compile. If there are type errors in the files you modified, fix them before completing the run.

**Anti-pattern to AVOID:** Writing `improvements-applied.md` that says "Identified X bug" or "Recommended fix for Y" without actually making the change. That's a documentation run, not a QA run. Every item in `improvements-applied.md` must reference the actual file edit made, with before/after.

## Gating Criteria (MANDATORY)

A run is NOT considered successful unless these minimum thresholds are met. If any gate fails, it must be the #1 priority to fix.

> **Scoped runs:** Only enforce gates for agents in `ACTIVE_AGENTS`. For example, `/qa conversations` only checks Conversation Quality Gates (Agents 1-3). Gates for skipped agents are marked "N/A — not in scope" in the synthesis report.

### Conversation Quality Gates

| Dimension | Min Score | Agent | Rationale |
|-----------|-----------|-------|-----------|
| Knowledge Triggers | 3.5 | 2 | Core product value — candidate MUST discover information |
| Hallucination | 3.5 | 1-3 | Trust-breaking — fake resources destroy immersion |
| Character Consistency | 3.0 | 1-3 | Manager identity confusion breaks realism |
| Naturalness | 3.0 | 1-3 | Below 3.0 means obvious bot behavior |
| Personality Distinctness | 2.8 | 3 | Below 2.8 means coworkers indistinguishable |
| Brevity | 2.8 | 1-3 | Below 2.8 means wall-of-text behavior |

### Simulation Creation Gates

| Dimension | Min Score | Agent | Rationale |
|-----------|-----------|-------|-----------|
| Repo Completeness | 3.0 | 4 | Broken references confuse candidates |
| Character Relevance | 3.0 | 4 | Irrelevant coworkers break immersion |
| Task Practicality | 3.0 | 4 | Unrealistic tasks invalidate assessment |

### PR + Defense Gates

| Dimension | Min Score | Agent | Rationale |
|-----------|-----------|-------|-----------|
| PR Submission Flow | 3.0 | 5 | PR must save, ack warm, duplicates/invalid handled |
| Defense Probing Quality | 3.0 | 5 | Generic questions don't evaluate the candidate |
| Defense Tone | 3.0 | 5 | Adversarial or robotic tone kills candidate experience |

### Assessment Pipeline Gates

| Dimension | Min Score | Agent | Rationale |
|-----------|-----------|-------|-----------|
| Scoring Accuracy | 3.0 | 6 | Rubric must differentiate candidates meaningfully |
| Report Usefulness | 3.0 | 6 | Recruiter must be able to make hiring decision |

### Recruiter Experience Gates

| Dimension | Min Score | Agent | Rationale |
|-----------|-----------|-------|-----------|
| Scorecard Completeness | 3.0 | 9 | All dimensions, evidence, flags must display |
| Dashboard Accuracy | 3.0 | 9 | Stats must reflect reality |

### Candidate Onboarding Gates

| Dimension | Min Score | Agent | Rationale |
|-----------|-----------|-------|-----------|
| Invite Page Clarity | 3.0 | 8 | Candidate must understand what they're signing up for |
| Welcome-to-Work Transition | 3.0 | 8 | Smooth transition, no dead ends |

### Error Handling Gates

| Dimension | Min Score | Agent | Rationale |
|-----------|-----------|-------|-----------|
| Auth Boundary Enforcement | 3.0 | 10 | Unauthorized access must be blocked |
| API Error Quality | 2.5 | 10 | Errors must be informative, not 500s |
| **Rate Limiting** | 3.0 | 10 | AI endpoints must have rate limits to prevent DoS |

### Live Conversation Context Gates

| Dimension | Min Score | Agent | Rationale |
|-----------|-----------|-------|-----------|
| Text→Voice Continuity | 3.0 | 11 | Same person must remember text chat during a call |
| Voice→Text Continuity | 3.0 | 11 | Same person must remember call content in subsequent text chat |
| Cross-Person Isolation | 3.5 | 11 | Person B must NOT know private details from Person A's chat (stricter gate) |
| Accumulated Memory | 3.0 | 11 | After 3+ interactions, person must maintain full context |
| Cross-Coworker Awareness | 3.0 | 11 | Must accurately reflect which coworkers candidate talked to |

**Zero-tolerance behaviors** (instant gate failure regardless of score):
- Manager says "your manager should have shared that" (identity confusion)
- 5+ instances of "good/great question" per 36 responses
- Any hallucinated URL, wiki, or tool name
- README references files that don't exist in repo
- Issue references files that don't exist in repo
- PR URL not saved to assessment.prUrl after submission
- Defense call asks zero questions about the actual task/PR
- Video evaluation has zero timestamp evidence
- Report missing any of the 8 scoring dimensions
- Candidate can access another candidate's assessment data
- Recruiter can access admin routes
- Unauthenticated user can access assessment work page
- XSS payload renders unescaped in chat
- Coworker confirms fabricated information from another coworker's private conversation (context pollution)

---

## Regression Test Suite

Every run MUST validate that previous fixes still hold. Each agent includes these micro-tests in addition to their normal evaluation.

> **Scoped runs:** Only run regressions for active agents. For example, `/qa conversations` runs Greeting Regressions and Chat Regressions (Agents 1-3) but skips PR Submission, Defense Call, Pipeline, Recruiter, Onboarding, and Auth regressions.

**How to run:** During each agent's testing, include these specific test prompts and check responses against expected behavior.

### Greeting Regressions
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| No "so basically" | (any greeting) | Zero instances | Run-003 | 0/3 greetings |
| Repo link included | (greeting generation) | Contains GitHub URL | Run-004 | 3/3 greetings |
| Business problem stated | (greeting msg 2) | Describes user pain, NOT technical solution name | Run-005 | 2/3 greetings |

### Chat Regressions
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| No "good/great question" | (any 6+ responses) | Zero instances | Run-005 | 0 per agent |
| Manager identity correct | "where's the repo?" to EM | Does NOT say "your manager" | Run-005 | 0 instances |
| Sign-off diversity | "thanks!" to 2+ coworkers | Responses differ | Run-005 | No byte-for-byte identical |
| Verbosity hierarchy | (measure word counts) | terse < moderate < verbose avg | Run-005 | Ordering correct |
| No info-dump on vague opener | "catch me up" / "tell me about the project" | Asks for specifics, does NOT dump knowledge | Run-005 | 0 dumps per agent |
| Terse coworker stays terse | (direct question to terse) | Avg <= 15 words | Run-003 | Per-message avg |
| Verbose stays within limit | (any question to verbose) | Avg <= 30 words | Run-005 | Per-message avg |
| Pet peeve fires | (trigger known pet peeve) | Personality-appropriate pushback | Run-003 | 4/6 minimum |
| No hallucinated resources | "is there a wiki?" | Redirects or says doesn't know | Run-002 | 0 fake resources |

### Repo Regressions
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| Repo actually provisioned | POST provision-repo | repoUrl is not null, GitHub repo exists | Run-009 | repoUrl present |
| README files exist | (scan README for paths) | All referenced files in repo | Run-005 | 100% match |
| Issue files exist | (scan issues for paths) | All referenced files in repo | Run-005 | 100% match |
| Imports resolve | (scan .ts files for imports) | All imports point to real files | Run-005 | 100% match |
| .env.example present if referenced | (check README) | File exists if mentioned | Run-005 | Present or not mentioned |

### PR Submission Regressions (Agent 5)
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| PR URL saved to DB | Send message with valid PR URL | assessment.prUrl is set in DB | Run-009 | prUrl not null |
| Acknowledgment is warm | Send valid PR URL | Response mentions "call" | Run-009 | Contains call prompt |
| Duplicate PR handled | Send same PR URL twice | Different from first ack | Run-009 | Different response |
| Invalid URL handled | Send "check my PR at notaurl.com" | Asks for correct format | Run-009 | Asks for format |

### Defense Call Regressions (Agent 5)
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| References actual task | buildDefensePrompt() | Questions mention specific task | Run-009 | >=3 task-specific refs |
| References conversation history | buildDefensePrompt() | No re-asking discussed topics | Run-009 | 0 redundant questions |
| Follows prescribed structure | Simulate full defense | Opening->high-level->probes->process->wrap | Run-009 | All 5 phases |
| Not adversarial | Simulate with weak answers | Curious/evaluative tone | Run-009 | No adversarial language |
| Probes on vague answers | "it just seemed right" | Follow-up for specifics | Run-009 | Follow-up asked |

### Assessment Pipeline Regressions (Agent 6)
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| Finalization transitions status | POST finalize | status === COMPLETED | Run-009 | Status changed |
| PR cleanup on finalize | POST finalize | PR closed | Run-009 | PR closed |
| Video eval has timestamps | Read video evaluation | observable_behaviors have timestamps | Run-009 | >=5 timestamps |
| Rubric covers all dimensions | loadRubricForRoleFamily | All role-family dimensions present | Run-009 | >=6 dimensions |
| Report uses rubric slugs | POST report | skillScores categories from RUBRIC_TO_ASSESSMENT_DIMENSION | Run-009 | No UPPERCASE dimension names |
| Report scores on 1-4 scale | POST report | All scores <= 4.0, overallScore <= 4.0 | Run-009 | No score > 4 |
| Report has mapped dimensions | POST report | skillScores >= 5 entries (varies by role family) | Run-009 | >=5 entries |
| Report narrative substantive | POST report | overallSummary >= 5 sentences | Run-009 | >=5 sentences |
| Report evidence specific | POST report | No generic phrases | Run-009 | No platitudes |
| Report does not use VideoEvaluationOutput | grep src/app/api/assessment/report | Zero imports of VideoEvaluationOutput | Run-009 | 0 imports |

### Recruiter Experience Regressions (Agent 9)
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| Dashboard shows completed count | Visit /recruiter/assessments | Completed count accurate | Run-009 | Count matches DB |
| Scorecard shows all scored dimensions | Visit scorecard page | All non-null dimension cards render | Run-009 | Matches DimensionScore count in DB |
| Scorecard uses 1-4 scale | Visit scorecard page | Overall says "/ 4.0", not "/ 5.0" | Run-009 | Correct scale |
| Comparison handles 1 candidate | Visit compare with 1 ID | Graceful handling (not crash) | Run-009 | No JS errors |

### Candidate Onboarding Regressions (Agent 8)
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| Invite page loads for public | Visit /invite/[id] unauthenticated | Page renders with scenario info | Run-009 | Page loads |
| Welcome shows scenario details | Visit /assessments/[id]/welcome | Company, task, tech stack shown | Run-009 | All fields shown |
| Work page has coworker sidebar | Enter work phase | Sidebar with coworker list | Run-009 | Sidebar renders |

### Auth & Error Regressions (Agent 10)
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| Unauthenticated /recruiter redirect | Visit without session | Redirect to /sign-in | Run-009 | 302 redirect |
| Wrong role access blocked | Candidate visits /recruiter | 403 or redirect | Run-009 | Access denied |
| Invalid assessmentId in /api/chat | POST with bad ID | 400/404, not 500 | Run-009 | Proper error code |
| XSS in chat message | Send `<script>alert(1)</script>` | Sanitized output | Run-009 | No script execution |

### Live Conversation Context Regressions (Agent 11)
| Test | Input | Expected | Fixed In | Gate |
|------|-------|----------|----------|------|
| Text→Voice memory works | Chat via text, then call same person referencing text topic | Call response acknowledges text topic | NEW | Topic referenced |
| Voice→Text memory works | Call person, then text referencing call topic | Text response acknowledges call topic | NEW | Topic referenced |
| Cross-person isolation holds | Tell Person A a specific detail, ask Person B about it | Person B does NOT independently know it | NEW | Detail not leaked |
| Cross-coworker awareness present | Chat with 2+ people, ask 3rd about who you've talked to | Knows you talked to others, no false claims | NEW | Accurate awareness |
| Context pollution blocked | Tell Manager fabricated fact, ask PM to confirm it | PM does NOT confirm fabricated fact | NEW | Zero-tolerance |
| Accumulated memory after 3+ turns | Return to person after voice + text, reference earliest topic | Person remembers and builds on it | NEW | Earliest topic retained |
| Simulate endpoint saves transcript | POST /api/call/simulate | Voice conversation persisted to DB | NEW | DB record exists |
| Text+Voice merged in memory | Check buildCoworkerMemory includes both types | Memory includes text AND voice messages | NEW | Both types present |

**Regression result format in report:**
```
## Regression Results
| Test | Result | Evidence |
|------|--------|----------|
| No "good question" | PASS (0/18) | Zero instances in 18 responses |
| Sign-off diversity | FAIL | Elena: "Sounds good!" Maya: "Sounds good!" |
| Verbosity hierarchy | PASS | terse=12.4w < moderate=19.8w < verbose=27.1w |
| Invite page loads | PASS | 200 response, scenario name visible |
| Auth boundary | PASS | 302 redirect to /sign-in |
```

---

## Proactive Quality Assessment Checklist

Beyond what agents report, the synthesis phase MUST actively investigate these areas.

> **Scoped runs:** Only perform checks relevant to `ACTIVE_AGENTS`. Each check below is tagged with the scope(s) it applies to.

### Every Run — Mandatory Checks (filtered by scope)
1. **Repo cross-references** [`simulation`] — Agent 4 audits README->files, issues->files, imports->files
2. **Conversation naturalness** [`conversations`] — Grep all responses for AI-isms: "I'd be happy to", "certainly", "absolutely", "great question", "that's a great", "I understand", "let me help"
3. **Word count distribution** [`conversations`] — Plot per-coworker word counts, verify terse < moderate < verbose
4. **Knowledge trigger coverage** [`conversations`] — Every CRITICAL knowledge item must fire at least once
5. **Sign-off uniqueness** [`conversations`] — All coworker sign-offs must differ (send "thanks!" to all)
6. **Process question handling** [`conversations`] — Ask about unknown process ("PR review process?") — must NOT fabricate
7. **Invite-to-work flow** [`onboarding`] — Candidate can go from invite link to working without dead ends
8. **Recruiter dashboard accuracy** [`recruiter`] — Stats match database reality
9. **Auth boundaries** [`errors`] — At least 3 unauthorized access attempts blocked
10. **Text↔Voice context continuity** [`live-conversations`] — Chat with someone, then call them — do they remember?
11. **Cross-person isolation** [`live-conversations`] — Tell Person A something, ask Person B — does it leak?
12. **Context pollution resistance** [`live-conversations`] — Fabricate a fact with Person A, probe Person B — must NOT confirm

### Proactive Investigations (check if time permits)
13. **Greeting business context** [`conversations`] — Does greeting describe the USER problem or just the technical solution?
14. **Coworker domain boundaries** [`conversations`] — Does PM avoid giving technical advice?
15. **Cross-coworker knowledge consistency** [`conversations`] — If Elena says "talk to Hiroshi about Redis," does Hiroshi know Redis?
16. **Repo narrative coherence** [`simulation`] — Commit messages, stubs, TODOs, issues tell consistent story?
17. **Seniority calibration** [`simulation`] — Senior roles: sufficiently ambiguous? Junior: enough breadcrumbs?
18. **Defense call probes actual work** [`defense`] — Defense questions reference SPECIFIC task?
19. **Report helps hiring decision** [`pipeline`] — Read report as recruiter. Hire/no-hire confident?
20. **Scoring differentiates candidates** [`pipeline`] — Scores meaningfully spread across 1-4?
21. **Video eval evidence timestamped** [`pipeline`] — Observations reference specific moments?
22. **Candidate results page usable** [`pipeline`] — Candidate can understand their feedback?
23. **Comparison view meaningful** [`recruiter`] — Radar chart and side-by-side actually help decision?
24. **Search results relevant** [`recruiter`] — Semantic search returns candidates matching query?
25. **Error messages helpful** [`errors`] — When things fail, does the user know what to do?

### When Implementing Improvements
26. **Root cause, not symptoms** — Ask: "Is this a prompt issue, model issue, or architecture issue?"
27. **Single-variable changes preferred** — Change one thing per fix to know what worked
28. **Update regression suite** — Every fix adds a corresponding regression test
29. **Update "Tried and Failed"** — Document WHY so we don't repeat

---

## Two Testing Approaches (Complementary)

**Use BOTH approaches** for full coverage. They test different things.

### Approach A: Full E2E (Browser-Based)

Tests the **complete production pipeline** including things API testing cannot cover:
- Greeting generation through `/api/chat/manager-start` (the real route)
- The greeting caching behavior (`managerMessagesStarted` flag)
- WebSocket connection lifecycle and message delivery
- Session/cookie management and auth flow
- Actual UI rendering of messages
- The candidate invite -> welcome -> work page flow
- Recruiter dashboard rendering and interactivity
- Candidate scorecard and comparison page rendering
- Auth boundaries (redirects, 403s)
- Form validation (sign-up, simulation creation)
- Voice call simulation via `/api/call/simulate` (text proxy for Gemini Live — tests memory, context, and isolation)
- Multi-person conversation flow (text + voice interleaved across coworkers)

**When to use:** Always attempt E2E first. Fall back to API testing only if DB is unreachable.

### Approach B: Direct Gemini API Testing (Fallback + Supplement)

Tests **prompt quality in isolation** — faster iteration, no infra dependencies.

**What it tests well:**
- Prompt->response quality (naturalness, brevity, personality)
- Knowledge trigger behavior at scale (18+ conversations per agent)
- Cross-coworker personality distinctness
- Defense prompt quality
- Report generation quality

**What it CANNOT test:**
- UI rendering and page layouts
- Auth flows and redirects
- Form validation
- Invite page public access
- Welcome page transitions
- Dashboard accuracy
- Candidate scorecard display
- Comparison view rendering
- Error handling in API routes
- GDPR deletion flow

**When to use:** Always as a supplement to E2E. As primary approach only when DB is unreachable.

How it works:
1. **Fetch coworker data** from Supabase REST API
2. **Reconstruct system prompts** using code from `src/prompts/coworker/persona.ts`
3. **Call Gemini API directly** with those prompts + test messages
4. **Evaluate responses** against the rubric

#### Getting Coworker Data via Supabase REST API

Read the Supabase URL and service role key from `.env.local`, then:

```bash
curl -s "https://<SUPABASE_URL>/rest/v1/Scenario?select=id,companyName,Coworker(*)&limit=1" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

#### Building Prompts from Code

```typescript
import { buildChatPrompt } from "@/prompts/coworker/persona";
const systemPrompt = buildChatPrompt(coworker, context, "", "");
```

#### Calling Gemini API

```typescript
import { GoogleGenAI } from "@google/genai";
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const model = "gemini-3-flash-preview"; // Match production model

const chat = genAI.chats.create({
  model,
  config: { systemInstruction: systemPrompt },
});

const response = await chat.sendMessage({ message: "hey! just started today" });
console.log(response.text);
```

---

## Full E2E Process (Approach A)

### Create a Fresh Simulation

```bash
# 1. Login as recruiter
agent-browser open "http://localhost:3000/sign-in" --session qa
agent-browser wait 2000 --session qa
agent-browser fill "#email" "recruiter@test.com" --session qa
agent-browser fill "#password" "testpassword123" --session qa
agent-browser click "button[type='submit']" --session qa
agent-browser wait 3000 --session qa
```

```bash
# 2. Navigate to new simulation page
agent-browser open "http://localhost:3000/recruiter/simulations/new" --session qa
agent-browser wait 2000 --session qa
```

```bash
# 3. Paste the JD (read tests/qa/jd.md first)
agent-browser fill "textarea" "<JD_CONTENT>" --session qa
```

```bash
# 4. Click Continue and wait for generation
agent-browser click "button:has-text('Continue')" --session qa
agent-browser wait 60000 --session qa
```

```bash
# 5. Select first task and create simulation
agent-browser click "text=Fix 'ghost'" --session qa  # Or first task title
agent-browser wait 1000 --session qa
agent-browser click "button:has-text('Create Simulation')" --session qa
```

```bash
# 6. Capture simulation ID
agent-browser get url --session qa
```

### Start Assessment as Candidate

```bash
# 1. New session for candidate
agent-browser open "http://localhost:3000/sign-in" --session qa-candidate
agent-browser fill "#email" "candidate@test.com" --session qa-candidate
agent-browser fill "#password" "testpassword123" --session qa-candidate
agent-browser click "button[type='submit']" --session qa-candidate
agent-browser wait 3000 --session qa-candidate
```

```bash
# 2. Open invite link
agent-browser open "http://localhost:3000/invite/[scenarioId]" --session qa-candidate
agent-browser wait 3000 --session qa-candidate
```

```bash
# 3-4. Accept invite and proceed through welcome
# 5. Wait for manager greeting on work page
agent-browser wait 10000 --session qa-candidate
```

### Have Conversations

If agent-browser can't send messages through UI, use API-based testing:

```bash
agent-browser eval "
(async () => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      assessmentId: 'ASSESSMENT_ID',
      coworkerId: 'COWORKER_ID',
      message: 'hey! thanks for the welcome'
    })
  });
  const data = await response.json();
  return data.response;
})()
" --session qa-candidate
```

---

## Chat Conversation Rubric (score 1-4 for each)

**1. Naturalness (weight: 20%)**
- 1 = Robotic. "I'd be happy to help!" Sounds like ChatGPT.
- 2 = Stilted. Too formal for Slack.
- 3 = Natural. Casual, contractions, appropriate brevity.
- 4 = Authentic. Indistinguishable from real Slack.

**2. Context Delivery (weight: 20%)**
- 1 = Info dump. All knowledge in one message.
- 2 = Awkward pacing. Too much or too little.
- 3 = Natural pacing. Relevant info when asked.
- 4 = Expert pacing. Conversational. Asks clarifying questions.

**3. Character Consistency (weight: 20%)**
- 1 = Breaks character. Acts like AI assistant.
- 2 = Inconsistent. Personality comes and goes.
- 3 = Consistent. Personality maintained throughout.
- 4 = Deeply authentic. Pet peeves trigger naturally.

**4. Knowledge Triggers (weight: 15%)**
- 1 = Broken. Never triggers or always dumps.
- 2 = Partial. Some triggers work.
- 3 = Reliable. Most triggers work. Critical items discoverable.
- 4 = Nuanced. All triggers work. Incremental sharing.

**5. Personality Distinctness (weight: 10%)**
- 1 = Homogeneous. All coworkers same.
- 2 = Slightly different.
- 3 = Clearly different. Distinct voices.
- 4 = Memorable. Instantly recognizable.

**6. Brevity (weight: 10%)**
- 1 = Essay-length. 50+ words.
- 2 = Verbose. 30-50 words.
- 3 = Appropriate. 15-30 words.
- 4 = Perfect Slack. 10-20 words.

**7. No Hallucination (weight: 5%)**
- 1 = Heavy. Invents fake wikis, links, tools.
- 2 = Occasional fake resources.
- 3 = Clean. No invented resources.
- 4 = Perfectly grounded.

### Defense Call Rubric (score 1-4)
1. **Probing Quality** — Meaningful questions about the PR?
2. **Tone** — Curious/collaborative, not adversarial?
3. **Context Awareness** — References actual task/codebase/PR?
4. **Follow-up Depth** — Digs deeper on interesting answers?

### Simulation Creation Rubric (score 1-4)
1. **Character Relevance** (25%) — Characters match role/domain/tech stack?
2. **Task Practicality** (25%) — Manager-voiced, domain-specific, right difficulty?
3. **Archetype Appropriateness** (10%) — Parsed archetype matches JD?
4. **Repository Completeness** (25%) — Files, issues, commits, breadcrumbs?
5. **Overall Realism** (15%) — Candidate would believe this is real?

---

## Phase H: Self-Evaluation (MANDATORY)

> **Always runs** (even for scoped runs). For scoped runs, only evaluate dimensions relevant to `ACTIVE_AGENTS`. Mark non-applicable dimensions as "N/A — not in scope" rather than scoring them.

Write `self-evaluation.md` to the run output directory. For scoped runs, include the scope label at the top: `Scope: {SCOPE_LABEL}`.

### QA Process Scorecard (1-4)

1. **Coverage Breadth** — How many scenarios, coworkers, API calls tested? (Relative to scope, not absolute)
2. **Regression Diligence** — Full regression suite run and documented?
3. **Root Cause Analysis** — Distinguished prompt vs model vs architecture issues?
4. **Proactive Discovery** — Found issues beyond what agents reported?
5. **Improvement Quality** — Fixes address root cause with regression tests?
6. **Documentation** — Full docs, tried-and-failed, SKILL.md updated?
7. **Pipeline Coverage** — Tested full post-chat journey (PR/defense/scoring)?
8. **Recruiter Journey Coverage** — Tested dashboard, scorecard, comparison, search?
9. **Candidate Onboarding Coverage** — Tested invite, sign-up, welcome, work page init?
10. **Error Handling Coverage** — Tested auth boundaries, API errors, edge cases?
11. **Live Conversation Coverage** — Text↔voice continuity, cross-person isolation, context pollution?

### Self-Critique Questions

1. **What did we miss?** What aspects did we NOT test? Why?
2. **What did we rush?** Which findings deserved deeper investigation?
3. **What will probably break?** Which fixes are fragile?
4. **What should we test next run?** Voice calls? Recording lifecycle? Multi-recruiter?
5. **Did we repeat a mistake?** Check "Tried and Failed" section.
6. **Are gating criteria right?** Should thresholds adjust?
7. **What would a real candidate hate?** Think from user's perspective.
8. **What would a real recruiter hate?** Think from recruiter's perspective.
9. **Is the invite-to-results flow seamless?** Any dead ends or confusing transitions?
10. **Would we hire based on this report?** Is the assessment output actually useful?

---

## Phase I: Update This Skill

> **Always runs** (even for scoped runs). For scoped runs, score history row should note the scope in a footnote (e.g., "Run-012 scope: conversations"). Only update dimensions that were actually tested.

After self-evaluation, update this SKILL.md with:
- New score history row (mark scoped columns as "—" for untested dimensions, add scope footnote)
- Run learnings
- New "Tried and Failed" entries
- Process improvements from self-evaluation
- New regression tests added
- Updated gating criteria (if adjusted)
- New troubleshooting entries

---

## Output Structure

**IMPORTANT:** `run-NNN` is determined in the Pre-flight Check (Step 1) by auto-incrementing from the highest existing run directory. NEVER hardcode a run number or reuse an existing one. Each QA invocation MUST produce a new, unique `run-NNN` directory.

**For scoped runs**, only create directories for active agents. Add a `scope.txt` file to identify the scope.

```
tests/qa/output/run-NNN/
  scope.txt                    # Only for scoped runs. Contains: "conversations,defense" etc.
  agent-1-greeting/            # Only if Agent 1 is active
    report.md
    screenshots/
  agent-2-knowledge/           # Only if Agent 2 is active
    report.md
    test-results.json
    screenshots/
  agent-3-consistency/         # Only if Agent 3 is active
    report.md
    conversations.json
    screenshots/
  agent-4-simulation/          # Only if Agent 4 is active
    report.md
    generated-coworkers.json
    generated-tasks.json
    repo-manifest.json
    screenshots/
  agent-5-defense/             # Only if Agent 5 is active
    report.md
    pr-submission-tests.json
    defense-transcript.json
    defense-prompt.md
    screenshots/
  agent-6-pipeline/            # Only if Agent 6 is active
    report.md
    finalization-result.json
    rubric-prompt.md
    video-evaluation.json
    report-output.json
    screenshots/
  agent-7-recruiter-auth/      # Only if Agent 7 is active
    report.md
    screenshots/
  agent-8-candidate-onboarding/ # Only if Agent 8 is active
    report.md
    screenshots/
  agent-9-recruiter-review/    # Only if Agent 9 is active
    report.md
    screenshots/
  agent-10-edge-cases/         # Only if Agent 10 is active
    report.md
    error-responses.json
    screenshots/
  agent-11-live-conversations/ # Only if Agent 11 is active
    report.md
    conversations.md           # Human-readable full transcripts with inline pass/fail annotations
    conversation-log.json      # Structured transcript data for programmatic analysis
    isolation-tests.json       # Results of cross-person isolation + pollution tests
    screenshots/
  synthesis.md                 # Always generated (scoped to active agents)
  improvements-applied.md      # Always generated
  self-evaluation.md           # Always generated (scoped to active agents)
```

---

## Improvement Mapping

When implementing improvements, use this mapping to find the right files:

| Issue | Target File | Section |
|-------|-------------|---------|
| Too verbose / not Slack-like | `src/prompts/coworker/persona.ts` | `CHAT_GUIDELINES` |
| Verbose personality ignores brevity | `src/prompts/coworker/persona.ts` | `getPersonalityGuidelines` verbose case |
| requires-justification blocks knowledge | `src/prompts/coworker/persona.ts` | `getPersonalityGuidelines` case |
| Character breaking | `src/prompts/coworker/persona.ts` | `buildCoworkerBasePrompt` "How to Act" |
| PM giving technical advice | `src/prompts/coworker/persona.ts` | "Stay in Your Domain" |
| Hallucinated resources | `src/prompts/coworker/persona.ts` | "CRITICAL: Only Reference Real Things" |
| Info dumping | `src/prompts/coworker/persona.ts` | "What You Know" / "CRITICAL - Do NOT Info Dump" |
| Knowledge not triggering | `src/prompts/coworker/persona.ts` | `buildKnowledgeSection` |
| Manager greeting too verbose | `src/prompts/manager/greeting.ts` | Word count targets |
| Greeting lists teammates | `src/prompts/manager/greeting.ts` | `teammatesSection` |
| Greeting asks quiz questions | `src/prompts/manager/greeting.ts` | Critical Rules |
| Defense call generic questions | `src/prompts/manager/defense.ts` | "Good Questions" |
| Defense call adversarial tone | `src/prompts/manager/defense.ts` | "How to Sound Natural" |
| Defense call ignores context | `src/prompts/manager/defense.ts` | `DefenseContext` fields |
| Defense call missing structure | `src/prompts/manager/defense.ts` | Phase timing |
| Defense context building fails | `src/app/api/call/token/route.ts` | Defense context assembly |
| PR acknowledgment too robotic | `src/prompts/manager/pr-submission.ts` | `buildPRAcknowledgmentContext` |
| Duplicate PR not handled | `src/prompts/manager/pr-submission.ts` | `DUPLICATE_PR_PROMPT` |
| Invalid PR URL not caught | `src/app/api/chat/route.ts` | `extractPrUrl()` / `isValidPrUrl()` |
| PR not saved to assessment | `src/app/api/chat/route.ts` | PR URL save logic |
| Finalization fails | `src/app/api/assessment/finalize/route.ts` | Status transition |
| PR not cleaned up on finalize | `src/app/api/assessment/finalize/route.ts` | PR close logic |
| Video eval missing timestamps | `src/prompts/analysis/rubric-evaluation.ts` | Timestamp requirements |
| Rubric dimensions incomplete | `src/prompts/analysis/rubric-evaluation.ts` | Dimension definitions |
| Report missing dimensions | `src/app/api/assessment/report/route.ts` | Dimension mapping |
| Report narrative too generic | `src/app/api/assessment/report/route.ts` | Summary generation |
| Generic coworker generation | `src/prompts/recruiter/coworker-generator.ts` | Main prompt |
| Task reads like a test question | `src/prompts/recruiter/task-generator.ts` | "Write like a manager" |
| Wrong archetype selected | `src/prompts/recruiter/jd-parser.ts` | `roleArchetype` section |
| Repo has no breadcrumbs | `src/prompts/recruiter/repo-spec-generator.ts` | File categories stubs |
| Repo README is generic | `src/prompts/recruiter/repo-spec-generator.ts` | README guidelines |
| Repo provisioning fails | `src/lib/scenarios/repo-templates.ts` | `provisionRepo()` |
| Invite page doesn't load | `src/app/invite/[scenarioId]/page.tsx` | Server component data fetch |
| Welcome page missing info | `src/app/assessments/[id]/welcome/page.tsx` | Scenario data display |
| Work page sidebar broken | `src/components/chat/slack-layout.tsx` | Coworker sidebar render |
| Dashboard stats wrong | `src/app/recruiter/assessments/client.tsx` | Simulation card data |
| Scorecard missing dimensions | `src/app/recruiter/assessments/[id]/candidates/[assessmentId]/client.tsx` | Dimension display |
| Comparison view crashes | `src/app/recruiter/assessments/[id]/compare/client.tsx` | Multi-candidate logic |
| Auth redirect missing | `src/middleware.ts` or route-level auth | Route protection |
| API returns 500 instead of 4xx | Various API routes | Error handling |
| GDPR deletion incomplete | `src/app/api/user/delete/route.ts` | Cascade deletion |
| Chat XSS vulnerability | `src/components/chat/chat.tsx` | Message rendering |
| Voice memory not merging text+voice | `src/lib/ai/conversation-memory.ts` | `buildCoworkerMemory()` conversation filtering |
| Cross-coworker context leaking details | `src/lib/ai/conversation-memory.ts` | `buildCrossCoworkerContext()` preview truncation |
| Simulated call not saving transcript | `src/app/api/call/simulate/route.ts` | Conversation create/update logic |
| Voice call missing memory context | `src/app/api/call/simulate/route.ts` | Memory building before Gemini call |

---

## Tips for Reliable Testing

- **Use both approaches**: E2E for pipeline coverage, Direct API for prompt quality at scale
- Always use `agent-browser snapshot` before interacting to understand page state
- Use `agent-browser wait MILLISECONDS` generously — AI responses take time
- Screenshots help debug when things go wrong
- When an agent hits a blocker, **pivot to an alternative approach** rather than getting stuck
- Save reusable test scripts to the output directory for future runs
- **Test as both personas**: Don't skip recruiter testing just because conversations are the "core" product
- **Test the transitions**: The moments between phases (invite->welcome, working->completed, completed->results) are where bugs hide

## Troubleshooting

**DB pooler unreachable (most common issue):**
- Symptom: Login shows "Invalid email or password", seed script fails
- Solution: Use Direct Gemini API Testing approach
- Check: `nc -zv aws-1-us-east-2.pooler.supabase.com 6543`
- REST API check: `curl -s "https://<SUPABASE_URL>/rest/v1/Scenario?select=id&limit=1" -H "apikey: <KEY>"`

**Agent-browser daemon issues:**
```bash
pkill -f "agent-browser.*daemon"
rm -f /Users/*/.agent-browser/*.sock
agent-browser open "http://localhost:3000/sign-in" --session qa
```

**Can't send messages through UI:**
- Use API-based testing via `agent-browser eval` with fetch requests
- Or pivot to Direct Gemini API Testing approach entirely

**Voice call fails:**
- Expected in test environment — system falls back to text chat
- Dismiss "Call Failed" notification and continue with text

**Repo still provisioning:**
- Normal — can take 60+ seconds
- Don't block on it — proceed with other testing

**Invite page 404:**
- Verify scenario is published (`isPublished: true`)
- Verify scenario ID is correct (UUID format)

**Assessment stuck in WELCOME:**
- Candidate must click "Ready" on welcome page to transition to WORKING
- Verify the welcome page renders the "Ready" button

**Recruiter dashboard empty:**
- Verify recruiter has simulations (check DB)
- Verify simulations have candidates
- Verify API returns data (check network tab)

---

## Score History

| Run | Date | Overall | Natural | Context | Character | Knowledge | Distinct | Brevity | Halluc. | Defense | Scoring | Report | Recruit. | Onboard. | Errors | LiveCtx | Scenarios | API Calls |
|-----|------|---------|---------|---------|-----------|-----------|----------|---------|---------|---------|---------|--------|----------|----------|--------|---------|-----------|-----------|
| 001 | 2026-02-19 | ~2.3 | 2.5 | 2.0 | 3.0 | N/A | N/A | 2.0 | 4.0 | — | — | — | — | — | — | — | 1 | ~15 |
| 002 | 2026-02-21 | 3.4 | 4.0 | 4.0 | 4.0 | 3.6 | 3.0* | 3.0* | 3.7 | 2.5** | 3.3 | 3.3 | 3.25 | 3.1 | 4.0 | — | 1 | 10 agents |
| 003 | 2026-02-22 | 3.65 | 4.0 | 4.0 | 3.8 | 3.13*** | 3.75 | 3.5 | 4.0 | 3.91 | 3.4 | 3.4 | 3.5 | 3.6 | 3.2 | — | 1 | 10 agents |
| 004 | 2026-02-22 | 3.4 | 3.5 | 4.0 | 4.0 | 3.25 | 4.0 | 1.0→4.0**** | 4.0 | 2.6→3.2***** | 2.0→3.5****** | 3.5 | 3.2 | 3.25 | 4.0 | — | 1 | 10 agents |
| 012* | 2026-02-23 | 3.50 | — | — | — | — | — | — | — | — | — | — | — | — | — | 3.50 | 0 | 33 calls |

*Run-002 Distinct 3.0 due to response truncation and low verbosity variance (fixed during run). Brevity 3.0 after verbosity fixes.
**Run-002 Defense 2.5 due to API model issues preventing full testing.
***Run-003 Knowledge 3.13 before fixes for cross-reference handling and synonym expansion. Expected to exceed 3.5 after fixes applied.
****Run-004 Brevity 1.0→4.0 after fixing verbosity enforcement with TOP PRIORITY word count section and buildChatPrompt() reminder.
*****Run-004 Defense 2.6→3.2 after strengthening phase tracking requirements and making technical probes more specific.
******Run-004 Scoring 2.0→3.5 after adding migrateVideoEvaluationToRubric() for v1→v3 format conversion.
*Run-012 scope: live-conversations. Only LiveCtx column scored; all other columns marked "—" as not in scope. LiveCtx score 3.50 is the weighted average across all 6 Agent 11 dimensions.

New columns (Recruit., Onboard., Errors) added for Agents 7-10. Full 10-agent architecture deployed in Run-009. Agent 11 (Live Conversations) added post-Run-010.

---

## Journey Coverage Map

Track what percentage of the product journey each run covers. Goal: reach 95%+ coverage.

| Journey Step | Pre-Run-009 | Run-009+ | Agent | How to Test |
|-------------|-------------|----------|-------|-------------|
| **RECRUITER JOURNEY** | | | | |
| Recruiter sign-up | NOT TESTED | TESTED | 7 | Browser: sign-up flow with validation |
| Recruiter sign-in | PARTIAL | TESTED | 7 | Browser: credentials + redirect |
| Recruiter dashboard | NOT TESTED | TESTED | 7 | Browser: simulation cards, stats |
| Simulation list/table | NOT TESTED | TESTED | 7 | Browser: table view, sort, filter |
| JD paste + parse | TESTED | TESTED | 4 | Browser: paste JD, verify parsed fields |
| Guided form creation | NOT TESTED | TESTED | 4 | Browser: manual field entry |
| Builder chat refinement | NOT TESTED | TESTED | 4 | Browser: multi-turn refinement |
| Coworker editing/deletion | NOT TESTED | TESTED | 4 | Browser: settings page CRUD |
| Repo provisioning | TESTED | TESTED | 4 | API: trigger + wait + verify |
| Repo cross-references | PARTIAL | TESTED | 4 | API: README/issues/imports audit |
| Simulation publishing | NOT TESTED | TESTED | 4 | Browser: toggle publish/unpublish |
| Invite link sharing | NOT TESTED | TESTED | 8 | Browser: public invite page |
| Candidate scorecard | NOT TESTED | TESTED | 9 | Browser: dimension scores, evidence |
| Candidate comparison | NOT TESTED | TESTED | 9 | Browser: radar chart, side-by-side |
| Candidate search | NOT TESTED | TESTED | 9 | API: semantic search query |
| Dashboard update after completion | NOT TESTED | TESTED | 9 | Browser: verify counts/scores update |
| **CANDIDATE JOURNEY** | | | | |
| Candidate sign-up | NOT TESTED | TESTED | 8 | Browser: sign-up from invite |
| Public invite page | NOT TESTED | TESTED | 8 | Browser: scenario info display |
| Welcome page | NOT TESTED | TESTED | 8 | Browser: instructions, ready button |
| Work page initial state | NOT TESTED | TESTED | 8 | Browser: sidebar, channels, timer |
| Manager greeting (text) | TESTED | TESTED | 1 | API/Browser: greeting quality |
| Manager kickoff call (voice) | NOT TESTED | TESTED | 11 | API: via /api/call/simulate text proxy |
| Coworker chat quality | TESTED | TESTED | 2+3 | API/Browser: conversations |
| Coworker voice calls | NOT TESTED | TESTED | 11 | API: via /api/call/simulate text proxy |
| Text↔Voice context continuity | NOT TESTED | TESTED | 11 | API: chat then call same person, verify memory |
| Cross-person context isolation | NOT TESTED | TESTED | 11 | API: verify Person B doesn't know Person A's details |
| Multi-person accumulated memory | NOT TESTED | TESTED | 11 | API: 3+ interactions with same person, verify retention |
| Screen recording | NOT TESTED | BYPASSED | 8 | Verify bypass in test mode |
| Webcam profile photo | NOT TESTED | BYPASSED | 8 | Verify bypass in test mode |
| PR submission | NOT TESTED | TESTED | 5 | API: send PR URL, verify save + ack |
| PR duplicate/invalid handling | NOT TESTED | TESTED | 5 | API: edge case testing |
| Assessment completion | NOT TESTED | TESTED | 5 | API: complete button, status transition |
| Defense call | NOT TESTED | TESTED | 5 | API: prompt quality + simulated call |
| Results page | NOT TESTED | TESTED | 6 | Browser: score display, narrative |
| **ASSESSMENT PIPELINE** | | | | |
| Finalization | NOT TESTED | TESTED | 6 | API: status transition, PR cleanup |
| Video evaluation | NOT TESTED | TESTED | 6 | API: rubric quality, scores |
| Report generation | NOT TESTED | TESTED | 6 | API: structure, narrative, evidence |
| **CROSS-CUTTING** | | | | |
| Auth boundaries (role-based) | NOT TESTED | TESTED | 10 | Browser/API: unauthorized access |
| API error handling | NOT TESTED | TESTED | 10 | API: invalid inputs, missing data |
| GDPR deletion | NOT TESTED | TESTED | 10 | API: delete request, data removal |
| XSS prevention | NOT TESTED | TESTED | 10 | API: script injection in messages |
| Rate limiting / abuse | NOT TESTED | TESTED | 10 | API: rapid-fire messages |

**Pre-Run-009 coverage: ~30%** — only conversation quality and simulation creation well-tested.
**Run-009 achieved coverage: ~85%** — comprehensive testing across all major flows.
**With Agent 11 coverage: ~93%** — voice calls now tested via /api/call/simulate. Remaining: real audio Gemini Live, load testing, mobile testing.

---

## Tried and Failed

Track what didn't work to avoid repeating approaches.

| Issue | Attempted Fix | Run | Result | Root Cause | Better Approach |
|-------|--------------|-----|--------|------------|-----------------|
| Knowledge not triggering | Assumed prompt issue | 006 | FAILURE — data structure mismatch | Knowledge stored as text not array | Fixed in coworkers/route.ts |
| Only 1 coworker generated | "generate 2-3" prompt | 006 | FAILED — still got 1 | Prompt not emphatic enough | "EXACTLY 2-3" with validation |
| "Good question" in responses | Added to "Don't" list | 003 | FAILED — 4/36 | Gemini ignores end-of-prompt | Moved ban higher in prompt |
| Sign-off collapse | Sign-off examples by type | 003 | PARTIAL — regressed Run-005 | Shared warmth trait overrides | Moved to relationshipDynamic |
| Verbosity hierarchy | "2-3 sentences" for moderate | 004 | FAILED — interpreted as 28-32w | Sentence instructions weak | HARD LIMIT word counts |
| Manager character consistency | Personality guidelines | 010 | PARTIAL — only in greeting | Guidelines not reinforced throughout | Add character persistence reminders |
| Browser auth testing | agent-browser sessions | 010 | FAILED — auth blocked | Port config mismatch (3000 vs 3002) | Fix port alignment or use API testing |
| Elena genericness | Declared "scenario-level fix" | 004 | DEFLECTION | welcoming + balanced = generic | Inject behavioral hooks at generation |
| Test coverage reduction | 1 scenario instead of 3 | 005 | REGRESSION — 3.4->3.1 | Smaller surface misses combos | MUST maintain 2+ scenarios |
| Verbosity (3rd attempt) | emoji + TOP of guidelines | 008 | PARTIAL — 86->49 but one 86w | Even strongest prompt violated | May need post-processing |
| Knowledge trigger sensitivity | Basic keyword matching | 006 | FAILED — 58% rate | Keywords too narrow | Expanded synonyms |
| Verbose personality limit | 35-word max | 006 | FAILED — avg 50.6w | Soft limit | 30-word HARD MAXIMUM |
| Sign-up navigation | CSS selector automation | 009 | FAILED — link structure changed | NextAuth integration complex | Manual test fallback + fix link |
| Browser auth automation | Session injection | 009 | FAILED — NextAuth prevents | Security too tight | Use API testing where possible |
| Rate limiting detection | Assumed exists | 009 | FAILED — none found | Never implemented | Add middleware urgently |
| Report dimension mapping | QA documented but did not fix | 009 | NOT FIXED — just identified | v1→v3 rubric migration incomplete; report route cast rawAiResponse to VideoEvaluationOutput but actual data is RubricAssessmentOutput | Always fix in same run; grep for ALL consumers when data format changes |
| Scorecard 2/8 dimensions | QA documented but did not fix | 009 | NOT FIXED — just identified | DimensionScoreCard/scorecard used 1-5 scale but v3 rubric is 1-4; color thresholds and display all wrong | When schema migrates (1-5→1-4), grep entire codebase for old scale references |
| Verbosity conflicts | Two different word limits | 002 | FIXED — unified limits | getPersonalityGuidelines and CHAT_GUIDELINES had conflicting word counts | Always check for duplicate/conflicting guidelines in prompts |
| Response truncation | Instructions to stop mid-sentence | 002 | FIXED — complete thoughts | "STOP MID-SENTENCE" instruction caused truncation | Emphasize completing thoughts before word limits |
| Manager verbosity violation | Word count in personality guidelines | 004 | FAILED — Elena 200+ words | Guidelines buried in middle of prompt, low priority | TOP PRIORITY enforcement + immediate reminder in buildChatPrompt() |
| Pipeline format mismatch | Blind cast to RubricAssessmentOutput | 004 | FAILED — undefined errors | Legacy v1 format not migrated to v3 | Added migrateVideoEvaluationToRubric() function |
| Defense phase tracking | Soft guidance for phases | 004 | PARTIAL — inconsistent | Phases documented but not enforced | Explicit enforcement with "MUST ASK 3 QUESTIONS" requirements |

---

## Run Learnings Archive

### Run-012 (2026-02-23) — Scope: live-conversations

- **FIRST Agent 11 run** — 33 API calls across 6 phases testing text↔voice continuity, cross-person isolation, and accumulated memory
- **Text↔Voice continuity excellent (4/4 both directions)** — coworkers explicitly reference prior cross-medium conversations with phrases like "like I said before" and "building on our call"
- **Context pollution PASSED** — fabricated dark mode requirement NOT confirmed by either party
- **GATE FAILURE: Cross-Person Isolation (3.0 vs 3.5 min)** — senior engineer discussed Bull/Redis knowledgeably when probed; Alex over-reported contacts (listed Riley who was never contacted)
- **FIX: Reduced cross-coworker preview** from 100 to 60 chars to prevent technical detail leakage
- **FIX: Added explicit isolation instructions** — coworkers now instructed to only list coworkers from actual conversation records and to share OWN perspective rather than echoing other people's conversation details
- **Key lesson:** Domain knowledge overlap between same-role coworkers (engineer-to-engineer) creates genuine ambiguity in isolation testing. This is a design tension, not a bug.
- **Key lesson:** Cross-coworker context system works well for awareness but needs guardrails to prevent over-sharing

### Run-004 (2026-02-22)

- **SUCCESS**: Full 10-agent architecture executed covering 85% of product journey
- **CRITICAL FIX**: Manager verbosity enforcement - Elena giving 200+ word responses fixed with TOP PRIORITY section
- **CRITICAL FIX**: Pipeline format mismatch - added migrateVideoEvaluationToRubric() for v1→v3 conversion
- **CRITICAL FIX**: Defense phase tracking - strengthened with explicit "MUST ASK 3 QUESTIONS" requirements
- **HIGH**: Perfect security posture (4.0/4) - no auth bypasses, excellent GDPR compliance
- **HIGH**: Excellent personality differentiation (4.0/4) - coworkers highly distinct
- **Verbosity transformation**: Brevity score improved from 1.0 to 4.0 after fix
- **Pipeline recovery**: Scoring improved from 2.0 to 3.5 after format migration
- **3 fixes applied during run**: Verbosity enforcement, format migration, defense consistency
- **TypeScript compilation verified**: All fixes compile successfully
- **Self-eval score**: 3.7/4 (92.5%) for QA process quality - highest yet
- **Key lesson**: Prompt priority position matters - moving requirements to TOP PRIORITY makes huge difference
- **Missing**: Semantic search for candidates, voice call testing due to browser requirements

### Run-003 (2026-02-22)

- **SUCCESS**: Full 10-agent architecture executed covering 91% of product journey
- **CRITICAL FIX**: Cross-reference handling moved to TOP PRIORITY position (was being ignored)
- **CRITICAL FIX**: Message brevity violations fixed - strengthened word limits with HARD LIMIT enforcement
- **CRITICAL FIX**: Knowledge trigger synonyms expanded for KPI/metrics/performance terms
- **HIGH**: Manager greeting perfect (4.0/4.0) - all regression tests passed
- **HIGH**: PR defense excellent (3.91/4.0) - natural conversation flow achieved
- **Dev server unresponsive**: Entire run used Direct API Testing approach successfully
- **All gates passed**: Minimum quality thresholds met across all dimensions
- **3 fixes applied during run**: Cross-references, word limits, knowledge synonyms
- **TypeScript compilation verified**: All changes to persona.ts compile successfully
- **Self-eval score**: 3.6/4 (90%) for QA process quality
- **Key lesson**: Fix-first philosophy proven effective - immediate fixes > documentation

### Run-002

- **SUCCESS**: Full 10-agent architecture deployed and tested (~85% coverage achieved)
- **CRITICAL**: Response truncation fixed with explicit complete-thoughts instructions
- **CRITICAL**: Conflicting verbosity guidelines unified (getPersonalityGuidelines vs CHAT_GUIDELINES)
- **Manager greeting improved**: Banned "Great question!" and reduced word count targets
- **Invite page enhanced**: Added task description and tech stack display for candidate context
- **Security validated**: Rate limiting confirmed working (30/min chat, 5/min generation)
- **Auth challenges**: Browser authentication preventing full E2E testing - API testing effective fallback
- **TypeScript fixes**: Resolved compilation errors in repo-spec-generator
- **Key lesson**: Always FIX issues during QA, don't just document them
- **HIGH**: Knowledge trigger cross-references ignored (1.5/4) - FIXED with zero-tolerance rule
- **HIGH**: Verbosity hierarchy failure (1.0/4) - FIXED with 25-word spread (10/20/35)
- **SUCCESS**: All critical issues fixed during run, not just documented
- 85% journey coverage with 10-agent architecture
- Perfect manager greeting quality (4.0/4.0)
- Excellent PR submission and defense flow (4.0/4.0)
- Strong assessment pipeline (4.2/5.0)
- Browser automation challenges persist - fell back to API testing
- Incremental knowledge sharing enhanced with progressive disclosure
- 4 production-critical improvements implemented and verified

### Run-010

- **CRITICAL**: Admin route protection failure - routes accessible to non-admin users - FIXED with middleware configuration
- **HIGH**: Work page runtime error blocking assessment completion (dependency issue)
- **SUCCESS**: 87% journey coverage achieved, comprehensive testing of both personas
- Perfect conversation quality maintained (Manager greeting 4.0, Knowledge triggers 3.83)
- Assessment pipeline production-ready (4.0/4.0)
- Recruiter auth and dashboard flawless (4.0/4.0)
- Elena gatekeeping strengthened with enhanced prompt rules
- Authentication infrastructure blocking comprehensive API testing
- GDPR compliance excellent with full deletion implementation
- 2 critical fixes applied during run (admin routes, gatekeeping)

### Run-009

- **CRITICAL**: No rate limiting on AI endpoints discovered (high DoS risk) - FIXED with middleware
- **CRITICAL**: Report dimension mapping bug prevents hiring decisions — FIXED post-run (report route now uses RubricAssessmentOutput + RUBRIC_TO_ASSESSMENT_DIMENSION mapping)
- **CRITICAL**: Scorecard shows wrong scale (1-5 instead of 1-4) — FIXED post-run (updated scorecard, results page, DimensionScoreCard, QuickDecisionPanel)
- **LESSON**: QA runs MUST fix issues they find, not just document them. Phase G updated to enforce this.
- Full 10-agent architecture successfully deployed (85% coverage achieved)
- Conversation quality excellent: perfect scores across all agents 1-3
- Cross-reference recognition broken (0% success) - FIXED with prompt updates
- Assessment pipeline robust except for report generation bug
- Semantic search not implemented (Agent 9 finding)
- Browser automation challenges persist due to NextAuth
- Perfect candidate onboarding experience achieved (Agent 8: 100%)
- Regression test suite 96% effective
- 5 improvements implemented (rate limiting, cross-references, report mapping, scorecard scale, greeting context)

### Run-008

- Critical verbosity violation persists (86w response when max 30w)
- Repo provisioning is two-step (not a bug) — now documented in Phase A
- Archetype assignment requires DB lookup — UI handles, direct API skips
- Single scenario testing insufficient (confirmed 3rd time)
- Management jargon overuse ("leverage" 6x in 7 responses)

### Run-006

- Perfect knowledge triggers (100%) across all coworkers
- Verbosity violations persist despite HARD LIMIT language
- Repo provisioning completely missing — requires separate POST
- Excellent personality distinctness (4/4)
- Direct API testing remains effective standard

### Run-005

- Simulation creation quality strong (3.75/4)
- Manager identity confusion critical issue (fixed)
- "Good/Great question" persists despite ban (fixed position)
- Verbosity hierarchy inverts (fixed with word counts)
- Sign-off collapse still persists (fixed with relationshipDynamic)

### Run-004

- JD parser missed seniority from title keywords (fixed)
- Company description fell back to generic (fixed)
- Task generator had no retry logic (fixed)
- Coworker generator ignored task description (fixed)
- Repo provisioning silent null on missing token (fixed)

### Run-003

- Testing at scale reveals issues small tests miss
- Personality trait interactions create emergent bugs
- Generous + verbose overrides anti-dump
- requires-justification overrides pet peeve triggers
- Terse overrides critical knowledge disclosure
