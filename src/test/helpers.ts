/**
 * Test Helpers (RF-001)
 *
 * Helper functions for E2E testing with agent-browser.
 *
 * Usage:
 * ```typescript
 * import { loginWithCredentials, loginAsRecruiter, loginAsCandidate } from "@/test/helpers";
 * ```
 */

import {
  TEST_RECRUITER,
  TEST_CANDIDATE,
  TEST_USER,
  TEST_ADMIN,
  TEST_URLS,
} from "./fixtures";

/**
 * Login command generator for agent-browser.
 * Returns the commands to execute for logging in.
 *
 * @example
 * ```bash
 * # Execute these commands with agent-browser:
 * agent-browser open "http://localhost:3000/sign-in" --session "test"
 * agent-browser fill "#email" "recruiter@test.com" --session "test"
 * agent-browser fill "#password" "testpassword123" --session "test"
 * agent-browser click "button[type='submit']" --session "test"
 * agent-browser wait 3000 --session "test"
 * ```
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Generates agent-browser login commands for the given credentials.
 *
 * @param credentials - The email and password to use
 * @param baseUrl - Base URL (default: http://localhost:3000)
 * @param sessionName - Agent-browser session name (default: "e2e")
 * @returns Array of agent-browser commands to execute
 */
export function generateLoginCommands(
  credentials: LoginCredentials,
  baseUrl = "http://localhost:3000",
  sessionName = "e2e"
): string[] {
  return [
    `agent-browser open "${baseUrl}${TEST_URLS.signIn}" --session "${sessionName}"`,
    `agent-browser fill "#email" "${credentials.email}" --session "${sessionName}"`,
    `agent-browser fill "#password" "${credentials.password}" --session "${sessionName}"`,
    `agent-browser click "button[type='submit']" --session "${sessionName}"`,
    `agent-browser wait 3000 --session "${sessionName}"`,
  ];
}

/**
 * Generates login commands for the test recruiter user.
 */
export function generateRecruiterLoginCommands(
  baseUrl = "http://localhost:3000",
  sessionName = "e2e"
): string[] {
  return generateLoginCommands(TEST_RECRUITER, baseUrl, sessionName);
}

/**
 * Generates login commands for the test candidate user.
 */
export function generateCandidateLoginCommands(
  baseUrl = "http://localhost:3000",
  sessionName = "e2e"
): string[] {
  return generateLoginCommands(TEST_CANDIDATE, baseUrl, sessionName);
}

/**
 * Generates login commands for the legacy test user.
 */
export function generateUserLoginCommands(
  baseUrl = "http://localhost:3000",
  sessionName = "e2e"
): string[] {
  return generateLoginCommands(TEST_USER, baseUrl, sessionName);
}

/**
 * Generates login commands for the test admin user.
 */
export function generateAdminLoginCommands(
  baseUrl = "http://localhost:3000",
  sessionName = "e2e"
): string[] {
  return generateLoginCommands(TEST_ADMIN, baseUrl, sessionName);
}

/**
 * CSS selectors for common elements in E2E tests.
 */
export const SELECTORS = {
  // Auth forms
  emailInput: "#email",
  passwordInput: "#password",
  submitButton: "button[type='submit']",

  // Navigation
  navDashboard: '[data-testid="nav-dashboard"]',
  navProfile: '[data-testid="nav-profile"]',

  // Assessment pages
  chatInput: '[data-testid="chat-input"]',
  chatSendButton: '[data-testid="chat-send"]',
  resumeUpload: '[data-testid="resume-upload"]',
} as const;

/**
 * Wait times for common operations (in milliseconds).
 */
export const WAIT_TIMES = {
  pageLoad: 3000,
  navigation: 2000,
  formSubmit: 3000,
  fileUpload: 5000,
  aiResponse: 10000,
} as const;
