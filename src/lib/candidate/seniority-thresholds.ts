/**
 * Seniority Thresholds
 *
 * Defines seniority-based candidate filtering using key dimensions
 * per archetype. Each seniority level has a minimum score threshold
 * that must be met on the archetype's key dimensions.
 *
 * Seniority levels:
 * - Junior: No minimum thresholds (score >= 0)
 * - Mid: Key dimensions >= 3
 * - Senior: Key dimensions >= 4
 *
 * @since 2026-01-16
 * @see Issue #66: US-010
 */

import { AssessmentDimension } from "@prisma/client";
import type { RoleArchetype, DimensionScoreInput } from "./archetype-weights";

// Re-export DimensionScoreInput for consumers that import from this module
export type { DimensionScoreInput } from "./archetype-weights";

// ============================================================================
// Types
// ============================================================================

/**
 * Seniority level for threshold filtering
 */
export type SeniorityLevel = "JUNIOR" | "MID" | "SENIOR";

/**
 * Result of a seniority threshold check
 */
export interface ThresholdCheckResult {
  /** Whether the candidate meets the threshold */
  meetsThreshold: boolean;
  /** The minimum score threshold that was applied */
  threshold: number;
  /** The key dimensions that were checked */
  keyDimensionsChecked: AssessmentDimension[];
  /** Dimensions that failed to meet the threshold */
  failingDimensions: AssessmentDimension[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Minimum score thresholds for each seniority level.
 * Applied to the archetype's key dimensions only.
 */
export const SENIORITY_THRESHOLDS: Record<SeniorityLevel, number> = {
  JUNIOR: 0,
  MID: 3,
  SENIOR: 4,
};

/**
 * Key dimensions for each archetype that are checked against
 * seniority thresholds. These correspond to the VERY_HIGH weighted
 * dimensions from archetype-weights.ts.
 */
export const ARCHETYPE_KEY_DIMENSIONS: Record<
  RoleArchetype,
  AssessmentDimension[]
> = {
  SENIOR_FRONTEND_ENGINEER: [
    AssessmentDimension.COMMUNICATION,
    AssessmentDimension.CREATIVITY,
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
  ],
  SENIOR_BACKEND_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
    AssessmentDimension.TIME_MANAGEMENT,
  ],
  FULLSTACK_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
    AssessmentDimension.ADAPTABILITY,
  ],
  ENGINEERING_MANAGER: [
    AssessmentDimension.COMMUNICATION,
    AssessmentDimension.LEADERSHIP,
    AssessmentDimension.COLLABORATION,
  ],
  TECH_LEAD: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.LEADERSHIP,
    AssessmentDimension.COMMUNICATION,
  ],
  DEVOPS_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
    AssessmentDimension.TIME_MANAGEMENT,
  ],
  DATA_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
    AssessmentDimension.ADAPTABILITY,
  ],
  GENERAL_SOFTWARE_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
  ],
};

/**
 * Display names for seniority levels
 */
const SENIORITY_DISPLAY_NAMES: Record<SeniorityLevel, string> = {
  JUNIOR: "Junior",
  MID: "Mid-Level",
  SENIOR: "Senior",
};

// ============================================================================
// Functions
// ============================================================================

/**
 * Checks if a candidate's scores meet the seniority threshold for an archetype.
 *
 * Only key dimensions (VERY_HIGH weighted dimensions) are checked.
 * All key dimensions must score at or above the threshold.
 *
 * @param scores - Array of dimension scores
 * @param archetype - Target role archetype
 * @param seniorityLevel - Required seniority level
 * @returns Threshold check result with details
 */
export function meetsThreshold(
  scores: DimensionScoreInput[],
  archetype: RoleArchetype,
  seniorityLevel: SeniorityLevel
): ThresholdCheckResult {
  const threshold = SENIORITY_THRESHOLDS[seniorityLevel];
  const keyDimensions = ARCHETYPE_KEY_DIMENSIONS[archetype];

  // For JUNIOR, always pass (threshold is 0)
  if (threshold === 0) {
    return {
      meetsThreshold: true,
      threshold,
      keyDimensionsChecked: keyDimensions,
      failingDimensions: [],
    };
  }

  // Build score map (last value wins for duplicates)
  const scoreMap = new Map<AssessmentDimension, number>();
  for (const { dimension, score } of scores) {
    scoreMap.set(dimension, score);
  }

  // Check each key dimension against the threshold
  const failingDimensions: AssessmentDimension[] = [];

  for (const dimension of keyDimensions) {
    const score = scoreMap.get(dimension) ?? 0;
    if (score < threshold) {
      failingDimensions.push(dimension);
    }
  }

  return {
    meetsThreshold: failingDimensions.length === 0,
    threshold,
    keyDimensionsChecked: keyDimensions,
    failingDimensions,
  };
}

/**
 * Filters a list of candidates by seniority threshold.
 *
 * @param candidates - Array of candidates to filter
 * @param getScores - Function to extract dimension scores from a candidate
 * @param archetype - Target role archetype
 * @param seniorityLevel - Required seniority level
 * @returns Object with passing and filtered candidate arrays
 */
export function filterCandidatesBySeniority<T>(
  candidates: T[],
  getScores: (candidate: T) => DimensionScoreInput[],
  archetype: RoleArchetype,
  seniorityLevel: SeniorityLevel
): {
  passing: Array<{ candidate: T; thresholdResult: ThresholdCheckResult }>;
  filtered: Array<{ candidate: T; thresholdResult: ThresholdCheckResult }>;
} {
  const passing: Array<{
    candidate: T;
    thresholdResult: ThresholdCheckResult;
  }> = [];
  const filtered: Array<{
    candidate: T;
    thresholdResult: ThresholdCheckResult;
  }> = [];

  for (const candidate of candidates) {
    const scores = getScores(candidate);
    const thresholdResult = meetsThreshold(scores, archetype, seniorityLevel);

    if (thresholdResult.meetsThreshold) {
      passing.push({ candidate, thresholdResult });
    } else {
      filtered.push({ candidate, thresholdResult });
    }
  }

  return { passing, filtered };
}

/**
 * Gets the human-readable display name for a seniority level.
 *
 * @param level - Seniority level
 * @returns Display name string
 */
export function getSeniorityDisplayName(level: SeniorityLevel): string {
  return SENIORITY_DISPLAY_NAMES[level];
}

/**
 * Gets all available seniority levels.
 *
 * @returns Array of all seniority level identifiers
 */
export function getAllSeniorityLevels(): SeniorityLevel[] {
  return ["JUNIOR", "MID", "SENIOR"];
}

/**
 * Gets the key dimensions for a given archetype.
 *
 * @param archetype - Role archetype
 * @returns Array of key assessment dimensions
 */
export function getKeyDimensionsForArchetype(
  archetype: RoleArchetype
): AssessmentDimension[] {
  return ARCHETYPE_KEY_DIMENSIONS[archetype];
}
