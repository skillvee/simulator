"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateComparison } from "./types";

interface WorkStyleSectionProps {
  candidates: CandidateComparison[];
  defaultExpanded?: boolean;
}

export function WorkStyleSection({ candidates, defaultExpanded = true }: WorkStyleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "\u2014";
    return `${minutes} min`;
  };

  const formatAiToolsUsed = (used: boolean): { text: string; color: string } => {
    return used
      ? { text: "Yes", color: "text-green-700" }
      : { text: "No", color: "text-stone-500" };
  };

  const formatTestsStatus = (status: string): { text: string; color: string } => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "passing":
        return { text: "Passing", color: "text-green-700" };
      case "failing":
        return { text: "Failing", color: "text-red-700" };
      case "none":
        return { text: "None", color: "text-stone-500" };
      default:
        return { text: "Unknown", color: "text-stone-500" };
    }
  };

  const metricRows = [
    {
      label: "Total Duration",
      getValue: (candidate: CandidateComparison) =>
        formatDuration(candidate.metrics.totalDurationMinutes),
      getColor: () => "text-stone-900",
    },
    {
      label: "Active Working Time",
      getValue: (candidate: CandidateComparison) =>
        formatDuration(candidate.metrics.workingPhaseMinutes),
      getColor: () => "text-stone-900",
    },
    {
      label: "Coworkers Contacted",
      getValue: (candidate: CandidateComparison) =>
        candidate.metrics.coworkersContacted.toString(),
      getColor: () => "text-stone-900",
    },
    {
      label: "AI Tools Used",
      getValue: (candidate: CandidateComparison) =>
        formatAiToolsUsed(candidate.metrics.aiToolsUsed).text,
      getColor: (candidate: CandidateComparison) =>
        formatAiToolsUsed(candidate.metrics.aiToolsUsed).color,
    },
    {
      label: "CI Tests",
      getValue: (candidate: CandidateComparison) =>
        formatTestsStatus(candidate.metrics.testsStatus).text,
      getColor: (candidate: CandidateComparison) =>
        formatTestsStatus(candidate.metrics.testsStatus).color,
    },
  ];

  return (
    <div className="border-b border-stone-200 bg-white">
      <div
        className="px-6 py-4 border-b border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-stone-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-stone-400" />
          )}
          Work Style
        </h2>
      </div>

      {isExpanded && (
        <div>
          {metricRows.map((row) => (
            <div
              key={row.label}
              className="grid border-b border-stone-200 last:border-b-0"
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
                  <span className={cn("text-sm", row.getColor(candidate))}>
                    {row.getValue(candidate)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
