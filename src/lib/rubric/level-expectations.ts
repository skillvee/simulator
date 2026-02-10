/**
 * Level Expectations
 *
 * Defines the expected dimension scores for each seniority level.
 * Scores use the 1-4 rubric scale:
 *   1 = Foundational
 *   2 = Competent
 *   3 = Advanced
 *   4 = Expert
 *
 * These expectations provide role-relative context when viewing candidate
 * scores. A score of 3 for a Junior hire "exceeds expectations" while the
 * same score for a Staff hire merely "meets expectations."
 */

export type TargetLevel = "junior" | "mid" | "senior" | "staff";

export interface LevelExpectation {
  label: string;
  yearsRange: string;
  expectedScore: number;
}

/**
 * Expected scores per seniority level.
 *
 * These are the same across all dimensions — the rubric already encodes
 * dimension-specific behaviors at each level (Foundational through Expert).
 * The expected score represents "what good looks like" for someone at this level.
 */
export const LEVEL_EXPECTATIONS: Record<TargetLevel, LevelExpectation> = {
  junior: {
    label: "Junior",
    yearsRange: "0-2 years",
    expectedScore: 2, // Competent — can do the work with guidance
  },
  mid: {
    label: "Mid-Level",
    yearsRange: "2-5 years",
    expectedScore: 2.5, // Between Competent and Advanced
  },
  senior: {
    label: "Senior",
    yearsRange: "5-8 years",
    expectedScore: 3, // Advanced — works independently, elevates others
  },
  staff: {
    label: "Staff",
    yearsRange: "8+ years",
    expectedScore: 3.5, // Between Advanced and Expert
  },
};

export type FitLevel =
  | "exceeds"     // Score is above expected
  | "meets"       // Score is at expected (+/- 0.5)
  | "below";      // Score is below expected

/**
 * Determine how a score relates to the expected score for a target level.
 */
export function getScoreFit(
  score: number,
  targetLevel: TargetLevel
): FitLevel {
  const expected = LEVEL_EXPECTATIONS[targetLevel].expectedScore;
  const diff = score - expected;

  if (diff >= 0.5) return "exceeds";
  if (diff >= -0.5) return "meets";
  return "below";
}

/**
 * Determine the overall strength label relative to the target level.
 */
export type RelativeStrength =
  | "Exceptional"
  | "Strong"
  | "Meets expectations"
  | "Below expectations";

export function getRelativeStrength(
  overallScore: number,
  targetLevel: TargetLevel
): RelativeStrength {
  const expected = LEVEL_EXPECTATIONS[targetLevel].expectedScore;
  const diff = overallScore - expected;

  if (diff >= 1.0) return "Exceptional";
  if (diff >= 0.5) return "Strong";
  if (diff >= -0.5) return "Meets expectations";
  return "Below expectations";
}
