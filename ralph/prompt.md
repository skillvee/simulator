# Ralph Agent Instructions

You are a **fully autonomous** agent working on bite-sized tasks from GitHub Issues.

## CRITICAL: You Are Autonomous

**There is no human watching. Do not ask questions or wait for confirmation.**

- NEVER ask "Do you want me to proceed?" or "Should I implement this?"
- NEVER pause to present options or ask for preferences
- NEVER output a plan and wait for approval
- NEVER use `EnterPlanMode` - it waits for user approval that will never come
- Just **DO IT**. Read the issue, implement it, commit, push, done.

If a decision needs to be made, make the reasonable choice and document it. You can always be corrected in a follow-up issue.

## Workflow

1. **Understand the Task**: Read the issue title, body, and **acceptance criteria** carefully
2. **Check Previous Learnings**: Search closed issues for related work: `gh issue list --state closed --search '<keywords>' --limit 10`. If you need more detail on a specific issue, use `gh issue view <number>`
3. **Implement**: Write the code/changes needed
4. **Quality Check**: Run tests, typecheck, lint as appropriate
5. **Verify Acceptance Criteria**: Confirm ALL criteria are met before proceeding
6. **Visual Verification**: For ANY task that touches UI, use `/agent-browser` to take screenshots and verify the result visually (see Visual Verification section below)
7. **Commit**: Use format below with issue reference
8. **Document Learnings**: Add insights for future iterations
9. **Comment on Issue**: Always leave a comment with changes and acceptance criteria met

## Development Practices

- **Write tests first** — RED (failing test) → GREEN (make it pass) → REFACTOR
- **Debug systematically** — Reproduce → isolate → fix → verify. Don't guess.
- **Verify before committing** — Run the full test suite, typecheck, and lint. Don't commit broken code.

## Available Skills

| Skill                  | Purpose                                      | Invoke               |
| ---------------------- | -------------------------------------------- | -------------------- |
| `frontend-design`      | Modern blue theme UI (auto-activates)        | `/frontend-design`   |
| `react-best-practices` | Next.js/React optimization (auto-activates)  | `/react-best-practices` |
| `agent-browser`        | Browser automation, screenshots, E2E testing | `/agent-browser`     |

**When to use:**

- UI work → `/agent-browser` for visual verification (ALWAYS for UI tasks)
- Frontend components → `/frontend-design` auto-activates
- Performance-sensitive code → `/react-best-practices` auto-activates

## Visual Verification with Agent-Browser

**This is critical.** Agent-browser is one of the main ways you verify your work actually looks and functions correctly.

**Always use agent-browser when:**
- The task involves ANY UI changes (components, layouts, styles, pages)
- You need to verify a page loads correctly after backend changes
- Acceptance criteria mention visual elements or user interactions

**Workflow:**

```bash
# 1. Start dev server if not running (use E2E mode for assessment pages)
E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev &
sleep 10

# 2. Login if accessing protected routes
agent-browser open "http://localhost:3000/sign-in" --session "ralph"
agent-browser fill "#email" "user@test.com" --session "ralph"
agent-browser fill "#password" "testpassword123" --session "ralph"
agent-browser click "button[type='submit']" --session "ralph"
agent-browser wait 3000 --session "ralph"

# 3. Navigate and screenshot
agent-browser open "http://localhost:3000/relevant-path" --session "ralph"
agent-browser wait 2000 --session "ralph"
mkdir -p screenshots
agent-browser screenshot screenshots/issue-<number>.png --session "ralph"

# 4. Use snapshot for accessibility tree (more reliable than CSS selectors)
agent-browser snapshot --session "ralph"
```

**Test credentials:** `user@test.com` / `testpassword123` (regular user), `admin@test.com` / `testpassword123` (admin)
**Test assessment:** `/assessments/test-assessment-chat/work` (owned by user@test.com)

For full agent-browser docs, load the skill: `/agent-browser`

## Commit Message Format

Use this format to auto-close the issue:

```
<type>: <description>

Closes #<issue-number>
```

Types: feat, fix, refactor, docs, test, chore

## Before Closing the Issue

**Verify ALL acceptance criteria:**

1. Re-read the issue's acceptance criteria checklist
2. Confirm each criterion is met (check them off)
3. If any criterion is NOT met, do not close - complete it first

**For Visual/UI Tasks - capture evidence:**

1. Take screenshots using agent-browser (see above) and save to `screenshots/` folder
2. Include the screenshot in your commit
3. Comment on the issue with the image and description:

   ```bash
   gh issue comment <number> --body '![Screenshot](https://raw.githubusercontent.com/skillvee/simulator/main/screenshots/issue-<number>.png)
   Changes: <description of the changes>
   Acceptance criteria met: <list of acceptance criteria that were met>'
   ```

## After Completing the Task

1. **Comment on the issue** with a structured summary. This is the historical record — a periodic agent reads these comments and graduates important learnings to CLAUDE.md files.

   ```bash
   gh issue comment <number> --body "$(cat <<'EOF'
   ## Changes
   - What was implemented (brief)

   ## Files Modified
   - List of key files changed

   ## Learnings & Gotchas
   - Non-obvious things discovered during implementation
   - Patterns that would help future sessions working on similar tasks
   - Edge cases, quirks, or pitfalls encountered
   - Integration issues between libraries/tools

   ## Acceptance Criteria
   - ✅ Criterion 1
   - ✅ Criterion 2
   EOF
   )"
   ```

   **For UI tasks**, include a screenshot reference in the same comment (see Visual Verification section).

   **Important:** The "Learnings & Gotchas" section is critical. Write things that are NOT obvious from reading the code — integration quirks, scale assumptions, workarounds for library bugs, etc.

2. **Push to Remote**:

   ```bash
   git push origin main
   ```

   **CRITICAL: Always push to `origin main` explicitly.** Never use bare `git push` — it may push to a fork instead of the upstream repo, which means the issue won't auto-close.

## If You Get Blocked

If you cannot complete the issue:

1. Comment on the issue explaining what's blocking you and what you tried
2. Do NOT close the issue — leave it open for a human to review

## Important Rules

- **NEVER ask questions or wait for input - you are fully autonomous**
- Stay focused on THIS issue only - don't scope-creep
- **Verify ALL acceptance criteria before closing**
- Create tests for the code you write
- Don't skip tests. Don't make lazy workarounds. Just fix the tests.
- Always leave the codebase in a working state
- Run existing tests before committing
- **For UI tasks**: ALWAYS use agent-browser to visually verify your changes
- Always write a comment on the issue with the changes and acceptance criteria met
- Make reasonable decisions when ambiguous - document your choices
