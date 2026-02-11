import { CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDimensionName } from "./helpers";
import type { CandidateComparison } from "./types";

interface StrengthsGrowthSectionProps {
  candidates: CandidateComparison[];
}

export function StrengthsGrowthSection({ candidates }: StrengthsGrowthSectionProps) {

  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="px-6 py-4 border-b border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900">
          Strengths & Growth Areas
        </h2>
      </div>

      <div>
          {/* Top Strengths Row */}
          <div
            className="grid border-b border-stone-200"
            style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
          >
            <div className="p-4 border-r border-stone-200 flex items-center">
              <span className="font-medium text-stone-700">Top Strengths</span>
            </div>

            {candidates.map((candidate) => (
              <div
                key={candidate.assessmentId}
                className="p-4 border-r border-stone-200 last:border-r-0"
              >
                {candidate.topStrengths.length > 0 ? (
                  <ul className="space-y-3">
                    {candidate.topStrengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-stone-600">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-stone-900">
                              {formatDimensionName(strength.dimension)}
                            </span>
                            <span className="text-stone-400 ml-1">({strength.score}/4)</span>
                            <p className="text-xs text-stone-500 mt-0.5">{strength.description}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-stone-400 italic">No strengths available</span>
                )}
              </div>
            ))}
          </div>

          {/* Growth Areas Row */}
          <div
            className="grid"
            style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
          >
            <div className="p-4 border-r border-stone-200 flex items-center">
              <span className="font-medium text-stone-700">Growth Areas</span>
            </div>

            {candidates.map((candidate) => (
              <div
                key={candidate.assessmentId}
                className="p-4 border-r border-stone-200 last:border-r-0"
              >
                {candidate.growthAreas.length > 0 ? (
                  <ul className="space-y-3">
                    {candidate.growthAreas.map((area, idx) => (
                      <li key={idx} className="text-sm text-stone-600">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-stone-900">
                              {formatDimensionName(area.dimension)}
                            </span>
                            <span className="text-stone-400 ml-1">({area.score}/4)</span>
                            <p className="text-xs text-stone-500 mt-0.5">{area.description}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-stone-400 italic">No growth areas identified</span>
                )}
              </div>
            ))}
          </div>
        </div>
    </div>
  );
}
