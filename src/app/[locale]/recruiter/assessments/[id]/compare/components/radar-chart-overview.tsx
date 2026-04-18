"use client";

import { useMemo, useState } from "react";
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
  formatDimensionName,
} from "./helpers";
import type { CandidateComparison } from "./types";

// Custom tick renderer that wraps long labels onto multiple lines
function CustomAngleTick({
  payload,
  x,
  y,
  textAnchor,
  ...rest
}: {
  payload: { value: string };
  x: number;
  y: number;
  textAnchor: "start" | "end" | "inherit" | "middle" | undefined;
  [key: string]: unknown;
}) {
  const words = payload.value.split(" ");
  return (
    <text
      {...rest}
      x={x}
      y={y}
      textAnchor={textAnchor}
      fontSize={11}
      fill="hsl(var(--muted-foreground))"
    >
      {words.map((word, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>
          {word}
        </tspan>
      ))}
    </text>
  );
}

// Chart colors matching the CSS variables from globals.css
const CHART_COLORS = [
  "hsl(12, 76%, 61%)", // chart-1: Orange
  "hsl(173, 58%, 39%)", // chart-2: Teal
  "hsl(197, 37%, 24%)", // chart-3: Blue-dark
  "hsl(43, 74%, 66%)", // chart-4: Yellow
  "hsl(27, 87%, 67%)", // chart-5: Orange-warm
];

function SummaryRow({ candidates }: { candidates: CandidateComparison[] }) {
  const [expanded, setExpanded] = useState(false);
  const isSingle = candidates.length === 1;

  if (isSingle) {
    return (
      <div className="border-t border-stone-200 px-6 py-4">
        <p className="text-sm text-stone-600 leading-relaxed">
          {candidates[0].summary || "No summary available"}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid border-t border-stone-200 cursor-pointer hover:bg-stone-50/50 transition-colors"
      style={{
        gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4 border-r border-stone-200 flex items-center">
        <span className="font-medium text-stone-700">Summary</span>
      </div>
      {candidates.map((candidate) => (
        <div
          key={candidate.assessmentId}
          className="p-4 border-r border-stone-200 last:border-r-0"
        >
          <p
            className={cn(
              "text-sm text-stone-600 leading-relaxed",
              !expanded && "line-clamp-3"
            )}
          >
            {candidate.summary || "No summary available"}
          </p>
        </div>
      ))}
    </div>
  );
}

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
  const isSingle = candidates.length === 1;

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
        color: isSingle ? "hsl(221, 83%, 53%)" : CHART_COLORS[idx % CHART_COLORS.length],
      };
    });
    return config;
  }, [candidates, isSingle]);

  // Single candidate: side-by-side layout with radar + info
  if (isSingle) {
    const candidate = candidates[0];
    return (
      <div className="border-b border-stone-200 bg-white">
        <div className="flex flex-col md:flex-row">
          {/* Radar Chart */}
          <div className="flex-1 px-6 pt-6 pb-2">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[350px]"
            >
              <RadarChart data={radarData} outerRadius="65%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={<CustomAngleTick payload={{ value: "" }} x={0} y={0} textAnchor="middle" />}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 4]}
                  tickCount={5}
                  tick={{ fontSize: 10 }}
                />
                <Radar
                  name={candidate.candidateName || "Candidate"}
                  dataKey="candidate0"
                  stroke="var(--color-candidate0)"
                  fill="var(--color-candidate0)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </div>

          {/* Candidate Info */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 md:border-l md:border-stone-200">
            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-base"
                style={{ backgroundColor: "hsl(221, 83%, 53%)" }}
              >
                {getInitials(candidate.candidateName)}
              </div>
              <span className="text-xl font-semibold text-stone-900">
                {candidate.candidateName || "Anonymous"}
              </span>
            </div>

            {/* Score Circle */}
            <div className="h-24 w-24 rounded-full flex items-center justify-center border-4 border-blue-600 bg-blue-50">
              <span className="text-3xl font-bold text-blue-600">
                {candidate.overallScore.toFixed(1)}
              </span>
            </div>

            {/* Badges */}
            <div className="flex flex-col items-center gap-2">
              <Badge className={getStrengthBadgeStyles(candidate.strengthLevel)}>
                {candidate.strengthLevel}
              </Badge>
              {showPercentiles && (
                <Badge variant="outline" className="text-xs">
                  Top {Math.round(100 - candidate.overallPercentile)}%
                  <span className="text-stone-400 ml-1">
                    of {totalCandidatesInSimulation}
                  </span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <SummaryRow candidates={candidates} />
      </div>
    );
  }

  // Multi-candidate layout (original)
  return (
    <div className="border-b border-stone-200 bg-white">
      {/* Radar Chart */}
      <div className="px-6 pt-6 pb-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[400px]"
        >
          <RadarChart data={radarData} outerRadius="65%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={<CustomAngleTick payload={{ value: "" }} x={0} y={0} textAnchor="middle" />}
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

      {/* Candidates Row — identity + score + badges */}
      <div
        className="grid border-t border-stone-200"
        style={{
          gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)`,
        }}
      >
        <div className="p-4 border-r border-stone-200 flex items-center">
          <span className="font-medium text-stone-700">Candidates</span>
        </div>
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Row */}
      <SummaryRow candidates={candidates} />
    </div>
  );
}
