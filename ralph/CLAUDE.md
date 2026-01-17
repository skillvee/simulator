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

1. Create issues in the repo
2. Each issue = one bite-sized task
3. Run ralph - it processes issues continuously

## How It Works

1. Fetches oldest open issue (any label)
2. Spawns fresh Claude instance with issue context
3. Claude implements, tests, and commits
4. Commit message `Closes #N` auto-closes issue
5. Learnings saved to `progress.md`
6. Polls for new issues (configurable interval)
7. Runs forever until stopped with Ctrl+C

## Files

- `ralph.sh` - Main orchestrator
- `prompt.md` - Instructions for each Claude iteration
- `progress.md` - Cumulative learnings across iterations

## Available Tools

Ralph has access to the following skills and tools:

### Frontend Design
When building UI components, the `frontend-design` skill activates automatically. It creates distinctive interfaces that avoid generic AI aesthetics (no Inter font, no purple gradients on white).

### Superpowers (TDD & Planning)
For complex tasks, use the superpowers workflow:
- Write tests first (RED), make them pass (GREEN), then refactor
- Use `/superpowers:brainstorm` before implementing new features

### Agent-Browser (Visual Testing)
For tasks involving web UIs, use agent-browser for E2E and visual testing:
```bash
agent-browser open "http://localhost:3000"
agent-browser screenshot ./tests/screenshot.png
agent-browser snapshot  # Get accessibility tree
agent-browser click "button.submit"
agent-browser fill "#input" "text"
```

Use this to verify UI changes work correctly and capture visual evidence.
