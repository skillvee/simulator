/**
 * Seniority Thresholds for Candidate Filtering
 *
 * @deprecated This file uses the legacy hardcoded 8-dimension system.
 * For the new data-driven rubric system with per-dimension seniority gates, use:
 *   import { calculateArchetypeFit } from "@/lib/rubric"
 *
 * The legacy system is kept for backward compatibility with existing
 * assessments scored on the old 1-5 / 8-dimension scale.
 *
 * Defines minimum score requirements per seniority level for key dimensions.
 * Applied at search time to filter candidates who don't meet role requirements.
 *
 * Seniority levels:
 * - Junior: No minimum thresholds (all candidates pass)
 * - Mid: Key dimensions must score >= 3
 * - Senior: Key dimensions must score >= 4
 *
 * Key dimensions vary by archetype (e.g., Senior Backend needs Technical Knowledge >= 4)
 *
 * @since 2026-01-16
 * @see Issue #66: US-010
 */

import { AssessmentDimension } from "@prisma/client";
import { type RoleArchetype, ARCHETYPE_CONFIGS } from "./archetype-weights";
import { type FilterSeniorityLevel } from "@/types";

// Create local type alias and re-export for backward compatibility
export type SeniorityLevel = FilterSeniorityLevel;

/**
 * Key dimensions for each archetype (dimensions with VERY_HIGH weight)
 */
export type ArchetypeKeyDimensions = Record<
  RoleArchetype,
  AssessmentDimension[]
>;

/**
 * Input for threshold check (same as archetype-weights for consistency)
 */
export interface DimensionScoreInput {
  dimension: AssessmentDimension;
  score: number; // 1-5 scale
}

/**
 * Result of threshold check
 */
export interface ThresholdCheckResult {
  /** Whether the candidate meets the threshold */
  meetsThreshold: boolean;
  /** The minimum score required (0 for JUNIOR, 3 for MID, 4 for SENIOR) */
  threshold: number;
  /** The seniority level checked */
  seniorityLevel: SeniorityLevel;
  /** The archetype checked */
  archetype: RoleArchetype;
  /** Dimensions that were checked (key dimensions for the archetype) */
  keyDimensionsChecked: AssessmentDimension[];
  /** Dimensions that failed to meet the threshold */
  failingDimensions: AssessmentDimension[];
  /** Breakdown of each key dimension's status */
  breakdown: Array<{
    dimension: AssessmentDimension;
    score: number | null;
    threshold: number;
    meetsThreshold: boolean;
  }>;
}

/**
 * Result of filtering candidates by seniority
 */
export interface FilterResult<T> {
  /** Candidates who meet the threshold */
  passing: Array<{
    candidate: T;
    thresholdResult: ThresholdCheckResult;
  }>;
  /** Candidates who do not meet the threshold */
  filtered: Array<{
    candidate: T;
    thresholdResult: ThresholdCheckResult;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum scores required for key dimensions at each seniority level.
 * - JUNIOR: No minimum (0)
 * - MID: Key dimensions must be >= 3
 * - SENIOR: Key dimensions must be >= 4
 */
export const SENIORITY_THRESHOLDS: Record<SeniorityLevel, number> = {
  JUNIOR: 0,
  MID: 3,
  SENIOR: 4,
} as const;

/**
 * Key dimensions for each archetype.
 * These are the dimensions that have VERY_HIGH weight for the archetype.
 * Candidates must meet the threshold on ALL key dimensions for their seniority level.
 */
export const ARCHETYPE_KEY_DIMENSIONS: ArchetypeKeyDimensions = {
  /**
   * Senior Frontend Engineer
   * Key: Communication, Creativity, Technical Knowledge (VERY_HIGH weighted)
   */
  SENIOR_FRONTEND_ENGINEER: [
    AssessmentDimension.COMMUNICATION,
    AssessmentDimension.CREATIVITY,
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
  ],

  /**
   * Senior Backend Engineer
   * Key: Technical Knowledge, Problem Solving, Time Management (VERY_HIGH weighted)
   */
  SENIOR_BACKEND_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
    AssessmentDimension.TIME_MANAGEMENT,
  ],

  /**
   * Fullstack Engineer
   * Key: Technical Knowledge, Problem Solving, Adaptability (VERY_HIGH weighted)
   */
  FULLSTACK_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
    AssessmentDimension.ADAPTABILITY,
  ],

  /**
   * Engineering Manager
   * Key: Communication, Leadership, Collaboration (VERY_HIGH weighted)
   */
  ENGINEERING_MANAGER: [
    AssessmentDimension.COMMUNICATION,
    AssessmentDimension.LEADERSHIP,
    AssessmentDimension.COLLABORATION,
  ],

