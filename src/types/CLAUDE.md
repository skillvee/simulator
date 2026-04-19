# src/types

Centralized type barrel. Import from `@/types`, not from component or lib implementation files.

```typescript
import { ChatMessage, CodeReviewData, ParsedProfile } from "@/types";
```

ESLint rule `no-restricted-imports` warns (not errors) when importing types from `@/components/*/*` or `@/lib/*/!(index)`. Fix warnings when encountered.

Some lib barrels still re-export types for backwards compat (e.g. `import { ChatMessage } from "@/lib/ai"`) — works, but prefer `@/types` in new code.

## Adding new types

1. Add interface in the appropriate file under `src/types/`.
2. Re-export from `index.ts`.
3. If replacing a type that previously lived in a lib file, keep a re-export there for backwards compat.

## Gotchas

- Zod schemas in lib files (e.g. `cv-parser`) are the **source of truth for runtime validation**. Types here are the compile-time equivalents. Keep them in sync; Zod wins if they drift.
- For Prisma JSON field casting, see `prisma/CLAUDE.md`.
