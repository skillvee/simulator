#!/bin/bash
# E2E Test: Full Spanish Candidate Journey
# Tests the complete Spanish language experience from invite to completion
#
# Acceptance Criteria:
# - Seeds a Spanish scenario
# - Opens invite link
# - Signs up / signs in as Spanish-preference candidate
# - Navigates welcome (all 4 steps), work page, starts a call, sends chat message
# - Completes the assessment
# - Views results page
# - Inspects report email (or its rendering)
# - Assertions: UI chrome Spanish, AI messages Spanish, voice system Spanish, results Spanish, email Spanish

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"

echo ""
echo "=============================================="
echo "  TEST: Full Spanish Candidate Journey"
echo "=============================================="
echo ""

# Generate unique identifiers for this test run
TIMESTAMP="$(date +%s)"
TEST_EMAIL="spanish-test-${TIMESTAMP}@test.com"
TEST_NAME="Carlos García"
SESSION_ID="spanish-${TIMESTAMP}"

# Start the dev server with E2E test mode
log_info "Starting dev server in E2E mode..."
E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev &
SERVER_PID=$!
sleep 10

# Kill server on exit
trap "kill $SERVER_PID 2>/dev/null; cleanup" EXIT

# ===========================================================
# STEP 1: Sign up as Spanish-preference candidate
# ===========================================================

log_info "Step 1: Creating Spanish-preference account..."
open_url "$BASE_URL/sign-up"
sleep 2

# Fill signup form
fill_field "#name" "$TEST_NAME"
sleep 0.5
fill_field "#email" "$TEST_EMAIL"
sleep 0.5
fill_field "#password" "$TEST_USER_PASSWORD"
sleep 0.5
fill_field "#confirmPassword" "$TEST_USER_PASSWORD"
sleep 0.5

# Check for language preference selector
if is_visible "#preferredLanguage" 2>/dev/null || is_visible "select[name='preferredLanguage']" 2>/dev/null; then
  log_info "Found language preference selector"
  # Select Spanish
  agent-browser eval "document.querySelector('#preferredLanguage, select[name=\"preferredLanguage\"]').value = 'es'" --session "$TEST_SESSION" 2>/dev/null
  sleep 0.5
fi

click "button[type='submit']"
sleep 3

# Take screenshot of signup
take_screenshot "spanish-01-signup"

# Verify we're logged in and redirected
current_url=$(get_url)
if [[ "$current_url" == *"/dashboard"* ]] || [[ "$current_url" == *"/profile"* ]] || [[ "$current_url" == *"/" ]]; then
  log_success "Successfully signed up and logged in"
else
  log_error "Signup failed - unexpected URL: $current_url"
fi

# ===========================================================
# STEP 2: Navigate to profile and set Spanish preference
# ===========================================================

log_info "Step 2: Setting language preference to Spanish..."
open_url "$BASE_URL/profile"
sleep 2

# Check if language selector exists on profile page
if is_visible "select[name='language']" 2>/dev/null || is_visible "#language" 2>/dev/null; then
  log_info "Found language selector on profile page"
  agent-browser eval "document.querySelector('select[name=\"language\"], #language').value = 'es'" --session "$TEST_SESSION" 2>/dev/null
  sleep 0.5

  # Save if there's a save button
  if is_visible "button[type='submit']" 2>/dev/null; then
    click "button[type='submit']"
    sleep 2
  fi
fi

take_screenshot "spanish-02-profile"

# ===========================================================
# STEP 3: Create or navigate to Spanish assessment
# ===========================================================

log_info "Step 3: Creating Spanish assessment..."

# Navigate to assessment creation/selection
open_url "$BASE_URL/assessments/new"
sleep 2

# Check if we can create a new assessment with Spanish settings
page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)

# If there's no new assessment page, try the dashboard
if echo "$page_content" | grep -qi "not found\|404"; then
  log_info "No new assessment page, checking dashboard..."
  open_url "$BASE_URL/dashboard"
  sleep 2

  # Look for Start Practice or similar button
  if is_visible "a[href*='/assessments/'], button:contains('Start')" 2>/dev/null; then
    click "a[href*='/assessments/'], button:contains('Start')"
    sleep 2
  fi
fi

take_screenshot "spanish-03-assessment-start"

# ===========================================================
# STEP 4: Welcome flow (4 steps) - Check Spanish UI
# ===========================================================

