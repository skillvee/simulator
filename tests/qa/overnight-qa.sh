#!/bin/bash

# Overnight QA Runner
# Runs the QA skill N times sequentially, each as a fresh Claude session.
# Modeled after ralph.sh with the same hang-recovery pattern.
#
# Usage:
#   ./tests/qa/overnight-qa.sh          # 20 runs (default)
#   ./tests/qa/overnight-qa.sh 5        # 5 runs
#   QA_COOLDOWN=30 ./tests/qa/overnight-qa.sh  # 30s between runs

# Use Max subscription, not API credits
unset ANTHROPIC_API_KEY

# Configuration
TOTAL_RUNS="${1:-20}"
COOLDOWN="${QA_COOLDOWN:-15}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
LOG_DIR="$OUTPUT_DIR/overnight-logs"

cd "$REPO_ROOT"

mkdir -p "$LOG_DIR"

# Pre-flight: ensure .next build is fresh to avoid stale vendor chunk errors
if [ ! -d ".next/server" ] || [ "$(find .next/server -name '*.js' -newer node_modules/.package-lock.json 2>/dev/null | head -1)" = "" ]; then
  echo "Rebuilding .next (stale or missing build detected)..."
  npm run build 2>&1 | tail -5
  echo "Build complete."
fi

# Build the QA prompt from the skill file (strip YAML frontmatter so --- isn't parsed as CLI flags)
QA_PROMPT="$(awk '/^---$/{n++; next} n>=2' .claude/skills/qa/SKILL.md)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Overnight QA Runner"
echo "  Runs: $TOTAL_RUNS"
echo "  Cooldown: ${COOLDOWN}s between runs"
echo "  Started: $(date)"
echo "  Logs: $LOG_DIR/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

COMPLETED=0
FAILED=0

for i in $(seq 1 "$TOTAL_RUNS"); do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "QA Run $i/$TOTAL_RUNS — started at $(date '+%Y-%m-%d %H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  LOG_FILE="$LOG_DIR/run-$i.log"
  > "$LOG_FILE"

  # Run Claude with stream-json and hang recovery (same pattern as ralph.sh)
  claude --dangerously-skip-permissions -p "$QA_PROMPT" --output-format stream-json --verbose > "$LOG_FILE" 2>&1 &
  CLAUDE_PID=$!

  echo "Claude PID: $CLAUDE_PID | Log: $LOG_FILE"

  # Stream text output in background for visibility
  {
    tail -f "$LOG_FILE" 2>/dev/null | while IFS= read -r line; do
      if [[ "$line" == *'content_block_delta'* ]] && [[ "$line" == *'"text"'* ]]; then
        echo -n "$(echo "$line" | jq -r '.delta.text // empty' 2>/dev/null)"
      fi
    done
  } &
  TAIL_PID=$!

  # Monitor for completion with hang recovery
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

  # Check result
  if grep -q '"type":"result"' "$LOG_FILE" 2>/dev/null; then
    COMPLETED=$((COMPLETED + 1))
    echo "Run $i/$TOTAL_RUNS completed successfully"
  else
    FAILED=$((FAILED + 1))
    echo "Run $i/$TOTAL_RUNS ended without result"
  fi

  echo "Progress: $COMPLETED completed, $FAILED failed, $((TOTAL_RUNS - i)) remaining"
  echo "Log: $LOG_FILE"

  # Cooldown between runs (skip after last run)
  if [ "$i" -lt "$TOTAL_RUNS" ]; then
    echo "Cooling down ${COOLDOWN}s before next run..."
    sleep "$COOLDOWN"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Overnight QA Complete"
echo "  Finished: $(date)"
echo "  Completed: $COMPLETED/$TOTAL_RUNS"
echo "  Failed: $FAILED/$TOTAL_RUNS"
echo "  Logs: $LOG_DIR/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
