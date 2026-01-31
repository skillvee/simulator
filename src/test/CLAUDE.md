# Test Infrastructure

Test utilities, factories, and mocks for consistent, maintainable tests.

## Quick Start

```typescript
import { renderWithProviders, screen } from "@/test/utils";
import { createMockUser, createMockAssessment } from "@/test/factories";
import { createMockPrismaClient, setupMediaMocks } from "@/test/mocks";
```

## Structure

```
src/test/
├── setup.tsx              # Global test setup (runs before each file)
├── utils.tsx              # renderWithProviders, waitForAsync
├── fixtures.ts            # Test constants (RF-001) - TEST_RECRUITER, TEST_CANDIDATE, etc.
├── helpers.ts             # E2E helpers (RF-001) - login command generators
├── factories/
│   ├── assessment.ts      # createMockAssessment()
│   ├── user.ts            # createMockUser()
│   ├── scenario.ts        # createMockScenario()
│   └── index.ts           # Re-exports
├── mocks/
│   ├── media.ts           # MediaRecorder, AudioContext mocks
│   ├── gemini.ts          # Gemini session mock
│   ├── prisma.ts          # Prisma client mock
│   └── index.ts           # Re-exports
└── CLAUDE.md              # This file
```

## Factories

Factories create type-safe mock data with sensible defaults.

### Usage

```typescript
import { createMockUser, createMockAssessment, createMockScenario } from "@/test/factories";

// Use defaults
const user = createMockUser();

// Override specific fields
const admin = createMockUser({ role: "ADMIN" });
const completed = createMockAssessment({
  status: AssessmentStatus.COMPLETED,
  completedAt: new Date(),
});
```

### Factory Pattern

All factories follow this pattern:

1. Return complete objects with all required fields
2. Use `test-` prefixed IDs for easy identification
3. Accept partial overrides that spread last
4. Use realistic default values

## Mocks

### Media Mocks (MediaRecorder, AudioContext, MediaStream)

For components using browser media APIs:

```typescript
import { setupMediaMocks, teardownMediaMocks, createMockMediaRecorder } from "@/test/mocks";

describe("MediaComponent", () => {
  let mediaMocks: MediaMocksState;

  beforeEach(() => {
    mediaMocks = setupMediaMocks();
  });

  afterEach(() => {
    teardownMediaMocks(mediaMocks);
  });

  it("starts recording", () => {
    const recorder = new MediaRecorder(new MediaStream());
    recorder.start();
    expect(recorder.start).toHaveBeenCalled();
  });
});
```

### Gemini Mocks

For AI conversation components:

```typescript
import { createMockGeminiSession, MockGeminiSession } from "@/test/mocks";

// Simple mock
const session = createMockGeminiSession();
await session.send({ text: "Hello" });
expect(session.send).toHaveBeenCalled();

// Full-featured mock class
const session = new MockGeminiSession();
session.setResponseHandler((msg) => ({ text: `Echo: ${msg.text}` }));
```

### Prisma Mocks

For database interactions:

```typescript
import { createMockPrismaClient, MockPrismaClient } from "@/test/mocks";

// Simple mock
const prisma = createMockPrismaClient();
prisma.user.findUnique.mockResolvedValue({ id: "123", name: "Test" });

// Full-featured mock class
const prisma = new MockPrismaClient();
prisma.user.findMany.mockResolvedValue([user1, user2]);
```

## Rendering Components

Always use `renderWithProviders` for component tests:

```typescript
import { renderWithProviders, screen } from "@/test/utils";

it("renders component", () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
```

This wraps components with SessionProvider and other required providers.

## Global Setup

The `setup.tsx` file provides automatic mocks for:

- **next/navigation**: `useRouter`, `usePathname`, `useSearchParams`, `useParams`
- **next/image**: Renders as standard `<img>`
- **next/link**: Renders as standard `<a>`
- **window.matchMedia**: Always returns `matches: false`
- **IntersectionObserver**: No-op observer
- **ResizeObserver**: No-op observer
- **URL.createObjectURL/revokeObjectURL**: Returns mock blob URLs

## Patterns

### Test Organization

```typescript
describe("ComponentName", () => {
  describe("rendering", () => {
    it("renders with default props", () => {});
    it("renders with custom props", () => {});
  });

  describe("interactions", () => {
    it("handles click events", () => {});
    it("handles form submission", () => {});
  });

  describe("edge cases", () => {
    it("handles empty data", () => {});
    it("handles error states", () => {});
  });
});
```

