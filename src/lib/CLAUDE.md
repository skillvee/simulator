# src/lib - Utilities

Domain-based organization for better discoverability:

```
src/lib/
├── core/          # env, admin, error-recovery, analytics, data-deletion
├── external/      # github, email, supabase, storage, pr-validation
├── media/         # audio, screen, video-recorder
├── ai/            # gemini, conversation-memory, coworker-persona
├── scenarios/     # scenario-builder
├── candidate/     # cv-parser, embeddings, candidate-search, archetypes, seniority
├── analysis/      # ai-call-logging, assessment-logging, video-evaluation
├── schemas/       # Zod validation schemas
└── api/           # API utilities (client, response, validation)
```

## Import Pattern

Use barrel exports for cleaner imports:

```typescript
// Before
import { gemini } from "@/lib/gemini";
import { env } from "@/lib/env";

// After
import { gemini } from "@/lib/ai";
import { env } from "@/lib/core";
```

## Gemini Gotchas

- Transcription MUST be enabled server-side in ephemeral token config (see `ai/gemini.ts:45`)
- Use `Modality.AUDIO` import, not string "AUDIO"
- For text chat, `systemInstruction` not supported - use first message pair instead
- Models: `gemini-3-flash-preview` (text), `gemini-2.5-flash-native-audio-latest` (voice)

## Prisma JSON

Always double-cast: `data as unknown as Type` (read) and `as unknown as Prisma.InputJsonValue` (write).

## pgvector

Must use raw SQL (`$executeRaw`, `$queryRaw`) - Prisma ORM doesn't support vector ops.

## AI Call Logging

Use `logAICall()` to track AI API calls with context for debugging:

```typescript
import { logAICall } from "@/lib/analysis";

const tracker = await logAICall({
  assessmentId: assessment.id,
  endpoint: "/api/chat",
  promptText: fullPrompt,
  modelVersion: "gemini-2.0-flash-exp",
  promptType: "CHAT",        // e.g., "HR_INTERVIEW", "CODE_REVIEW"
  promptVersion: "1.0",      // Prompt template version
  modelUsed: "gemini-3-flash-preview",
});

try {
  const response = await callAI(fullPrompt);
  await tracker.complete({
    responseText: response.text,
    statusCode: 200,
    promptTokens: response.usageMetadata?.promptTokenCount,
    responseTokens: response.usageMetadata?.candidatesTokenCount,
  });
} catch (error) {
  await tracker.fail(error);
}
```

## Testing

- Define mocks INSIDE `vi.mock()` factory (Vitest hoisting)
- MediaRecorder doesn't exist in Node.js - mock it
- jsdom File/Blob `arrayBuffer()` hangs with large files
