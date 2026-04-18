"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CandidateResultsData } from "@/types";

interface InsufficientEvidenceViewProps {
  results: CandidateResultsData;
}

export function InsufficientEvidenceView({
  results,
}: InsufficientEvidenceViewProps) {
  const t = useTranslations("results.insufficientEvidence");
  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          {results.companyName}
        </p>
        <h2 className="text-xl font-semibold text-stone-900">
          {results.scenarioName}
        </h2>
      </div>

      <div className="mx-6 mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              {t("title")}
            </h3>
            <p className="text-sm text-stone-600 mt-1 leading-relaxed">
              {t("description")}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-200 px-6 py-4">
        <h3 className="text-sm font-semibold text-stone-700 mb-2">
          {t("observedTitle")}
        </h3>
        <p className="text-sm text-stone-600 leading-relaxed">
          {results.overallSummary}
        </p>
      </div>
    </div>
  );
}
