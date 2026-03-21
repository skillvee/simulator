# PRD: Conversation Grounding — Prevent AI Teammates from Referencing Undiscussed Topics

## Overview

AI teammates (manager and coworkers) are referencing conversations and topics that never actually occurred. For example, the manager asks "What do you think about the logging feature?" when the candidate never discussed logging. This happens because the system injects the full task description into every coworker's system prompt as established shared knowledge, and the AI then treats it as common ground.

This destroys the realism of the simulation and frustrates candidates who feel gaslit by teammates referencing things they never said.

## Root Cause Analysis

**6 injection points** leak scenario knowledge into AI prompts without distinguishing "what the scenario is about" from "what the candidate has actually discussed":

1. **Coworker base prompt** (`src/prompts/coworker/persona.ts:159-161`): Injects `taskDescription` under "Conversation Rules" as `They're working on: "[task description]..."` — every coworker reads this as established context.

2. **Manager follow-up messages** (`src/prompts/manager/greeting.ts`): After greeting messages, the manager has full task knowledge and assumes the candidate absorbed all details from the greeting.

3. **Kickoff voice prompt** (`src/prompts/manager/kickoff.ts:63`): States "you already briefed them over Slack" and includes full `taskDescription` — assumes candidate read and understood everything.

4. **Voice coworker prompt** (`src/app/api/call/token/route.ts:199-209`): Passes `taskDescription` to `buildVoicePrompt`, same leak as chat.

5. **Conversation memory** (`src/lib/ai/conversation-memory.ts:170-171`): Says "Remember and reference these when relevant" without qualifying WHAT was actually discussed vs. what's scenario background.

6. **Defense prompt** (`src/prompts/manager/defense.ts:82`): Opens with `"So you finished up the [task]... task"` — hard-codes task reference.

## Goals

- Eliminate all instances where AI teammates reference topics, features, or conversations that the candidate has not explicitly discussed or acknowledged
- Maintain AI teammates' ability to discuss task-related topics AFTER the candidate brings them up
- Ensure the manager can still brief the candidate on their task (the first interaction) without follow-up messages assuming comprehension
- Preserve cross-coworker awareness only for topics actually discussed in real conversations

## User Stories

### US-001: Remove task description from coworker base prompt

**Description**: As a candidate, I want coworkers to only know their own domain knowledge (the knowledge items configured for them), not the full task description, so that they don't reference task specifics I never mentioned.

**Acceptance Criteria**:

- [ ] Remove `taskDescription` injection from `buildCoworkerBasePrompt()` in `src/prompts/coworker/persona.ts` (lines 159-161)
- [ ] Remove `taskDescription` from the `CoworkerContext` interface (or make it unused in the base prompt)
- [ ] Coworker prompt no longer contains the phrase "They're working on:"
- [ ] Add a replacement rule: "You know you have a new team member working on a coding task. You do NOT know the details of their task unless they tell you."
- [ ] Coworkers can still respond about task topics IF the candidate brings them up first
- [ ] Tests pass
- [ ] Typecheck passes

### US-002: Add explicit "do not assume" guardrails to coworker prompts

**Description**: As a candidate, I want coworkers to never assume I've read, discussed, or understood anything unless I explicitly mentioned it in the conversation, so that conversations feel natural and grounded.

**Acceptance Criteria**:

- [ ] Add a new section to `buildCoworkerBasePrompt()` titled "## Conversation Grounding Rules" with these rules:
  - "NEVER reference a conversation, meeting, or discussion that is not in your Prior Conversation History section"
  - "NEVER assume the candidate has read any documentation, README, repo code, or GitHub Issues unless they explicitly say they have"
  - "NEVER ask follow-up questions about topics the candidate hasn't brought up (e.g., don't ask 'how's the logging feature going?' unless they mentioned logging)"
  - "If you want to discuss a topic, introduce it as new: 'Hey, have you looked at X yet?' rather than 'So about X that we discussed...'"
- [ ] Place this section with ZERO TOLERANCE severity (matching the existing anti-hallucination patterns in the codebase)
- [ ] Tests pass
- [ ] Typecheck passes

