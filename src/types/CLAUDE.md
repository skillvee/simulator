# Types Directory

Centralized type definitions for the Skillvee Simulator platform.

## Organization

```
src/types/
├── index.ts          # Re-exports all types
├── assessment.ts     # Assessment data (Prisma JSON fields)
├── conversation.ts   # Chat and transcript types
├── coworker.ts       # Coworker persona types
├── cv.ts             # CV/profile types
├── api.ts            # API response types
└── CLAUDE.md         # This file
```

## Usage

Import from `@/types` instead of individual lib files:

```typescript
// Preferred - import from centralized types
import { ChatMessage, CodeReviewData, ParsedProfile } from "@/types";

// Still works - backwards compatible re-exports
import { ChatMessage } from "@/lib/conversation-memory";
import type { CodeReviewData } from "@/lib/code-review";
```

## Type Categories

### Assessment Types (`assessment.ts`)

Types for Prisma JSON fields storing assessment data:

- `CodeReviewData` - PR code review analysis results
- `HRAssessmentData` - HR interview evaluation
- `VideoAssessmentData` - Screen recording analysis

### Conversation Types (`conversation.ts`)

Types for chat and voice interactions:

- `ChatMessage` - Text chat messages
- `TranscriptMessage` - Voice call transcripts
- `ConversationWithMeta` - Conversation with metadata
- `CoworkerMemory` - Memory context for conversation continuity

### Coworker Types (`coworker.ts`)

Types for AI coworker personas:

- `CoworkerPersona` - Full persona definition
- `CoworkerKnowledge` - Knowledge items coworkers hold
- `PersonalityStyle` - Communication style enum
- `DecorativeTeamMember` - Offline sidebar members

### CV Types (`cv.ts`)

Types for parsed CV/resume data:

- `ParsedProfile` - Complete parsed CV
- `WorkExperience`, `Education`, `Skill`, etc.

### API Types (`api.ts`)

Generic API response types:

- `ApiResponse<T>` - Union of success/error
- `ApiSuccess<T>`, `ApiError` - Individual response types
- Helper functions: `createSuccessResponse()`, `isApiSuccess()`, etc.

## Prisma JSON Fields

When reading/writing Prisma JSON fields, use double-casting:

```typescript
import type { CodeReviewData } from "@/types";
import type { Prisma } from "@prisma/client";

// Reading
const data = assessment.codeReview as unknown as CodeReviewData;

// Writing
await db.assessment.update({
  data: { codeReview: reviewData as unknown as Prisma.InputJsonValue },
});
```

## Adding New Types

1. Create interface in appropriate file (or new file if needed)
2. Re-export from `index.ts`
3. Update original lib file to re-export for backwards compatibility
4. Add documentation here

## Gotchas

- Zod schemas in lib files (cv-parser, code-review) define runtime validation
- Types here are the interface equivalents for compile-time type checking
- Both are kept in sync but Zod schemas are source of truth for validation
