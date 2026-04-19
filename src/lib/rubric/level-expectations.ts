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
 *
 * Display strings (level labels, year ranges, relative-strength labels) are
 * intentionally NOT defined here. They live in `src/messages/{en,es}.json`
 * under the `rubric` namespace so they can be localised. Consumers should
 * resolve the slug keys returned by `getRelativeStrength()` and the level
 * keys in `LEVEL_EXPECTATIONS` via `useTranslations("rubric.levels")` /
 * `useTranslations("rubric.relativeStrength")` (or `getTranslations` in
 * server components).
 */

export type TargetLevel = "junior" | "mid" | "senior" | "staff";

export interface LevelExpectation {
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
    expectedScore: 2, // Competent — can do the work with guidance
  },
  mid: {
    expectedScore: 2.5, // Between Competent and Advanced
  },
  senior: {
    expectedScore: 3, // Advanced — works independently, elevates others
  },
  staff: {
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
 * Slug keys for relative-strength labels. Use these as i18n keys under the
 * `rubric.relativeStrength` namespace.
 */
export type RelativeStrengthKey =
  | "exceptional"
  | "strong"
  | "meets"
  | "below";

/**
 * @deprecated Use `RelativeStrengthKey` instead. This English-string union
 * is retained only for legacy callers; new code should pass slug keys back
 * to the UI and translate at the rendering layer.
 */
export type RelativeStrength =
  | "Exceptional"
  | "Strong"
  | "Meets expectations"
  | "Below expectations";

export function getRelativeStrength(
  overallScore: number,
  targetLevel: TargetLevel
): RelativeStrengthKey {
  const expected = LEVEL_EXPECTATIONS[targetLevel].expectedScore;
  const diff = overallScore - expected;

  if (diff >= 1.0) return "exceptional";
  if (diff >= 0.5) return "strong";
  if (diff >= -0.5) return "meets";
  return "below";
}
