---
name: agent-browser
description: Browser automation and visual testing using agent-browser CLI. Use this skill for E2E testing, taking screenshots, interacting with web pages, and visual regression testing.
---

# Agent-Browser Skill

Headless browser automation CLI for visual testing, E2E testing, and web interactions.

## Prerequisites

Installed globally via `npm install -g agent-browser` with Chromium downloaded via `agent-browser install`.

## Core Commands

### Navigation & Screenshots

```bash
# Open a URL
agent-browser open "https://example.com"

# Take screenshot
agent-browser screenshot ./screenshots/page.png

# Save as PDF
agent-browser pdf ./output.pdf

# Get accessibility tree (best for AI understanding)
agent-browser snapshot
```

### Interactions

```bash
# Click element (use @ref from snapshot, or CSS selector)
agent-browser click "@ref123"
agent-browser click "button.submit"

# Type into input
agent-browser type "input[name=email]" "user@example.com"

# Fill (clears first)
agent-browser fill "#search" "query text"

# Select dropdown
agent-browser select "#country" "US"

# Check/uncheck
agent-browser check "#terms"
agent-browser uncheck "#newsletter"

# Wait for element or time
agent-browser wait "#loading"
agent-browser wait 2000
```

### Get Information

```bash
agent-browser get text ".message"
agent-browser get html "#content"
agent-browser get value "input#email"
agent-browser get attr "href" "a.link"
agent-browser get title
agent-browser get url
```

### Check State

```bash
agent-browser is visible ".modal"
agent-browser is enabled "button.submit"
agent-browser is checked "#remember-me"
```

## Visual Testing Workflow

1. **Capture baseline screenshots** before changes:

   ```bash
   agent-browser open "http://localhost:3000"
   agent-browser screenshot ./baseline/home.png
   ```

2. **After changes, capture new screenshots**:

   ```bash
   agent-browser open "http://localhost:3000"
   agent-browser screenshot ./current/home.png
   ```

3. **Compare visually** or use image diff tools

## Test User Credentials

Two test users are seeded in the database for E2E testing. Use these to access protected routes:

| Role  | Email          | Password        |
| ----- | -------------- | --------------- |
| Admin | admin@test.com | testpassword123 |
| User  | user@test.com  | testpassword123 |

**Note:** Run `npx tsx prisma/seed.ts` to create these users if they don't exist.

## Authentication Flow

Most pages require authentication. Login before accessing protected routes:

```bash
# Login as regular user
agent-browser open "http://localhost:3000/sign-in"
agent-browser fill "#email" "user@test.com"
agent-browser fill "#password" "testpassword123"
agent-browser click "button[type='submit']"
agent-browser wait 3000

# Now access protected pages (session cookie persists)
agent-browser open "http://localhost:3000/profile"
agent-browser screenshot ./screenshots/profile.png
```

```bash
# Login as admin (for /admin/* routes)
agent-browser open "http://localhost:3000/sign-in"
agent-browser fill "#email" "admin@test.com"
agent-browser fill "#password" "testpassword123"
agent-browser click "button[type='submit']"
agent-browser wait 3000

# Access admin pages
agent-browser open "http://localhost:3000/admin"
agent-browser screenshot ./screenshots/admin-dashboard.png
```

**Important:** Use the same `--session` flag across all commands to maintain the login session:

```bash
agent-browser open "http://localhost:3000/sign-in" --session "my-test"
agent-browser fill "#email" "user@test.com" --session "my-test"
# ... continue with same session
```

## E2E Test Example

```bash
# Login flow test
agent-browser open "http://localhost:3000/sign-in"
agent-browser fill "#email" "user@test.com"
agent-browser fill "#password" "testpassword123"
agent-browser click "button[type='submit']"
agent-browser wait 3000
agent-browser screenshot ./tests/login-success.png
```

## E2E Test Mode for Assessment Pages

Assessment pages (`/assessments/[id]/welcome`, `/work`, `/results`) require screen recording, which doesn't work in headless browsers.

To bypass screen recording for E2E tests, start the dev server with:

```bash
E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev
```

Then run your tests against that server. The screen recording modal will be skipped and fake recording segments will be created in the database.

**Note:** This only works in development mode (`NODE_ENV=development`). The bypass is disabled in production.

## Test Assessment IDs

After running `npx tsx prisma/seed.ts`, these test assessments are available:

| ID                   | Status  | Page URL                                         |
| -------------------- | ------- | ------------------------------------------------ |
| test-assessment-chat | WORKING | /assessments/test-assessment-chat/work           |

**Note:** The test assessment is owned by `user@test.com`, so you must login as that user first.

### Taking Screenshots of Chat/Sidebar Components

Complete workflow for visual verification of chat layout components:

```bash
# 1. Ensure database is seeded
npx tsx prisma/seed.ts

# 2. Start dev server with E2E mode (if not already running)
E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev &
sleep 10

# 3. Login as test user
agent-browser open "http://localhost:3000/sign-in" --session "visual-test"
agent-browser fill "#email" "user@test.com" --session "visual-test"
agent-browser fill "#password" "testpassword123" --session "visual-test"
agent-browser click "button[type='submit']" --session "visual-test"
agent-browser wait 3000 --session "visual-test"

# 4. Navigate to work page (uses fixed test assessment ID)
agent-browser open "http://localhost:3000/assessments/test-assessment-chat/work" --session "visual-test"
agent-browser wait 2000 --session "visual-test"

# 5. Take screenshot
mkdir -p screenshots
agent-browser screenshot ./screenshots/chat-page.png --session "visual-test"
```

This captures: SlackLayout sidebar, CoworkerSidebar, chat interface, and FloatingCallBar (if in call).

## Tips

- Use `snapshot` to get accessibility tree with element references (@ref) - more reliable than CSS selectors
- Screenshots help verify visual state during automated tests
- Chain commands in shell scripts for full test flows
- Use `--session` flag for isolated browser instances
