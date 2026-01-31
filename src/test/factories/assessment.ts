/**
 * Assessment Factory
 *
 * Creates mock Assessment objects for testing.
 * @see Issue #98: REF-008
 */

import type { Assessment } from "@prisma/client";
import { AssessmentStatus } from "@prisma/client";

/**
 * Creates a mock Assessment with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 *
 * @example
 * // Create with defaults
 * const assessment = createMockAssessment();
 *
 * @example
 * // Create with custom status
 * const completed = createMockAssessment({ status: AssessmentStatus.COMPLETED });
 *
 * @example
 * // Create with PR submitted (stays in WORKING until defense call completes)
 * const withPr = createMockAssessment({
 *   prUrl: "https://github.com/test/repo/pull/1",
 *   status: AssessmentStatus.WORKING,
 * });
 */
export function createMockAssessment(
  overrides?: Partial<Assessment>
): Assessment {
  const now = new Date();

  return {
    id: "test-assessment-id",
    userId: "test-user-id",
    scenarioId: "test-scenario-id",
    status: AssessmentStatus.WELCOME,
    startedAt: now,
    completedAt: null,
    prUrl: null,
    prSnapshot: null,
    ciStatus: null,
    codeReview: null,
    managerMessagesStarted: false,
    report: null,
    supersededBy: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
