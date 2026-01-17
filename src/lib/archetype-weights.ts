/**
 * Archetype Weight Configurations for Candidate Matching
 *
 * Defines role-specific dimension weights for calculating fit scores.
 * Weights are applied dynamically at query time, never stored with assessment.
 *
 * Weight levels:
 * - Very High (1.5x): Critical for the role
 * - High (1.25x): Important for success
 * - Medium (1.0x): Baseline importance
 *
 * @since 2026-01-16
 * @see Issue #65: US-009
 */

import { AssessmentDimension } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

/**
 * Weight multiplier levels
 */
export type WeightLevel = "VERY_HIGH" | "HIGH" | "MEDIUM";

/**
 * Weight multiplier values
 */
export const WEIGHT_MULTIPLIERS: Record<WeightLevel, number> = {
  VERY_HIGH: 1.5,
  HIGH: 1.25,
  MEDIUM: 1.0,
} as const;

/**
 * Dimension weights for a role archetype
 */
export type ArchetypeWeights = Record<AssessmentDimension, WeightLevel>;

/**
 * Role archetypes that define different evaluation priorities
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

// ============================================================================
// Archetype Weight Configurations
// ============================================================================

/**
 * Weight configurations for each role archetype.
 *
 * These weights reflect the relative importance of each dimension for success
 * in the given role. They are applied at query time when calculating fit scores.
 */
export const ARCHETYPE_CONFIGS: Record<RoleArchetype, ArchetypeWeights> = {
  /**
   * Senior Frontend Engineer
   * - Very High: Communication (user-facing), Creativity (UI/UX), Technical Knowledge
   * - High: Problem Solving, Collaboration, Time Management
   * - Medium: Adaptability, Leadership
   */
  SENIOR_FRONTEND_ENGINEER: {
    [AssessmentDimension.COMMUNICATION]: "VERY_HIGH",
    [AssessmentDimension.CREATIVITY]: "VERY_HIGH",
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "HIGH",
    [AssessmentDimension.ADAPTABILITY]: "MEDIUM",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
  },

  /**
   * Senior Backend Engineer
   * - Very High: Technical Knowledge, Problem Solving, Time Management
   * - High: Collaboration, Adaptability, Communication
   * - Medium: Leadership, Creativity
   */
  SENIOR_BACKEND_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "VERY_HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.ADAPTABILITY]: "HIGH",
    [AssessmentDimension.COMMUNICATION]: "HIGH",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },

  /**
   * Fullstack Engineer
   * - Very High: Technical Knowledge, Problem Solving, Adaptability
   * - High: Communication, Collaboration, Time Management, Creativity
   * - Medium: Leadership
   */
  FULLSTACK_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.ADAPTABILITY]: "VERY_HIGH",
    [AssessmentDimension.COMMUNICATION]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "HIGH",
    [AssessmentDimension.CREATIVITY]: "HIGH",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
  },

  /**
   * Engineering Manager
   * - Very High: Communication, Leadership, Collaboration
   * - High: Problem Solving, Time Management, Adaptability
   * - Medium: Technical Knowledge, Creativity
   */
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

  /**
   * Tech Lead
   * - Very High: Technical Knowledge, Leadership, Communication
   * - High: Problem Solving, Collaboration, Time Management
   * - Medium: Adaptability, Creativity
   */
  TECH_LEAD: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.LEADERSHIP]: "VERY_HIGH",
    [AssessmentDimension.COMMUNICATION]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "HIGH",
    [AssessmentDimension.ADAPTABILITY]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },

  /**
   * DevOps Engineer
   * - Very High: Technical Knowledge, Problem Solving, Adaptability
   * - High: Time Management, Collaboration, Communication
   * - Medium: Leadership, Creativity
   */
  DEVOPS_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.ADAPTABILITY]: "VERY_HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.COMMUNICATION]: "HIGH",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },

  /**
   * Data Engineer
   * - Very High: Technical Knowledge, Problem Solving, Time Management
   * - High: Adaptability, Communication, Collaboration
   * - Medium: Leadership, Creativity
   */
  DATA_ENGINEER: {
    [AssessmentDimension.TECHNICAL_KNOWLEDGE]: "VERY_HIGH",
    [AssessmentDimension.PROBLEM_SOLVING]: "VERY_HIGH",
    [AssessmentDimension.TIME_MANAGEMENT]: "VERY_HIGH",
    [AssessmentDimension.ADAPTABILITY]: "HIGH",
    [AssessmentDimension.COMMUNICATION]: "HIGH",
    [AssessmentDimension.COLLABORATION]: "HIGH",
    [AssessmentDimension.LEADERSHIP]: "MEDIUM",
    [AssessmentDimension.CREATIVITY]: "MEDIUM",
  },

  /**
   * General Software Engineer (balanced weights)
   * - Very High: Technical Knowledge, Problem Solving
   * - High: Communication, Collaboration, Time Management, Adaptability
   * - Medium: Leadership, Creativity
   */
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

// ============================================================================
// Fit Score Calculation
// ============================================================================

/**
 * Input for fit score calculation
 */
export interface DimensionScoreInput {
  dimension: AssessmentDimension;
  score: number; // 1-5 scale
}

/**
 * Result of fit score calculation
 */
export interface FitScoreResult {
  /** Normalized fit score (0-100 scale) */
  fitScore: number;
  /** Raw weighted sum before normalization */
  weightedSum: number;
  /** Maximum possible weighted sum */
  maxPossible: number;
  /** The archetype used for calculation */
  archetype: RoleArchetype;
  /** Breakdown of each dimension's contribution */
  breakdown: Array<{
    dimension: AssessmentDimension;
    rawScore: number;
    weight: number;
    weightLevel: WeightLevel;
    weightedScore: number;
  }>;
}

