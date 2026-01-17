#!/bin/bash
# E2E Test: HR Interview Flow
# Tests the full flow: create account -> upload CV -> HR interview -> congratulations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo ""
echo "=================================="
echo "  TEST: HR Interview Flow"
echo "=================================="
echo ""

# Test-specific config
TEST_EMAIL="e2e-hr-$(date +%s)@example.com"
TEST_CV_PATH="$SCRIPT_DIR/../../docs/test-resume.pdf"

log_info "Test email: $TEST_EMAIL"
log_info "Test CV path: $TEST_CV_PATH"

# Verify CV exists
if [ ! -f "$TEST_CV_PATH" ]; then
  log_error "Test CV not found at: $TEST_CV_PATH"
  exit 1
fi

# ============================================
# Step 1: Create account
# ============================================
log_info "Step 1: Creating account..."
open_url "$BASE_URL/sign-up"
sleep 2

fill_field "#name" "$TEST_USER_NAME"
sleep 0.3
fill_field "#email" "$TEST_EMAIL"
sleep 0.3
fill_field "#password" "$TEST_USER_PASSWORD"
sleep 0.3
fill_field "#confirmPassword" "$TEST_USER_PASSWORD"
sleep 0.3
click "button[type='submit']"
sleep 3

current_url=$(get_url)
if echo "$current_url" | grep -qE "(^${BASE_URL}/?$|profile)"; then
  log_success "Account created successfully"
else
  log_error "Account creation failed - URL: $current_url"
  take_screenshot "hr-flow-account-failed"
  exit 1
fi

# ============================================
# Step 2: Start assessment
# ============================================
log_info "Step 2: Starting assessment..."
open_url "$BASE_URL/profile"
sleep 2

# Click "Start Practicing" or similar
click "a[href*='welcome']"
sleep 2

# If not found, try looking for any start button
current_url=$(get_url)
if echo "$current_url" | grep -q "welcome"; then
  log_success "Navigated to welcome page"
else
  # Try direct navigation to start
  log_info "Trying direct navigation to scenario selection..."
  open_url "$BASE_URL"
  sleep 2
  click "a[href*='sign-in']"
  sleep 2
fi

take_screenshot "hr-flow-welcome"

# Click continue/start on welcome page
click "a[href*='cv-upload'], button:has-text('Continue'), a:has-text('Continue')"
sleep 2

current_url=$(get_url)
log_info "After welcome - URL: $current_url"
take_screenshot "hr-flow-after-welcome"

# ============================================
# Step 3: Upload CV
# ============================================
log_info "Step 3: Uploading CV..."

# Navigate to CV upload if not already there
if ! echo "$current_url" | grep -q "cv-upload"; then
  # Find assessment ID from URL or page and navigate
  log_info "Looking for CV upload page..."
  # Try to extract assessment ID from current URL
  assessment_id=$(echo "$current_url" | grep -oE '[a-z0-9]{20,}')
  if [ -n "$assessment_id" ]; then
    open_url "$BASE_URL/assessment/$assessment_id/cv-upload"
    sleep 2
  fi
fi

current_url=$(get_url)
log_info "CV upload page URL: $current_url"
take_screenshot "hr-flow-cv-upload-page"

# Upload the CV file
log_info "Uploading CV file..."
agent-browser upload "input[type='file']" "$TEST_CV_PATH" --session "$TEST_SESSION" 2>/dev/null
sleep 5  # Wait for upload AND parsing (now synchronous)

take_screenshot "hr-flow-cv-uploading"

# Wait for redirect to HR interview or check for success
sleep 3
current_url=$(get_url)
log_info "After CV upload - URL: $current_url"

if echo "$current_url" | grep -q "hr-interview"; then
  log_success "CV uploaded and redirected to HR interview"
else
  log_info "Waiting for redirect to HR interview..."
  sleep 5
  current_url=$(get_url)
  if echo "$current_url" | grep -q "hr-interview"; then
    log_success "CV uploaded and redirected to HR interview"
  else
    log_error "Did not redirect to HR interview - URL: $current_url"
    take_screenshot "hr-flow-cv-no-redirect"
  fi
fi

take_screenshot "hr-flow-hr-interview-page"

# ============================================
# Step 4: Start HR Interview
# ============================================
log_info "Step 4: Starting HR interview..."

# Extract assessment ID for later
assessment_id=$(echo "$current_url" | grep -oE 'assessment/[^/]+' | cut -d'/' -f2)
log_info "Assessment ID: $assessment_id"

# Click "Start Interview" button
log_info "Clicking Start Interview button..."
click "button:has-text('Start Interview')"
sleep 3

take_screenshot "hr-flow-interview-started"

# Check connection state
log_info "Checking interview connection..."
sleep 2

# Look for "Connected" or "Listening" indicators
page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
if echo "$page_content" | grep -qi "connected\|listening\|speaking"; then
  log_success "Interview connected successfully"
else
  log_info "Interview connection state: checking..."
  take_screenshot "hr-flow-interview-connecting"
  sleep 5
fi

# ============================================
# Step 5: Wait for AI to speak and transcript to appear
# ============================================
log_info "Step 5: Waiting for AI to speak and transcript to appear..."

# Wait for AI to speak - the AI starts by introducing themselves
# This typically takes 5-10 seconds for the first response
log_info "Waiting for AI introduction..."
sleep 10

# Check for transcript content
page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
if echo "$page_content" | grep -qi "HR Interviewer\|Sarah Mitchell\|interview"; then
  log_success "Transcript content detected"
else
  log_info "Waiting longer for transcript..."
  sleep 10
  take_screenshot "hr-flow-waiting-transcript"
fi

# Check for "Speaking" indicator showing AI is responding
if echo "$page_content" | grep -qi "speaking"; then
  log_info "AI is speaking, waiting for completion..."
  sleep 5
fi

take_screenshot "hr-flow-transcript-captured"

# ============================================
# Step 6: End Interview
# ============================================
log_info "Step 6: Ending interview..."

# Click "End Interview" button
click "button:has-text('End Interview')"
sleep 5

take_screenshot "hr-flow-interview-ended"

# ============================================
# Step 7: Verify redirect to congratulations
# ============================================
log_info "Step 7: Verifying redirect to congratulations..."

current_url=$(get_url)
log_info "URL after ending interview: $current_url"

# Wait for any redirects to settle
sleep 3
current_url=$(get_url)
log_info "URL after settling: $current_url"

take_screenshot "hr-flow-final-page"

# Check final destination
if echo "$current_url" | grep -q "congratulations"; then
  log_success "Successfully redirected to congratulations page!"

  # Wait a bit more to ensure no redirect back
  sleep 5
  final_url=$(get_url)
  if echo "$final_url" | grep -q "congratulations"; then
    log_success "Stayed on congratulations page (no redirect back)"
  else
    log_error "REDIRECTED BACK from congratulations to: $final_url"
    take_screenshot "hr-flow-redirect-back"
  fi
elif echo "$current_url" | grep -q "hr-interview"; then
  log_error "Still on HR interview page - redirect failed"
  take_screenshot "hr-flow-still-on-hr"
else
  log_info "Unexpected URL: $current_url"
  take_screenshot "hr-flow-unexpected"
fi

# ============================================
# Debug: Check database state
# ============================================
log_info "Debug: Checking page content..."
page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
echo "Page content snippet:"
echo "$page_content" | head -20

# Print summary
print_summary
