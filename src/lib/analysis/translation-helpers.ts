import { AssessmentDimension } from "@prisma/client";
import { getTranslations } from "next-intl/server";

type ScoreLevel = "exceptional" | "strong" | "adequate" | "developing" | "needs_improvement";

export async function getDimensionLabel(
  dimension: AssessmentDimension,
  locale: string
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "assessment.dimensions" });
  return t(dimension);
}

export async function getLevelLabel(
  level: ScoreLevel,
  locale: string
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "assessment.levels" });
  return t(level);
}