/**
 * Calculates the weighted fit score for a candidate against a role archetype.
 *
 * Formula: fitScore = (sum of dimension_score * weight) / max_possible * 100
 *
 * Where:
 * - dimension_score is the candidate's score (1-5) for each dimension
 * - weight is the multiplier based on the archetype (1.0, 1.25, or 1.5)
 * - max_possible is the sum of (5 * weight) for all dimensions
 *
 * The fit score is normalized to a 0-100 scale.
 *
 * @param dimensionScores - Array of dimension scores (score 1-5)
 * @param archetype - The role archetype to match against
 * @returns Fit score result with breakdown
 */
export function calculateFitScore(
  dimensionScores: DimensionScoreInput[],
  archetype: RoleArchetype
): FitScoreResult {
  const weights = ARCHETYPE_CONFIGS[archetype];
  const breakdown: FitScoreResult["breakdown"] = [];

  let weightedSum = 0;
  let maxPossible = 0;

  // Create a map of scores by dimension for lookup
  const scoreMap = new Map<AssessmentDimension, number>();
  for (const { dimension, score } of dimensionScores) {
    scoreMap.set(dimension, score);
  }

  // Calculate weighted sum for each dimension
  for (const dimension of Object.values(AssessmentDimension)) {
    const weightLevel = weights[dimension];
    const weight = WEIGHT_MULTIPLIERS[weightLevel];
    const rawScore = scoreMap.get(dimension);

    // Max possible for this dimension (max score of 5 * weight)
    const maxForDimension = 5 * weight;
    maxPossible += maxForDimension;

    // If we have a score for this dimension, add to weighted sum
    if (rawScore !== undefined) {
      const weightedScore = rawScore * weight;
      weightedSum += weightedScore;

      breakdown.push({
        dimension,
        rawScore,
        weight,
        weightLevel,
        weightedScore,
      });
    } else {
      // No score for this dimension - still include in breakdown with 0
      breakdown.push({
        dimension,
        rawScore: 0,
        weight,
        weightLevel,
        weightedScore: 0,
      });
    }
  }

  // Normalize to 0-100 scale
  // Guard against division by zero (shouldn't happen with valid archetypes)
  const fitScore = maxPossible > 0 ? (weightedSum / maxPossible) * 100 : 0;

  return {
    fitScore: Math.round(fitScore * 10) / 10, // Round to 1 decimal place
    weightedSum: Math.round(weightedSum * 100) / 100,
    maxPossible: Math.round(maxPossible * 100) / 100,
    archetype,
    breakdown,
  };
}

/**
 * Calculates fit scores for a candidate against multiple archetypes.
 * Useful for showing candidates which roles they're best suited for.
 *
 * @param dimensionScores - Array of dimension scores
 * @param archetypes - Optional array of archetypes to calculate (defaults to all)
 * @returns Array of fit score results sorted by score descending
 */
export function calculateFitScoresForMultipleArchetypes(
  dimensionScores: DimensionScoreInput[],
  archetypes?: RoleArchetype[]
): FitScoreResult[] {
  const targetArchetypes = archetypes ?? (Object.keys(ARCHETYPE_CONFIGS) as RoleArchetype[]);

  const results = targetArchetypes.map((archetype) =>
    calculateFitScore(dimensionScores, archetype)
  );

  // Sort by fit score descending
  return results.sort((a, b) => b.fitScore - a.fitScore);
}

/**
 * Gets the weight multiplier for a specific dimension and archetype.
 * Useful for UI display of weight information.
 *
 * @param archetype - The role archetype
 * @param dimension - The assessment dimension
 * @returns The weight multiplier (1.0, 1.25, or 1.5)
 */
export function getWeightForDimension(
  archetype: RoleArchetype,
  dimension: AssessmentDimension
): number {
  const weightLevel = ARCHETYPE_CONFIGS[archetype][dimension];
  return WEIGHT_MULTIPLIERS[weightLevel];
}

/**
 * Gets the weight level (VERY_HIGH, HIGH, MEDIUM) for a specific dimension and archetype.
 * Useful for UI display of importance indicators.
 *
 * @param archetype - The role archetype
 * @param dimension - The assessment dimension
 * @returns The weight level
 */
export function getWeightLevelForDimension(
  archetype: RoleArchetype,
  dimension: AssessmentDimension
): WeightLevel {
  return ARCHETYPE_CONFIGS[archetype][dimension];
}

/**
 * Gets the human-readable display name for a role archetype.
 *
 * @param archetype - The role archetype
 * @returns Human-readable name
 */
export function getArchetypeDisplayName(archetype: RoleArchetype): string {
  const names: Record<RoleArchetype, string> = {
    SENIOR_FRONTEND_ENGINEER: "Senior Frontend Engineer",
    SENIOR_BACKEND_ENGINEER: "Senior Backend Engineer",
    FULLSTACK_ENGINEER: "Fullstack Engineer",
    ENGINEERING_MANAGER: "Engineering Manager",
    TECH_LEAD: "Tech Lead",
    DEVOPS_ENGINEER: "DevOps Engineer",
    DATA_ENGINEER: "Data Engineer",
    GENERAL_SOFTWARE_ENGINEER: "General Software Engineer",
  };
  return names[archetype];
}

/**
 * Gets all available role archetypes.
 *
 * @returns Array of all archetype identifiers
 */
export function getAllArchetypes(): RoleArchetype[] {
  return Object.keys(ARCHETYPE_CONFIGS) as RoleArchetype[];
}
