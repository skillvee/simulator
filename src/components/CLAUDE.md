# src/components - React Components

Domain-based organization following modern shadcn/ui design. See `.claude/skills/frontend-design/SKILL.md` for full rules.

## Structure

```
src/components/
├── shared/        # Providers, markdown, page-transition
├── admin/         # Admin navigation, data deletion
├── feedback/      # Error display, rejection feedback modal
├── candidate/     # Filters bar, search result cards, profile display
├── chat/          # Chat, coworker sidebar/voice/avatar, slack layout
└── assessment/    # Screen wrapper, recording guard, voice conversation
```

## Import Pattern

Use barrel exports from domain directories:

```typescript
// Import from domain barrel
import { Chat, SlackLayout, useCallContext } from "@/components/chat";
import { ErrorDisplay, SessionRecoveryPrompt } from "@/components/feedback";
import { AssessmentScreenWrapper } from "@/components/assessment";
```

Within a domain directory, use relative imports:

```typescript
// Inside src/components/chat/chat.tsx
import { useCallContext } from "./slack-layout";
import { CoworkerAvatar } from "./coworker-avatar";
```

## Design Quick Reference

Rounded corners (0.5rem default), subtle shadows, blue (#237CF1) primary, DM Sans + Space Mono fonts.

## Server/Client Split

Server components fetch data and pass serialized (JSON-safe) props to client components. Prisma Dates need serialization.

## Gotchas

- `useSearchParams()` requires Suspense boundary
- Use `e.stopPropagation()` on nested click handlers
- `redirect()` from next/navigation throws (not returns)
- Test files should mock relative imports when testing intra-directory dependencies
