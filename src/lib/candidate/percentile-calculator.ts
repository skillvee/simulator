/**
 * Percentile Calculator for Candidate Scores
 *
 * Calculates percentile rankings for assessment dimension scores
 * relative to all completed assessments in the system.
 *
 * Formula: percentile = (candidates_below / total_candidates) * 100
 *
 * @since 2026-01-31
 * @see Issue #199: US-001
 */

import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

/**
 * Percentile result for a single dimension
 */
export interface DimensionPercentile {
  dimension: string;
  score: number;
  percentile: number;
  rank: number; // 1 = highest, n = lowest
  totalCandidates: number;
}

/**
 * Complete percentile results including all dimensions and overall
 */
export interface PercentileResult {
  /** Percentile for each dimension (keyed by rubric dimension slug) */
  dimensions: Record<string, number>;
  /** Overall score percentile */
  overall: number;
  /** Metadata about the calculation */
  metadata: {
    calculatedAt: string;
    totalCandidates: number;
    assessmentId: string;
  };
}

/**
 * Map of dimension name to percentile value for storage
 */
export type PercentileMap = Record<string, number>;

// ============================================================================
// Percentile Calculation
// ============================================================================

/**
 * Calculates percentiles for a specific assessment relative to all completed assessments.
 *
 * For each dimension:
 * 1. Count how many completed assessments scored lower
 * 2. Divide by total completed assessments
 * 3. Multiply by 100 for percentage
 *
 * For overall score:
 * 1. Calculate average score across all dimensions for this assessment
 * 2. Compare to average scores of all other assessments
 *
 * @param assessmentId - The assessment ID to calculate percentiles for
 * @returns PercentileResult with dimension and overall percentiles
 * @throws Error if assessment not found or has no scores
 */
export async function calculatePercentiles(
  assessmentId: string
): Promise<PercentileResult> {
  // Get the video assessment linked to this assessment
  const videoAssessment = await db.videoAssessment.findFirst({
    where: {
      assessmentId,
      status: VideoAssessmentStatus.COMPLETED,
    },
    include: {
      scores: true,
    },
  });

  if (!videoAssessment) {
    throw new Error(
      `No completed video assessment found for assessment ID: ${assessmentId}`
    );
  }

  if (videoAssessment.scores.length === 0) {
    throw new Error(
      `No dimension scores found for video assessment: ${videoAssessment.id}`
    );
  }

  // Get all completed assessments with their scores for comparison
  const allCompletedAssessments = await db.videoAssessment.findMany({
    where: {
      status: VideoAssessmentStatus.COMPLETED,
    },
    include: {
      scores: true,
    },
  });

  // Filter to only assessments with scores
  const assessmentsWithScores = allCompletedAssessments.filter(
    (a) => a.scores.length > 0
  );

  const totalCandidates = assessmentsWithScores.length;

  if (totalCandidates === 0) {
    throw new Error("No completed assessments with scores found for comparison");
  }

  // Build score maps for efficient lookup
  const targetScoreMap = new Map<string, number>();
  for (const score of videoAssessment.scores) {
    targetScoreMap.set(score.dimension, score.score);
  }

  // Build maps of all scores by dimension
  const dimensionScoreLists = new Map<string, number[]>();
  const overallScores: { assessmentId: string; average: number }[] = [];

  for (const assessment of assessmentsWithScores) {
    // Collect dimension scores
    let sum = 0;
    let count = 0;

    for (const score of assessment.scores) {
      const existing = dimensionScoreLists.get(score.dimension) ?? [];
      existing.push(score.score);
      dimensionScoreLists.set(score.dimension, existing);
      sum += score.score;
      count++;
    }

    // Calculate overall average for this assessment
    if (count > 0) {
      overallScores.push({
        assessmentId: assessment.id,
        average: sum / count,
      });
    }
  }

  // Calculate percentiles for each dimension the target assessment was scored on
  const dimensionPercentiles: Record<string, number> = {};

  for (const [dimension, targetScore] of targetScoreMap.entries()) {
    const allScores = dimensionScoreLists.get(dimension) ?? [];

    if (allScores.length === 0) {
      dimensionPercentiles[dimension] = 50;
      continue;
    }

    // Count how many scored strictly lower
    const scoredBelow = allScores.filter((s) => s < targetScore).length;

    // Percentile formula: (count below / total) * 100
    const percentile = (scoredBelow / allScores.length) * 100;
    dimensionPercentiles[dimension] = Math.round(percentile);
  }

  // Calculate overall percentile
  const targetOverall = calculateAverageScore(videoAssessment.scores);
  const scoredBelowOverall = overallScores.filter(
    (s) => s.average < targetOverall
  ).length;
  const overallPercentile = (scoredBelowOverall / overallScores.length) * 100;

  return {
    dimensions: dimensionPercentiles,
    overall: Math.round(overallPercentile),
    metadata: {
      calculatedAt: new Date().toISOString(),
      totalCandidates,
      assessmentId,
    },
  };
}

