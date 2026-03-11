"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
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
      <div className="text-sm italic text-stone-400">
        Not assessed on this dimension
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Observable Behaviors */}
      {dimScore.observableBehaviors.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-stone-700">
            Observable Behaviors
          </h4>
          <ul className="space-y-1.5">
            {dimScore.observableBehaviors.map((ob, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-stone-600"
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
                    className="flex-shrink-0 rounded border border-blue-200 bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-800 transition-colors hover:bg-blue-200"
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
          <h4 className="mb-1.5 text-xs font-semibold text-stone-700">
            Positive Signals
          </h4>
          <ul className="space-y-1">
            {dimScore.greenFlags.map((flag, idx) => (
              <li
                key={idx}
                className="flex items-start gap-1.5 text-xs text-stone-600"
              >
                <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-600" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns */}
      {dimScore.redFlags.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-stone-700">
            Concerns
          </h4>
          <ul className="space-y-1">
            {dimScore.redFlags.map((flag, idx) => (
              <li
                key={idx}
                className="flex items-start gap-1.5 text-xs text-stone-600"
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-orange-600" />
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rationale */}
      {dimScore.rationale && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-stone-700">
            Rationale
          </h4>
          <p className="text-xs text-stone-600">{dimScore.rationale}</p>
        </div>
      )}

      {/* Fallback timestamps */}
      {dimScore.observableBehaviors.length === 0 &&
        dimScore.timestamps.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-xs font-semibold text-stone-700">
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
                  className="rounded border border-blue-200 bg-blue-100 px-2 py-1 font-mono text-xs text-blue-800 transition-colors hover:bg-blue-200"
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
  defaultExpanded: _defaultExpanded = false,
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
        const dimScore = c.dimensionScores.find(
          (s) => s.dimension === dimension
        );
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
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-900">
            Core Dimensions
          </h2>
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
              <div
                key={dimension}
                className="border-b border-stone-200 last:border-b-0"
              >
                {/* Collapsed Row */}
                <div
                  className="flex cursor-pointer items-center justify-between px-6 py-4 transition-colors hover:bg-stone-50"
                  onClick={() => toggleRow(dimension)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 flex-shrink-0 text-stone-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-400" />
                    )}
                    <span className="font-medium text-stone-900">
                      {formatDimensionName(dimension)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {dimScore && <ScoreDots score={dimScore.score} />}
                    {dimScore?.summary && (
                      <p className="line-clamp-1 hidden max-w-md text-right text-xs text-stone-500 md:block">
                        {dimScore.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-stone-100 bg-stone-50/50 px-6 pb-4 pt-0">
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
      <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Core Dimensions
        </h2>
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
            <div
              key={dimension}
              className="border-b border-stone-200 last:border-b-0"
            >
              {/* Collapsed Row — compact ScoreDots + one-line summary */}
              <div
                className="grid cursor-pointer transition-colors hover:bg-stone-50"
                style={{
                  gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
                }}
                onClick={() => toggleRow(dimension)}
              >
                {/* Dimension Label */}
                <div className="flex items-center gap-2 border-r border-stone-200 p-4">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-stone-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-400" />
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
                  const isWinner =
                    dimScore && winners.has(candidate.assessmentId);

                  return (
                    <div
                      key={candidate.assessmentId}
                      className={cn(
                        "border-r border-stone-200 p-4 last:border-r-0",
                        isWinner && "bg-blue-50/50"
                      )}
                    >
                      {dimScore ? (
                        <div className="flex items-start gap-3">
                          <ScoreDots score={dimScore.score} />
                          {dimScore.summary && (
                            <p className="line-clamp-1 flex-1 text-xs text-stone-500">
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
                  style={{
                    gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
                  }}
                >
                  <div className="border-r border-stone-200"></div>

                  {candidates.map((candidate) => {
                    const dimScore = candidate.dimensionScores.find(
                      (s) => s.dimension === dimension
                    );
                    const isWinner =
                      dimScore && winners.has(candidate.assessmentId);

                    return (
                      <div
                        key={candidate.assessmentId}
                        className={cn(
                          "border-r border-stone-200 p-4 last:border-r-0",
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