### Testing Async Behavior

```typescript
import { waitFor } from "@testing-library/react";

it("loads data asynchronously", async () => {
  renderWithProviders(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText("Loaded")).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import { userEvent } from "@/test/utils";

it("handles button click", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();

  renderWithProviders(<Button onClick={onClick} />);
  await user.click(screen.getByRole("button"));

  expect(onClick).toHaveBeenCalled();
});
```

## E2E Testing with agent-browser

For visual testing and E2E tests of assessment pages, use the seeded test data.

### Setup

```bash
# 1. Seed the database (creates test users + fixed assessment IDs)
npx tsx prisma/seed.ts

# 2. Start dev server with screen recording bypass
# Option A: Skip just screen recording (recommended for RF-001)
NEXT_PUBLIC_SKIP_SCREEN_RECORDING=true npm run dev

# Option B: Full E2E mode (bypasses all test guards)
E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev
```

### Test Fixtures (RF-001)

Use the fixtures from `src/test/fixtures.ts`:

```typescript
import {
  TEST_RECRUITER,
  TEST_CANDIDATE,
  TEST_SCENARIO_ID,
  TEST_ASSESSMENT_IDS,
} from "@/test/fixtures";
```

### Test Users

| Role      | Email              | Password        |
| --------- | ------------------ | --------------- |
| Admin     | admin@test.com     | testpassword123 |
| User      | user@test.com      | testpassword123 |
| Recruiter | recruiter@test.com | testpassword123 |
| Candidate | candidate@test.com | testpassword123 |

### Fixed Test Assessment IDs

These IDs are created by the seed script and can be used for predictable E2E testing:

| ID                                 | Status     | Owner              | URL                                                 |
| ---------------------------------- | ---------- | ------------------ | --------------------------------------------------- |
| `test-assessment-chat`             | WORKING    | user@test.com      | `/assessment/test-assessment-chat/chat`             |
| `test-assessment-welcome`          | ONBOARDING | candidate@test.com | `/assessment/test-assessment-welcome`               |
| `test-assessment-working-recruiter`| WORKING    | candidate@test.com | `/assessment/test-assessment-working-recruiter/chat`|

### Test Scenarios

| ID                      | Company                | Name                           |
| ----------------------- | ---------------------- | ------------------------------ |
| `default-scenario`      | TechFlow Inc.          | Full-Stack Feature Implementation |
| `test-scenario-recruiter` | Test Recruiter Company | Frontend Developer Assessment  |

### Visual Testing Workflow

```bash
# Login and take screenshot of chat page
agent-browser open "http://localhost:3000/sign-in" --session "e2e"
agent-browser fill "#email" "user@test.com" --session "e2e"
agent-browser fill "#password" "testpassword123" --session "e2e"
agent-browser click "button[type='submit']" --session "e2e"
agent-browser wait 3000 --session "e2e"

# Navigate to chat page (fixed assessment ID)
agent-browser open "http://localhost:3000/assessment/test-assessment-chat/chat" --session "e2e"
agent-browser wait 2000 --session "e2e"
agent-browser screenshot ./screenshots/chat-page.png --session "e2e"
```

### Adding New Test Assessments

To add more fixed test assessments for different pages/statuses, update `prisma/seed.ts`:

```typescript
const TEST_ASSESSMENT_IDS = {
  chat: "test-assessment-chat",        // Status: WORKING
  defense: "test-assessment-defense",  // Status: FINAL_DEFENSE (add this)
};
```

Then create the assessment with `prisma.assessment.upsert()` using the fixed ID.

## Gotchas

1. **JSX in test files**: Use `.tsx` extension, not `.ts`
2. **Import order**: Import from `@/test/*` not relative paths from components
3. **Async mocks**: Always `await` async operations
4. **Mock cleanup**: Reset mocks in `afterEach` if they hold state
5. **Provider wrapping**: Use `renderWithProviders`, not bare `render`
6. **Screen recording bypass**: Use `NEXT_PUBLIC_SKIP_SCREEN_RECORDING=true` or `NEXT_PUBLIC_E2E_TEST_MODE=true`
7. **Test fixtures**: Import from `@/test/fixtures` for consistent test data constants
