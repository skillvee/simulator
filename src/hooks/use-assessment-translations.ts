import { useTranslations } from "next-intl";

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
    const key = dimension.toUpperCase().replace(/ /g, "_");
    if (tDimensions.has(key)) return tDimensions(key);
    return dimension
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  /**
   * Translate a strength level (e.g., "Strong" -> "Fuerte" in Spanish)
   */
  const translateStrengthLevel = (level: string): string => {
    const levelMap: Record<string, string> = {
      "Exceptional": "exceptional",
      "Strong": "strong",
      "Meets expectations": "meetsExpectations",
      "Below expectations": "belowExpectations",
      "Developing": "developing"
    };

    const key = levelMap[level];
    if (key && tLevels.has(key)) return tLevels(key);
    return level;
  };

  return {
    translateDimension,
    translateStrengthLevel
  };
}
