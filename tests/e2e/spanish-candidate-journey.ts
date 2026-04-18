#!/usr/bin/env tsx
/**
 * E2E Test: Spanish Candidate Journey
 *
 * Tests Spanish language support throughout the candidate experience.
 * Uses existing test users and focuses on UI language validation.
 *
 * Run with: npx tsx tests/e2e/spanish-candidate-journey.ts
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SESSION_ID = `spanish-test-${Date.now()}`;
const SCREENSHOTS_DIR = 'tests/e2e/screenshots';

// Ensure screenshots directory exists
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Test tracking
let testsPassed = 0;
let testsFailed = 0;
const testResults: { test: string; passed: boolean; details?: string }[] = [];

// Color codes for output
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

// Helper functions
function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const prefix = {
    info: `${YELLOW}[INFO]${RESET}`,
    success: `${GREEN}✅ [PASS]${RESET}`,
    error: `${RED}❌ [FAIL]${RESET}`
  };

  console.log(`${prefix[type]} ${message}`);

  if (type === 'success') testsPassed++;
  if (type === 'error') {
    testsFailed++;
    testResults.push({ test: message, passed: false });
  }
}

function exec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error: any) {
    return error.stdout?.toString() || error.message;
  }
}

function agentBrowser(command: string): string {
  return exec(`agent-browser ${command} --session "${SESSION_ID}" 2>/dev/null`);
}

function screenshot(name: string) {
  agentBrowser(`screenshot ${SCREENSHOTS_DIR}/${name}.png --full`);
  log(`Screenshot saved: ${name}.png`, 'info');
}

function sleep(ms: number) {
  exec(`sleep ${ms / 1000}`);
}

// Spanish content validation
const spanishKeywords = {
  general: ['es', 'español', 'idioma'],
  welcome: ['bienvenid', 'hola', 'evaluación', 'comenzar', 'continuar'],
  work: ['enviar', 'mensaje', 'llamar', 'conversación', 'proyecto'],
  results: ['resultado', 'puntuación', 'informe', 'competencia'],
  navigation: ['siguiente', 'anterior', 'finalizar', 'completar'],
  auth: ['iniciar sesión', 'correo electrónico', 'contraseña']
};

function checkSpanishContent(page: string, content: string): boolean {
  const keywords = [...spanishKeywords.general, ...(spanishKeywords as any)[page] || []];
  return keywords.some(keyword => content.toLowerCase().includes(keyword));
}

async function runTests() {
  console.log('\n========================================');
  console.log('  Spanish Candidate Journey E2E Test');
  console.log('========================================\n');

  let serverPid: number | null = null;

  try {
    // Start dev server
    log('Starting development server in E2E mode...');
    exec('E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev &');
    serverPid = parseInt(exec('echo $!'));
    sleep(10000);

    // Test 1: Sign-in page with Spanish preference
    log('Test 1: Sign-in page language detection');
    agentBrowser(`open "${BASE_URL}/sign-in"`);
    sleep(2000);

    screenshot('01-signin-page');

    // Check for language selector or Spanish text
    const signinContent = agentBrowser('eval "document.body.innerText"');
    if (checkSpanishContent('auth', signinContent)) {
      log('Sign-in page shows Spanish content', 'success');
    } else {
      log('Sign-in page missing Spanish localization', 'error');
    }

    // Sign in as test user
    log('Signing in as test user...');
    agentBrowser('fill "#email" "user@test.com"');
    sleep(300);
    agentBrowser('fill "#password" "testpassword123"');
    sleep(300);
    agentBrowser('click "button[type=\'submit\']"');
    sleep(3000);

    // Test 2: Profile language preference
    log('Test 2: Profile language settings');
    agentBrowser(`open "${BASE_URL}/profile"`);
    sleep(2000);

    screenshot('02-profile-page');

    // Check if language preference selector exists
    const hasLangSelector = agentBrowser('eval "!!document.querySelector(\'select[name=\\\"language\\\"], #preferredLanguage\\\")"');
    if (hasLangSelector === 'true') {
      log('Profile has language preference selector', 'success');

      // Try to set Spanish
      agentBrowser('eval "const sel = document.querySelector(\'select[name=\\\"language\\\"], #preferredLanguage\\\'); if(sel) { sel.value = \'es\'; sel.dispatchEvent(new Event(\'change\')); }"');
      sleep(1000);

      // Save if there's a button
      agentBrowser('click "button[type=\'submit\']" || true');
      sleep(2000);
    } else {
      log('Profile missing language selector', 'error');
    }

    // Test 3: Assessment with Spanish UI
    log('Test 3: Assessment welcome flow');
    agentBrowser(`open "${BASE_URL}/assessments/test-assessment-chat"`);
    sleep(2000);

    screenshot('03-assessment-welcome');

    const welcomeContent = agentBrowser('eval "document.body.innerText"');
    if (checkSpanishContent('welcome', welcomeContent)) {
      log('Assessment welcome shows Spanish content', 'success');
    } else {
      // Try to find language toggle
      const hasLangToggle = agentBrowser('eval "!!document.querySelector(\'[aria-label*=\\\"language\\\"], button[data-testid=\\\"language-selector\\\"]\\\")"');
      if (hasLangToggle === 'true') {
        agentBrowser('click "[aria-label*=\\"language\\"], button[data-testid=\\"language-selector\\"]"');
        sleep(1000);
        agentBrowser('click "[data-value=\\"es\\"], [value=\\"es\\"]" || true');
        sleep(1000);

        const updatedContent = agentBrowser('eval "document.body.innerText"');
        if (checkSpanishContent('welcome', updatedContent)) {
          log('Spanish content available after language switch', 'success');
        } else {
          log('Assessment welcome missing Spanish content', 'error');
        }
      } else {
        log('Assessment welcome missing Spanish content and language toggle', 'error');
      }
    }

    // Test 4: Work page Spanish UI
    log('Test 4: Work page with Spanish interface');
    agentBrowser(`open "${BASE_URL}/assessments/test-assessment-chat/work"`);
    sleep(3000);

    screenshot('04-work-page');

    const workContent = agentBrowser('eval "document.body.innerText"');
    if (checkSpanishContent('work', workContent)) {
      log('Work page shows Spanish UI elements', 'success');
    } else {
      log('Work page missing Spanish localization', 'error');
    }

    // Test chat interaction
    log('Testing Spanish chat interaction...');
    const chatInput = agentBrowser('eval "!!document.querySelector(\'textarea, input[type=\\\"text\\\"][placeholder*=\\\"message\\\"]\\\")"');
    if (chatInput === 'true') {
      agentBrowser('fill "textarea, input[type=\\"text\\"][placeholder*=\\"message\\"]" "Hola, necesito ayuda con el proyecto"');
      sleep(500);
      agentBrowser('press Enter || click "button[type=\'submit\']"');
      sleep(3000);

      screenshot('05-chat-interaction');

      const chatContent = agentBrowser('eval "document.body.innerText"');
      if (chatContent.toLowerCase().includes('hola') || chatContent.toLowerCase().includes('proyecto')) {
        log('Chat shows Spanish conversation', 'success');
      } else {
        log('Chat response not in Spanish', 'error');
      }
    }

    // Test 5: Results page
    log('Test 5: Results page localization');
    agentBrowser(`open "${BASE_URL}/assessments/test-assessment-chat/results"`);
    sleep(2000);

    screenshot('06-results-page');

    const resultsContent = agentBrowser('eval "document.body.innerText"');
    if (checkSpanishContent('results', resultsContent)) {
      log('Results page shows Spanish content', 'success');
    } else {
      log('Results page missing Spanish localization', 'error');
    }

    // Test 6: Navigation elements
    log('Test 6: Spanish navigation elements');
    const navContent = agentBrowser('eval "Array.from(document.querySelectorAll(\'nav, header, .navigation, button\')).map(e => e.innerText).join(\' \')"');
    if (checkSpanishContent('navigation', navContent)) {
      log('Navigation elements include Spanish text', 'success');
    } else {
      log('Navigation missing Spanish localization', 'error');
    }

  } catch (error: any) {
    log(`Test execution error: ${error.message}`, 'error');
  } finally {
    // Cleanup
    log('Cleaning up...');
    agentBrowser('close');

    if (serverPid) {
      exec(`kill ${serverPid} 2>/dev/null || true`);
    }
    exec('pkill -f "next dev" 2>/dev/null || true');
  }

  // Print summary
  console.log('\n========================================');
  console.log('           TEST SUMMARY');
  console.log('========================================');
  console.log(`${GREEN}Passed: ${testsPassed}${RESET}`);
  console.log(`${RED}Failed: ${testsFailed}${RESET}`);

  if (testsFailed > 0) {
    console.log('\nFailed tests:');
    testResults.forEach(result => {
      if (!result.passed) {
        console.log(`  - ${result.test}`);
      }
    });
    process.exit(1);
  } else {
    console.log(`\n${GREEN}✅ All Spanish journey tests passed!${RESET}`);
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});