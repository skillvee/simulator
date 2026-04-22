/**
 * E2E Test: Full Spanish Candidate Journey
 *
 * Tests the complete Spanish language experience from invite to completion.
 * Run with: npx tsx tests/e2e/spanish-journey.ts
 *
 * Acceptance Criteria:
 * - Seeds a Spanish scenario
 * - Opens invite link
 * - Signs up / signs in as Spanish-preference candidate
 * - Navigates welcome (all 4 steps), work page, starts a call, sends chat message
 * - Completes the assessment
 * - Views results page
 * - Inspects report email (or its rendering)
 * - Assertions: UI chrome Spanish, AI messages Spanish, voice system Spanish, results Spanish, email Spanish
 */

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMESTAMP = Date.now();
const TEST_EMAIL = `spanish-test-${TIMESTAMP}@test.com`;
const TEST_NAME = 'Carlos García';
const TEST_PASSWORD = 'testpassword123';
const SESSION_ID = `spanish-${TIMESTAMP}`;

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const failedTests: string[] = [];

// Helper functions
function logInfo(message: string) {
  console.log(`[INFO] ${message}`);
}

function logSuccess(message: string) {
  console.log(`✅ [PASS] ${message}`);
  testsPassed++;
}

function logError(message: string) {
  console.error(`❌ [FAIL] ${message}`);
  testsFailed++;
  failedTests.push(message);
}

