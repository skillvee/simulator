"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldAlert,
} from "lucide-react";
import type { CodeReviewData, HiringSignals } from "@/types";

/**
 * Candidate strength levels
 */
type CandidateStrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

/**
 * Dimension score data from API
 */
interface DimensionScoreData {
  dimension: string;
  score: number;
  observableBehaviors: string;
  timestamps: string[];
  trainableGap: boolean;
}

/**
 * Candidate detail response from API
 */
interface CandidateDetailData {
  assessmentId: string;
  candidate: {
    name: string | null;
    email: string | null;
  };
  scenarioName?: string;
  completedAt?: string;
  overallScore: number;
  strengthLevel: CandidateStrengthLevel;
  dimensionScores: DimensionScoreData[];
  percentiles: Record<string, number> | null;
  videoUrl: string | null;
  greenFlags: string[];
  redFlags: string[];
  overallSummary: string;
  codeReview: CodeReviewData | null;
  prUrl: string | null;
  hiringSignals: HiringSignals | null;
}

interface CandidateDetailClientProps {
  assessmentId: string;
}

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
 * Get dimension score color based on score (1-5 scale)
 */
function getDimensionScoreColor(score: number): string {
  if (score >= 4.5) return "text-green-600";
  if (score >= 3.5) return "text-blue-600";
  if (score >= 2.5) return "text-stone-600";
  return "text-red-600";
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
 */
function formatDimensionName(dimension: string): string {
  // Convert camelCase or snake_case to Title Case with spaces
  return dimension
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Loading skeleton component
 */
function LoadingSkeleton() {
  return (
    <div className="p-6">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      {/* Overall score card skeleton */}
      <Skeleton className="h-32 w-full mb-6" />

      {/* Dimension cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>

      {/* Hiring signals skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

/**
 * Error state for 403 Forbidden
 */
function ForbiddenError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <ShieldAlert className="h-12 w-12 text-red-600" />
      </div>
      <h1 className="text-2xl font-semibold text-stone-900 mb-2">Access Denied</h1>
      <p className="text-stone-500 text-center mb-6 max-w-md">
        You don&apos;t have permission to view this candidate&apos;s assessment.
        This may be because the assessment belongs to a different recruiter.
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/recruiter/candidates">Back to Candidates</Link>
      </Button>
    </div>
  );
}

/**
 * Main candidate detail client component
 */
export function CandidateDetailClient({ assessmentId }: CandidateDetailClientProps) {
  const [data, setData] = useState<CandidateDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/recruiter/candidate/${assessmentId}`);

        if (!response.ok) {
          setError(response.status);
          return;
        }

        const result = await response.json();
        setData(result.data);
      } catch {
        setError(500);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [assessmentId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error === 403) {
    return <ForbiddenError />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <AlertCircle className="h-12 w-12 text-stone-400 mb-4" />
        <h1 className="text-xl font-semibold text-stone-900 mb-2">
          Unable to load candidate data
        </h1>
        <p className="text-stone-500 mb-6">
          An error occurred while fetching the assessment details.
        </p>
        <Button asChild variant="outline">
          <Link href="/recruiter/candidates">Back to Candidates</Link>
        </Button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const overallPercentile = data.percentiles?.overall ?? null;

  return (
    <div className="p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/recruiter/candidates"
          className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Candidates
        </Link>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-stone-900">
                {data.candidate.name || "Anonymous Candidate"}
              </h1>
              <Badge className={getStrengthBadgeStyles(data.strengthLevel)}>
                {data.strengthLevel}
              </Badge>
            </div>
            {data.scenarioName && (
              <p className="mt-1 text-stone-500">{data.scenarioName}</p>
            )}
            {data.completedAt && (
              <p className="mt-1 text-sm text-stone-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Completed {formatDate(data.completedAt)}
              </p>
            )}
          </div>

          <Button asChild variant="outline" className="border-stone-200">
            <Link href={`/recruiter/candidates/compare?ids=${assessmentId}`}>
              <Users className="mr-2 h-4 w-4" />
              Compare with others
            </Link>
          </Button>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card className="mb-6 border-stone-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-stone-500 mb-1">
                Overall Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${getDimensionScoreColor(data.overallScore)}`}>
                  {data.overallScore.toFixed(1)}
                </span>
                <span className="text-lg text-stone-400">/ 5.0</span>
              </div>
            </div>
            {overallPercentile !== null && (
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-sm px-3 py-1.5 ${getPercentileBadgeColor(overallPercentile)}`}
                >
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                  Top {Math.round(100 - overallPercentile)}%
                </Badge>
              </div>
            )}
          </div>
          {data.overallSummary && (
            <p className="mt-4 text-stone-600 border-t border-stone-100 pt-4">
              {data.overallSummary}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dimension Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">
          Dimension Scores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.dimensionScores.map((dim) => {
            const dimPercentile = data.percentiles?.[dim.dimension] ?? null;
            return (
              <Card
                key={dim.dimension}
                className="border-stone-200 bg-white shadow-sm"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium text-stone-900">
                      {formatDimensionName(dim.dimension)}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-bold ${getDimensionScoreColor(dim.score)}`}>
                        {dim.score.toFixed(1)}
                      </span>
                      {dimPercentile !== null && (
                        <Badge
                          className={`text-xs ${getPercentileBadgeColor(dimPercentile)}`}
                        >
                          Top {Math.round(100 - dimPercentile)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600">
                    {dim.observableBehaviors}
                  </p>
                  {dim.trainableGap && (
                    <Badge className="mt-3 bg-amber-100 text-amber-700 border-0">
                      Trainable Gap
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Hiring Signals */}
      {(data.greenFlags.length > 0 || data.redFlags.length > 0) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Hiring Signals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Green Flags */}
            <Card className="border-green-200 bg-green-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Green Flags ({data.greenFlags.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.greenFlags.length > 0 ? (
                  <ul className="space-y-2">
                    {data.greenFlags.map((flag, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-green-700"
                      >
                        <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-green-600">No green flags identified</p>
                )}
              </CardContent>
            </Card>

            {/* Red Flags */}
            <Card className="border-red-200 bg-red-50/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-medium text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  Red Flags ({data.redFlags.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.redFlags.length > 0 ? (
                  <ul className="space-y-2">
                    {data.redFlags.map((flag, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-red-700"
                      >
                        <TrendingDown className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-red-600">No red flags identified</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
