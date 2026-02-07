"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  ExternalLink,
  AlertCircle,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type CandidateStrengthLevel =
  | "Exceptional"
  | "Strong"
  | "Proficient"
  | "Developing";

interface DimensionScoreComparison {
  dimension: string;
  score: number;
  percentile: number;
}

interface CandidateComparison {
  assessmentId: string;
  candidateName: string | null;
  overallScore: number;
  overallPercentile: number;
  strengthLevel: CandidateStrengthLevel;
  dimensionScores: DimensionScoreComparison[];
  topStrength: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get strength level badge styling
 */
function getStrengthBadgeStyles(level: CandidateStrengthLevel): string {
  switch (level) {
    case "Exceptional":
      return "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 border-0";
    case "Strong":
      return "bg-green-100 text-green-700 border-0";
    case "Proficient":
      return "bg-blue-100 text-blue-700 border-0";
    case "Developing":
      return "bg-stone-100 text-stone-600 border-0";
  }
}

/**
 * Get percentile badge color
 */
function getPercentileBadgeColor(percentile: number): string {
  if (percentile >= 90) return "bg-green-100 text-green-700";
  if (percentile >= 75) return "bg-blue-100 text-blue-700";
  if (percentile >= 50) return "bg-stone-100 text-stone-600";
  return "bg-red-100 text-red-700";
}

/**
 * Format dimension name for display
 * PROBLEM_SOLVING -> Problem Solving
 */
function formatDimensionName(dimension: string): string {
  return dimension
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Get a color for each candidate (for chart lines)
 */
function getCandidateColor(index: number): string {
  const colors = [
    "hsl(221, 83%, 53%)", // blue
    "hsl(142, 76%, 36%)", // green
    "hsl(262, 83%, 58%)", // purple
    "hsl(24, 95%, 53%)", // orange
  ];
  return colors[index % colors.length];
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-8 w-64 mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>

      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ============================================================================
// Error States
// ============================================================================

function ForbiddenError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <ShieldAlert className="h-12 w-12 text-red-600" />
      </div>
      <h1 className="text-2xl font-semibold text-stone-900 mb-2">
        Access Denied
      </h1>
      <p className="text-stone-500 text-center mb-6 max-w-md">
        You don&apos;t have permission to view one or more of these candidates.
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/recruiter/candidates">Back to Candidates</Link>
      </Button>
    </div>
  );
}

function NoIdsError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <AlertCircle className="h-12 w-12 text-stone-400 mb-4" />
      <h1 className="text-xl font-semibold text-stone-900 mb-2">
        No candidates selected
      </h1>
      <p className="text-stone-500 mb-6 text-center max-w-md">
        Select at least 2 candidates from the candidates list to compare them
        side-by-side.
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/recruiter/candidates">Select Candidates</Link>
      </Button>
    </div>
  );
}

// ============================================================================
// Candidate Card Component
// ============================================================================

interface CandidateCardProps {
  candidate: CandidateComparison;
  color: string;
  allCandidates: CandidateComparison[];
  dimensionOrder: string[];
}