  /**
   * Tech Lead
   * Key: Technical Knowledge, Leadership, Communication (VERY_HIGH weighted)
   */
  TECH_LEAD: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.LEADERSHIP,
    AssessmentDimension.COMMUNICATION,
  ],

  /**
   * DevOps Engineer
   * Key: Technical Knowledge, Problem Solving, Adaptability (VERY_HIGH weighted)
   */
  DEVOPS_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
    AssessmentDimension.ADAPTABILITY,
  ],

  /**
   * Data Engineer
   * Key: Technical Knowledge, Problem Solving, Time Management (VERY_HIGH weighted)
   */
  DATA_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
    AssessmentDimension.TIME_MANAGEMENT,
  ],

  /**
   * General Software Engineer
   * Key: Technical Knowledge, Problem Solving (VERY_HIGH weighted)
   */
  GENERAL_SOFTWARE_ENGINEER: [
    AssessmentDimension.TECHNICAL_KNOWLEDGE,
    AssessmentDimension.PROBLEM_SOLVING,
  ],
};

// ============================================================================
// Threshold Check Function
// ============================================================================

/**
 * Checks if a candidate's scores meet the threshold for a given seniority level and archetype.
 *
 * For each key dimension (determined by archetype):
 * - JUNIOR: No minimum required (always passes)
 * - MID: Score must be >= 3
 * - SENIOR: Score must be >= 4
 *
 * A candidate only passes if ALL key dimensions meet the threshold.
 * Missing scores are treated as failing the threshold.
 *
 * @param dimensionScores - Array of dimension scores (score 1-5)
 * @param archetype - The role archetype (determines key dimensions)
 * @param seniorityLevel - The seniority level to check against
 * @returns ThresholdCheckResult with detailed breakdown
 */
export function meetsThreshold(
  dimensionScores: DimensionScoreInput[],
  archetype: RoleArchetype,
  seniorityLevel: SeniorityLevel
): ThresholdCheckResult {
  const threshold = SENIORITY_THRESHOLDS[seniorityLevel];
  const keyDimensions = ARCHETYPE_KEY_DIMENSIONS[archetype];

  // Build a map of scores by dimension (last value wins for duplicates)
  const scoreMap = new Map<AssessmentDimension, number>();
  for (const { dimension, score } of dimensionScores) {
    scoreMap.set(dimension, score);
  }

  const breakdown: ThresholdCheckResult["breakdown"] = [];
  const failingDimensions: AssessmentDimension[] = [];

  // Check each key dimension
  for (const dimension of keyDimensions) {
    const score = scoreMap.get(dimension) ?? null;
    const dimensionMeetsThreshold = score !== null && score >= threshold;

    breakdown.push({
      dimension,
      score,
      threshold,
      meetsThreshold: dimensionMeetsThreshold,
    });

    if (!dimensionMeetsThreshold) {
      failingDimensions.push(dimension);
    }
  }

  // For JUNIOR level, always pass (no threshold)
  const meetsThresholdResult =
    threshold === 0 || failingDimensions.length === 0;

  return {
    meetsThreshold: meetsThresholdResult,
    threshold,
    seniorityLevel,
    archetype,
    keyDimensionsChecked: keyDimensions,
    failingDimensions: threshold === 0 ? [] : failingDimensions,
    breakdown,
  };
}

// ============================================================================
// Candidate Filter Function
// ============================================================================

/**
 * Filters a list of candidates based on seniority thresholds.
 *
 * Candidates who don't meet the threshold are filtered out (not just ranked lower).
 * This is a hard filter - missing a key dimension threshold means exclusion.
 *
 * @param candidates - Array of candidates to filter
 * @param getScores - Function to extract dimension scores from a candidate
 * @param archetype - The role archetype to filter for
 * @param seniorityLevel - The seniority level threshold
 * @returns FilterResult with passing and filtered candidates
 */
export function filterCandidatesBySeniority<T>(
  candidates: T[],
  getScores: (candidate: T) => DimensionScoreInput[],
  archetype: RoleArchetype,
  seniorityLevel: SeniorityLevel
): FilterResult<T> {
  const passing: FilterResult<T>["passing"] = [];
  const filtered: FilterResult<T>["filtered"] = [];

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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the human-readable display name for a seniority level.
 *
 * @param level - The seniority level
 * @returns Human-readable name
 */
export function getSeniorityDisplayName(level: SeniorityLevel): string {
  const names: Record<SeniorityLevel, string> = {
    JUNIOR: "Junior",
    MID: "Mid-Level",
    SENIOR: "Senior",
  };
  return names[level];
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
 * Key dimensions are the dimensions that candidates must meet threshold on.
 * These correspond to the VERY_HIGH weighted dimensions from archetype-weights.
 *
 * @param archetype - The role archetype
 * @returns Array of key dimensions for the archetype
 */
export function getKeyDimensionsForArchetype(
  archetype: RoleArchetype
): AssessmentDimension[] {
  return ARCHETYPE_KEY_DIMENSIONS[archetype];
}

/**
 * Verifies that key dimensions align with VERY_HIGH weighted dimensions.
 * This is a design verification function, not for runtime use.
 *
 * @param archetype - The archetype to verify
 * @returns true if key dimensions match VERY_HIGH weights
 */
export function verifyKeyDimensionsAlignment(
  archetype: RoleArchetype
): boolean {
  const keyDimensions = ARCHETYPE_KEY_DIMENSIONS[archetype];
  const weights = ARCHETYPE_CONFIGS[archetype];

  for (const dimension of keyDimensions) {
    if (weights[dimension] !== "VERY_HIGH") {
      return false;
    }
  }

  return true;
}
