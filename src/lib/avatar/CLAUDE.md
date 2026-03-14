# src/lib/avatar - Avatar Generation

AI-generated photorealistic avatars for scenario coworkers, with a deterministic static pool fallback.

## Pipeline

```
Scenario Created → generateAvatarsForScenario()
  → Find coworkers without avatarUrl
  → For each (sequential, to avoid rate limits):
       buildAvatarPrompt() → extractStyleHints() from persona
       → Gemini Imagen 3 API → JPEG buffer
       → Upload to Supabase Storage ("avatars" bucket)
       → Generate 1-year signed URL → update coworker.avatarUrl
       → Retry on failure (exponential backoff, max 3)
```

## Key Files

| File | Purpose |
|------|---------|
| `avatar-generation.ts` | Imagen 3 generation, Supabase upload, retry logic |
| `name-ethnicity.ts` | Name → demographics inference, deterministic static pool assignment |

## Static Pool Fallback

When AI generation is unavailable, `getPoolAvatarPath(name)` deterministically assigns a static avatar:
- `inferDemographics(name)` maps first/last name → ethnicity group + gender (150+ name mappings)
- Hash-based selection from 70 pool images (14 demographic categories x 5 each)
- Same name always gets same avatar (deterministic hash)

## Gotchas

- **Sequential generation**: One at a time to respect Imagen API rate limits (no parallelization)
- **Bucket auto-creation**: If upload fails with "Bucket not found", auto-creates private bucket
- **Server-side only**: Uses `supabaseAdmin` - cannot run client-side
- **Name in prompt**: Coworker name included in Imagen prompt for ethnicity-coherent appearance
- **Cost**: ~$0.04 per image (Imagen 3)
- **Gender fallback**: If name not in explicit sets, uses hash for gender inference
- **Model**: `imagen-3.0-generate-002` via Gemini 2.0 Flash
