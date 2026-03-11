"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatDimensionName } from "./helpers";
import type { CandidateComparison } from "./types";

interface EvidenceMoment {
  timestamp: string;
  dimension: string;
  description: string;
}

interface KeyEvidenceSectionProps {
  candidates: CandidateComparison[];
  defaultExpanded?: boolean;
  onTimestampClick: (
    timestamp: string,
    candidateName: string | null,
    videoUrl: string,
    dimensionName?: string
  ) => void;
}

/**
 * Extract 2-3 key video moments from highest and lowest scoring dimensions
 */
function deriveKeyEvidence(candidate: CandidateComparison): EvidenceMoment[] {
  const moments: EvidenceMoment[] = [];
  const sorted = [...candidate.dimensionScores].sort(
    (a, b) => b.score - a.score
  );

  for (const dim of sorted) {
    if (moments.length >= 2) break;
    if (dim.observableBehaviors.length > 0) {
      const ob = dim.observableBehaviors[0];
      moments.push({
        timestamp: ob.timestamp,
        dimension: dim.dimension,
        description: ob.behavior,
      });
    } else if (dim.timestamps.length > 0 && dim.rationale) {
      const description =
        dim.rationale.split(".")[0].substring(0, 80) +
        (dim.rationale.length > 80 ? "..." : "");
      moments.push({
        timestamp: dim.timestamps[0],
        dimension: dim.dimension,
        description,
      });
    }
  }

  const reversed = [...sorted].reverse();
  for (const dim of reversed) {
    if (moments.length >= 3) break;
    const firstTs = dim.observableBehaviors[0]?.timestamp ?? dim.timestamps[0];
    if (moments.some((m) => m.timestamp === firstTs)) continue;

    if (dim.observableBehaviors.length > 0) {
      const ob = dim.observableBehaviors[0];
      moments.push({
        timestamp: ob.timestamp,
        dimension: dim.dimension,
        description: ob.behavior,
      });
    } else if (dim.timestamps.length > 0 && dim.rationale) {
      const description =
        dim.rationale.split(".")[0].substring(0, 80) +
        (dim.rationale.length > 80 ? "..." : "");
      moments.push({
        timestamp: dim.timestamps[0],
        dimension: dim.dimension,
        description,
      });
    }
  }

  return moments;
}

export function KeyEvidenceSection({
  candidates,
  defaultExpanded = false,
  onTimestampClick,
}: KeyEvidenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-stone-200 bg-white">
      <div
        className="flex cursor-pointer items-center justify-between border-b border-stone-200 px-6 py-4 transition-colors hover:bg-stone-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-stone-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-stone-400" />
          )}
          Key Evidence
        </h2>
      </div>

      {isExpanded && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
          }}
        >
          <div className="border-r border-stone-200"></div>

          {candidates.map((candidate) => {
            const moments = deriveKeyEvidence(candidate);
            return (
              <div
                key={candidate.assessmentId}
                className="border-r border-stone-200 p-4 last:border-r-0"
              >
                {moments.length > 0 ? (
                  <ul className="space-y-3">
                    {moments.map((moment, idx) => (
                      <li key={idx} className="text-sm text-stone-600">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTimestampClick(
                              moment.timestamp,
                              candidate.candidateName,
                              candidate.videoUrl,
                              moment.dimension
                            );
                          }}
                          className="inline-flex w-full items-start gap-2 rounded p-2 text-left transition-colors hover:bg-stone-50"
                        >
                          <Badge className="flex-shrink-0 border border-blue-200 bg-blue-100 px-2 py-1 font-mono text-xs text-blue-800 hover:bg-blue-200">
                            [{moment.timestamp}]
                          </Badge>
                          <div className="text-xs">
                            <span className="font-semibold text-stone-900">
                              {formatDimensionName(moment.dimension)}:
                            </span>{" "}
                            <span>{moment.description}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm italic text-stone-400">
                    No evidence available
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
