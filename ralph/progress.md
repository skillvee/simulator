# Ralph Progress

Learnings from autonomous issue resolution.

## Issue #86: BUG - Typing Indicator Persists After Initial Manager Messages

### What was implemented
- Fixed bug where typing indicator remained visible as the first message in the chat list after all manager messages were delivered
- Changed from storing typing indicators in the messages array to using a boolean state (`isShowingTypingIndicator`)
- Typing indicator now renders conditionally outside the messages loop, at the end of the message list

### Files changed
- `src/app/assessment/[id]/welcome/client.tsx` - Refactored typing indicator implementation:
  - Removed `isTyping` property from `Message` interface
  - Replaced `allMessagesShown` state with `isShowingTypingIndicator` boolean
  - Updated `useEffect` to set boolean state instead of adding/removing typing messages
  - Render typing indicator as separate conditional element at end of messages

### Root cause
The bug was caused by storing typing indicators as message objects in the messages array. In React Strict Mode (development), effects run twice:
1. First run adds typing indicator to state, starts timer
2. Cleanup clears timer (but typing indicator already in state)
3. Second run uses `prev` state that already contains typing indicator, potentially creating duplicates

By removing the timer before it could fire, the typing indicator was never cleaned up from the messages array.

### Learnings for future iterations

1. **Typing indicators as boolean state**: For transient UI states like typing indicators, use a boolean state variable and render conditionally OUTSIDE the data array. This pattern (used in `chat.tsx`) is more robust than storing ephemeral UI state in data arrays.

2. **React Strict Mode effect timing**: Effects that add data to state and rely on timers to clean it up are vulnerable to Strict Mode's double-invocation. The cleanup function only clears the timer, not the state update that already occurred.

3. **Pattern comparison**: When fixing UI bugs, compare similar working implementations in the codebase. The `chat.tsx` component had a working typing indicator using `isSending` boolean state - this pattern was adapted for the welcome page.

4. **Browser testing for visual bugs**: Use agent-browser snapshots to verify visual state. The snapshot output clearly showed `"typing... AC Alex Chen 10:01 AM"` confirming the typing indicator persisted before actual messages.

## Issue #98: REF-008 - Create Test Factory Pattern

### What was implemented
- Created `src/test/factories/` with factory functions for Assessment, User, and Scenario
- Created `src/test/mocks/` with reusable mocks for MediaRecorder, AudioContext, Gemini, and Prisma
- Created `src/test/utils.tsx` with `renderWithProviders()` helper
- Expanded `src/test/setup.tsx` with global mock configuration for Next.js and browser APIs
- Added `src/test/CLAUDE.md` documenting test patterns
- Added 3 example component tests using the new factories

### Files changed
- `src/test/factories/assessment.ts` - `createMockAssessment(overrides?)`
- `src/test/factories/user.ts` - `createMockUser(overrides?)`
- `src/test/factories/scenario.ts` - `createMockScenario(overrides?)`
- `src/test/factories/index.ts` - Re-exports
- `src/test/mocks/media.ts` - MediaRecorder, AudioContext, MediaStream mocks
- `src/test/mocks/gemini.ts` - Gemini session mock
- `src/test/mocks/prisma.ts` - Prisma client mock
- `src/test/mocks/index.ts` - Re-exports
- `src/test/utils.tsx` - `renderWithProviders()`, re-exports testing-library
- `src/test/setup.tsx` - Extended global setup with Next.js mocks
- `src/test/CLAUDE.md` - Test patterns documentation
- `src/components/error-display.test.tsx` - Example using factory pattern
- `src/components/pr-link-modal.test.tsx` - Example with form testing
- `src/components/coworker-sidebar.test.tsx` - Example with interaction testing
- `vitest.config.ts` - Updated setup file path

### Learnings for future iterations

1. **Vitest Mock Types**: When using `vi.fn()` return values as callable functions, TypeScript may complain about `Mock<Procedure | Constructable>` not being callable. Cast to specific function signature: `(mock.fn as Mock<() => void>)()`

2. **JSX in Test Files**: Test files with JSX must use `.tsx` extension, not `.ts`. This applies to setup files, utils, and test files themselves.

3. **Global Mock Classes**: For browser APIs that need to work as constructors (like `MediaRecorder`, `AudioContext`), use actual class definitions instead of `vi.fn().mockImplementation()`:
   ```typescript
   class MockMediaRecorderClass {
     static isTypeSupported = vi.fn().mockReturnValue(true);
     start = vi.fn();
     // ...
   }
   global.MediaRecorder = MockMediaRecorderClass as unknown as typeof MediaRecorder;
   ```

4. **Factory Pattern**: All factories should:
   - Return complete objects with all required fields
   - Use `test-` prefixed IDs for easy identification
   - Accept partial overrides that spread last
   - Use realistic default values

5. **TDD for Test Infrastructure**: Even test utilities benefit from TDD. Write tests for factories first, watch them fail, then implement.

6. **Button States**: When testing forms, be aware of disabled button states. If a button is disabled when input is empty, clicking it won't trigger validation - adjust tests accordingly.

## Issue #95: REF-005 - Add API Route Validation Layer

### What was implemented
- Created `src/lib/api-validation.ts` with `validateRequest<T>(request, schema)` helper
- Created `src/lib/schemas/api.ts` with Zod schemas for API request validation
- Created `src/lib/schemas/index.ts` for schema re-exports
- Migrated 5 routes to use the validation helper:
  - `src/app/api/chat/route.ts` - chat POST endpoint
  - `src/app/api/call/token/route.ts` - coworker call token endpoint
  - `src/app/api/kickoff/token/route.ts` - manager kickoff token endpoint
  - `src/app/api/defense/token/route.ts` - defense call token endpoint
  - `src/app/api/recording/route.ts` - recording upload (POST) and metadata (GET) endpoints
- Updated `src/app/api/CLAUDE.md` with validation pattern documentation
- Added tests for the validation helper (`src/lib/api-validation.test.ts`)
- Updated existing route tests to expect standardized response format

