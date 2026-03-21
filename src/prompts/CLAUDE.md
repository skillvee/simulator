# src/prompts - AI Prompts

Organized by domain: hr/, manager/, coworker/, analysis/. All exported from index.ts.

## Voice Prompts

Use filler words ("um", "so"), react naturally ("mm-hmm", "gotcha"), keep turns short.

## Chat Prompts

1-3 sentences max, sound like Slack not documentation.

## Technical

- `systemInstruction` not supported for text chat - use first user/model message pair
- Clean JSON markdown (```json) from Gemini responses before parsing
- Defense prompt aggregates all coworker chat history via `formatConversationsForSummary()` from `conversation-memory.ts`
- Hiring signals fields (`greenFlags`, `redFlags`, `hiringSignals`) — code extracts them from `rawAiResponse` but the video evaluation prompt never generates them. Update the prompt if bringing these back
- Coworker prompts are ~700 lines — keep new rule additions concise (≤10 lines) to avoid diluting existing rules
- Defense prompt has 5 ordered phases — only modify the specific phase that needs changes
