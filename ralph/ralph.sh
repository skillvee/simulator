#!/bin/bash
set -e

# Use Max subscription, not API credits
unset ANTHROPIC_API_KEY

# Configuration
POLL_INTERVAL="${RALPH_POLL_INTERVAL:-60}"  # seconds between checks when idle
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

echo "🚀 Ralph starting (continuous mode, poll interval: ${POLL_INTERVAL}s)"
echo "   Press Ctrl+C to stop"

ITERATION=0

while true; do
  # Fetch oldest open issue
  ISSUE=$(gh issue list --state open --json number,title,body --limit 100 | jq 'sort_by(.number) | .[0] // empty')

  # If no issues, wait and poll again
  if [ -z "$ISSUE" ]; then
    echo "💤 No tasks found. Waiting ${POLL_INTERVAL}s before next check... ($(date '+%H:%M:%S'))"
    sleep "$POLL_INTERVAL"
    continue
  fi

  ITERATION=$((ITERATION + 1))
  ISSUE_NUM=$(echo "$ISSUE" | jq -r '.number')
  ISSUE_TITLE=$(echo "$ISSUE" | jq -r '.title')
  ISSUE_BODY=$(echo "$ISSUE" | jq -r '.body')

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 Iteration $ITERATION: Issue #$ISSUE_NUM - $ISSUE_TITLE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Build the prompt with context
  PROMPT="$(cat "$SCRIPT_DIR/prompt.md")

## Current Task
**Issue #$ISSUE_NUM**: $ISSUE_TITLE

$ISSUE_BODY

## Previous Learnings
$(cat "$SCRIPT_DIR/progress.md" 2>/dev/null || echo 'No previous learnings yet.')"

  # Spawn Claude with context
  claude --dangerously-skip-permissions -p "$PROMPT"

  echo ""
  echo "✅ Iteration $ITERATION complete"
  sleep 2
done
