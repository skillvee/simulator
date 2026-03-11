import { CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDimensionName } from "./helpers";
import type { CandidateComparison } from "./types";

interface StrengthsGrowthSectionProps {
  candidates: CandidateComparison[];
}

export function StrengthsGrowthSection({
  candidates,
}: StrengthsGrowthSectionProps) {
  const isSingle = candidates.length === 1;

  if (isSingle) {
    const candidate = candidates[0];
    return (
      <div className="border-b border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Strengths & Growth Areas
          </h2>
        </div>

        <div className="grid grid-cols-1 divide-y divide-stone-200 md:grid-cols-2 md:divide-x md:divide-y-0">
          {/* Top Strengths */}
          <div className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-stone-700">
              Top Strengths
            </h3>
            {candidate.topStrengths.length > 0 ? (
              <ul className="space-y-3">
                {candidate.topStrengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-stone-600">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <div>
                        <span className="font-medium text-stone-900">
                          {formatDimensionName(strength.dimension)}
                        </span>
                        <span className="ml-1 text-stone-400">
                          ({strength.score}/4)
                        </span>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {strength.description}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm italic text-stone-400">
                No strengths available
              </span>
            )}
          </div>

          {/* Growth Areas */}
          <div className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-stone-700">
              Growth Areas
            </h3>
            {candidate.growthAreas.length > 0 ? (
              <ul className="space-y-3">
                {candidate.growthAreas.map((area, idx) => (
                  <li key={idx} className="text-sm text-stone-600">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
                      <div>
                        <span className="font-medium text-stone-900">
                          {formatDimensionName(area.dimension)}
                        </span>
                        <span className="ml-1 text-stone-400">
                          ({area.score}/4)
                        </span>
                        <p className="mt-0.5 text-xs text-stone-500">
                          {area.description}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm italic text-stone-400">
                No growth areas identified
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Multi-candidate grid layout (original)
  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Strengths & Growth Areas
        </h2>
      </div>

      <div>
        {/* Top Strengths Row */}
        <div
          className="grid border-b border-stone-200"
          style={{
            gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
          }}
        >
          <div className="flex items-center border-r border-stone-200 p-4">
            <span className="font-medium text-stone-700">Top Strengths</span>
          </div>

          {candidates.map((candidate) => (
            <div
              key={candidate.assessmentId}
              className="border-r border-stone-200 p-4 last:border-r-0"
            >
              {candidate.topStrengths.length > 0 ? (
                <ul className="space-y-3">
                  {candidate.topStrengths.map((strength, idx) => (
                    <li key={idx} className="text-sm text-stone-600">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                        <div>
                          <span className="font-medium text-stone-900">
                            {formatDimensionName(strength.dimension)}
                          </span>
                          <span className="ml-1 text-stone-400">
                            ({strength.score}/4)
                          </span>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {strength.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm italic text-stone-400">
                  No strengths available
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Growth Areas Row */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
          }}
        >
          <div className="flex items-center border-r border-stone-200 p-4">
            <span className="font-medium text-stone-700">Growth Areas</span>
          </div>

          {candidates.map((candidate) => (
            <div
              key={candidate.assessmentId}
              className="border-r border-stone-200 p-4 last:border-r-0"
            >
              {candidate.growthAreas.length > 0 ? (
                <ul className="space-y-3">
                  {candidate.growthAreas.map((area, idx) => (
                    <li key={idx} className="text-sm text-stone-600">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
                        <div>
                          <span className="font-medium text-stone-900">
                            {formatDimensionName(area.dimension)}
                          </span>
                          <span className="ml-1 text-stone-400">
                            ({area.score}/4)
                          </span>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {area.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm italic text-stone-400">
                  No growth areas identified
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