### US-003: Add grounding guardrails to manager follow-up prompts

**Description**: As a candidate, I want the manager to not assume I absorbed all the details from their greeting messages, so that follow-up conversations don't reference things I haven't engaged with.

**Acceptance Criteria**:

- [ ] In `buildGreetingPrompt()` (`src/prompts/manager/greeting.ts`), add a "CONVERSATION RESPONSES" section with:
  - "After your greeting messages, do NOT assume the candidate has read or understood any specific detail you mentioned"
  - "If the candidate says 'Ok, I've reviewed' or similar, ask what specifically they have questions about — do NOT assume they absorbed every detail"
  - "When following up, introduce topics as questions: 'Have you had a chance to look at X?' rather than 'So about X...'"
  - "ONLY reference specific task details (features, components, bugs) if the candidate explicitly mentioned them in their messages"
- [ ] These rules apply to all messages AFTER the initial greeting (the greeting itself can reference the task since it IS the briefing)
- [ ] Tests pass
- [ ] Typecheck passes

### US-004: Add grounding guardrails to manager kickoff voice prompt

**Description**: As a candidate, I want the kickoff call to be responsive to what I actually ask about, without the manager assuming I understood everything from the Slack briefing.

**Acceptance Criteria**:

- [ ] In `buildKickoffVoicePrompt()` (`src/prompts/manager/kickoff.ts`), update the phrasing from "you already briefed them" to acknowledge uncertainty: "You sent them a brief over Slack, but you're not sure how much they've read or understood yet"
- [ ] Change the opening suggestion from "did you get a chance to look through everything?" to "did you get a chance to look at anything?" (subtle but important — "everything" assumes they should have read all)
- [ ] Add grounding rule: "Do NOT assume they read specific GitHub Issues, README sections, or code. Let them tell you what they've seen."
- [ ] Add grounding rule: "If they say 'I looked at the repo', ask what stood out — don't assume they read specific files"
- [ ] Tests pass
- [ ] Typecheck passes

### US-005: Remove task description from non-manager voice prompts

**Description**: As a candidate, I want coworkers on voice calls to not know my task details unless I tell them, matching the same grounding behavior as chat.

**Acceptance Criteria**:

- [ ] In `src/app/api/call/token/route.ts`, stop passing `taskDescription` to `buildVoicePrompt()` for non-manager, non-defense calls (around line 204)
- [ ] Pass `taskDescription: undefined` or remove it from the context object for regular coworker voice calls
- [ ] Manager kickoff and defense calls can still receive `taskDescription` (they need it for their specific roles)
- [ ] Tests pass
- [ ] Typecheck passes

### US-006: Qualify conversation memory injection with grounding context

**Description**: As a candidate, I want the conversation memory system to clearly distinguish between what was actually discussed vs. background scenario information, so that AI teammates don't blend the two.

**Acceptance Criteria**:

