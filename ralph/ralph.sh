#!/bin/bash

# Use Max subscription, not API credits
unset ANTHROPIC_API_KEY

# Configuration
POLL_INTERVAL="${RALPH_POLL_INTERVAL:-60}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

# Ensure we're always on origin/main, not a fork
git fetch origin
git checkout main
git reset --hard origin/main

echo "Ralph starting (continuous mode, poll interval: ${POLL_INTERVAL}s)"
echo "   Press Ctrl+C to stop"

ITERATION=0

while true; do
  # Fetch highest priority open issue (P0 > P1 > P2 > no priority), oldest first
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
    echo "No tasks found. Waiting ${POLL_INTERVAL}s... ($(date '+%H:%M:%S'))"
    sleep "$POLL_INTERVAL"
    continue
  fi

  # Reset to origin/main before each iteration to avoid drift
  git fetch origin
  git checkout main
  git reset --hard origin/main

  ITERATION=$((ITERATION + 1))
  ISSUE_NUM=$(echo "$ISSUE" | jq -r '.number')
  ISSUE_TITLE=$(echo "$ISSUE" | jq -r '.title')
  ISSUE_BODY=$(echo "$ISSUE" | jq -r '.body')

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Iteration $ITERATION: Issue #$ISSUE_NUM - $ISSUE_TITLE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Build the prompt
  PROMPT="$(cat "$SCRIPT_DIR/prompt.md")

## Current Task
**Issue #$ISSUE_NUM**: $ISSUE_TITLE

$ISSUE_BODY

## Previous Learnings
Read \`ralph/progress.md\` for learnings from previous iterations."

  # Run Claude with hang recovery
  # See: https://github.com/anthropics/claude-code/issues/19060
  LOG_FILE="/tmp/ralph-iteration-$ITERATION.log"
  > "$LOG_FILE"

  # Run Claude with stream-json to detect completion
  claude --dangerously-skip-permissions -p "$PROMPT" --output-format stream-json --verbose > "$LOG_FILE" 2>&1 &
  CLAUDE_PID=$!

  echo "Running Claude (PID: $CLAUDE_PID)..."

  # Stream output in background for real-time display
  {
    tail -f "$LOG_FILE" 2>/dev/null | while IFS= read -r line; do
      # Show text deltas (streaming output)
      if [[ "$line" == *'content_block_delta'* ]] && [[ "$line" == *'"text"'* ]]; then
        echo -n "$(echo "$line" | jq -r '.delta.text // empty' 2>/dev/null)"
      fi
    done
  } &
  TAIL_PID=$!

  # Monitor for completion - the key fix for the hang bug
  # The "type":"result" message is emitted BEFORE the hang occurs
  while kill -0 $CLAUDE_PID 2>/dev/null; do
    if grep -q '"type":"result"' "$LOG_FILE" 2>/dev/null; then
      echo ""
      echo "Result received, waiting for graceful exit..."
      sleep 2
      if kill -0 $CLAUDE_PID 2>/dev/null; then
        echo "Claude hung after completion, killing process..."
        kill $CLAUDE_PID 2>/dev/null
      fi
      break
    fi
    sleep 0.5
  done

  # Cleanup
  kill $TAIL_PID 2>/dev/null 2>&1
  wait $CLAUDE_PID 2>/dev/null
  wait $TAIL_PID 2>/dev/null 2>&1

  echo ""
  echo "Log saved to: $LOG_FILE"

  # Check if we got a result
  if grep -q '"type":"result"' "$LOG_FILE" 2>/dev/null; then
    echo "Session completed (detected via stream-json)"
  else
    echo "Session ended without result message"
  fi

  # Check if issue is now closed (source of truth)
  ISSUE_STATE=$(gh issue view "$ISSUE_NUM" --json state -q '.state' 2>/dev/null || echo "UNKNOWN")
  if [ "$ISSUE_STATE" = "CLOSED" ]; then
    echo "Issue #$ISSUE_NUM closed successfully"
  else
    echo "Issue #$ISSUE_NUM still open - will retry next run"
  fi

  sleep 2
done