### Files changed
- `src/lib/api-validation.ts` - New validation helper
- `src/lib/api-validation.test.ts` - Tests for validation helper
- `src/lib/schemas/api.ts` - Zod schemas for request bodies
- `src/lib/schemas/index.ts` - Re-exports
- `src/app/api/chat/route.ts` - Uses validateRequest
- `src/app/api/call/token/route.ts` - Uses validateRequest + standardized responses
- `src/app/api/kickoff/token/route.ts` - Uses validateRequest + standardized responses
- `src/app/api/defense/token/route.ts` - Uses validateRequest + standardized responses
- `src/app/api/recording/route.ts` - Uses standardized responses (FormData, not JSON)
- `src/app/api/CLAUDE.md` - Added validation documentation
- `src/app/api/call/token/route.test.ts` - Updated expectations
- `src/app/api/kickoff/token/route.test.ts` - Updated expectations
- `src/app/api/defense/token/route.test.ts` - Updated expectations
- `src/app/api/recording/route.test.ts` - Updated expectations

### Learnings for future iterations

1. **FormData vs JSON validation**: The `validateRequest` helper is designed for JSON bodies. Routes using FormData (like recording/upload with file uploads) need manual validation but should still use the standardized response helpers.

2. **Error variable naming**: When using the `error()` helper from `api-response.ts`, rename catch block error variables to `err` to avoid shadowing:
   ```typescript
   } catch (err) {
     console.error("Error:", err);
     return error("Failed to process", 500);
   }
   ```

3. **Test updates for standardized responses**: When migrating routes to use `success()` helper, update tests to check `json.success === true` and access data via `json.data.field` instead of `json.field`.

4. **Validation error format**: The standardized validation errors include:
   - `error`: "Validation failed"
   - `code`: "VALIDATION_ERROR"
   - `details`: Array of `{ path, message }` objects for each field error

5. **Schema location**: Keep Zod schemas in `src/lib/schemas/api.ts` and re-export from `src/lib/schemas/index.ts`. Each schema should export both the schema and the inferred TypeScript type.

6. **TDD for helpers**: Writing tests first for utility functions (like `validateRequest`) ensures the API contract is well-defined before implementation.

## Issue #96: REF-006 - Create API Client Wrapper

### What was implemented
- Created `src/lib/api-client.ts` with typed `api<T>(endpoint, options)` function
- Created `src/lib/api-client.test.ts` with 14 comprehensive tests
- Handles Content-Type headers automatically for JSON bodies
- Parses response JSON and throws typed `ApiClientError` on failure
- Supports all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Migrated 5 client-side fetch calls to use the new api client:
  - `src/components/chat.tsx` - GET chat history, POST send message
  - `src/components/data-deletion-section.tsx` - POST request deletion, DELETE cancel request
  - `src/app/candidate_search/client.tsx` - POST entity extraction

### Files changed
- `src/lib/api-client.ts` - New API client wrapper
- `src/lib/api-client.test.ts` - Tests for API client
- `src/components/chat.tsx` - Uses api client for chat operations
- `src/components/data-deletion-section.tsx` - Uses api client for deletion requests
- `src/app/candidate_search/client.tsx` - Uses api client for entity extraction

### Learnings for future iterations

1. **Standardized vs Legacy responses**: The api client handles both standardized responses (`{ success: true, data: T }`) and legacy responses (direct JSON). It extracts `data` from standardized responses automatically.

2. **ApiClientError for typed errors**: Using a custom error class (`ApiClientError`) with `code` and `status` properties makes error handling more precise:
   ```typescript
   try {
     await api('/api/endpoint');
   } catch (err) {
     if (err instanceof ApiClientError) {
       console.log(err.message, err.code, err.status);
     }
   }
   ```

3. **Mock reuse in tests**: When a test needs to call the same endpoint multiple times (e.g., to check both `toThrow` and `toMatchObject`), use `mockResolvedValue` instead of `mockResolvedValueOnce` to avoid the mock being consumed.

4. **Type inference with generics**: The `api<T>()` generic pattern allows callers to specify expected response types, improving type safety across the codebase.

5. **Body handling**: The api client automatically stringifies object bodies and sets Content-Type header, simplifying call sites from verbose fetch patterns.

## Issue #97: REF-007 - Extract Server-Side Data Fetching Utilities

### What was implemented
- Created `src/server/queries/` directory for reusable server-side data fetching
- Created `assessment.ts` with specialized query functions for different page needs
- Added `CLAUDE.md` documenting available queries and usage patterns
- Migrated 3 assessment pages to use new utilities

### Files changed
- `src/server/queries/assessment.ts` - Query functions:
  - `getAssessmentWithContext()` - basic assessment + scenario + user
  - `getAssessmentForHRInterview()` - HR page with conversation transcript
  - `getAssessmentForChat()` - chat page with coworkers
  - `getAssessmentForDefense()` - defense page with manager coworker
  - `getAssessmentForWelcome()` - welcome page with HR assessment
  - `getAssessmentForResults()` - results page with scenario and user
  - `getAssessmentBasic()` - verification only
- `src/server/queries/index.ts` - Re-exports all query functions
- `src/server/queries/CLAUDE.md` - Documentation for query usage
- `src/app/assessment/[id]/hr-interview/page.tsx` - Uses getAssessmentForHRInterview
- `src/app/assessment/[id]/chat/page.tsx` - Uses getAssessmentForChat
- `src/app/assessment/[id]/defense/page.tsx` - Uses getAssessmentForDefense

### Learnings for future iterations

1. **Query function naming**: Use pattern `getAssessmentFor<Purpose>(id, userId)` to clearly indicate what data is included for which page/use case.

2. **Ownership verification patterns**: Two approaches exist:
   - `findFirst({ where: { id, userId } })` - filters in query, returns null if not owner
   - `findUnique({ where: { id } })` + manual `userId !== userId` check - separate verification
   Both are valid; use `findFirst` for simpler code when ownership is the primary concern.

3. **Include vs Select**: Use `select` when you only need specific scalar fields to reduce data transfer. Use `include` when you need related models with all their fields.

4. **Query composition**: Keep queries purpose-specific rather than creating generic "fetch everything" functions. This ensures each page gets only the data it needs.

5. **Documentation location**: Add CLAUDE.md to directories with reusable utilities to guide future usage and additions.

