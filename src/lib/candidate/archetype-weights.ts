/**
 * Archetype Weight Configurations
 *
 * Defines weighted scoring for role-specific candidate evaluation.
 * Each archetype has different priorities for the 8 assessment dimensions.
 *
 * Weight levels:
 * - VERY_HIGH (1.5x): Critical dimensions for the role
 * - HIGH (1.25x): Important dimensions for the role
 * - MEDIUM (1.0x): Standard baseline dimensions
 *
 * @since 2026-01-16
 * @see Issue #65: US-009
 */

import { AssessmentDimension } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

/**
 * Weight level for dimension importance
 */
export type WeightLevel = "VERY_HIGH" | "HIGH" | "MEDIUM";

/**
 * Role archetype identifiers
 */
export type RoleArchetype =
  | "SENIOR_FRONTEND_ENGINEER"
  | "SENIOR_BACKEND_ENGINEER"
  | "FULLSTACK_ENGINEER"
  | "ENGINEERING_MANAGER"
  | "TECH_LEAD"
  | "DEVOPS_ENGINEER"
  | "DATA_ENGINEER"
  | "GENERAL_SOFTWARE_ENGINEER";

/**
 * Input for dimension scoring
 */
export interface DimensionScoreInput {
  dimension: AssessmentDimension;
  score: number;
}

/**
 * Breakdown item for a single dimension in the fit score calculation
 */
export interface FitScoreBreakdownItem {
  dimension: AssessmentDimension;
  rawScore: number;
  weight: number;
  weightedScore: number;
  weightLevel: WeightLevel;
}

/**
 * Result of fit score calculation
 */
export interface FitScoreResult {
  fitScore: number;
  archetype: RoleArchetype;
  breakdown: FitScoreBreakdownItem[];
  weightedSum: number;
  maxPossible: number;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Weight multipliers for each level
 */
export const WEIGHT_MULTIPLIERS: Record<WeightLevel, number> = {
  VERY_HIGH: 1.5,
  HIGH: 1.25,
  MEDIUM: 1.0,
};

/**
 * Archetype configurations mapping each dimension to a weight level.
 * Weights are applied dynamically at query time, never stored with assessment data.
 */
export const ARCHETYPE_CONFIGS: Record<
  RoleArchetype,
  Record<AssessmentDimension, WeightLevel>
> = {
  SENIOR_FRONTEND_ENGINEER: {
    [AssessmentDimension.COMMUNICATION]: "VERY_HIGH",
    [AssessmentDimension.CREATIVITY]: "VERY_HIGH",
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.ADAPTABILITY]: "MEDIUM",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
    [AssessmentDimension.TIME_MANAGEMENT]: "MEDIUM",
  },
  SENIOR_BACKEND_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "VERY_HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.ADAPTABILITY]: "HIGH",
    [AssessmentDimension.COMMUNICATION]: "MEDIUM",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },
  FULLSTACK_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.ADAPTABILITY]: "VERY_HIGH",
    [AssessmentDimension.COMMUNICATION]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "HIGH",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },
  ENGINEERING_MANAGER: {
    [AssessmentDimension.COMMUNICATION]: "VERY_HIGH",
    [AssessmentDimension.LEADERSHIP]: "VERY_HIGH",
    [AssessmentDimension.COLLABORATION]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "HIGH",
    [AssessmentDimension.ADAPTABILITY]: "HIGH",
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },
  TECH_LEAD: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.LEADERSHIP]: "VERY_HIGH",
    [AssessmentDimension.COMMUNICATION]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "MEDIUM",
    [AssessmentDimension.ADAPTABILITY]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },
  DEVOPS_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "VERY_HIGH",
    [AssessmentDimension.ADAPTABILITY]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.COMMUNICATION]: "MEDIUM",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },
  DATA_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.ADAPTABILITY]: "VERY_HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "HIGH",
    [AssessmentDimension.CREATIVITY]: "HIGH",
    [AssessmentDimension.COMMUNICATION]: "MEDIUM",
    [AssessmentDimension.COLLABORATION]: "MEDIUM",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
  },
  GENERAL_SOFTWARE_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.COMMUNICATION]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "HIGH",
    [AssessmentDimension.ADAPTABILITY]: "HIGH",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },
};

/**
 * Display names for archetypes
 */
