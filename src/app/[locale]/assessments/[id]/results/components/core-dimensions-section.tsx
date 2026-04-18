"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { ScoreDots } from "@/components/assessment/score-dots";
import { useAssessmentTranslations } from "@/hooks/use-assessment-translations";
import type { CandidateResultsData, CandidateDimensionScore } from "@/types";

interface CoreDimensionsSectionProps {
  results: CandidateResultsData;
}

function DimensionDetailContent({
  dimension,
  scoreScale,
}: {
  dimension: CandidateDimensionScore;
  scoreScale: number;
}) {
  const t = useTranslations("results.skillBreakdown");
  return (
    <div className="space-y-3">
      {/* Rationale */}
      <div>
        <p className="text-xs text-stone-600 leading-relaxed">
          {dimension.rationale}
        </p>
      </div>

      {/* What You Demonstrated Well */}
      {dimension.strengths.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-stone-700 mb-1.5">
            {t("demonstratedWell")}
          </h4>
          <ul className="space-y-1">
            {dimension.strengths.map((strength, idx) => (
              <li
                key={idx}
                className="text-xs text-stone-600 flex items-start gap-1.5"
              >
                <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Score context */}
      <div className="pt-2 border-t border-stone-100">
        <p className="text-[11px] text-stone-400">
          {t("score")} {dimension.score}/{scoreScale}
        </p>
      </div>
    </div>
  );
}

export function CandidateCoreDimensionsSection({
  results,
}: CoreDimensionsSectionProps) {
  const t = useTranslations("results.skillBreakdown");
  const { translateDimension } = useAssessmentTranslations();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const allDimensions = useMemo(
    () => results.dimensionScores.map((d) => d.dimension),
    [results.dimensionScores]
  );

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

  return (
    <div className="border-b border-stone-200 bg-white">
      {/* Section Header */}
      <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">
          {t("title")}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            <ChevronDown className="mr-1.5 h-4 w-4" />
            {t("expandAll")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            <ChevronRight className="mr-1.5 h-4 w-4" />
            {t("collapseAll")}
          </Button>
        </div>
      </div>

      {/* Dimension Rows */}
      <div>
        {results.dimensionScores.map((dimScore) => {
          const isExpanded = expandedRows.has(dimScore.dimension);

          return (
            <div
              key={dimScore.dimension}
              className="border-b border-stone-200 last:border-b-0"
            >
              {/* Collapsed Row */}
              <div
                className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 cursor-pointer transition-colors"
                onClick={() => toggleRow(dimScore.dimension)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-stone-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-stone-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-stone-900">
                    {translateDimension(dimScore.dimension)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreDots
                    score={dimScore.score}
                    maxScore={results.scoreScale}
                  />
                  <p className="text-xs text-stone-500 line-clamp-1 max-w-md text-right hidden md:block">
                    {dimScore.summary}
                  </p>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-6 pb-4 pt-0 bg-stone-50/50 border-t border-stone-100">
                  <div className="pl-6 pt-3">
                    <DimensionDetailContent
                      dimension={dimScore}
                      scoreScale={results.scoreScale}
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
