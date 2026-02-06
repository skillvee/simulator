/**
 * Test Fixtures (RF-001)
 *
 * Fixed test data constants for E2E testing with agent-browser.
 * These match the data created by prisma/seed.ts.
 *
 * Usage:
 * ```typescript
 * import { TEST_RECRUITER, TEST_CANDIDATE, TEST_SCENARIO_ID } from "@/test/fixtures";
 * ```
 */

// ============================================================================
// TEST USERS
// ============================================================================

/** Test recruiter user credentials */
export const TEST_RECRUITER = {
  email: "recruiter@test.com",
  password: "testpassword123",
  name: "Test Recruiter",
} as const;

/** Test candidate user credentials */
export const TEST_CANDIDATE = {
  email: "candidate@test.com",
  password: "testpassword123",
  name: "Test Candidate",
} as const;

/** Legacy test user (kept for backward compatibility) */
export const TEST_USER = {
  email: "user@test.com",
  password: "testpassword123",
  name: "Test User",
} as const;

/** Test admin user */
export const TEST_ADMIN = {
  email: "admin@test.com",
  password: "testpassword123",
  name: "Test Admin",
} as const;

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/** Fixed test scenario ID for recruiter-focused flow */
export const TEST_SCENARIO_ID = "test-scenario-recruiter";

/** All test scenario IDs */
export const TEST_SCENARIO_IDS = {
  recruiter: "test-scenario-recruiter",
  default: "default-scenario",
} as const;

// ============================================================================
// TEST ASSESSMENTS
// ============================================================================

/** Fixed test assessment IDs for E2E testing */
export const TEST_ASSESSMENT_IDS = {
  /** Welcome page flow (status: WELCOME) */
  welcome: "test-assessment-welcome",
  /** Working state for recruiter flow testing */
  working: "test-assessment-working-recruiter",
  /** Legacy chat assessment (kept for backward compatibility) */
  chat: "test-assessment-chat",
} as const;

// ============================================================================
// TEST URLS
// ============================================================================

/** Common test URLs for E2E navigation */
export const TEST_URLS = {
  signIn: "/sign-in",
  signUp: "/sign-up",
  dashboard: "/dashboard",
  assessmentWelcome: `/assessments/${TEST_ASSESSMENT_IDS.welcome}/welcome`,
  assessmentWorking: `/assessments/${TEST_ASSESSMENT_IDS.working}/work`,
  assessmentChat: `/assessments/${TEST_ASSESSMENT_IDS.chat}/work`,
} as const;
