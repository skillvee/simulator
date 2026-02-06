/**
 * Fit Score Calculator (Rubric System)
 *
 * Computes archetype fit scores and seniority matches using
 * data-driven weights and gates from the database.
 *
 * @since 2026-02-06
 */

import type {
  ArchetypeFitResult,
  ArchetypeSeniorityLevel,
} from "@/types";

// ============================================================================
// Types
// ============================================================================

interface DimensionScoreInput {
  dimensionSlug: string;
  dimensionName: string;
  score: number | null; // 1-4 or null
}

interface ArchetypeWeightInput {
  dimensionSlug: string;
  dimensionName: string;
  weight: number;
}

interface SeniorityGateInput {
  dimensionSlug: string;
  seniorityLevel: ArchetypeSeniorityLevel;
  minScore: number;
}

export interface ArchetypeInput {
  slug: string;
  name: string;
  weights: ArchetypeWeightInput[];
  seniorityGates: SeniorityGateInput[];
}

// ============================================================================
// Fit Score Calculation
// ============================================================================

/**
 * Calculates the weighted fit score for a candidate against an archetype.
 *
 * Formula: fitScore = (sum of score * weight) / (sum of maxScore * weight) * 100
 * where maxScore is 4 (the max rubric level).
 *
 * Only scored dimensions (non-null) are included in the calculation.
 *
 * @param scores - Candidate dimension scores
 * @param archetype - Archetype with weights and gates
 * @returns Fit result with score, seniority match, and breakdowns
 */
export function calculateArchetypeFit(
  scores: DimensionScoreInput[],
  archetype: ArchetypeInput
): ArchetypeFitResult {
  const scoreMap = new Map<string, number>();
  const nameMap = new Map<string, string>();
  for (const s of scores) {
    if (s.score !== null) {
      scoreMap.set(s.dimensionSlug, s.score);
    }
    nameMap.set(s.dimensionSlug, s.dimensionName);
  }

  // Calculate weighted score
  let weightedSum = 0;
  let maxPossible = 0;
  const weightBreakdown: ArchetypeFitResult["weightBreakdown"] = [];

  for (const w of archetype.weights) {
    const rawScore = scoreMap.get(w.dimensionSlug);
    const maxForDimension = 4 * w.weight; // Max score (4) * weight
    maxPossible += maxForDimension;

    if (rawScore !== undefined) {
      const weightedScore = rawScore * w.weight;
      weightedSum += weightedScore;
      weightBreakdown.push({
        dimensionSlug: w.dimensionSlug,
        dimensionName: w.dimensionName,
        rawScore,
        weight: w.weight,
        weightedScore,
      });
    } else {
      weightBreakdown.push({
        dimensionSlug: w.dimensionSlug,
        dimensionName: w.dimensionName,
        rawScore: 0,
        weight: w.weight,
        weightedScore: 0,
      });
    }
  }

  const fitScore =
    maxPossible > 0
      ? Math.round((weightedSum / maxPossible) * 1000) / 10
      : 0;

  // Check seniority gates
  const seniorityLevels: ArchetypeSeniorityLevel[] = [
    "JUNIOR",
    "MID",
    "SENIOR",
  ];
  const gateBreakdown: ArchetypeFitResult["gateBreakdown"] = [];
  let seniorityMatch: ArchetypeSeniorityLevel | null = null;

  for (const level of seniorityLevels) {
    const gatesForLevel = archetype.seniorityGates.filter(
      (g) => g.seniorityLevel === level
    );
    const failingDimensions: string[] = [];

    for (const gate of gatesForLevel) {
      const candidateScore = scoreMap.get(gate.dimensionSlug);
      if (candidateScore === undefined || candidateScore < gate.minScore) {
        failingDimensions.push(
          nameMap.get(gate.dimensionSlug) || gate.dimensionSlug
        );
      }
    }

    const passes = failingDimensions.length === 0;
    gateBreakdown.push({ seniorityLevel: level, passes, failingDimensions });

    if (passes) {
      seniorityMatch = level;
    }
  }

  // Identify strengths and gaps based on weights
  // Sort dimensions by (score * weight) descending for strengths
  const scored = weightBreakdown.filter((w) => w.rawScore > 0);
  const sortedByWeightedScore = [...scored].sort(
    (a, b) => b.weightedScore - a.weightedScore
  );
  const sortedByGap = [...scored].sort(
    (a, b) => a.rawScore - b.rawScore
  );

  const roleRelevantStrengths = sortedByWeightedScore
    .slice(0, 3)
    .map((w) => w.dimensionName);

  const roleRelevantGaps = sortedByGap
    .filter((w) => w.rawScore <= 2)
    .slice(0, 3)
    .map((w) => w.dimensionName);

  return {
    archetypeSlug: archetype.slug,
    archetypeName: archetype.name,
    fitScore,
    seniorityMatch,
    roleRelevantStrengths,
    roleRelevantGaps,
    weightBreakdown,
    gateBreakdown,
  };
}

/**
 * Calculates fit scores for multiple archetypes, sorted by fit score descending.
 */
export function calculateFitForMultipleArchetypes(
  scores: DimensionScoreInput[],
  archetypes: ArchetypeInput[]
): ArchetypeFitResult[] {
  return archetypes
    .map((arch) => calculateArchetypeFit(scores, arch))
    .sort((a, b) => b.fitScore - a.fitScore);
}