const ARCHETYPE_DISPLAY_NAMES: Record<RoleArchetype, string> = {
  SENIOR_FRONTEND_ENGINEER: "Senior Frontend Engineer",
  SENIOR_BACKEND_ENGINEER: "Senior Backend Engineer",
  FULLSTACK_ENGINEER: "Fullstack Engineer",
  ENGINEERING_MANAGER: "Engineering Manager",
  TECH_LEAD: "Tech Lead",
  DEVOPS_ENGINEER: "DevOps Engineer",
  DATA_ENGINEER: "Data Engineer",
  GENERAL_SOFTWARE_ENGINEER: "General Software Engineer",
};

// ============================================================================
// Functions
// ============================================================================

/**
 * Calculates the weighted fit score for a candidate against an archetype.
 *
 * Formula: fitScore = (weightedSum / maxPossible) * 100
 * Where weightedSum = sum of (score * weight) for each dimension
 * And maxPossible = sum of (5 * weight) for each dimension
 *
 * @param scores - Array of dimension scores
 * @param archetype - Target role archetype
 * @returns Fit score result with breakdown
 */
export function calculateFitScore(
  scores: DimensionScoreInput[],
  archetype: RoleArchetype
): FitScoreResult {
  const config = ARCHETYPE_CONFIGS[archetype];

  // Build score map (last value wins for duplicates)
  const scoreMap = new Map<AssessmentDimension, number>();
  for (const { dimension, score } of scores) {
    scoreMap.set(dimension, score);
  }

  const breakdown: FitScoreBreakdownItem[] = [];
  let weightedSum = 0;
  let maxPossible = 0;

  for (const dimension of Object.values(AssessmentDimension)) {
    const weightLevel = config[dimension];
    const weight = WEIGHT_MULTIPLIERS[weightLevel];
    const rawScore = scoreMap.get(dimension) ?? 0;
    const weightedScore = rawScore * weight;

    breakdown.push({
      dimension,
      rawScore,
      weight,
      weightedScore,
      weightLevel,
    });

    weightedSum += weightedScore;
    maxPossible += 5 * weight;
  }

  const fitScore =
    maxPossible > 0
      ? Math.round((weightedSum / maxPossible) * 1000) / 10
      : 0;

  return {
    fitScore,
    archetype,
    breakdown,
    weightedSum,
    maxPossible,
  };
}

/**
 * Calculates fit scores for multiple archetypes, sorted by score descending.
 *
 * @param scores - Array of dimension scores
 * @param archetypes - Optional subset of archetypes (defaults to all)
 * @returns Array of fit score results sorted by fitScore descending
 */
export function calculateFitScoresForMultipleArchetypes(
  scores: DimensionScoreInput[],
  archetypes?: RoleArchetype[]
): FitScoreResult[] {
  const targetArchetypes = archetypes ?? getAllArchetypes();

  const results = targetArchetypes.map((archetype) =>
    calculateFitScore(scores, archetype)
  );

  // Sort by fit score descending
  results.sort((a, b) => b.fitScore - a.fitScore);

  return results;
}

/**
 * Gets the weight multiplier for a dimension in a given archetype.
 *
 * @param archetype - Role archetype
 * @param dimension - Assessment dimension
 * @returns Weight multiplier (1.0, 1.25, or 1.5)
 */
export function getWeightForDimension(
  archetype: RoleArchetype,
  dimension: AssessmentDimension
): number {
  const weightLevel = ARCHETYPE_CONFIGS[archetype][dimension];
  return WEIGHT_MULTIPLIERS[weightLevel];
}

/**
 * Gets the weight level for a dimension in a given archetype.
 *
 * @param archetype - Role archetype
 * @param dimension - Assessment dimension
 * @returns Weight level (VERY_HIGH, HIGH, or MEDIUM)
 */
export function getWeightLevelForDimension(
  archetype: RoleArchetype,
  dimension: AssessmentDimension
): WeightLevel {
  return ARCHETYPE_CONFIGS[archetype][dimension];
}

/**
 * Gets the human-readable display name for an archetype.
 *
 * @param archetype - Role archetype
 * @returns Display name string
 */
export function getArchetypeDisplayName(archetype: RoleArchetype): string {
  return ARCHETYPE_DISPLAY_NAMES[archetype];
}

/**
 * Gets all available role archetypes.
 *
 * @returns Array of all archetype identifiers
 */
export function getAllArchetypes(): RoleArchetype[] {
  return Object.keys(ARCHETYPE_CONFIGS) as RoleArchetype[];
}
