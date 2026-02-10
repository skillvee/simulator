import type { CandidateStrengthLevel } from "./types";

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds
 */
export function parseTimestampToSeconds(timestamp: string): number | null {
  const parts = timestamp.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

/**
 * Format seconds to MM:SS or HH:MM:SS format
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
export function getStrengthBadgeStyles(level: CandidateStrengthLevel): string {
  switch (level) {
    case "Exceptional":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Strong":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "Proficient":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "Developing":
      return "bg-stone-100 text-stone-600 hover:bg-stone-100";
  }
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
