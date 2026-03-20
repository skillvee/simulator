# Ralph - GitHub Issues Task Runner

Autonomous AI agent loop that processes GitHub Issues one by one.

## Usage

```bash
# Run continuously (default: checks every 60s when idle)
./ralph/ralph.sh

# Custom poll interval (30 seconds)
RALPH_POLL_INTERVAL=30 ./ralph/ralph.sh

# Stop with Ctrl+C
```

## Setup

1. Create issues in the repo with the `task` label
2. Each issue = one bite-sized task
3. Run ralph - it processes issues continuously

## How It Works

1. Fetches highest priority open issue with `task` label (P0 → P1 → P2 → no priority), oldest first within each priority
2. Spawns fresh Claude instance with issue context
3. Claude implements, tests, and commits
4. Commit message `Closes #N` auto-closes issue
5. Learnings saved as structured comments on the issue
6. Polls for new issues (configurable interval)
7. Runs forever until stopped with Ctrl+C

## Files

- `ralph.sh` - Main orchestrator
- `prompt.md` - Instructions for each Claude iteration

## Available Tools

Ralph has access to the following skills and tools:

### Frontend Design

When building UI components, the `frontend-design` skill activates automatically. It creates distinctive interfaces using the modern blue theme with shadcn/ui.

### Agent-Browser (Visual Testing)

For tasks involving web UIs, use agent-browser for E2E and visual testing. See `.claude/skills/agent-browser/SKILL.md` for full documentation.

```bash
agent-browser open "http://localhost:3000"
agent-browser screenshot ./screenshots/page.png
agent-browser snapshot  # Get accessibility tree
agent-browser click "button.submit"
agent-browser fill "#input" "text"
```

Use `--session "ralph"` flag across commands to maintain browser state (login sessions, etc.).
