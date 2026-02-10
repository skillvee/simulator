"use client";

import { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  getInitials,
  getStrengthBadgeStyles,
  getConfidenceBadgeStyles,
  formatDimensionName,
} from "./helpers";
import type { CandidateComparison } from "./types";

// Chart colors matching the CSS variables from globals.css
const CHART_COLORS = [
  "hsl(12, 76%, 61%)", // chart-1: Orange
  "hsl(173, 58%, 39%)", // chart-2: Teal
  "hsl(197, 37%, 24%)", // chart-3: Blue-dark
  "hsl(43, 74%, 66%)", // chart-4: Yellow
  "hsl(27, 87%, 67%)", // chart-5: Orange-warm
];

interface RadarChartOverviewProps {
  candidates: CandidateComparison[];
  winnerIds: Set<string>;
  showPercentiles: boolean;
  totalCandidatesInSimulation: number;
}

export function RadarChartOverview({
  candidates,
  winnerIds,
  showPercentiles,
  totalCandidatesInSimulation,
}: RadarChartOverviewProps) {
  // Transform data for radar chart
  const radarData = useMemo(() => {
    const allDimensions = new Set<string>();
    candidates.forEach((c) =>
      c.dimensionScores.forEach((d) => allDimensions.add(d.dimension))
    );

    return Array.from(allDimensions)
      .sort()
      .map((dim) => {
        const point: Record<string, string | number> = {
          dimension: formatDimensionName(dim),
          fullMark: 4,
        };
        candidates.forEach((c, idx) => {
          const score = c.dimensionScores.find(
            (d) => d.dimension === dim
          );
          point[`candidate${idx}`] = score?.score ?? 0;
        });
        return point;
      });
  }, [candidates]);

  // Build chart config for colors and labels
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    candidates.forEach((c, idx) => {
      config[`candidate${idx}`] = {
        label: c.candidateName || `Candidate ${idx + 1}`,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });
    return config;
  }, [candidates]);

  return (
    <div className="border-b border-stone-200 bg-white">
      {/* Radar Chart */}
      <div className="px-6 pt-6 pb-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px]"
        >
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 4]}
              tickCount={5}
              tick={{ fontSize: 10 }}
            />
            {candidates.map((_, idx) => (
              <Radar
                key={idx}
                name={
                  candidates[idx].candidateName ||
                  `Candidate ${idx + 1}`
                }
                dataKey={`candidate${idx}`}
                stroke={`var(--color-candidate${idx})`}
                fill={`var(--color-candidate${idx})`}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </RadarChart>
        </ChartContainer>
      </div>

      {/* Candidate Overview Cards */}
      <div
        className="grid border-t border-stone-200"
        style={{
          gridTemplateColumns: `repeat(${candidates.length}, 1fr)`,
        }}
      >
        {candidates.map((candidate, idx) => {
          const isWinner = winnerIds.has(candidate.assessmentId);
          return (
            <div
              key={candidate.assessmentId}
              className={cn(
                "p-5 border-r border-stone-200 last:border-r-0 flex flex-col items-center gap-3",
                isWinner && "bg-blue-50/50"
              )}
            >
              {/* Avatar + Name */}
              <div className="flex items-center gap-2">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{
                    backgroundColor:
                      CHART_COLORS[idx % CHART_COLORS.length],
                  }}
                >
                  {getInitials(candidate.candidateName)}
                </div>
                <span className="font-semibold text-stone-900">
                  {candidate.candidateName || "Anonymous"}
                </span>
              </div>

              {/* Score Circle */}
              <div
                className={cn(
                  "h-20 w-20 rounded-full flex items-center justify-center border-4",
                  isWinner
                    ? "border-blue-600 bg-blue-50"
                    : "border-stone-200 bg-stone-50"
                )}
              >
                <span
                  className={cn(
                    "text-2xl font-bold",
                    isWinner ? "text-blue-600" : "text-stone-900"
                  )}
                >
                  {candidate.overallScore.toFixed(1)}
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-col items-center gap-1.5">
                <Badge
                  className={getStrengthBadgeStyles(
                    candidate.strengthLevel
                  )}
                >
                  {candidate.strengthLevel}
                </Badge>

                {showPercentiles && (
                  <Badge variant="outline" className="text-xs">
                    Top{" "}
                    {Math.round(
                      100 - candidate.overallPercentile
                    )}
                    %
                    <span className="text-stone-400 ml-1">
                      of {totalCandidatesInSimulation}
                    </span>
                  </Badge>
                )}

                <Badge
                  className={cn(
                    "text-xs",
                    getConfidenceBadgeStyles(candidate.confidence)
                  )}
                >
                  {candidate.confidence} confidence
                </Badge>
              </div>

              {/* Summary */}
              <p className="text-sm text-stone-600 text-center leading-relaxed line-clamp-3">
                {candidate.summary || "No summary available"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