## Issue #99: REF-009 - Consolidate Voice Hook Duplication

### What was implemented
- Created `src/hooks/voice/` directory with shared voice hook infrastructure
- Created `types.ts` with unified `VoiceConnectionState` type (now includes "retrying" for all hooks)
- Created `use-voice-base.ts` (~400 LOC) extracting common logic:
  - Connection state management
  - Audio capture initialization (16kHz input)
  - Audio playback queue (24kHz output)
  - WebSocket message handling
  - Retry with exponential backoff
  - Session recovery (optional)
- Refactored all 4 voice hooks to extend base hook
- Added "retrying" state to defense and kickoff hooks (previously missing)
- Added consistent retry logic to all hooks (previously only 2 of 4 had it)
- Updated component imports to use new path (`@/hooks/voice`)

### Files changed
- `src/hooks/voice/types.ts` - Shared types (VoiceConnectionState, VoiceBaseOptions, etc.)
- `src/hooks/voice/use-voice-base.ts` - ~400 LOC shared base hook
- `src/hooks/voice/use-voice-conversation.ts` - ~140 LOC HR interview hook
- `src/hooks/voice/use-coworker-voice.ts` - ~120 LOC coworker call hook
- `src/hooks/voice/use-defense-call.ts` - ~120 LOC defense call hook
- `src/hooks/voice/use-manager-kickoff.ts` - ~110 LOC manager kickoff hook
- `src/hooks/voice/index.ts` - Re-exports all voice hooks and types
- `src/hooks/index.ts` - Main hooks re-exports
- `src/hooks/CLAUDE.md` - Updated with new hook structure documentation
- `src/components/voice-conversation.tsx` - Updated import path
- `src/components/coworker-voice-call.tsx` - Updated import path
- `src/app/assessment/[id]/defense/client.tsx` - Updated import path, added retrying state
- Deleted: `src/hooks/use-voice-conversation.ts`, `src/hooks/use-coworker-voice.ts`, `src/hooks/use-defense-call.ts`, `src/hooks/use-manager-kickoff.ts`

### LOC Reduction
- Before: 1940 LOC across 4 hooks
- After: 1156 LOC across 6 files (base + 4 hooks + types)
- Reduction: 784 LOC (40.4%)

### Learnings for future iterations

1. **Base hook pattern**: When multiple hooks share significant code, extract shared logic into a base hook that accepts configuration. Specific hooks become thin wrappers that configure the base and add domain-specific logic.

2. **Consistent typing**: Unify connection states across hooks to ensure consistent UI handling. The "retrying" state was missing in 2 of 4 hooks, causing TypeScript exhaustiveness issues.

3. **Session vs Ref pattern**: The base hook exposes both the state (`transcript`) and ref (`transcriptRef`) because callbacks in closures may have stale state. Consumers use refs in callbacks but state in render.

4. **Optional features via config**: Features like session recovery are controlled via config object (`enableSessionRecovery`, `progressType`), making the base hook flexible without adding complexity to hooks that don't need the feature.

5. **Token response callback**: Use `onTokenResponse` callback to let specific hooks extract additional data from token endpoint responses (e.g., managerName, prUrl) without the base hook needing to know about these fields.

6. **Empty interface lint error**: ESLint complains about `interface X extends Y {}` when no new members are added. Use `type X = Y` instead for type aliases.

## Issue #84: US-023 - Fix Call Widget Layout in Sidebar

### What was implemented
- Fixed call widget layout to stay fixed at bottom of sidebar
- Made chats list scrollable when call widget is active
- Added smooth transition when call widget appears/disappears

### Files changed
- `src/components/slack-layout.tsx` - Updated flex layout for sidebar:
  - Changed coworker list from `overflow-auto` to `overflow-y-auto` for explicit vertical scrolling
  - Changed call widget wrapper from `h-0` to `max-h-0` when inactive, `max-h-[100px]` when active
  - Updated transition duration from 200ms to 300ms for smoother animation
  - Ensured `flex-shrink-0` keeps call widget from being compressed

### Learnings for future iterations

1. **Flex layout for fixed footer elements**: In a flex column container, use this pattern for a scrollable list with a fixed footer:
   - Container: `flex flex-col h-screen`
   - Scrollable area: `flex-1 min-h-0 overflow-y-auto`
   - Fixed footer: `flex-shrink-0`

2. **max-height transitions vs height transitions**: Using `max-h-0`/`max-h-[100px]` with `overflow-hidden` allows smooth height transitions. Direct `h-0` doesn't animate well because height needs a specific value to transition to.

3. **Browser testing limitations**: Headless browser testing cannot grant microphone/screen sharing permissions, so call functionality requires manual testing or mocked audio APIs.

4. **min-h-0 for flex scroll children**: When a flex child should scroll its content, `min-h-0` is required to override the default `min-height: auto` which prevents the element from shrinking below its content size.

## Issue #85: US-024 - Add In-Call Indicator to Chat

### What was implemented
- Added green "In call" badge to chat header when user is on a call with that person
- Badge shows phone icon + "In call" text with green background (neo-brutalist style)
- Badge replaces "online" indicator when call is active
- Badge disappears automatically when call ends (uses CallContext)
- Added comprehensive unit tests for the in-call indicator behavior

### Files changed
- `src/components/chat.tsx` - Added in-call indicator with CallContext integration:
  - Import `Phone` icon from lucide-react
  - Import `useCallContext` from slack-layout
  - Check if `activeCall?.coworkerId === coworker.id` to determine in-call state
  - Conditionally render green badge vs online indicator in header
- `src/components/chat.test.tsx` - New test file with 11 tests covering:
  - Rendering (name, role, initials)
  - In-call indicator states (online, in call, different coworker)
  - Message input and done button

### Design decisions
- **Slack-inspired UI**: Followed Slack's huddle pattern with a distinct badge in the conversation header
- **Green color for active call**: Used `bg-green-500` with `border-green-600` (2px border) for neo-brutalist consistency
- **Phone icon**: Used lucide-react's Phone icon (14px) to indicate call status
- **Font mono**: Used `font-mono text-sm font-bold text-white` for "In call" text

### Learnings for future iterations

