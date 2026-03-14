# src/lib/rubric - Scoring System & Rubric

Role-specific evaluation rubrics with dimension weights, seniority gates, and fit scoring.

## Three-Layer Model

```
RoleFamily (e.g., "engineering")
  ├── Dimensions: 5-8 per role family
  │     └── 4 Rubric Levels each: Foundational(1) → Competent(2) → Advanced(3) → Expert(4)
  │           └── label, pattern (1-sentence), evidence (observable behaviors)
  │
  └── Archetypes (e.g., "frontend_engineer")
        ├── Weights per dimension (0-1, importance for this role)
        └── Seniority Gates (JUNIOR/MID/SENIOR)
              └── Per-dimension minimum scores
```

## Key Files

| File | Purpose |
|------|---------|
| `load-rubric.ts` | Load rubric data from DB; role-family overrides merge with defaults |
| `fit-score.ts` | Weighted fit scoring + seniority gate evaluation |
| `dimension-mapping.ts` | Maps role-specific rubric dimensions → 8 fixed AssessmentDimension values |
| `level-expectations.ts` | Seniority-level score expectations (junior=2.0, mid=2.5, senior=3.0, staff=3.5) |

## Scoring

**Fit score formula**: `(sum of score * weight) / (sum of maxScore * weight) * 100` → 0-100 scale

**Seniority gates**: All gates at a level must pass (AND logic). Highest passing level returned.

**Dimension mapping**: When multiple rubric dimensions map to the same AssessmentDimension, the one with highest archetype weight wins (no averaging).

## Barrel Export

Only `load-rubric.ts` and `fit-score.ts` are exported from `index.ts`. `dimension-mapping.ts` and `level-expectations.ts` are utility modules imported directly where needed.

## Gotchas

- **Null scores penalize**: Null scores don't contribute to weighted sum but DO count in denominator (maxPossible)
- **Role override precedence**: Role-family-specific rubric levels override defaults; all 4 levels must exist (throws if missing)
- **Seniority gates are AND-ed**: If any dimension fails the gate, the entire seniority level fails
- **Strengths vs gaps asymmetry**: Strengths sorted by weightedScore (top 3); gaps filtered to score <= 2, sorted by rawScore (top 3)
- **Double-cast for evidence**: Evidence arrays stored as Prisma JSON, loaded as `unknown`, cast to `string[]`
- **Level expectations are uniform**: Same expected score across all dimensions per seniority (rubric encodes dimension-specific behavior)