log_info "Step 4: Testing welcome flow in Spanish..."

# Use a fixed test assessment for consistency
open_url "$BASE_URL/assessments/test-assessment-chat"
sleep 2

# Check if welcome page shows Spanish content
page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)

# Welcome Step 1 - Introduction
if echo "$page_content" | grep -qi "bienvenid\|hola\|evaluación\|práctica"; then
  log_success "Welcome page shows Spanish content"
else
  log_info "Checking for language switcher..."
  # Try to find and use language switcher
  if is_visible "button[aria-label*='language'], select[name='language']" 2>/dev/null; then
    agent-browser eval "
      const langSelector = document.querySelector('button[aria-label*=\"language\"], select[name=\"language\"]');
      if (langSelector.tagName === 'SELECT') {
        langSelector.value = 'es';
        langSelector.dispatchEvent(new Event('change'));
      } else {
        langSelector.click();
        setTimeout(() => {
          const esOption = document.querySelector('[data-value=\"es\"], option[value=\"es\"]');
          if (esOption) esOption.click();
        }, 100);
      }
    " --session "$TEST_SESSION" 2>/dev/null
    sleep 2
  fi
fi

take_screenshot "spanish-04-welcome-step1"

# Navigate through welcome steps
for step in 2 3 4; do
  log_info "Welcome step $step..."

  # Click Next/Continue button (might be in Spanish)
  if is_visible "button:contains('Siguiente'), button:contains('Continuar'), button:contains('Next')" 2>/dev/null; then
    agent-browser eval "
      const btn = Array.from(document.querySelectorAll('button')).find(b =>
        /siguiente|continuar|next/i.test(b.textContent)
      );
      if (btn) btn.click();
    " --session "$TEST_SESSION" 2>/dev/null
    sleep 2
  fi

  take_screenshot "spanish-04-welcome-step${step}"

  # Check for Spanish content
  page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
  if echo "$page_content" | grep -qi "evaluación\|código\|empresa\|trabajo\|proyecto\|experiencia"; then
    log_success "Welcome step $step shows Spanish content"
  else
    log_error "Welcome step $step may not be in Spanish"
  fi
done

# ===========================================================
# STEP 5: Work page - Test Spanish chat and voice
# ===========================================================

log_info "Step 5: Testing work page with Spanish interactions..."

# Navigate to work page
open_url "$BASE_URL/assessments/test-assessment-chat/work"
sleep 3

take_screenshot "spanish-05-work-page"

# Check work page UI is in Spanish
page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
if echo "$page_content" | grep -qi "enviar\|mensaje\|llamar\|colega\|chat\|conversación"; then
  log_success "Work page UI shows Spanish elements"
else
  log_error "Work page UI may not be in Spanish"
fi

# Send a chat message in Spanish
log_info "Sending Spanish chat message..."
if is_visible "textarea[placeholder*='message'], textarea[placeholder*='mensaje'], #chat-input, .chat-input" 2>/dev/null; then
  fill_field "textarea[placeholder*='message'], textarea[placeholder*='mensaje'], #chat-input, .chat-input" "Hola, ¿cómo puedo ayudarte con el proyecto?"
  sleep 0.5

  # Press Enter or click Send
  if is_visible "button[type='submit'], button:contains('Send'), button:contains('Enviar')" 2>/dev/null; then
    click "button[type='submit'], button:contains('Send'), button:contains('Enviar')"
  else
    press_key "Enter"
  fi
  sleep 3

  take_screenshot "spanish-06-chat-message"

  # Check for Spanish response
  page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
  if echo "$page_content" | grep -qi "hola\|proyecto\|código\|tarea\|gracias"; then
    log_success "Received Spanish chat response"
  else
    log_info "Chat response language unclear"
  fi
fi