1. **CallContext for cross-component call state**: The `useCallContext()` hook from `slack-layout.tsx` provides `activeCall` state that can be consumed by any component within the `SlackLayout`. This makes it easy to show call indicators across multiple UI components.

2. **Screen recording guard blocks E2E testing**: The chat page requires screen sharing permission which headless browsers cannot grant. Browser-based tests for chat functionality will be blocked by `ScreenRecordingGuard` component unless testing infrastructure adds bypass mechanisms.

3. **Neo-brutalist green indicators**: For active/success states in the design system, use:
   - `bg-green-500` for solid backgrounds
   - `border-2 border-green-600` for borders
   - `text-white` for text on green backgrounds
   - `px-3 py-1` for compact badge padding

4. **Conditional rendering in headers**: When swapping between two indicator states (online vs in-call), use a single conditional with explicit branches rather than stacking multiple conditionals. This makes the code clearer and ensures mutual exclusivity.

5. **Unit testing with mocked context**: For components using React context, mock the context hook at the module level and mutate the mock state in `beforeEach` to test different scenarios:
   ```typescript
   const mockActiveCall = { coworkerId: "", callType: "coworker" as const };
   vi.mock("@/components/slack-layout", () => ({
     useCallContext: vi.fn(() => ({
       activeCall: mockActiveCall.coworkerId ? mockActiveCall : null,
     })),
   }));
   ```

## Issue #87: BUG - Cannot Submit PR Link - Assessment Stuck in ONBOARDING Status

### What was implemented
- Fixed missing status transition from ONBOARDING to WORKING in the assessment flow
- Added status update to `/api/kickoff/transcript` route when the kickoff call transcript is saved
- Added unit tests for the status transition behavior

### Root cause
The assessment flow transitions through statuses: HR_INTERVIEW → ONBOARDING → WORKING → FINAL_DEFENSE → COMPLETED.

The HR interview transcript save correctly updated status to ONBOARDING in `/api/interview/transcript/route.ts`. However, the kickoff call transcript save in `/api/kickoff/transcript/route.ts` never updated the status to WORKING. This left users stuck in ONBOARDING status, causing the PR submission endpoint to reject requests with "Cannot complete assessment in ONBOARDING status. Must be in WORKING status."

### Files changed
- `src/app/api/kickoff/transcript/route.ts` - Added assessment status update to WORKING when kickoff transcript is saved (both for new conversations and when appending to existing ones)
- `src/app/api/kickoff/transcript/route.test.ts` - Added mock for `assessment.update` and tests verifying status transition

### Learnings for future iterations

1. **Consistent status transition pattern**: When saving call transcripts, always update the assessment status to the next phase. The pattern is:
   - `/api/interview/transcript` → sets status to ONBOARDING
   - `/api/kickoff/transcript` → sets status to WORKING (new!)
   - `/api/assessment/complete` → sets status to FINAL_DEFENSE

2. **Systematic debugging**: Following the 4-phase approach (Root Cause Investigation → Pattern Analysis → Hypothesis → Implementation) quickly identified the missing status update by:
   - Tracing the error message to `/api/assessment/complete/route.ts`
   - Searching for status transitions with `grep`
   - Comparing the interview transcript route (which had the transition) to the kickoff transcript route (which was missing it)

3. **TDD for bug fixes**: Writing a failing test first (`should update assessment status to WORKING when transcript is saved`) clearly defined the expected behavior before implementing the fix.

4. **E2E testing limitations**: Browser-based testing for assessment pages is blocked by `ScreenRecordingGuard` which requires screen sharing permissions unavailable in headless browsers. For full E2E validation, use direct database/API testing scripts or manual testing.

5. **Conditional status updates**: Only update status when there's actual content (transcript length > 0), following the same pattern as the interview transcript route.

## Issue #88: BUG - All Coworker Calls Use Same Female Voice

### What was implemented
- Added `voiceName` field to Coworker model in Prisma schema to store per-coworker voice configuration
- Modified `generateEphemeralToken()` in `src/lib/gemini.ts` to accept optional `voiceName` parameter
- Added `GEMINI_VOICES` constant with male and female voice options for UI selection
- Updated all token generation routes to pass coworker's voice:
  - `/api/call/token` - Uses coworker's voiceName from database
  - `/api/kickoff/token` - Uses manager's voiceName
  - `/api/defense/token` - Uses manager's voiceName
  - `/api/interview/token` - Uses default female voice (Aoede) for HR
- Added voice selector dropdown to admin scenario detail page
- Updated EXAMPLE_COWORKERS with gender-appropriate voice assignments
- Updated seed.ts to persist voiceName when seeding coworkers
- Updated coworker API routes (POST/PUT) to handle voiceName field
- Updated CoworkerPersona type to include optional voiceName field

### Files changed
- `prisma/schema.prisma` - Added `voiceName String?` field to Coworker model
- `src/lib/gemini.ts` - Added voiceName parameter, GEMINI_VOICES constant, VoiceName type
- `src/types/coworker.ts` - Added voiceName to CoworkerPersona interface
- `src/lib/coworker-persona.ts` - Added voices to EXAMPLE_COWORKERS
- `prisma/seed.ts` - Seeds voiceName for coworkers
- `src/app/api/call/token/route.ts` - Passes coworker.voiceName to token generation
- `src/app/api/kickoff/token/route.ts` - Passes manager.voiceName to token generation
- `src/app/api/defense/token/route.ts` - Passes manager.voiceName to token generation
- `src/app/api/interview/token/route.ts` - Documented default voice usage
- `src/app/api/admin/scenarios/[id]/coworkers/route.ts` - Handles voiceName in POST
- `src/app/api/admin/scenarios/[id]/coworkers/[coworkerId]/route.ts` - Handles voiceName in PUT
- `src/app/admin/scenarios/[id]/client.tsx` - Added voice selector UI with grouped options

### Voice assignments
The following voice assignments were implemented in seed data:
- Alex Chen (Engineering Manager) - Charon (Male - Informative)
- Jordan Rivera (Senior Software Engineer) - Leda (Female - Youthful)
- Sam Patel (Product Manager) - Puck (Male - Upbeat)
- Riley Kim (QA Lead) - Callirrhoe (Female - Easy-going)

