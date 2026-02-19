---
name: qa
description: Iterative AI QA testing for coworker conversations. Creates a simulation, plays through it as a candidate, evaluates conversation quality, improves prompts, and repeats.
user-invocable: true
---

# Coworker Conversation QA

Iterative quality testing loop: create simulation → play as candidate → evaluate → improve prompts → repeat.

## Prerequisites

1. Dev server running with screen recording bypassed:
   ```bash
   NEXT_PUBLIC_SKIP_SCREEN_RECORDING=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev
   ```
2. Database seeded: `npx tsx prisma/seed.ts`
3. `agent-browser` installed globally

## Session Management

Use `--session qa` for ALL agent-browser commands to maintain cookies/state.

## The Loop

Run up to 5 iterations. Stop early if overall score >= 3.5 and no dimension < 3.

For each iteration:

### PHASE 1: Create a Fresh Simulation

Login as recruiter and create a new simulation from a JD.

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
# 3. Paste the JD from tests/qa/jd.md into the textarea
# Read the JD file first, then paste it
agent-browser fill "textarea" "<JD_CONTENT>" --session qa
```

**IMPORTANT:** Read the file `tests/qa/jd.md` to get the JD text, then paste it into the textarea.

```bash
# 4. Click Continue and wait for generation
agent-browser click "button:has-text('Continue')" --session qa
# Wait for generation to complete (can take 30-60 seconds)
agent-browser wait 60000 --session qa
```

```bash
# 5. On the preview page, select the first task option
agent-browser snapshot --session qa
# Use snapshot to find the first radio button for a task and click it
# Then select a role archetype from the dropdown
# Then click "Create Simulation"
```

```bash
# 6. After creation, you'll be redirected to /recruiter/simulations/[id]/settings
# Capture the simulation ID from the URL
agent-browser get url --session qa
```

```bash
# 7. Get the invite link for this simulation
# Navigate to the settings page and find/construct the invite URL
# Format: /invite/[scenarioId]
agent-browser screenshot tests/qa/output/run-NNN/screenshots/simulation-created.png --session qa
```

**Wait for repo provisioning:** The repo is provisioned asynchronously. Wait ~30 seconds, then verify:
```bash
agent-browser open "http://localhost:3000/recruiter/simulations/[id]/settings" --session qa
agent-browser wait 30000 --session qa
agent-browser snapshot --session qa
# Look for the repo URL in the page content
```

### PHASE 2: Start Assessment as Candidate

```bash
# 1. Open a NEW session for the candidate (separate from recruiter)
agent-browser open "http://localhost:3000/sign-in" --session qa-candidate
agent-browser wait 2000 --session qa-candidate
agent-browser fill "#email" "candidate@test.com" --session qa-candidate
agent-browser fill "#password" "testpassword123" --session qa-candidate
agent-browser click "button[type='submit']" --session qa-candidate
agent-browser wait 3000 --session qa-candidate
```

```bash
# 2. Open the invite link
agent-browser open "http://localhost:3000/invite/[scenarioId]" --session qa-candidate
agent-browser wait 3000 --session qa-candidate
agent-browser screenshot tests/qa/output/run-NNN/screenshots/invite-page.png --session qa-candidate
```

```bash
# 3. Accept the invite (click Start / Accept button)
agent-browser snapshot --session qa-candidate
# Find and click the accept/start button
agent-browser wait 3000 --session qa-candidate
```

```bash
# 4. Go through the welcome steps (3 steps)
# Step 1: Click continue/next
agent-browser snapshot --session qa-candidate
# Find and click the continue button for each step
agent-browser wait 1000 --session qa-candidate
# Repeat for steps 2 and 3
# Final step should navigate to /assessments/[id]/work
```

```bash
# 5. On the work page, wait for manager greeting
agent-browser wait 10000 --session qa-candidate
agent-browser screenshot tests/qa/output/run-NNN/screenshots/manager-greeting.png --session qa-candidate
```

### PHASE 3: Have Conversations

Use `agent-browser snapshot` to understand the page structure. The chat interface has:
- A sidebar with coworker list
- A message input area
- A send button
- Messages displayed in the chat area

**Strategy: Play as a realistic mid-level developer on day 1.**

#### 3a. Chat with Manager (5-7 turns)

Read the manager's greeting messages first using snapshot/get text. Then respond naturally:

1. **Greeting response**: "hey! thanks for the welcome, excited to get started"
2. **Ask about priority**: "what should I focus on first? any high-priority items?"
3. **Ask about repo**: "cool, I'll check out the repo. anything tricky I should know about the codebase?"
4. **Ask about workflow**: "what's the PR process like? any specific reviewers I should tag?"
5. **Ask about team**: "who should I reach out to if I get stuck on [something from the task]?"

For each message:
```bash
# Type the message
agent-browser fill "[data-testid='chat-input'], textarea, input[type='text']" "your message here" --session qa-candidate
# Send it
agent-browser click "[data-testid='send-button'], button:has-text('Send')" --session qa-candidate
# Wait for response (coworker typing delay)
agent-browser wait 8000 --session qa-candidate
# Read the response
agent-browser snapshot --session qa-candidate
```

**IMPORTANT:** After each response, READ the coworker's actual response and adapt your next message based on what they said. Don't follow the script blindly — if the coworker mentions something interesting, follow up on it naturally.

#### 3b. Chat with Senior Engineer (4-5 turns)

First, switch to the senior engineer in the sidebar:
```bash
agent-browser snapshot --session qa-candidate
# Find the senior engineer's name in the sidebar and click it
agent-browser wait 2000 --session qa-candidate
```

Messages:
1. **Intro**: "hey! [manager name] mentioned you know the codebase well. quick question..."
2. **Technical question**: Ask about something from the task (targets a knowledge trigger)
3. **Follow-up**: Based on their response, ask a deeper question
4. **Vague question**: "hey can you help me with something?" (test if they ask for clarification)

#### 3c. Chat with Other Coworkers (3-4 turns each)

For each remaining coworker:
1. **Cross-reference**: "hey! [previous coworker] mentioned you might know about [topic]"
2. **Domain question**: Ask about their area of expertise
3. **Casual/off-topic**: Something slightly off-topic to test character boundaries

#### 3d. Capture All Transcripts

After all conversations, take final screenshots:
```bash
agent-browser screenshot tests/qa/output/run-NNN/screenshots/final-chat.png --session qa-candidate
```

Also read ALL conversation text from the page for each coworker. Switch between coworkers in the sidebar and capture the full conversation text using `agent-browser get text` or `agent-browser snapshot`.

### PHASE 4: Simulate Defense Call

```bash
# 1. Switch back to manager chat
# 2. Submit a fake PR URL
agent-browser fill "textarea, input[type='text']" "hey, here's my PR: https://github.com/test-org/test-repo/pull/1" --session qa-candidate
agent-browser click "button:has-text('Send')" --session qa-candidate
agent-browser wait 8000 --session qa-candidate
```

Then use the text-based defense simulation API:
```bash
# Get the assessment ID and manager coworker ID from the page URL / earlier context
# Send defense messages via the simulate endpoint
curl -X POST http://localhost:3000/api/call/simulate \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"assessmentId": "...", "coworkerId": "...", "message": "..."}'
```

**Note:** For the defense call simulation, you may need to extract the session cookie from agent-browser. Use `agent-browser eval "document.cookie"` to get it, or use the browser session to make fetch requests via `agent-browser eval`.

Have a 4-6 turn defense conversation:
1. "sure, I'll walk you through it. so the main approach was..."
2. Answer whatever probing questions the manager asks
3. Discuss trade-offs and alternatives you considered
4. Talk about what you'd improve with more time

### PHASE 5: Evaluate

After completing all conversations, evaluate against this rubric:

#### Chat Conversation Rubric (score 1-4 for each)

**1. Naturalness (weight: 20%)**
- 1 = Robotic. "I'd be happy to help!" patterns. Sounds like ChatGPT.
- 2 = Stilted. Too formal for Slack. Complete sentences where fragments would be natural.
- 3 = Natural. Casual language, contractions, appropriate brevity.
- 4 = Authentic. Indistinguishable from real Slack. Natural fillers, reactions.

Red flags: "I'd be happy to help", "Great question!", paragraph-length messages, bullet points in chat, numbered lists.

**2. Context Delivery (weight: 20%)**
- 1 = Info dump. All knowledge in one message. Volunteers everything unprompted.
- 2 = Awkward pacing. Too much or too little for the question asked.
- 3 = Natural pacing. Relevant info when asked. Right level of detail.
- 4 = Expert pacing. Conversational delivery. Asks clarifying questions before answering.

**3. Character Consistency (weight: 20%)**
- 1 = Breaks character. Acts like an AI assistant. Too-perfect help.
- 2 = Inconsistent. Personality comes and goes.
- 3 = Consistent. Personality dimensions maintained throughout.
- 4 = Deeply authentic. Pet peeves trigger naturally. Mood affects responses.

**4. Knowledge Triggers (weight: 15%)**
- 1 = Broken. Knowledge never triggers OR all dumped regardless of question.
- 2 = Partial. Some triggers work. Critical knowledge sometimes missed.
- 3 = Reliable. Most triggers work. Critical items discoverable.
- 4 = Nuanced. All triggers work. Knowledge shared incrementally. Critical items emphasized.

**5. Personality Distinctness (weight: 10%)**
- 1 = Homogeneous. All coworkers sound the same.
- 2 = Slightly different. Minor tone differences.
- 3 = Clearly different. Each has a distinct voice.
- 4 = Memorable. Instantly recognizable. Unique interaction patterns.

**6. Brevity (weight: 10%)**
- 1 = Essay-length. 5+ sentences. Reads like documentation.
- 2 = Verbose. 3-4 sentences. Too long for Slack.
- 3 = Appropriate. 1-3 sentences. Feels like Slack.
- 4 = Perfect Slack. Varies naturally. Fragments where natural.

**7. No Hallucination (weight: 5%)**
- 1 = Heavy. Invents fake wikis, go/ links, tools, URLs.
- 2 = Occasional. Sometimes references plausible but fake resources.
- 3 = Clean. Does not invent resources.
- 4 = Perfectly grounded. Only references real resources from knowledge items.

#### Defense Call Rubric (score 1-4 for each)

**1. Probing Quality** — Meaningful questions about the PR, not generic?
**2. Tone** — Curious and collaborative, not adversarial or robotic?
**3. Context Awareness** — References actual task, codebase, PR content?
**4. Follow-up Depth** — Digs deeper based on candidate answers?

#### Repo Quality Checks (pass/fail)

If a repo URL was generated:
- Clone it and inspect the structure
- Does it match the JD/task description?
- Does it have realistic git history (multiple commits, not just one)?
- Are there GitHub Issues that match the task?
- Is the README relevant?

### PHASE 6: Generate Report

Write the evaluation to `tests/qa/output/run-NNN/report.md` with this format:

```markdown
# QA Run NNN — [date]