function CandidateCard({
  candidate,
  color,
  allCandidates,
  dimensionOrder,
}: CandidateCardProps) {
  // Build radar chart data for this candidate
  const radarData = useMemo(() => {
    return dimensionOrder.map((dimension) => {
      const score = candidate.dimensionScores.find(
        (d) => d.dimension === dimension
      );
      return {
        dimension: formatDimensionName(dimension),
        score: score?.score ?? 0,
        fullMark: 5,
      };
    });
  }, [candidate, dimensionOrder]);

  // Check if this candidate is the winner for each dimension
  const dimensionWinners = useMemo(() => {
    const winners: Record<string, boolean> = {};

    for (const dim of dimensionOrder) {
      let maxPercentile = -1;
      let winnerId: string | null = null;
      let isTie = false;

      for (const c of allCandidates) {
        const score = c.dimensionScores.find((d) => d.dimension === dim);
        const percentile = score?.percentile ?? 0;

        if (percentile > maxPercentile) {
          maxPercentile = percentile;
          winnerId = c.assessmentId;
          isTie = false;
        } else if (percentile === maxPercentile) {
          isTie = true;
        }
      }

      winners[dim] = !isTie && winnerId === candidate.assessmentId;
    }

    return winners;
  }, [allCandidates, candidate.assessmentId, dimensionOrder]);

  const chartConfig = {
    score: {
      label: "Score",
      color: color,
    },
  };

  return (
    <Card className="border-stone-200 bg-white shadow-sm flex flex-col">
      <CardHeader className="pb-3 border-b border-stone-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium text-lg"
              style={{ backgroundColor: color }}
            >
              {candidate.candidateName?.charAt(0) || "?"}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-stone-900">
                {candidate.candidateName || "Anonymous"}
              </CardTitle>
              <Badge className={getStrengthBadgeStyles(candidate.strengthLevel)}>
                {candidate.strengthLevel}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Overall Score */}
        <div className="mb-4 pb-4 border-b border-stone-100">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-sm text-stone-500 mb-1">Overall Score</p>
              <span className="text-3xl font-bold text-stone-900">
                {candidate.overallScore.toFixed(1)}
              </span>
              <span className="text-lg text-stone-400 ml-1">/ 5.0</span>
            </div>
            <Badge
              className={`text-sm px-3 py-1.5 ${getPercentileBadgeColor(candidate.overallPercentile)}`}
            >
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Top {Math.round(100 - candidate.overallPercentile)}%
            </Badge>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="h-48 mb-4">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e7e5e4" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 10, fill: "#78716c" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 5]}
                tick={{ fontSize: 9, fill: "#a8a29e" }}
                tickCount={6}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Radar
                name="Score"
                dataKey="score"
                stroke={color}
                fill={color}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ChartContainer>
        </div>

        {/* Top Strength */}
        <div className="mb-4">
          <div className="p-3 rounded-lg bg-green-50 border border-green-100">
            <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Top Strength
            </p>
            <p className="text-sm font-medium text-green-900">
              {candidate.topStrength
                ? formatDimensionName(candidate.topStrength)
                : "—"}
            </p>
          </div>
        </div>

        {/* Dimension Rows (aligned across all cards) */}
        <div className="flex-1">
          <p className="text-sm font-medium text-stone-700 mb-2">
            Dimension Scores
          </p>
          <div className="space-y-2">
            {dimensionOrder.map((dimension) => {
              const score = candidate.dimensionScores.find(
                (d) => d.dimension === dimension
              );
              const isWinner = dimensionWinners[dimension];

              return (
                <div
                  key={dimension}
                  className={cn(
                    "flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
                    isWinner
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-stone-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isWinner && (
                      <Trophy className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        isWinner
                          ? "font-medium text-blue-900"
                          : "text-stone-700"
                      )}
                    >
                      {formatDimensionName(dimension)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isWinner ? "text-blue-700" : "text-stone-900"
                      )}
                    >
                      {score?.score.toFixed(1) ?? "—"}
                    </span>
                    <Badge
                      className={cn(
                        "text-xs",
                        getPercentileBadgeColor(score?.percentile ?? 0)
                      )}
                    >
                      {score?.percentile
                        ? `${Math.round(score.percentile)}th`
                        : "—"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* View Full Scorecard Link */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <Button asChild variant="outline" className="w-full border-stone-200">
            <Link href={`/recruiter/candidates/${candidate.assessmentId}`}>
              View full scorecard
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CandidateCompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<CandidateComparison[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<number | null>(null);

  // Get assessment IDs from query params
  const ids = searchParams.get("ids");

  useEffect(() => {
    async function fetchData() {
      if (!ids) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/recruiter/candidates/compare?assessmentIds=${ids}`
        );

        if (!response.ok) {
          setError(response.status);
          return;
        }

        const result = await response.json();
        setCandidates(result.data);
      } catch {
        setError(500);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [ids]);

  // Get consistent dimension order across all candidates
  const dimensionOrder = useMemo(() => {
    if (!candidates || candidates.length === 0) return [];

    // Use the first candidate's dimension order as the canonical order
    const firstCandidate = candidates[0];
    return firstCandidate.dimensionScores.map((d) => d.dimension);
  }, [candidates]);

  // Build back link with preserved selection
  const backLink = useMemo(() => {
    if (!ids) return "/recruiter/candidates";
    return `/recruiter/candidates?compare=${ids}`;
  }, [ids]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error === 403) {
    return <ForbiddenError />;
  }

  if (!ids || (candidates && candidates.length < 2)) {
    return <NoIdsError />;
  }

  if (error || !candidates) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <AlertCircle className="h-12 w-12 text-stone-400 mb-4" />
        <h1 className="text-xl font-semibold text-stone-900 mb-2">
          Unable to load comparison data
        </h1>
        <p className="text-stone-500 mb-6">
          An error occurred while fetching the candidate data.
        </p>
        <Button asChild variant="outline">
          <Link href="/recruiter/candidates">Back to Candidates</Link>
        </Button>
      </div>
    );
  }

  // Determine grid columns based on candidate count
  const gridCols =
    candidates.length === 2
      ? "md:grid-cols-2"
      : candidates.length === 3
        ? "md:grid-cols-2 lg:grid-cols-3"
        : "md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="p-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur-sm -mx-6 px-6 py-4 mb-4 border-b border-stone-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backLink)}
          className="text-stone-600 hover:text-stone-900 -ml-2"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Candidates
        </Button>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">
              Candidate Comparison
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Comparing {candidates.length} candidates side-by-side
            </p>
          </div>

          {/* Sticky candidate names for scroll */}
          <div className="hidden lg:flex items-center gap-4">
            {candidates.map((c, idx) => (
              <div key={c.assessmentId} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: getCandidateColor(idx) }}
                />
                <span className="text-sm font-medium text-stone-700">
                  {c.candidateName || "Anonymous"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.assessmentId}
            candidate={candidate}
            color={getCandidateColor(index)}
            allCandidates={candidates}
            dimensionOrder={dimensionOrder}
          />
        ))}
      </div>
    </div>
  );
}
