# AI Utilities

AI-related utilities for Gemini integration, conversation memory, and coworker personas.

## Structure

```
src/lib/ai/
├── index.ts                 # Barrel exports
├── gemini.ts                # Gemini client and token generation
├── conversation-memory.ts   # Conversation history management
├── coworker-persona.ts      # Coworker persona definitions
├── errors.ts                # AI error handling utilities
└── CLAUDE.md                # This file
```

## Error Handling

Use `wrapAICall` to wrap all AI operations for structured error context:

```typescript
import { wrapAICall, AIError, isAIError, TEXT_MODEL, gemini } from "@/lib/ai";

// Wrap AI calls to capture context on failure
const result = await wrapAICall(
  async () => {
    const response = await gemini.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    return response;
  },
  {
    model: TEXT_MODEL,
    promptType: "cv-parsing",
    promptVersion: "1.0",
  }
);

// Handle AI errors with full context
try {
  await wrapAICall(fn, context);
} catch (error) {
  if (isAIError(error)) {
    console.error(error.toDetailedString());
    // Logs:
    // AIError: Connection timeout
    //   Model: gemini-3-flash-preview
    //   Prompt Type: cv-parsing
    //   Prompt Version: 1.0
    //   Original Error: Network timeout
  }
}
```

### AIError Properties

- `message` - The error message
- `model` - Which model was used (e.g., "gemini-3-flash-preview")
- `promptType` - Type of prompt being executed (e.g., "cv-parsing", "hr-assessment")
- `promptVersion` - Version of the prompt (e.g., "1.0", "2024-01")
- `originalError` - The original error that was caught (if it was an Error instance)

### logAICall Tips

- `tracker.fail(error)` internally calls `.complete()` with statusCode 500 — don't set statusCode manually
- All tracker DB calls inside `ReadableStream.start()` must be `.catch()`-wrapped to prevent unhandled rejections

### Prompt Types

Use descriptive names for `promptType` that match the operation:

- `cv-parsing` - CV/resume parsing
- `video-evaluation` - Video assessment evaluation
- `entity-extraction` - Search query entity extraction
- `feedback-parsing` - Rejection feedback parsing
- `chat-response` - Chat message generation

## Models

- `LIVE_MODEL` - For voice conversations: `gemini-3.1-flash-live-preview`
- `TEXT_MODEL` - For text operations: `gemini-3-flash-preview`

## Voice Configuration

Use `generateEphemeralToken()` to create tokens for client-side voice connections:

```typescript
import { generateEphemeralToken, DEFAULT_VOICE } from "@/lib/ai";

const token = await generateEphemeralToken({
  systemInstruction: "You are a helpful assistant",
  voiceName: "Puck", // Optional, defaults to Aoede
});
```

Available voices are in `GEMINI_VOICES` object, grouped by gender.
