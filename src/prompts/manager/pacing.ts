/**
 * Manager Pacing Nudge Prompts
 *
 * Generated on a schedule during the WORKING phase to produce short Slack
 * messages from the manager as the candidate approaches the per-depth cap:
 *
 *   checkin: cap - 15 min  — casual "how's it going?"
 *   wrapup:  cap - 5  min  — gentle wrap-up suggestion
 *   cap:     cap         — firm-but-warm "let's hop on the walkthrough now"
 *
 * Each builder returns the *directive* that's layered on top of the base
 * agent prompt (via buildAgentPrompt's `phaseContext` slot). The LLM
 * generates the actual message in the manager's voice.
 */

// Shared phase-state header — every pacing prompt asserts where in the flow
// the candidate is, so the model doesn't fall back on "they haven't started"
// or "ready for kickoff" when conversation history is sparse.
const PACING_PHASE_HEADER = `## Where We Are in the Flow

The candidate has ALREADY:
- Reviewed the brief and supporting materials
- Had the KICKOFF CALL with you (scope clarified)
- Been heads-down WORKING on the task for a while

The remaining step is the WALKTHROUGH CALL — they'll hop on a call with you and demo what they built. That's the only thing left.

Do NOT reference the kickoff call as "upcoming." Do NOT ask if they've read the brief. Do NOT brief or re-explain the task.`;

export function buildPacingCheckInPrompt(): string {
  return `${PACING_PHASE_HEADER}

## Pacing Check-In

Send ONE short Slack message checking in on the candidate while they work.

Rules:
- ONE message only. 1-2 sentences max.
- Casual peer check-in. Something like "hey how's it going?" or "where you at?" — adapt to your voice.
- Do NOT mention time, deadlines, or a cap.
- Do NOT pressure or rush.
- Do NOT mention the kickoff call (it already happened).
- Stay in YOUR manager voice and personality.`;
}

export function buildPacingWrapUpPrompt(): string {
  return `${PACING_PHASE_HEADER}

## Pacing Wrap-Up Nudge

Send ONE short Slack message suggesting the candidate start finding a stopping point so you can hop on the walkthrough call together.

Rules:
- ONE message only. 1-2 sentences max.
- Gentle, not pushy. Something like "how close are you to a stopping point?" or "feel free to start wrapping up whenever — would love to hop on the walkthrough soon."
- Reference the WALKTHROUGH (not the kickoff). It's the next step.
- Do NOT cite a hard deadline. Do NOT be bossy.
- Stay in YOUR manager voice and personality.`;
}

export function buildPacingCapPrompt(): string {
  return `${PACING_PHASE_HEADER}

## Pacing Cap Nudge

Time is up. Send ONE short Slack message — firm but warm — telling the candidate it's time to wrap up and hop on the WALKTHROUGH CALL now.

Rules:
- ONE message only. 1-2 sentences max.
- MUST reference the WALKTHROUGH specifically (NOT "kickoff", NOT "submitting", NOT "finishing").
- Firm but not harsh. Example shape: "okay we're at time — let's hop on the walkthrough now and you can show me where you got to."
- Do NOT apologize for the cap. Do NOT dwell on it.
- Stay in YOUR manager voice and personality.`;
}
