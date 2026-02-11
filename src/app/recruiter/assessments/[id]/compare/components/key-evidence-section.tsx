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
  const sorted = [...candidate.dimensionScores].sort((a, b) => b.score - a.score);

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
      const description = dim.rationale.split('.')[0].substring(0, 80) + (dim.rationale.length > 80 ? '...' : '');
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
    if (moments.some(m => m.timestamp === firstTs)) continue;

    if (dim.observableBehaviors.length > 0) {
      const ob = dim.observableBehaviors[0];
      moments.push({
        timestamp: ob.timestamp,
        dimension: dim.dimension,
        description: ob.behavior,
      });
    } else if (dim.timestamps.length > 0 && dim.rationale) {
      const description = dim.rationale.split('.')[0].substring(0, 80) + (dim.rationale.length > 80 ? '...' : '');
      moments.push({
        timestamp: dim.timestamps[0],
        dimension: dim.dimension,
        description,
      });
    }
  }

  return moments;
}

export function KeyEvidenceSection({ candidates, defaultExpanded = false, onTimestampClick }: KeyEvidenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
          Key Evidence
        </h2>
      </div>

      {isExpanded && (
        <div
          className="grid"
          style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
        >
          <div className="border-r border-stone-200"></div>

          {candidates.map((candidate) => {
            const moments = deriveKeyEvidence(candidate);
            return (
              <div
                key={candidate.assessmentId}
                className="p-4 border-r border-stone-200 last:border-r-0"
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
                          className="inline-flex items-start gap-2 text-left w-full hover:bg-stone-50 p-2 rounded transition-colors"
                        >
                          <Badge className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200 flex-shrink-0">
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
                  <span className="text-sm text-stone-400 italic">No evidence available</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