### Learnings for future iterations

1. **Gemini Live voice configuration**: Voice is set at token generation time via `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName`. The voice must be one of Gemini's 30 prebuilt voices.

2. **Optional field with fallback pattern**: When adding optional configuration like voice, always provide a sensible default. The pattern `voiceName || DEFAULT_VOICE` ensures backward compatibility with existing coworkers that don't have voices set.

3. **Type extension for fallback objects**: When creating fallback objects (e.g., default manager), include all expected fields with appropriate types:
   ```typescript
   const manager = coworkers[0] || {
     id: "default-manager",
     name: "Alex Chen",
     voiceName: null as string | null,
   };
   ```

4. **UI for voice selection**: Grouping voices by gender in an optgroup makes the dropdown more intuitive. Each voice includes its "personality" descriptor for informed selection.

5. **Schema changes with db push**: For simple additive schema changes like adding an optional field, `prisma db push` is faster than full migrations, especially when there's drift between migration history and actual database schema.

## Issue #89: US-025 - Add DiceBear Identicon Avatars for Coworkers

### What was implemented
- Created reusable `CoworkerAvatar` component that generates DiceBear identicon avatars
- Replaced text-based initials avatars with deterministic geometric patterns
- Applied yellow (#D4AF37) background and black (#000000) pattern to match neo-brutalist theme
- Avatars are square (0 border-radius) following design system
- Updated all four coworker avatar locations: chat header, message list, sidebar, voice call UI

### Files changed
- `src/components/coworker-avatar.tsx` - New reusable avatar component with size variants (sm, md, lg, xl)
- `src/components/chat.tsx` - Updated header, empty state, message avatars, and typing indicator
- `src/components/coworker-sidebar.tsx` - Updated CoworkerItem avatar
- `src/components/coworker-voice-call.tsx` - Updated control panel avatar
- `src/components/floating-call-bar.tsx` - Updated call bar avatar
- `src/components/chat.test.tsx` - Updated tests to check for DiceBear images
- `src/components/coworker-sidebar.test.tsx` - Updated avatar tests for identicons

### DiceBear Configuration
The avatar URL format:
```
https://api.dicebear.com/7.x/identicon/svg?seed={name}&backgroundColor=D4AF37&rowColor=000000
```
- `identicon` style generates geometric patterns
- `seed` uses coworker name for deterministic avatars (same name = same avatar)
- `backgroundColor` is gold/yellow to match design system
- `rowColor` is black for the pattern

### Learnings for future iterations

1. **Reusable avatar component pattern**: Creating a dedicated component (`CoworkerAvatar`) with size variants makes it easy to maintain consistent styling across all locations. The size prop maps to Tailwind classes.

2. **DiceBear API for deterministic avatars**: Using the name as seed ensures the same coworker always gets the same avatar pattern. The identicon style provides unique geometric patterns that are visually distinctive.

3. **Image alt text for accessibility**: Each avatar image includes alt text with the coworker's name (`{name}'s avatar`) for screen reader accessibility.

4. **Test updates for image-based components**: When replacing text with images, update tests to look for `img` elements by `alt` text and check `src` attributes contain expected URL patterns rather than checking for text content.

5. **Neo-brutalist image styling**: For image elements in the design system:
   - Use `border-2 border-foreground` for consistent borders
   - Ensure square aspect ratio with equal width/height classes
   - No border-radius (0px) to match other elements

## Issue #90: US-025 - Submit PR via Manager Chat Instead of Button

### What was implemented
- Removed the "I'm Done" button from chat footer and deleted PrLinkModal component
- Added PR link detection in the chat API route when messaging a manager
- When a valid PR link is detected (GitHub/GitLab/Bitbucket patterns):
  1. Validates using existing `isValidPrUrl()` function
  2. Updates assessment status from WORKING to FINAL_DEFENSE
  3. Saves PR URL to assessment record
  4. Manager AI responds with acknowledgment like "Awesome! Let me take a quick look..."
  5. After 3-second delay, frontend triggers navigation to defense page
- Invalid PR links are handled gracefully with a helpful response from manager

### Files changed
- `src/components/chat.tsx` - Removed `showDoneButton`/`onDoneClick` props, added `onPrSubmitted` callback, handles `prSubmitted` response from API
- `src/components/pr-link-modal.tsx` - Deleted
- `src/components/pr-link-modal.test.tsx` - Deleted
- `src/components/chat.test.tsx` - Updated tests, removed done button tests
- `src/app/assessment/[id]/chat/client.tsx` - Removed modal state, simplified to pass `onPrSubmitted` callback
- `src/app/api/chat/route.ts` - Added PR link detection, manager role checking, assessment status transition, contextual responses

### New flow
1. User sends PR link message to manager in chat
2. API detects PR link and validates it
3. If valid and assessment is in WORKING status:
   - Assessment status updated to FINAL_DEFENSE
   - PR URL saved to assessment
   - Manager AI responds with acknowledgment
   - Response includes `prSubmitted: true`
4. Frontend receives `prSubmitted: true`, waits 3 seconds, then navigates to defense page
5. Defense page handles starting the call automatically

### Learnings for future iterations

1. **PR detection in messages**: Use regex to extract URLs from messages, then validate each URL against PR patterns. The `isValidPrUrl()` function handles GitHub, GitLab, and Bitbucket patterns.

2. **Contextual AI responses**: When detecting special message types (like PR submissions), generate contextual responses by adding additional prompts to the Gemini request. This keeps the conversation natural while ensuring appropriate acknowledgment.

3. **Delayed navigation pattern**: Using `setTimeout` in the frontend before navigation gives users time to read the manager's response, creating a more natural conversational feel.

4. **Status-aware processing**: Check assessment status before processing PR submissions. Only allow PR submission when status is WORKING - this prevents duplicate submissions or submissions at wrong stages.

5. **Browser testing limitations**: As noted in Issue #85, chat page E2E testing is blocked by `ScreenRecordingGuard` requiring screen sharing permissions unavailable in headless browsers. Use unit tests and API tests for validation.

6. **Graceful invalid input handling**: When users try to submit something that looks like a PR but isn't valid, provide helpful feedback asking for the correct format rather than a generic error.

## Issue #100: REF-010 - Reorganize src/lib into Domain-Based Subdirectories

### What was implemented
- Created 7 domain-based subdirectories in src/lib with barrel exports:
  - `core/` - env, admin, error-recovery, analytics, data-deletion
  - `external/` - github, email, supabase, storage, pr-validation
  - `media/` - audio, screen, video-recorder
  - `ai/` - gemini, conversation-memory, coworker-persona
  - `scenarios/` - scenario-builder
  - `candidate/` - cv-parser, embeddings, candidate-search, archetypes, seniority
  - `analysis/` - assessment-aggregation, video-evaluation, code-review, recording-analysis
- Moved 54 files from flat structure into domain directories
- Created index.ts barrel export in each subdirectory
- Updated 131 files with new import paths
- Updated src/lib/CLAUDE.md with new structure documentation

### Files changed
- New directories and index.ts files for each domain
- All files in src/lib moved to appropriate subdirectory
- All consuming files updated to use new `@/lib/{domain}` import paths
- prisma/seed.ts - Updated import path for coworker-persona
- src/lib/CLAUDE.md - Documented new structure

### Import pattern change
```typescript
// Before
import { gemini } from "@/lib/gemini";
import { env } from "@/lib/env";

// After
import { gemini } from "@/lib/ai";
import { env } from "@/lib/core";
```

### Learnings for future iterations

1. **Barrel export conflicts**: When creating barrel exports that re-export from multiple modules, check for duplicate export names. Use explicit exports to avoid conflicts (e.g., `SeniorityLevel` was defined in both cv-parser and seniority-thresholds).

2. **Migration order by dependency**: Follow the dependency order specified in the issue (core → external → media → ai → scenarios → candidate → analysis) to minimize broken imports during migration.

3. **Relative vs absolute imports in tests**: Test files within a directory should use relative imports (`"./module"`) for local imports and absolute imports (`"@/lib/domain"`) for cross-domain imports.

4. **Pre-existing test issues**: Many test failures were due to environment variable validation, not the refactoring. Tests that import from barrel exports trigger env validation which requires proper mocking.

5. **Seed file paths**: The prisma/seed.ts file uses relative imports (`"../src/lib/..."`) rather than `@/` aliases, so these need manual updating.

6. **API utilities at root**: Files like api-client, api-response, api-validation remain at src/lib root as they're general utilities not domain-specific.

## Issue #101: REF-011 - Reorganize src/components into Domain-Based Subdirectories

### What was implemented
- Created 6 domain-based subdirectories in src/components with barrel exports:
  - `shared/` - cv-upload, markdown, providers
  - `admin/` - admin-nav, data-deletion-section
  - `feedback/` - error-display, rejection-feedback-modal
  - `candidate/` - active-filters-bar, candidate-search-result-card, parsed-profile-display, profile-cv-section
  - `chat/` - chat, coworker-sidebar, coworker-voice-call, floating-call-bar, slack-layout, coworker-avatar
  - `assessment/` - assessment-screen-wrapper, screen-recording-guard, voice-conversation
- Created index.ts barrel export in each subdirectory
- Updated all consumer imports across the codebase (15+ files)
- Updated src/components/CLAUDE.md with new structure documentation

### Files changed
- New directories and index.ts files for each domain
- All 26 component files moved to appropriate subdirectories
- All test files moved alongside their components
- All consuming files in src/app updated to use new `@/components/{domain}` import paths
- src/components/CLAUDE.md - Documented new structure and import patterns

### Import pattern change
```typescript
// Before
import { Chat } from "@/components/chat";
import { ErrorDisplay } from "@/components/error-display";

// After
import { Chat, SlackLayout } from "@/components/chat";
import { ErrorDisplay } from "@/components/feedback";
```

### Internal imports pattern
Within a domain directory, components use relative imports:
```typescript
// Inside src/components/chat/chat.tsx
import { useCallContext } from "./slack-layout";
import { CoworkerAvatar } from "./coworker-avatar";
```

### Learnings for future iterations

1. **Cross-domain dependencies**: Some components depend on other domains (e.g., profile-cv-section in candidate/ imports CVUpload from shared/). Use absolute imports (`@/components/shared`) for cross-domain dependencies.

2. **Migration order matters**: Follow dependency order (shared → admin → feedback → candidate → chat → assessment) to minimize broken imports during migration.

3. **Test mock paths**: When components switch to relative imports, test mocks must also use relative paths. Example: `vi.mock("@/components/slack-layout")` becomes `vi.mock("./slack-layout")`.

4. **Barrel export pattern for components**: Export component names directly, not default exports:
   ```typescript
   export { Chat } from "./chat";
   export { CoworkerSidebar } from "./coworker-sidebar";
   ```

5. **Type exports in barrels**: For interfaces that consumers need, export types explicitly:
   ```typescript
   export type { CandidateSearchResult } from "./candidate-search-result-card";
   ```

6. **CLAUDE.md updates**: Always update directory documentation when reorganizing to help future development.

## Issue #102: FEAT-001 - Add E2E Test Mode to Bypass Screen Recording

### What was implemented
- Added `E2E_TEST_MODE` server env var and `NEXT_PUBLIC_E2E_TEST_MODE` client env var to `src/lib/core/env.ts`
- Created `isE2ETestMode()` and `isE2ETestModeClient()` helper functions with double-gate safety (requires `NODE_ENV=development` AND env var set to `"true"`)
- Updated `ScreenRecordingGuard` to return children directly when in test mode (no modal)
- Updated `ScreenRecordingContext` to auto-start a fake recording session in test mode
- Updated `/api/recording/session` to accept `testMode: true` flag and create completed segment with empty paths
- API rejects `testMode` requests when `NODE_ENV !== development` (returns 403)
- Documented env vars in `.env.example`
- Added unit tests for testMode API behavior

### Files changed
- `src/lib/core/env.ts` - Added env vars and helper functions
- `src/components/assessment/screen-recording-guard.tsx` - Early return in test mode
- `src/contexts/screen-recording-context.tsx` - Auto-start fake session
- `src/app/api/recording/session/route.ts` - Handle testMode flag with security gate
- `src/app/api/recording/session/route.test.ts` - Added tests for testMode behavior
- `.env.example` - Documented new vars

### Usage
```bash
E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev
```
Then run E2E tests against that server instance.

### Learnings for future iterations

1. **Double-gate safety pattern**: For features that should NEVER work in production, use a two-part check:
   - `process.env.NODE_ENV === "development"` (cannot be faked in production builds)
   - Explicit env var flag (user intent confirmation)
   This ensures accidental deployment won't enable the bypass.

2. **Inner component pattern for early returns**: When a component using hooks needs to conditionally render, extract the hook-using logic to an inner component. The outer component can have the early return (which happens before any hooks are called), avoiding the "hooks in conditionals" rule violation:
   ```typescript
   export function Guard({ children }) {
     if (isE2ETestModeClient()) return <>{children}</>;
     return <GuardInner>{children}</GuardInner>;
   }
   function GuardInner({ children }) {
     const { state } = useContext(); // hooks here
     // ... rest of component
   }
   ```

3. **Fake session for downstream compatibility**: When bypassing a feature that creates database records, still create the records (with placeholder/empty values) so downstream code that expects them to exist works correctly.

4. **Mock exports in tests**: When mocking a module barrel export (like `@/lib/core`), ensure all exports used by the imported code are included in the mock. Missing exports cause runtime errors like "No 'env' export is defined on the mock".

5. **Pre-existing test failures**: Many test suites in this codebase fail due to env validation when importing modules that trigger Supabase/env initialization. These are pre-existing issues documented in progress.md and not caused by new changes.

## Issue #103: REF-012 - Consolidate Duplicate Type Definitions

### What was implemented
- Unified `SeniorityLevel` type in `src/types/cv.ts` to use uppercase values (JUNIOR, MID, SENIOR, LEAD, PRINCIPAL, UNKNOWN)
- Added `FilterSeniorityLevel` type as a subset (JUNIOR, MID, SENIOR) for candidate filtering
- Updated `seniority-thresholds.ts` to import from `@/types` and create local type alias
- Removed duplicate `ChatMessage` interface from `chat.tsx` and `scenario builder client.tsx`
- Updated CV parsing prompt and schema to use uppercase seniority values
- Updated tests and display components to use new uppercase convention

### Files changed
- `src/types/cv.ts` - Unified SeniorityLevel to uppercase, added FilterSeniorityLevel
- `src/types/index.ts` - Added FilterSeniorityLevel export
- `src/lib/candidate/seniority-thresholds.ts` - Imports from @/types, creates local alias
- `src/lib/candidate/index.ts` - Updated comments
- `src/components/chat/chat.tsx` - Imports ChatMessage from @/types
- `src/app/admin/scenarios/builder/client.tsx` - Imports ChatMessage from @/types
- `src/lib/candidate/cv-parser.ts` - Updated schema and comparison to uppercase
- `src/prompts/analysis/cv-parser.ts` - Updated prompt to use uppercase
- `src/components/candidate/parsed-profile-display.tsx` - Updated SENIORITY_LABELS keys
- `src/components/candidate/parsed-profile-display.test.tsx` - Updated test values
- `src/lib/candidate/cv-parser.test.ts` - Updated test values

### Learnings for future iterations

1. **Type re-export vs type alias**: When you want to use a type from another module locally AND re-export it, use a type alias (`export type SeniorityLevel = FilterSeniorityLevel`) rather than a re-export (`export type { FilterSeniorityLevel as SeniorityLevel }`). The re-export doesn't create a local binding.

2. **AI prompt synchronization**: When changing type values (like lowercase to uppercase), remember to update any AI prompts that instruct models to output specific values. The prompt and schema must stay in sync.

3. **Type subset for different contexts**: When a type has different levels of granularity for different use cases (e.g., CV parsing needs all levels, filtering only needs 3), create a subset type like `FilterSeniorityLevel` rather than maintaining duplicate type definitions.

4. **Display label maps**: When changing type keys, check for any display label mappings (like `SENIORITY_LABELS`) that use the type values as keys. These need to be updated to match.

5. **Test data follows types**: When changing enum-like type values, all test files that use those values as literals need to be updated. Use TypeScript's type checking to find all locations.

## Issue #104: REF-013 - Move API Utilities to Domain Directory

### What was implemented
- Created `src/lib/api/` directory to organize API utilities following the domain-based structure
- Moved and renamed files:
  - `api-client.ts` → `api/client.ts`
  - `api-response.ts` → `api/response.ts`
  - `api-validation.ts` → `api/validation.ts`
  - Corresponding test files alongside implementations
- Created `api/index.ts` barrel export for clean imports
- Updated all 18 consumer files to use new `@/lib/api` import path
- Updated documentation in `src/lib/CLAUDE.md` and `src/app/api/CLAUDE.md`

### Files changed
- Created `src/lib/api/` directory with index.ts, client.ts, response.ts, validation.ts
- Moved and renamed 3 source files and 3 test files
- Updated imports in:
  - `src/components/chat/chat.tsx`
  - `src/components/admin/data-deletion-section.tsx`
  - `src/app/candidate_search/client.tsx`
  - `src/app/api/defense/token/route.ts`
  - `src/app/api/code-review/route.ts`
  - `src/app/api/kickoff/token/route.ts`
  - `src/app/api/interview/token/route.ts`
  - `src/app/api/recording/route.ts`
  - `src/app/api/call/token/route.ts`
  - `src/app/api/admin/scenarios/route.ts`
  - `src/app/api/chat/route.ts`
  - `src/app/api/assessment/complete/route.ts`
  - `src/app/api/CLAUDE.md`
  - `src/lib/CLAUDE.md`

### Import pattern change
```typescript
// Before
import { success, error } from "@/lib/api-response";
import { validateRequest } from "@/lib/api-validation";
import { api, ApiClientError } from "@/lib/api-client";

// After
import { success, error, validateRequest, api, ApiClientError } from "@/lib/api";
```

### Learnings for future iterations

1. **Consistent domain organization**: This completes the REF-010 reorganization of src/lib. All utilities are now in domain-based subdirectories (core/, external/, media/, ai/, scenarios/, candidate/, analysis/, schemas/, api/).

2. **Internal relative imports**: When files within a domain directory reference each other, use relative imports (e.g., `import { validationError } from "./response"`). This keeps the dependency explicit within the domain.

3. **Test file locations**: Test files should be moved alongside their source files when reorganizing. Update their relative imports to match the new structure (e.g., `"./api-client"` → `"./client"`).

4. **Combined imports in barrel exports**: When multiple related utilities exist, combine them in a single barrel export to allow consumers to import everything from one place (`@/lib/api`).

5. **Documentation updates**: When reorganizing code, always update relevant CLAUDE.md files to reflect the new structure. This includes both the directory documentation and any example code in other docs.

## Issue #105: REF-014 - Centralize Scattered Prompts

### What was implemented
- Created 4 new prompt files following the existing pattern (constant + builder function):
  - `src/prompts/analysis/hr-assessment.ts` - HR interview transcript analysis prompt
  - `src/prompts/analysis/feedback-parsing.ts` - Rejection feedback parsing prompt
  - `src/prompts/analysis/entity-extraction.ts` - Search query entity extraction prompt
  - `src/prompts/manager/pr-submission.ts` - PR acknowledgment and invalid PR prompts
- Updated source files to import from centralized `@/prompts`:
  - `src/app/api/interview/assessment/route.ts` - Uses `buildHRAssessmentContext`
  - `src/app/api/chat/route.ts` - Uses `buildPRAcknowledgmentContext` and `INVALID_PR_PROMPT`
  - `src/lib/candidate/feedback-parsing.ts` - Uses `buildFeedbackParsingContext`
  - `src/lib/candidate/entity-extraction.ts` - Uses `buildEntityExtractionContext`
- Updated `src/prompts/index.ts` with new exports

### Files changed
- Created: `src/prompts/analysis/hr-assessment.ts`
- Created: `src/prompts/analysis/feedback-parsing.ts`
- Created: `src/prompts/analysis/entity-extraction.ts`
- Created: `src/prompts/manager/pr-submission.ts`
- Modified: `src/prompts/index.ts`
- Modified: `src/app/api/interview/assessment/route.ts`
- Modified: `src/app/api/chat/route.ts`
- Modified: `src/lib/candidate/feedback-parsing.ts`
- Modified: `src/lib/candidate/entity-extraction.ts`

### Prompt organization pattern
The centralized prompts follow this structure:
```
src/prompts/
├── hr/           # HR interview prompts
├── manager/      # Manager kickoff, defense, PR submission prompts
├── coworker/     # Coworker persona and chat prompts
├── analysis/     # All analysis prompts (code review, CV, HR assessment, etc.)
└── index.ts      # Barrel exports for all prompts
```

Each prompt file follows the pattern:
```typescript
export const PROMPT_NAME = `...prompt text...`;

export function buildPromptContext(param: Type): string {
  return `${PROMPT_NAME}${param}`;
}
```

### Learnings for future iterations

1. **Prompt file naming convention**: Use lowercase with hyphens (e.g., `hr-assessment.ts`, `pr-submission.ts`) matching the existing prompt files in the directory.

2. **Builder function pattern**: Always pair prompts with a builder function that appends context. This makes it clear how to use the prompt and what context it expects:
   ```typescript
   export const PROMPT = `...`;
   export function buildPromptContext(input: string): string {
     return `${PROMPT}${input}`;
   }
   ```

3. **Domain organization**: Prompts should be organized by domain (hr/, manager/, analysis/) not by file type. Analysis prompts include HR assessment, code review, CV parsing, feedback parsing, and entity extraction.

4. **Multiple exports from single file**: When prompts are related (like PR acknowledgment and invalid PR prompts), group them in a single file with multiple exports.

5. **Import from barrel export**: Always import prompts from `@/prompts` not from individual files. This ensures consistent imports and makes refactoring easier.

## Issue #106: REF-015 - Create AI Error Context System

### What was implemented
- Created `src/lib/ai/errors.ts` with `AIError` class and `wrapAICall<T>()` helper function
- `AIError` extends `Error` and includes: message, model, promptType, promptVersion, originalError
- Added `isAIError()` type guard for safe error handling
- Added `toDetailedString()` method for formatted logging output
- Created comprehensive test suite with 13 tests covering all functionality
- Created `src/lib/ai/CLAUDE.md` documenting usage patterns
- Updated `src/lib/ai/index.ts` barrel exports

### Files changed
- `src/lib/ai/errors.ts` - New AIError class and wrapAICall helper
- `src/lib/ai/errors.test.ts` - 13 tests for error utilities
- `src/lib/ai/index.ts` - Added errors export
- `src/lib/ai/CLAUDE.md` - Documentation for AI utilities

### Usage pattern
```typescript
import { wrapAICall, AIError, isAIError } from "@/lib/ai";

const result = await wrapAICall(
  () => gemini.models.generateContent({ model, contents }),
  { model: TEXT_MODEL, promptType: "cv-parsing", promptVersion: "1.0" }
);

// Error handling
try {
  await wrapAICall(fn, context);
} catch (error) {
  if (isAIError(error)) {
    console.error(error.toDetailedString());
  }
}
```

### Learnings for future iterations

1. **Error.captureStackTrace for custom errors**: When creating custom error classes that extend Error, use `Error.captureStackTrace(this, ClassName)` to maintain proper stack traces. This removes the constructor from the stack trace, making debugging cleaner.

2. **Type guard pattern for error handling**: Export an `isErrorType()` type guard function alongside custom error classes. This allows consumers to safely narrow error types without relying on `instanceof` checks that may fail across module boundaries.

3. **toDetailedString() for logging**: Adding a formatting method like `toDetailedString()` makes it easy to log structured error information in a consistent format. This is more flexible than overriding `toString()` which may affect other error handling code.

4. **Generic async wrapper pattern**: The `wrapAICall<T>()` pattern works for any async operation. The generic type parameter ensures the return type is preserved, maintaining type safety through the wrapper.

5. **Prompt version convention**: Use semantic versions (e.g., "1.0") or date-based versions (e.g., "2024-01") for promptVersion. This enables tracking which prompt versions cause errors over time.
