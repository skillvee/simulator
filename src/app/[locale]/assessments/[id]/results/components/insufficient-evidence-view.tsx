"use client";

import { Info } from "lucide-react";
import type { CandidateResultsData } from "@/types";

interface InsufficientEvidenceViewProps {
  results: CandidateResultsData;
}

export function InsufficientEvidenceView({
  results,
}: InsufficientEvidenceViewProps) {
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
              Not enough to give you a full evaluation
            </h3>
            <p className="text-sm text-stone-600 mt-1 leading-relaxed">
              This assessment session was too short or didn&apos;t capture
              enough of your work for us to evaluate you on all dimensions.
              Below is a summary of what was observed.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-200 px-6 py-4">
        <h3 className="text-sm font-semibold text-stone-700 mb-2">
          What we observed
        </h3>
        <p className="text-sm text-stone-600 leading-relaxed">
          {results.overallSummary}
        </p>
      </div>
    </div>
  );
}