- [ ] In `formatMemoryForPrompt()` (`src/lib/ai/conversation-memory.ts`), change the intro from "Remember and reference these when relevant" to "ONLY reference these prior conversations when the candidate brings up a related topic. Do NOT proactively bring up past topics unless the candidate re-engages with them."
- [ ] Add a grounding qualifier: "The messages below are the ONLY interactions you have had with this candidate. Do not reference any other conversations, meetings, or discussions."
- [ ] Keep the incremental sharing rules (they're good) but qualify them: "Build on prior topics ONLY when the candidate asks about them again"
- [ ] Tests pass
- [ ] Typecheck passes

### US-007: Ground cross-coworker context to prevent topic amplification

**Description**: As a candidate, I want coworkers to not amplify or reference topics from conversations with other coworkers unless I bring those topics up myself.

**Acceptance Criteria**:

- [ ] In `buildCrossCoworkerContext()` (`src/lib/ai/conversation-memory.ts`), change "The candidate has been reaching out to other team members" to not include topic hints
- [ ] Remove the "Last topic hint" from cross-coworker context — only share that the candidate talked to another coworker and how many messages, NOT what they discussed
- [ ] Change the format from `Last topic hint: "[message preview]"` to just `The candidate has chatted with ${coworkerName} (${messageCount} messages)`
- [ ] Keep the rule about not prying into other conversations
- [ ] Add: "Do NOT assume you know what the candidate discussed with other team members. If they mention talking to someone, ask what came up."
- [ ] Tests pass
- [ ] Typecheck passes

### US-008: Fix defense call opening to be grounded in actual conversations

**Description**: As a candidate, I want the defense call to reference what actually happened during my assessment, not hard-code assumptions about the task.

**Acceptance Criteria**:

- [ ] In `buildDefensePrompt()` (`src/prompts/manager/defense.ts`), change Phase 1 opening from the hard-coded `"Hey! So you finished up the ${taskDescription}... task"` to a dynamic opening that references the conversation summary
- [ ] New opening should be generic: `"Hey! So I've been looking at your PR. Before I ask questions, want to give me the quick walkthrough of what you worked on?"`
- [ ] The manager should learn what the candidate worked on from the `conversationSummary` and `codeReviewSummary` context, not from injecting `taskDescription` into the opening line
- [ ] Keep `taskDescription` in the "What They Worked On" context section (the manager should know the task, just not open with it as if it's shared knowledge)
- [ ] Tests pass
- [ ] Typecheck passes

### US-009: Add task description to manager chat as gated background knowledge

**Description**: As a manager AI, I need to know the task details so I can answer questions about it, but I should treat it as MY knowledge rather than shared common ground.

**Acceptance Criteria**:

- [ ] In the manager's chat prompt (detected via `isManager()` in `src/app/api/chat/route.ts`), keep passing `taskDescription` but wrap it with grounding instructions
- [ ] Add a wrapper around `taskDescription` in the manager's prompt: "## Your Background Knowledge (NOT shared with the candidate)\nYou know the following about the task you assigned. The candidate may or may not have read the details yet. Reference specific aspects ONLY when the candidate asks or brings them up.\n[taskDescription]"
- [ ] For non-manager coworkers, `taskDescription` should NOT be passed (handled in US-001)
- [ ] Tests pass
- [ ] Typecheck passes

## Functional Requirements

1. The system shall NOT inject `taskDescription` into non-manager coworker prompts (chat or voice)
2. The system shall inject `taskDescription` into manager prompts ONLY as gated background knowledge with explicit instructions not to assume shared understanding
3. The system shall include explicit "conversation grounding" rules in ALL AI teammate prompts prohibiting references to undiscussed topics
4. The system shall NOT include topic hints in cross-coworker context
5. The conversation memory system shall qualify prior history as "the ONLY interactions" and prohibit referencing anything else
6. The defense call shall NOT hard-code task description in its opening line
7. The kickoff voice call shall acknowledge uncertainty about what the candidate has read
8. All grounding rules shall use the same ZERO TOLERANCE severity as existing anti-hallucination rules in the codebase

## Non-Goals

- Changing how scenarios or task descriptions are stored in the database
- Modifying the manager's initial greeting messages (those ARE the briefing and should reference the task)
- Removing taskDescription from the defense call's context section (the manager needs it for evaluation)
- Changing coworker knowledge items or trigger keywords (those are domain-specific, not task-specific)
- Adding a topic tracking database or runtime topic extraction system (we're solving this with prompt engineering, not infrastructure)

## Technical Considerations

- All changes are in prompt templates — no database migrations or API changes needed
- The `CoworkerContext` interface in `persona.ts` should keep `taskDescription` as optional since managers still use it
- Changes should be tested by running the simulation and verifying that coworkers don't reference task details unprompted
- The defense call change (US-008) requires careful wording since the manager needs to drive the review but shouldn't assume what the candidate knows

## Success Metrics

- Zero instances of AI teammates referencing topics the candidate hasn't mentioned in QA testing
- Manager follow-up messages ask about candidate's progress rather than assuming comprehension
- Coworkers respond to task-related questions naturally when the candidate brings them up
- Defense call opening lets the candidate describe their work rather than telling them what they did
