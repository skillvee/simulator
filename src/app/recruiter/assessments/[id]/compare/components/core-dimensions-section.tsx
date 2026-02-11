"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDimensionName } from "./helpers";
import { ScoreDots } from "./score-dots";
import type { CandidateComparison } from "./types";

interface CoreDimensionsSectionProps {
  candidates: CandidateComparison[];
  defaultExpanded?: boolean;
  onTimestampClick: (
    timestamp: string,
    candidateName: string | null,
    videoUrl: string,
    dimensionName?: string
  ) => void;
}

function DimensionDetailContent({
  candidate,
  dimension,
  onTimestampClick,
}: {
  candidate: CandidateComparison;
  dimension: string;
  onTimestampClick: CoreDimensionsSectionProps["onTimestampClick"];
}) {
  const dimScore = candidate.dimensionScores.find(
    (s) => s.dimension === dimension
  );

  if (!dimScore) {
    return (
      <div className="text-sm text-stone-400 italic">
        Not assessed on this dimension
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Observable Behaviors */}
      {dimScore.observableBehaviors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-stone-700 mb-1.5">
            Observable Behaviors
          </h4>
          <ul className="space-y-1.5">
            {dimScore.observableBehaviors.map((ob, idx) => (
              <li
                key={idx}
                className="text-xs text-stone-600 flex items-start gap-2"
              >
                {ob.timestamp && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTimestampClick(
                        ob.timestamp,
                        candidate.candidateName,
                        candidate.videoUrl,
                        dimension
                      );
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-100 text-blue-800 hover:bg-blue-200 rounded border border-blue-200 transition-colors flex-shrink-0"
                  >
                    {ob.timestamp}
                  </button>
                )}
                <span>{ob.behavior}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Positive Signals */}
      {dimScore.greenFlags.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-stone-700 mb-1.5">
            Positive Signals
          </h4>
          <ul className="space-y-1">
            {dimScore.greenFlags.map((flag, idx) => (
              <li
                key={idx}
                className="text-xs text-stone-600 flex items-start gap-1.5"
              >
                <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns */}
      {dimScore.redFlags.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-stone-700 mb-1.5">
            Concerns
          </h4>
          <ul className="space-y-1">
            {dimScore.redFlags.map((flag, idx) => (
              <li
                key={idx}
                className="text-xs text-stone-600 flex items-start gap-1.5"
              >
                <AlertTriangle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rationale */}
      {dimScore.rationale && (
        <div>
          <h4 className="text-xs font-semibold text-stone-700 mb-1">
            Rationale
          </h4>
          <p className="text-xs text-stone-600">{dimScore.rationale}</p>
        </div>
      )}

      {/* Fallback timestamps */}
      {dimScore.observableBehaviors.length === 0 && dimScore.timestamps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-stone-700 mb-1.5">
            Evidence Timestamps
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {dimScore.timestamps.map((timestamp, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onTimestampClick(
                    timestamp,
                    candidate.candidateName,
                    candidate.videoUrl,
                    dimension
                  );
                }}
                className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 hover:bg-blue-200 rounded border border-blue-200 transition-colors"
              >
                [{timestamp}]
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CoreDimensionsSection({
  candidates,
  defaultExpanded = false,
  onTimestampClick,
}: CoreDimensionsSectionProps) {
  const isSingle = candidates.length === 1;
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const allDimensions = useMemo(() => {
    const dimensionSet = new Set<string>();
    candidates.forEach((candidate) => {
      candidate.dimensionScores.forEach((score) => {
        dimensionSet.add(score.dimension);
      });
    });
    return Array.from(dimensionSet).sort();
  }, [candidates]);

  const toggleRow = (dimension: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(dimension)) {
        next.delete(dimension);
      } else {
        next.add(dimension);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedRows(new Set(allDimensions));
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  const getDimensionWinners = (dimension: string): Set<string> => {
    if (isSingle) return new Set();
    const scores = candidates
      .map((c) => {
        const dimScore = c.dimensionScores.find((s) => s.dimension === dimension);
        return { assessmentId: c.assessmentId, score: dimScore?.score ?? null };
      })
      .filter((item) => item.score !== null);

    if (scores.length === 0) return new Set();

    const maxScore = Math.max(...scores.map((s) => s.score!));
    return new Set(
      scores.filter((s) => s.score === maxScore).map((s) => s.assessmentId)
    );
  };

  // Single candidate: stacked layout without label column
  if (isSingle) {
    const candidate = candidates[0];
    return (
      <div className="border-b border-stone-200 bg-white">
        {/* Section Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Core Dimensions</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="text-sm text-stone-600 hover:text-stone-900"
            >
              <ChevronDown className="mr-1.5 h-4 w-4" />
              Expand All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="text-sm text-stone-600 hover:text-stone-900"
            >
              <ChevronRight className="mr-1.5 h-4 w-4" />
              Collapse All
            </Button>
          </div>
        </div>

        {/* Dimension Rows */}
        <div>
          {allDimensions.map((dimension) => {
            const isExpanded = expandedRows.has(dimension);
            const dimScore = candidate.dimensionScores.find(
              (s) => s.dimension === dimension
            );

            return (
              <div key={dimension} className="border-b border-stone-200 last:border-b-0">
                {/* Collapsed Row */}
                <div
                  className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 cursor-pointer transition-colors"
                  onClick={() => toggleRow(dimension)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-stone-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-stone-400 flex-shrink-0" />
                    )}
                    <span className="font-medium text-stone-900">
                      {formatDimensionName(dimension)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {dimScore && <ScoreDots score={dimScore.score} />}
                    {dimScore?.summary && (
                      <p className="text-xs text-stone-500 line-clamp-1 max-w-md text-right hidden md:block">
                        {dimScore.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-4 pt-0 bg-stone-50/50 border-t border-stone-100">
                    <div className="pl-6 pt-3">
                      <DimensionDetailContent
                        candidate={candidate}
                        dimension={dimension}
                        onTimestampClick={onTimestampClick}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Multi-candidate grid layout (original)
  return (
    <div className="border-b border-stone-200 bg-white">
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Core Dimensions</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            <ChevronDown className="mr-1.5 h-4 w-4" />
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            <ChevronRight className="mr-1.5 h-4 w-4" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Dimension Rows */}
      <div>
        {allDimensions.map((dimension) => {
          const isExpanded = expandedRows.has(dimension);
          const winners = getDimensionWinners(dimension);

          return (
            <div key={dimension} className="border-b border-stone-200 last:border-b-0">
              {/* Collapsed Row — compact ScoreDots + one-line summary */}
              <div
                className="grid hover:bg-stone-50 cursor-pointer transition-colors"
                style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
                onClick={() => toggleRow(dimension)}
              >
                {/* Dimension Label */}
                <div className="p-4 border-r border-stone-200 flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-stone-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-stone-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-stone-900">
                    {formatDimensionName(dimension)}
                  </span>
                </div>

                {/* Candidate Columns */}
                {candidates.map((candidate) => {
                  const dimScore = candidate.dimensionScores.find(
                    (s) => s.dimension === dimension
                  );
                  const isWinner = dimScore && winners.has(candidate.assessmentId);

                  return (
                    <div
                      key={candidate.assessmentId}
                      className={cn(
                        "p-4 border-r border-stone-200 last:border-r-0",
                        isWinner && "bg-blue-50/50"
                      )}
                    >
                      {dimScore ? (
                        <div className="flex items-start gap-3">
                          <ScoreDots score={dimScore.score} />
                          {dimScore.summary && (
                            <p className="text-xs text-stone-500 line-clamp-1 flex-1">
                              {dimScore.summary}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-stone-400">N/A</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expanded Row Details */}
              {isExpanded && (
                <div
                  className="grid bg-stone-50/50"
                  style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
                >
                  <div className="border-r border-stone-200"></div>

                  {candidates.map((candidate) => {
                    const dimScore = candidate.dimensionScores.find(
                      (s) => s.dimension === dimension
                    );
                    const isWinner = dimScore && winners.has(candidate.assessmentId);

                    return (
                      <div
                        key={candidate.assessmentId}
                        className={cn(
                          "p-4 border-r border-stone-200 last:border-r-0",
                          isWinner && "bg-blue-50/50"
                        )}
                      >
                        <DimensionDetailContent
                          candidate={candidate}
                          dimension={dimension}
                          onTimestampClick={onTimestampClick}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
