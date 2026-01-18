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
  # Fetch highest priority open issue (P0 > P1 > P2 > no priority), oldest first within each bucket
  ISSUE=$(gh issue list --state open --json number,title,body,labels --limit 100 | jq '
    map(. + {
      priority_order: (
        .labels | map(.name) |
        if any(. == "P0") then 0
        elif any(. == "P1") then 1
        elif any(. == "P2") then 2
        else 999
        end
      )
    }) | sort_by(.priority_order, .number) | .[0] // empty
  ')

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

  # Build the prompt with context (keep it small - Claude reads progress.md directly)
  PROMPT="$(cat "$SCRIPT_DIR/prompt.md")

## Current Task
**Issue #$ISSUE_NUM**: $ISSUE_TITLE

$ISSUE_BODY

## Previous Learnings
Read \`ralph/progress.md\` for learnings from previous iterations."

  # Spawn Claude with context (capture exit code for debugging)
  LOG_FILE="/tmp/ralph-iteration-$ITERATION.log"
  set +e  # Don't exit on error
  claude --dangerously-skip-permissions --verbose -p "$PROMPT" 2>&1 | tee "$LOG_FILE"
  EXIT_CODE=${PIPESTATUS[0]}
  set -e

  echo ""
  echo "📋 Claude exited with code: $EXIT_CODE"
  echo "📝 Log saved to: $LOG_FILE"

  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Iteration $ITERATION complete"
  else
    echo "⚠️  Iteration $ITERATION: Claude exited with error (work may still be done)"
    echo "   Check $LOG_FILE for details"
  fi
  sleep 2
done