## Overall Score: X.X / 4.0

## Dimension Scores

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Naturalness | X | "exact quote showing good/bad" |
| Context Delivery | X | "exact quote" |
| ... | | |

## Per-Coworker Breakdown

### [Coworker Name] ([Role])
- Overall: X/4
- Best: "quote of best response"
- Worst: "quote of worst response"
- Issues: [list of specific problems]

## Defense Call
- Probing Quality: X/4
- Tone: X/4
- Context Awareness: X/4
- Follow-up Depth: X/4

## Repo Quality
- [ ] Structure matches task
- [ ] Realistic git history
- [ ] GitHub Issues exist
- [ ] README relevant

## Top 3 Improvements

### 1. [Title]
- **File:** `src/prompts/...`
- **Current behavior:** "what's happening now"
- **Desired behavior:** "what should happen"
- **Suggested change:** specific edit description
- **Priority:** high/medium/low

### 2. ...
### 3. ...

## Comparison with Previous Runs
(if not first run)
| Run | Overall | Naturalness | Context | Character | ... |
|-----|---------|-------------|---------|-----------|-----|
```

### PHASE 7: Improve

For each improvement suggestion:

1. Read the target file
2. Identify the exact section to change
3. Make the edit using the Edit tool
4. Explain what was changed and why

**Improvement mapping — which issues map to which files:**

| Issue | Target File | Section |
|-------|-------------|---------|
| Too verbose / not Slack-like | `src/prompts/coworker/persona.ts` | `CHAT_GUIDELINES` constant |
| Character breaking | `src/prompts/coworker/persona.ts` | `buildCoworkerBasePrompt` — "How to Act" |
| Hallucinated resources | `src/prompts/coworker/persona.ts` | "CRITICAL: Only Reference Real Things" |
| Info dumping | `src/prompts/coworker/persona.ts` | "What You Know" section |
| Knowledge not triggering | Coworker generator or persona knowledge format | Knowledge section format |
| Personality not distinct | `src/prompts/coworker/persona.ts` | `getPersonalityGuidelines` function |
| Manager greeting issues | `src/prompts/manager/greeting.ts` | `buildGreetingPrompt` |
| AI-sounding patterns | `src/prompts/coworker/persona.ts` | "Conversation Rules" or CHAT_GUIDELINES |
| Generic coworker generation | `src/prompts/recruiter/coworker-generator.ts` | Main generation prompt |
| Defense call issues | `src/prompts/manager/defense.ts` | `buildDefensePrompt` |
| Repo quality issues | `src/prompts/recruiter/repo-spec-generator.ts` | Repo spec prompt |
| Task quality issues | `src/prompts/recruiter/task-generator.ts` | Task generation prompt |

After applying improvements, **loop back to Phase 1** with a fresh simulation.

### Stopping Criteria

Stop iterating when ANY of:
- Overall weighted score >= 3.5 AND no individual dimension < 3
- 5 iterations completed
- User says to stop

When stopping, print a summary of all runs and the total improvements made.

## Tips for Reliable Browser Interaction

- Always use `agent-browser snapshot --session qa-candidate` before interacting to understand current page state
- Use `agent-browser wait MILLISECONDS` generously — AI responses take time
- If a selector doesn't work, use snapshot to find the correct one
- Screenshots help debug when things go wrong
- The chat input might be a textarea or an input — check with snapshot
- Coworker switching is in the sidebar — look for clickable names
- If you get stuck, try `agent-browser screenshot` to see what the page looks like