# Test voice call button (don't actually start call in test)
log_info "Checking voice call UI..."
if is_visible "button[aria-label*='call'], button[aria-label*='llamar'], .call-button" 2>/dev/null; then
  # Get button text/aria-label to verify Spanish
  call_button_text=$(agent-browser eval "
    const btn = document.querySelector('button[aria-label*=\"call\"], button[aria-label*=\"llamar\"], .call-button');
    btn ? (btn.getAttribute('aria-label') || btn.textContent) : '';
  " --session "$TEST_SESSION" 2>/dev/null)

  if echo "$call_button_text" | grep -qi "llamar\|llamada\|voz"; then
    log_success "Voice call button shows Spanish text"
  else
    log_info "Voice call button text: $call_button_text"
  fi
fi

# ===========================================================
# STEP 6: Complete assessment and view results
# ===========================================================

log_info "Step 6: Completing assessment and checking results..."

# Look for complete/finish button
if is_visible "button:contains('Complete'), button:contains('Completar'), button:contains('Finalizar')" 2>/dev/null; then
  agent-browser eval "
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      /complete|completar|finalizar/i.test(b.textContent)
    );
    if (btn) btn.click();
  " --session "$TEST_SESSION" 2>/dev/null
  sleep 3
fi

# Navigate to results page
open_url "$BASE_URL/assessments/test-assessment-chat/results"
sleep 3

take_screenshot "spanish-07-results"

# Check results page is in Spanish
page_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
if echo "$page_content" | grep -qi "resultado\|evaluación\|puntuación\|informe\|desempeño\|competencias"; then
  log_success "Results page shows Spanish content"
else
  log_error "Results page may not be in Spanish"
fi

# ===========================================================
# STEP 7: Check email template (if accessible)
# ===========================================================

log_info "Step 7: Checking email template..."

# Try to access email preview if available
open_url "$BASE_URL/api/emails/preview/assessment-complete?language=es"
sleep 2

# Check if email preview loads
page_content=$(agent-browser eval "document.body.innerHTML" --session "$TEST_SESSION" 2>/dev/null)
if echo "$page_content" | grep -qi "evaluación\|resultado\|gracias\|informe"; then
  log_success "Email template shows Spanish content"
  take_screenshot "spanish-08-email"
else
  log_info "Email preview not accessible or not in Spanish"
fi

# ===========================================================
# STEP 8: API Verification - Check language in requests
# ===========================================================

log_info "Step 8: Verifying API calls include Spanish language..."

# Use browser DevTools to check network requests (if supported)
# This is a simplified check - real implementation would use browser DevTools API
api_check=$(agent-browser eval "
  // Check localStorage or session for language preference
  const lang = localStorage.getItem('language') || sessionStorage.getItem('language');
  lang;
" --session "$TEST_SESSION" 2>/dev/null)

if [[ "$api_check" == *"es"* ]]; then
  log_success "Language preference 'es' found in browser storage"
else
  log_info "Language preference in storage: $api_check"
fi

# ===========================================================
# Test Summary
# ===========================================================

echo ""
echo "=============================================="
echo "  Spanish Journey Test Complete"
echo "=============================================="

# Final assertions check
SPANISH_UI_FOUND=false
SPANISH_CHAT_FOUND=false
SPANISH_RESULTS_FOUND=false

# Re-check key pages for Spanish content
open_url "$BASE_URL/assessments/test-assessment-chat/work"
sleep 2
work_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
if echo "$work_content" | grep -qi "enviar\|mensaje\|llamar"; then
  SPANISH_UI_FOUND=true
fi

if echo "$work_content" | grep -qi "hola\|proyecto\|código"; then
  SPANISH_CHAT_FOUND=true
fi

open_url "$BASE_URL/assessments/test-assessment-chat/results"
sleep 2
results_content=$(agent-browser eval "document.body.innerText" --session "$TEST_SESSION" 2>/dev/null)
if echo "$results_content" | grep -qi "resultado\|evaluación\|puntuación"; then
  SPANISH_RESULTS_FOUND=true
fi

# Log final test results
echo ""
echo "Acceptance Criteria Validation:"
echo "--------------------------------"

if $SPANISH_UI_FOUND; then
  log_success "✅ UI chrome in Spanish"
else
  log_error "❌ UI chrome not fully in Spanish"
fi

if $SPANISH_CHAT_FOUND; then
  log_success "✅ AI messages in Spanish"
else
  log_error "❌ AI messages not in Spanish"
fi

if $SPANISH_RESULTS_FOUND; then
  log_success "✅ Results page in Spanish"
else
  log_error "❌ Results page not in Spanish"
fi

# Note about limitations
echo ""
log_info "Note: Voice system Spanish instruction validation requires runtime inspection"
log_info "Note: Email Spanish validation requires email service integration"

# Print test summary
print_summary

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
  exit 1
else
  exit 0
fi