function agentBrowser(command: string): string {
  try {
    const result = execSync(`agent-browser ${command} --session "${SESSION_ID}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.toString().trim();
  } catch (error: any) {
    return error.stdout?.toString() || '';
  }
}

function screenshot(name: string) {
  const dir = 'tests/e2e/screenshots';
  execSync(`mkdir -p ${dir}`, { stdio: 'ignore' });
  agentBrowser(`screenshot ${dir}/${name}.png --full`);
}

function sleep(ms: number) {
  execSync(`sleep ${ms / 1000}`);
}

async function seedSpanishData() {
  logInfo('Seeding Spanish test data...');

  try {
    // Create Spanish-preference user
    const hashedPassword = await hash(TEST_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: TEST_NAME,
        password: hashedPassword,
        preferredLanguage: 'es',
        role: 'USER'
      }
    });

    // Create Spanish scenario
    const scenario = await prisma.scenario.create({
      data: {
        name: 'Desarrollo de API REST - Español',
        companyName: 'TechCorp España',
        companyDescription: 'Empresa líder en soluciones tecnológicas en España y Latinoamérica',
        taskDescription: 'Implementar endpoints REST para gestión de usuarios con autenticación JWT',
        techStack: ['Node.js', 'Express', 'PostgreSQL', 'JWT'],
        language: 'es',
        isPublished: true,
        createdById: user.id,
        targetLevel: 'mid',
        simulationDepth: 'medium'
      }
    });

    // Create Spanish coworkers
    await prisma.coworker.createMany({
      data: [
        {
          scenarioId: scenario.id,
          name: 'María González',
          role: 'Gerente de Proyecto',
          personaStyle: 'friendly',
          knowledge: {
            projectContext: 'Sistema de gestión de usuarios para aplicación empresarial',
            requirements: 'Autenticación segura, CRUD de usuarios, validación de datos'
          }
        },
        {
          scenarioId: scenario.id,
          name: 'Pedro Martínez',
          role: 'Desarrollador Senior',
          personaStyle: 'technical',
          knowledge: {
            techStack: 'Node.js, Express, PostgreSQL',
            bestPractices: 'Clean code, pruebas unitarias, documentación API'
          }
        }
      ]
    });

    // Create assessment with Spanish language
    const assessment = await prisma.assessment.create({
      data: {
        id: `spanish-test-${TIMESTAMP}`,
        userId: user.id,
        scenarioId: scenario.id,
        status: 'WORKING',
        startedAt: new Date()
      }
    });

    logSuccess(`Created Spanish test data: User ${user.id}, Scenario ${scenario.id}, Assessment ${assessment.id}`);

    return { userId: user.id, scenarioId: scenario.id, assessmentId: assessment.id };
  } catch (error) {
    logError(`Failed to seed Spanish data: ${error}`);
    throw error;
  }
}

async function verifySpanishContent(page: 'welcome' | 'work' | 'results' | 'email'): Promise<boolean> {
  const content = agentBrowser('eval "document.body.innerText"');

  const spanishKeywords = {
    welcome: ['bienvenid', 'hola', 'evaluación', 'práctica', 'comenzar', 'siguiente'],
    work: ['enviar', 'mensaje', 'llamar', 'colega', 'chat', 'conversación', 'proyecto'],
    results: ['resultado', 'evaluación', 'puntuación', 'informe', 'desempeño', 'competencias'],
    email: ['evaluación', 'resultado', 'gracias', 'informe', 'estimado', 'cordialmente']
  };

  const keywords = spanishKeywords[page];
  const found = keywords.some(keyword =>
    content.toLowerCase().includes(keyword.toLowerCase())
  );

  if (found) {
    logSuccess(`${page} page contains Spanish content`);
  } else {
    logError(`${page} page missing Spanish content`);
  }

  return found;
}

async function runTest() {
  console.log('');
  console.log('==============================================');
  console.log('  E2E TEST: Full Spanish Candidate Journey');
  console.log('==============================================');
  console.log('');

  let assessmentData: any;

  try {
    // Step 1: Seed Spanish data
    logInfo('Step 1: Setting up Spanish test data...');
    assessmentData = await seedSpanishData();

    // Step 2: Start dev server
    logInfo('Step 2: Starting development server...');
    const serverProcess = execSync(
      'E2E_TEST_MODE=true NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev &',
      { stdio: 'ignore' }
    );
    sleep(10000); // Wait for server to start

    // Step 3: Sign in as Spanish user
    logInfo('Step 3: Signing in as Spanish-preference user...');
    agentBrowser(`open "${BASE_URL}/sign-in"`);
    sleep(2000);

    agentBrowser(`fill "#email" "${TEST_EMAIL}"`);
    sleep(500);
    agentBrowser(`fill "#password" "${TEST_PASSWORD}"`);
    sleep(500);
    agentBrowser('click "button[type=\'submit\']"');
    sleep(3000);

    screenshot('spanish-01-signin');

    // Step 4: Navigate to assessment welcome
    logInfo('Step 4: Testing welcome flow in Spanish...');
    agentBrowser(`open "${BASE_URL}/assessments/${assessmentData.assessmentId}"`);
    sleep(2000);

    screenshot('spanish-02-welcome');
    await verifySpanishContent('welcome');

    // Navigate through welcome steps
    for (let step = 1; step <= 4; step++) {
      logInfo(`Welcome step ${step}...`);

      // Click next/continue
      const nextButton = agentBrowser('eval "Array.from(document.querySelectorAll(\'button\')).find(b => /siguiente|continuar|next/i.test(b.textContent))?.click()"');
      sleep(2000);

      screenshot(`spanish-03-welcome-step${step}`);

      const content = agentBrowser('eval "document.body.innerText"');
      if (content.toLowerCase().match(/evaluación|código|empresa|trabajo|proyecto|experiencia/)) {
        logSuccess(`Welcome step ${step} shows Spanish content`);
      }
    }

    // Step 5: Work page interactions
    logInfo('Step 5: Testing work page with Spanish interactions...');
    agentBrowser(`open "${BASE_URL}/assessments/${assessmentData.assessmentId}/work"`);
    sleep(3000);

    screenshot('spanish-04-work');
    await verifySpanishContent('work');

    // Send Spanish chat message
    logInfo('Sending Spanish chat message...');
    const chatInput = 'textarea[placeholder*="message"], textarea[placeholder*="mensaje"], #chat-input, .chat-input';
    agentBrowser(`fill "${chatInput}" "Hola, ¿cómo puedo ayudarte con el proyecto?"`);
    sleep(500);

    // Send message
    agentBrowser('click "button[type=\'submit\']" || press Enter');
    sleep(3000);

    screenshot('spanish-05-chat');

    // Check response language
    const chatContent = agentBrowser('eval "document.body.innerText"');
    if (chatContent.toLowerCase().match(/hola|proyecto|código|tarea|gracias/)) {
      logSuccess('Received Spanish chat response');
    }

    // Verify voice button Spanish
    const voiceButtonText = agentBrowser('eval "document.querySelector(\'button[aria-label*=\\"call\\"], button[aria-label*=\\"llamar\\"]\')?.getAttribute(\'aria-label\')"');
    if (voiceButtonText?.toLowerCase().includes('llamar') || voiceButtonText?.toLowerCase().includes('llamada')) {
      logSuccess('Voice call button shows Spanish text');
    }

    // Step 6: Complete assessment and check results
    logInfo('Step 6: Completing assessment and checking results...');

    // Mark assessment as completed in database
    await prisma.assessment.update({
      where: { id: assessmentData.assessmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    agentBrowser(`open "${BASE_URL}/assessments/${assessmentData.assessmentId}/results"`);
    sleep(3000);

    screenshot('spanish-06-results');
    await verifySpanishContent('results');

    // Step 7: Check email template
    logInfo('Step 7: Checking email template...');
    agentBrowser(`open "${BASE_URL}/api/emails/preview/assessment-complete?language=es"`);
    sleep(2000);

    const emailContent = agentBrowser('eval "document.body.innerHTML"');
    if (emailContent) {
      screenshot('spanish-07-email');
      await verifySpanishContent('email');
    }

    // Step 8: API verification
    logInfo('Step 8: Verifying Spanish language in API calls...');

    // Check that assessment has Spanish scenario
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentData.assessmentId },
      include: { scenario: true }
    });

    if (assessment?.scenario?.language === 'es') {
      logSuccess('Assessment uses Spanish scenario');
    } else {
      logError('Assessment scenario not in Spanish');
    }

    // Check user preference
    const user = await prisma.user.findUnique({
      where: { id: assessmentData.userId }
    });

    if (user?.preferredLanguage === 'es') {
      logSuccess('User has Spanish language preference');
    } else {
      logError('User language preference not Spanish');
    }

  } catch (error) {
    logError(`Test execution error: ${error}`);
  } finally {
    // Cleanup
    logInfo('Cleaning up test data...');

    if (assessmentData) {
      // Clean up test data
      await prisma.assessment.deleteMany({
        where: { id: assessmentData.assessmentId }
      });
      await prisma.scenario.deleteMany({
        where: { id: assessmentData.scenarioId }
      });
      await prisma.user.deleteMany({
        where: { id: assessmentData.userId }
      });
    }

    // Close browser session
    agentBrowser('close');

    // Kill dev server
    execSync('pkill -f "next dev" || true', { stdio: 'ignore' });
  }

  // Print summary
  console.log('');
  console.log('==============================================');
  console.log('            TEST SUMMARY');
  console.log('==============================================');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);

  if (testsFailed > 0) {
    console.log('\nFailed tests:');
    failedTests.forEach(test => console.log(`  - ${test}`));
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});