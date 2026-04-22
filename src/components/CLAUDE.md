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

Rounded corners (0.5rem default), subtle shadows, blue (#237CF1) primary, Figtree + Space Mono fonts.

## Voice Call Paths

- `src/components/chat/slack-layout.tsx` mounts `src/components/chat/floating-call-bar.tsx` for active calls on the assessment work page. This is the real Gemini Live call path candidates hit in the Slack-style UI.
- `src/components/chat/floating-call-bar.tsx` owns the work-page call UI, but the underlying Gemini Live protocol/bootstrap code now lives in `src/lib/ai/live-session.ts`.
- If the bug is "the coworker did/didn't say X when the call connected" or anything around Live API setup/order-of-operations, start with `FloatingCallBar` and `src/lib/ai/live-session.ts`.

## Server/Client Split

Server components fetch data and pass serialized (JSON-safe) props to client components. Prisma Dates need serialization.

## Gotchas

- `useSearchParams()` requires Suspense boundary
- Use `e.stopPropagation()` on nested click handlers
- `redirect()` from next/navigation throws (not returns)
- Test files should mock relative imports when testing intra-directory dependencies
- Sticky positioning requires opaque background (`bg-white`) — without it, content bleeds through when scrolling under sticky elements
- Radix tooltip testing: use `findAllByText`, not `findByText` — Radix renders tooltips in a portal outside the component tree
- Next.js error boundaries don't receive route params — extract IDs from `window.location.pathname`
- Error reporting in boundaries uses fire-and-forget `fetch().catch(() => {})` to prevent infinite error loops
