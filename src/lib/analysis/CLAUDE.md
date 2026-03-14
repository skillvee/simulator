# src/lib/analysis - Video Evaluation & Logging

Server-side video evaluation via Gemini 3 Pro, plus event and API call logging for assessment telemetry.

## Evaluation Pipeline

```
assessmentId + videoUrl → evaluateVideo()
  → Load rubric for role family (fallback: "engineering")
  → Build evaluation prompt from rubric dimensions
  → Gemini 3 Pro: video + prompt → structured JSON scores
  → Parse response (handles v2 and v3 formats)
  → Transaction: upsert DimensionScores + Summary + status
  → Fire-and-forget: generateAndStoreEmbeddings()
```

## Key Files

| File | Purpose |
|------|---------|
| `video-evaluation.ts` | Main evaluation orchestrator (786 lines) |
| `assessment-logging.ts` | Event lifecycle logging with timestamp-based duration tracking |
| `ai-call-logging.ts` | Generic AI API call tracking with prompt type/version metadata |

## Patterns

**Stateful logger factory** (assessment-logging.ts):
```typescript
const logger = createVideoAssessmentLogger(assessmentId);
logger.logJobStarted(metadata);
// ... pipeline steps with duration tracking between events ...
logger.logCompleted(metadata);
```

**API call lifecycle tracker** (ai-call-logging.ts):
```typescript
const tracker = await logAICall({ assessmentId, endpoint, promptText, modelVersion, promptType });
try {
  const response = await callAI();
  await tracker.complete({ responseText, statusCode, promptTokens, responseTokens });
} catch (error) {
  await tracker.fail(error);
}
```

**Atomic score storage** (video-evaluation.ts):
```typescript
await db.$transaction(async (tx) => {
  // Upsert all dimension scores (by assessment + dimension slug)
  // Upsert summary
  // Update VideoAssessment status → COMPLETED
});
```

## Gotchas

- **Retry strategy**: Max 3 attempts with exponential backoff; admin can `forceRetryVideoAssessment()` to reset counter
- **Role family fallback**: If rubric not found for requested role, silently falls back to `"engineering"`
- **Response parsing**: Handles both v3 (`observableBehaviors: [{timestamp, behavior}]`) and v2 (`observable_behaviors` string[] + `timestamps` string[])
- **Timestamp validation**: Filters invalid timestamps with regex `/^(\d{1,2}:)?\d{1,2}:\d{2}$/`
- **Embedding generation is fire-and-forget**: Doesn't block evaluation response
- **All timestamps UTC**: Millisecond precision, duration calculations in `durationMs`
- **Dimension slug is the key**: Scores stored by rubric dimension slug, not display name
- **`logCompletedAICall()` has `durationMs: 0`**: By design for one-shot logging (no lifecycle tracking)
