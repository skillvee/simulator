# src/lib/candidate - Candidate Evaluation Pipeline

CV parsing, embedding generation, semantic search, and role-fit scoring for candidate evaluation.

## Data Flow

```
CV Upload → parseCv() → ParsedProfile → generateAndStoreEmbeddings() → pgvector
                                                                          ↓
Search Query → extractEntities() → generateQueryEmbedding() → performSemanticSearch()
                                                                          ↓
                                   calculateFitScore() ← archetype-weights
                                                                          ↓
                                   filterBySeniority() ← seniority-thresholds
                                                                          ↓
                                   calculateCombinedScore() → Ranked Results
                                                   (40% semantic + 60% fit)
```

## Key Files

| File | Purpose |
|------|---------|
| `cv-parser.ts` | Parse CVs via Gemini, Zod-validated `ParsedProfile` output |
| `embeddings.ts` | Generate 768-dim vectors (`text-embedding-004`), store via pgvector |
| `candidate-search.ts` | Semantic search + archetype fit scoring |
| `entity-extraction.ts` | NLU for search queries (job title, skills, seniority) |
| `archetype-weights.ts` | 8 role archetypes with dimension weight multipliers (1.0/1.25/1.5) |
| `seniority-thresholds.ts` | Minimum score gates per seniority level |
| `percentile-calculator.ts` | Percentile ranking across all completed assessments |
| `feedback-parsing.ts` | Parse rejection feedback into search constraints |
| `profile-photo.ts` | Generate headshot from webcam via Gemini image editing |

## Patterns

**Prisma JSON double-cast** (cv-parser.ts):
```typescript
profileToPrismaJson(profile)    // write: as unknown as Prisma.InputJsonValue
profileFromPrismaJson(json)     // read: Zod validates then returns typed result
```

**pgvector raw SQL** (embeddings.ts) - Prisma ORM doesn't support vector ops:
```typescript
await db.$executeRaw`INSERT INTO ... VALUES (${vectorToPostgres(embedding)}::vector)`
await db.$queryRaw`SELECT 1 - (embedding <=> ${queryVec}::vector) as similarity ...`
```

**Gemini JSON response cleaning** (shared across cv-parser, entity-extraction, feedback-parsing):
```typescript
// Strip markdown code blocks before JSON.parse
cleaned = responseText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
```

## Gotchas

- **Null Zod transforms**: Gemini returns `null` for optional fields; schemas use `.nullable().transform(v => v ?? undefined).optional()`
- **Embedding retry**: Uses `withRetry()` with exponential backoff (1s base, 30s max)
- **Search scoring**: Combined score = 40% semantic similarity + 60% archetype fit
- **Seniority gates**: Only VERY_HIGH weighted dimensions are checked
- **Archetype weights are dynamic**: Applied at query time, never stored with assessment data
- **Percentile formula**: `(candidates_below / total) * 100`, stored in `Assessment.report` JSON
- **Profile photo fallback**: Uses raw webcam snapshot if Gemini image editing fails
