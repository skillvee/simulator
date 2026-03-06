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
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatDimensionName,
  getStrengthBadgeStyles,
} from "@/components/assessment/helpers";
import type { CandidateResultsData } from "@/types";

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

interface CandidateRadarChartOverviewProps {
  results: CandidateResultsData;
}

export function CandidateRadarChartOverview({
  results,
}: CandidateRadarChartOverviewProps) {
  const radarData = useMemo(() => {
    return results.dimensionScores.map((d) => ({
      dimension: formatDimensionName(d.dimension),
      score: d.score,
      fullMark: results.scoreScale,
    }));
  }, [results.dimensionScores, results.scoreScale]);

  const chartConfig: ChartConfig = useMemo(
    () => ({
      score: {
        label: results.candidateName,
        color: "hsl(221, 83%, 53%)",
      },
    }),
    [results.candidateName]
  );

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
                tick={
                  <CustomAngleTick
                    payload={{ value: "" }}
                    x={0}
                    y={0}
                    textAnchor="middle"
                  />
                }
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, results.scoreScale]}
                tickCount={results.scoreScale + 1}
                tick={{ fontSize: 10 }}
              />
              <Radar
                name={results.candidateName}
                dataKey="score"
                stroke="var(--color-score)"
                fill="var(--color-score)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ChartContainer>
        </div>

        {/* Score + Info */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 md:border-l md:border-stone-200">
          {/* Scenario info */}
          <div className="text-center">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
              {results.companyName}
            </p>
            <h2 className="text-xl font-semibold text-stone-900 mt-1">
              {results.scenarioName}
            </h2>
          </div>

          {/* Score Circle */}
          <div className="h-28 w-28 rounded-full flex items-center justify-center border-4 border-blue-600 bg-blue-50">
            <div className="text-center">
              <span className="text-3xl font-bold text-blue-600">
                {results.overallScore.toFixed(1)}
              </span>
              <span className="text-sm text-stone-400 block">
                /{results.scoreScale}
              </span>
            </div>
          </div>

          {/* Strength Badge */}
          <Badge className={getStrengthBadgeStyles(results.strengthLevel)}>
            {results.strengthLevel}
          </Badge>

          {/* Confidence */}
          <p className="text-xs text-stone-400">
            Evaluation confidence:{" "}
            <span className="font-medium capitalize text-stone-500">
              {results.evaluationConfidence}
            </span>
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-stone-200 px-6 py-4">
        <p className="text-sm text-stone-600 leading-relaxed">
          {results.overallSummary}
        </p>
      </div>
    </div>
  );
}
