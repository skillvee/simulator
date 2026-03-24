/**
 * Shared assessment display helpers.
 * Used by both recruiter comparison and candidate results views.
 */

export type StrengthLevel = "Exceptional" | "Strong" | "Meets expectations" | "Below expectations";

/**
 * Convert SCREAMING_SNAKE_CASE to Title Case
 * PROBLEM_SOLVING -> Problem Solving
 */
export function formatDimensionName(dimension: string): string {
  return dimension
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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
  if (score >= 1.5) return { bg: "bg-amber-100", text: "text-amber-800", fill: "text-amber-600" };
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
