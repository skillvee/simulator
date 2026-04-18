/**
 * Shared assessment display helpers.
 * Used by both recruiter comparison and candidate results views.
 */

export type StrengthLevel = "Exceptional" | "Strong" | "Meets expectations" | "Below expectations";

/**
 * Get strength level badge styling
 */
export function getStrengthBadgeStyles(level: StrengthLevel | string): string {
  switch (level) {
    case "Exceptional":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Strong":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "Meets expectations":
      return "bg-stone-100 text-stone-700 hover:bg-stone-100";
    case "Below expectations":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    default:
      return "bg-stone-100 text-stone-700 hover:bg-stone-100";
  }
}

/**
 * Get color classes for a score value (0-4 scale)
 */
export function getScoreColor(score: number): {
  bg: string;
  text: string;
  fill: string;
} {
  if (score >= 3.5) return { bg: "bg-green-100", text: "text-green-800", fill: "text-green-600" };
  if (score >= 2.5) return { bg: "bg-blue-100", text: "text-blue-800", fill: "text-blue-600" };
  if (score >= 1.5) return { bg: "bg-stone-100", text: "text-stone-700", fill: "text-stone-500" };
  return { bg: "bg-red-100", text: "text-red-800", fill: "text-red-600" };
}

/**
 * Get confidence badge styling
 */
export function getConfidenceBadgeStyles(confidence: string): string {
  switch (confidence.toLowerCase()) {
    case "high":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-red-100 text-red-800";
    default:
      return "bg-stone-100 text-stone-600";
  }
}

/**
 * Convert score to bucket (0-3) for visualization
 */
export function scoreToBucket(score: number, scoreScale: 4 | 5): number {
  const normalizedScore = scoreScale === 5 ? (score - 1) / 4 : score / 4;
  if (normalizedScore >= 0.875) return 3; // Exceptional
  if (normalizedScore >= 0.625) return 2; // Strong
  if (normalizedScore >= 0.375) return 1; // Meets expectations
  return 0; // Below expectations
}