/**
 * Calculates percentiles and stores them in the assessment report.
 *
 * This function is idempotent - calling it multiple times will update
 * the stored percentiles with fresh calculations.
 *
 * @param assessmentId - The assessment ID to calculate and store percentiles for
 * @returns The calculated percentile result
 */
export async function calculateAndStorePercentiles(
  assessmentId: string
): Promise<PercentileResult> {
  const result = await calculatePercentiles(assessmentId);

  // Get current report
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: { report: true },
  });

  // Merge percentiles into existing report (or create new report structure)
  const currentReport = (assessment?.report as Record<string, unknown>) ?? {};
  const updatedReport = {
    ...currentReport,
    percentiles: {
      dimensions: result.dimensions,
      overall: result.overall,
      calculatedAt: result.metadata.calculatedAt,
      totalCandidates: result.metadata.totalCandidates,
    },
  };

  // Update the assessment with percentiles
  await db.assessment.update({
    where: { id: assessmentId },
    data: { report: updatedReport },
  });

  return result;
}

/**
 * Gets stored percentiles from an assessment report.
 *
 * @param assessmentId - The assessment ID to get percentiles for
 * @returns Stored percentiles or null if not calculated
 */
export async function getStoredPercentiles(
  assessmentId: string
): Promise<PercentileMap | null> {
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: { report: true },
  });

  if (!assessment?.report) {
    return null;
  }

  const report = assessment.report as Record<string, unknown>;
  const percentiles = report.percentiles as
    | { dimensions: PercentileMap; overall: number }
    | undefined;

  if (!percentiles) {
    return null;
  }

  // Return a flat map combining dimensions and overall
  return {
    ...percentiles.dimensions,
    overall: percentiles.overall,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates the average score across all dimensions.
 *
 * @param scores - Array of dimension scores
 * @returns Average score (1-5 scale)
 */
function calculateAverageScore(
  scores: Array<{ score: number }>
): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  return sum / scores.length;
}

/**
 * Gets the percentile description for display.
 *
 * @param percentile - Percentile value (0-100)
 * @returns Human-readable description
 */
export function getPercentileDescription(percentile: number): string {
  if (percentile >= 90) return "Top 10%";
  if (percentile >= 75) return "Top 25%";
  if (percentile >= 50) return "Above average";
  if (percentile >= 25) return "Below average";
  return "Bottom 25%";
}

/**
 * Recalculates percentiles for all completed assessments.
 * Useful when the candidate pool changes significantly.
 *
 * @returns Number of assessments updated
 */
export async function recalculateAllPercentiles(): Promise<number> {
  // Get all completed assessments with linked video assessments
  const assessments = await db.assessment.findMany({
    where: {
      status: "COMPLETED",
      videoAssessment: {
        status: VideoAssessmentStatus.COMPLETED,
      },
    },
    select: { id: true },
  });

  let updatedCount = 0;

  for (const assessment of assessments) {
    try {
      await calculateAndStorePercentiles(assessment.id);
      updatedCount++;
    } catch {
      // Skip assessments that fail (e.g., no scores)
      console.warn(
        `Failed to calculate percentiles for assessment ${assessment.id}`
      );
    }
  }

  return updatedCount;
}
