import { cn } from "@/lib/utils";
import type { CandidateComparison } from "./types";

interface WorkStyleSectionProps {
  candidates: CandidateComparison[];
}

export function WorkStyleSection({ candidates }: WorkStyleSectionProps) {
  const isSingle = candidates.length === 1;

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "\u2014";
    return `${minutes} min`;
  };

  const getAiUsageColor = (level: string): string => {
    switch (level) {
      case "Expert": return "text-blue-700";
      case "Strong": return "text-green-700";
      case "Basic": return "text-yellow-700";
      default: return "text-stone-500";
    }
  };

  const metricRows = [
    {
      label: "Total Duration",
      getValue: (candidate: CandidateComparison) =>
        formatDuration(candidate.metrics.totalDurationMinutes),
    },
    {
      label: "Active Working Time",
      getValue: (candidate: CandidateComparison) =>
        formatDuration(candidate.metrics.workingPhaseMinutes),
    },
    {
      label: "Coworkers Contacted",
      getValue: (candidate: CandidateComparison) =>
        candidate.metrics.coworkersContacted.toString(),
    },
    {
      label: "Voice Calls",
      getValue: (candidate: CandidateComparison) =>
        candidate.metrics.voiceCallMinutes > 0
          ? `${candidate.metrics.voiceCallMinutes} min`
          : "\u2014",
    },
    {
      label: "Messages Sent",
      getValue: (candidate: CandidateComparison) =>
        candidate.metrics.messageWordCount > 0
          ? `${candidate.metrics.messageWordCount.toLocaleString()} words`
          : "\u2014",
    },
  ];

  // Single candidate: horizontal key-value layout
  if (isSingle) {
    const candidate = candidates[0];
    const { aiUsage } = candidate.metrics;

    return (
      <div className="border-b border-stone-200 bg-white">
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-900">Work Style</h2>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
            {metricRows.map((row) => (
              <div key={row.label}>
                <p className="text-xs font-medium text-stone-500 mb-0.5">{row.label}</p>
                <p className="text-sm font-medium text-stone-900">{row.getValue(candidate)}</p>
              </div>
            ))}

            {/* AI Usage */}
            <div className="col-span-2 md:col-span-3 pt-2 border-t border-stone-100">
              <p className="text-xs font-medium text-stone-500 mb-1">AI Usage</p>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-sm font-semibold", getAiUsageColor(aiUsage.level))}>
                  {aiUsage.level}
                </span>
                <span className="text-xs text-stone-400">({aiUsage.score}/4)</span>
              </div>
              {aiUsage.behaviors.length > 0 && (
                <ul className="space-y-1 mt-1">
                  {aiUsage.behaviors.map((behavior, idx) => (
                    <li key={idx} className="text-xs text-stone-500 leading-snug">
                      {behavior}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multi-candidate grid layout (original)
  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="px-6 py-4 border-b border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900">
          Work Style
        </h2>
      </div>

      <div>
          {metricRows.map((row) => (
            <div
              key={row.label}
              className="grid border-b border-stone-200"
              style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
            >
              <div className="p-4 border-r border-stone-200 flex items-center">
                <span className="font-medium text-stone-900">{row.label}</span>
              </div>

              {candidates.map((candidate) => (
                <div
                  key={candidate.assessmentId}
                  className="p-4 border-r border-stone-200 last:border-r-0 flex items-center"
                >
                  <span className="text-sm text-stone-900">
                    {row.getValue(candidate)}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {/* AI Usage row — richer than a simple metric */}
          <div
            className="grid"
            style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
          >
            <div className="p-4 border-r border-stone-200 flex items-center">
              <span className="font-medium text-stone-900">AI Usage</span>
            </div>

            {candidates.map((candidate) => {
              const { aiUsage } = candidate.metrics;
              return (
                <div
                  key={candidate.assessmentId}
                  className="p-4 border-r border-stone-200 last:border-r-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-sm font-semibold", getAiUsageColor(aiUsage.level))}>
                      {aiUsage.level}
                    </span>
                    <span className="text-xs text-stone-400">({aiUsage.score}/4)</span>
                  </div>
                  {aiUsage.behaviors.length > 0 && (
                    <ul className="space-y-1 mt-1.5">
                      {aiUsage.behaviors.map((behavior, idx) => (
                        <li key={idx} className="text-xs text-stone-500 leading-snug">
                          {behavior}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}
