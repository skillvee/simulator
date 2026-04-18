"use client";

import { CheckCircle2, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAssessmentTranslations } from "@/hooks/use-assessment-translations";
import type { CandidateResultsData } from "@/types";

interface StrengthsGrowthSectionProps {
  results: CandidateResultsData;
}

export function CandidateStrengthsGrowthSection({
  results,
}: StrengthsGrowthSectionProps) {
  const t = useTranslations("results.strengthsGrowth");
  const { translateDimension } = useAssessmentTranslations();
  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="px-6 py-4 border-b border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900">
          {t("title")}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200">
        {/* Your Strengths */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">
            {t("strengths.title")}
          </h3>
          {results.topStrengths.length > 0 ? (
            <ul className="space-y-3">
              {results.topStrengths.map((strength, idx) => (
                <li key={idx} className="text-sm text-stone-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-stone-900">
                        {translateDimension(strength.dimension)}
                      </span>
                      <span className="text-stone-400 ml-1">
                        ({strength.score}/{results.scoreScale})
                      </span>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {strength.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-stone-400 italic">
              {t("strengths.empty")}
            </span>
          )}
        </div>

        {/* Areas to Develop */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">
            {t("areasToImprove.title")}
          </h3>
          {results.growthAreas.length > 0 ? (
            <ul className="space-y-3">
              {results.growthAreas.map((area, idx) => (
                <li key={idx} className="text-sm text-stone-600">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-stone-900">
                        {translateDimension(area.dimension)}
                      </span>
                      <span className="text-stone-400 ml-1">
                        ({area.score}/{results.scoreScale})
                      </span>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {area.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-stone-400 italic">
              {t("areasToImprove.empty")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
