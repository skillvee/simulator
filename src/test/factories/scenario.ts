/**
 * Scenario Factory
 *
 * Creates mock Scenario objects for testing.
 * @see Issue #98: REF-008
 */

import type { Scenario } from "@prisma/client";

/**
 * Creates a mock Scenario with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 *
 * @example
 * // Create with defaults
 * const scenario = createMockScenario();
 *
 * @example
 * // Create published scenario
 * const published = createMockScenario({ isPublished: true });
 *
 * @example
 * // Create with custom tech stack
 * const rustScenario = createMockScenario({
 *   name: "Rust CLI Tool",
 *   techStack: ["rust", "tokio", "clap"],
 * });
 */
export function createMockScenario(overrides?: Partial<Scenario>): Scenario {
  const now = new Date();

  return {
    id: "test-scenario-id",
    name: "Test Scenario",
    companyName: "Test Company",
    companyDescription: "A test company for assessment scenarios.",
    taskDescription: "Implement a feature following best practices.",
    repoUrl: "https://github.com/test/repo",
    techStack: ["typescript", "react", "node"],
    targetLevel: "mid",
    archetypeId: null,
    isPublished: false,
    repoSpec: null,
    createdById: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
