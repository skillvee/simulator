---
name: ralph
description: Convert PRDs into GitHub Issues for autonomous execution. Use when user says "create issues from PRD", "convert PRD to tasks", "run ralph", or wants to turn requirements into actionable GitHub issues with the task label.
user-invocable: true
---

# Ralph Issue Creator Skill

Convert Product Requirements Documents (PRDs) into GitHub Issues for Ralph to execute autonomously.

## Your Job

1. Read the PRD from `tasks/prd-[feature-name].md`
2. Convert each user story into a GitHub Issue
3. Create issues using `gh` CLI with proper labels and ordering

**Do NOT implement. Just create the issues.**

## Story Sizing - Critical Rule

**Each story must be completable in ONE Ralph iteration (one context window).**

Ralph operates with fresh context per iteration. Oversized stories result in incomplete work.

**Right-sized stories**:
- Add a database column with migration
- Create a single UI component
- Add one API endpoint
- Update server logic for one feature

**Too large - split these**:
- "Build the entire dashboard" → Split into individual components
- "Add authentication" → Split into: schema, login endpoint, logout endpoint, middleware, UI
- "Refactor the API" → Split into specific endpoints or layers

## Priority Labels

Ralph processes issues by priority: **P0 → P1 → P2 → no label** (oldest first within each priority).

Use priority labels for urgency:
- **P0**: Critical/blocking - must be done first
- **P1**: High priority - important but not blocking
- **P2**: Normal priority - standard work
- **No label**: Low priority - backlog items

## Dependency Ordering

Within the same priority, create issues in dependency order (Ralph processes oldest first):

1. **Schema/database changes** - Must exist before backend uses them
2. **Backend/server logic** - Must exist before UI calls them
3. **UI components** - Depend on backend being ready
4. **Integration/summary views** - Depend on all pieces existing

**Rule**: Earlier issues must NOT depend on later ones.

## Acceptance Criteria Standards

Criteria must be **verifiable**, not vague.

**Good criteria**:
- "Add status column to tasks table with default 'pending'"
- "Endpoint returns 200 with JSON body containing 'id' and 'name'"
- "Button is disabled when input is empty"
- "Tests pass"

**Bad criteria - avoid these**:
- "Works correctly"
- "Good UX"
- "Handles edge cases"
- "Is fast"

**Always include**:
- "Tests pass" (for any testable code)
- "Typecheck passes" (for TypeScript projects)

## Issue Format

Create each issue with this structure:

```bash
gh issue create \
  --title "US-001: [Story Title]" \
  --label "task" \
  --label "P1" \
  --body "$(cat <<'EOF'
## Description
As a [user type], I want [feature] so that [benefit].

## Acceptance Criteria
- [ ] Specific criterion 1
- [ ] Specific criterion 2
- [ ] Tests pass

## Context
[Any relevant context from the PRD]

## Dependencies
- Depends on: #[issue-number] (if applicable)
- Blocks: #[issue-number] (if applicable)
EOF
)"
```

## Conversion Process

1. **Read the PRD**: Load `tasks/prd-[feature-name].md`

2. **Identify stories**: Extract all user stories (US-001, US-002, etc.)

3. **Verify sizing**: Each story must be one-iteration sized
   - If too large, stop and ask user to split in the PRD

4. **Order by dependency**: Determine creation order

5. **Create issues**: Use `gh issue create` for each story
   - Add `task` label (required for Ralph to find them)
   - Add priority label (P0, P1, or P2) based on urgency
   - Include acceptance criteria as checklist
   - Reference dependencies between issues

6. **Report**: List all created issues with numbers

## Example Conversion

**PRD User Story**:
```markdown
### US-001: Add task status field
**Description**: As a user, I want tasks to have a status so I can track progress.

**Acceptance Criteria**:
- [ ] Add 'status' column to tasks table
- [ ] Default value is 'pending'
- [ ] Valid values: pending, in_progress, completed
- [ ] Migration runs without errors
```

**Created Issue**:
```bash
gh issue create \
  --title "US-001: Add task status field" \
  --label "task" \
  --label "P1" \
  --body "## Description
As a user, I want tasks to have a status so I can track progress.

## Acceptance Criteria
- [ ] Add 'status' column to tasks table
- [ ] Default value is 'pending'
- [ ] Valid values: pending, in_progress, completed
- [ ] Migration runs without errors

## Context
This is a schema change that must be completed before any backend or UI work that uses the status field."
```

## Pre-Creation Checklist

Before creating issues, verify:
- [ ] PRD exists at `tasks/prd-[feature-name].md`
- [ ] Each story is completable in one iteration
- [ ] Stories are ordered by dependency
- [ ] Priority labels assigned (P0, P1, P2) based on urgency
- [ ] Acceptance criteria are verifiable (not vague)
- [ ] "Tests pass" included where applicable
- [ ] No forward dependencies (earlier issues don't depend on later ones)

## After Creation

Report the created issues:

```
Created issues for PRD: [feature-name]

1. #123 - US-001: Add task status field
2. #124 - US-002: Create status update endpoint
3. #125 - US-003: Add status dropdown to task form

Run Ralph to process: ./ralph/ralph.sh
```
