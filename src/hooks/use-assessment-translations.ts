import { useTranslations } from "next-intl";
import type { AssessmentDimension } from "@prisma/client";

/**
 * Hook for translating assessment dimensions and strength levels
 */
export function useAssessmentTranslations() {
  const tDimensions = useTranslations("assessment.dimensions");
  const tLevels = useTranslations("assessment.levels");

  /**
   * Translate a dimension name (e.g., "COMMUNICATION" -> "Comunicación" in Spanish)
   */
  const translateDimension = (dimension: string): string => {
    // Handle both SCREAMING_SNAKE_CASE and regular format
    const key = dimension.toUpperCase().replace(/ /g, "_") as AssessmentDimension;
    try {
      return tDimensions(key);
    } catch {
      // Fallback to formatting if translation key doesn't exist
      return dimension
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  };

  /**
   * Translate a strength level (e.g., "Strong" -> "Fuerte" in Spanish)
   */
  const translateStrengthLevel = (level: string): string => {
    // Map the exact strings to our translation keys
    const levelMap: Record<string, string> = {
      "Exceptional": "exceptional",
      "Strong": "strong",
      "Meets expectations": "meetsExpectations",
      "Below expectations": "belowExpectations",
      "Developing": "developing"
    };

    const key = levelMap[level];
    if (key) {
      try {
        return tLevels(key);
      } catch {
        return level;
      }
    }
    return level;
  };

  return {
    translateDimension,
    translateStrengthLevel
  };
}