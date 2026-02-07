"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type CandidateStrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

interface DimensionScoreComparison {
  dimension: string;
  score: number;
  percentile: number;
  greenFlags: string[];
  redFlags: string[];
  rationale: string;
  timestamps: string[];
}

interface WorkStyleMetrics {
  totalDurationMinutes: number | null;
  workingPhaseMinutes: number | null;
  coworkersContacted: number;
  aiToolsUsed: boolean;
  testsStatus: string;
}

interface CandidateComparison {
  assessmentId: string;
  candidateName: string | null;
  scenarioId: string;
  overallScore: number;
  overallPercentile: number;
  strengthLevel: CandidateStrengthLevel;
  dimensionScores: DimensionScoreComparison[];
  summary: string;
  metrics: WorkStyleMetrics;
  confidence: string;
  videoUrl: string;
}

interface CandidateCompareClientProps {
  simulationId: string;
  simulationName: string;
  assessmentIds: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get initials from name
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get strength level badge styling
 */
function getStrengthBadgeStyles(level: CandidateStrengthLevel): string {
  switch (level) {
    case "Exceptional":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Strong":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "Proficient":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "Developing":
      return "bg-stone-100 text-stone-600 hover:bg-stone-100";
  }
}

/**
 * Get confidence badge styling
 */
function getConfidenceBadgeStyles(confidence: string): string {
  switch (confidence.toLowerCase()) {
    case "high":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-red-100 text-red-800";
    default:
      return "bg-stone-100 text-stone-600";
  }
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-50 bg-white border-b border-stone-200 px-6 py-4">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Overview section skeleton */}
      <div className="border-b border-stone-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-stone-200">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 space-y-4">
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <Skeleton className="h-3 w-48 mx-auto" />
            </div>
          ))}
        </div>
      </div>
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
      <h1 className="text-2xl font-semibold text-stone-900 mb-2">Access Denied</h1>
      <p className="text-stone-500 text-center mb-6 max-w-md">
        You don&apos;t have permission to view one or more of these candidates.
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/recruiter/candidates">Back to Candidates</Link>
      </Button>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <AlertCircle className="h-12 w-12 text-stone-400 mb-4" />
      <h1 className="text-xl font-semibold text-stone-900 mb-2">Unable to load comparison</h1>
      <p className="text-stone-500 mb-6 text-center max-w-md">{error}</p>
      <Button asChild variant="outline">
        <Link href="/recruiter/candidates">Back to Candidates</Link>
      </Button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CandidateCompareClient({
  simulationId,
  simulationName,
  assessmentIds,
}: CandidateCompareClientProps) {
  const [candidates, setCandidates] = useState<CandidateComparison[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: number; message: string } | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("0");

  // Fetch comparison data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `/api/recruiter/candidates/compare?simulationId=${simulationId}&assessmentIds=${assessmentIds.join(",")}`
        );

        if (!response.ok) {
          setError({
            code: response.status,
            message:
              response.status === 403
                ? "Access denied"
                : "Failed to load comparison data",
          });
          return;
        }

        const result = await response.json();
        setCandidates(result.data);
      } catch {
        setError({ code: 500, message: "An error occurred while fetching data" });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [simulationId, assessmentIds]);

  // Find winner(s) for overall score
  const winnerIds = useMemo(() => {
    if (!candidates || candidates.length === 0) return new Set<string>();
    const maxScore = Math.max(...candidates.map((c) => c.overallScore));
    return new Set(
      candidates.filter((c) => c.overallScore === maxScore).map((c) => c.assessmentId)
    );
  }, [candidates]);

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error states
  if (error?.code === 403) {
    return <ForbiddenError />;
  }

  if (error || !candidates) {
    return <ErrorState error={error?.message ?? "Unknown error"} />;
  }

  // Calculate candidates per simulation to show context
  const totalCandidates = candidates.length;

  // Render desktop layout (Apple-style columns)
  const renderDesktopLayout = () => (
    <div className="hidden md:block">
      {/* Sticky Header Row */}
      <div className="sticky top-0 z-50 bg-white border-b border-stone-200">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${candidates.length}, 1fr)` }}>
          {candidates.map((candidate) => (
            <div
              key={candidate.assessmentId}
              className="p-6 border-r border-stone-200 last:border-r-0"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                  {getInitials(candidate.candidateName)}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-stone-900">
                    {candidate.candidateName || "Anonymous"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overview Section */}
      <div className="border-b border-stone-200 bg-white">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${candidates.length}, 1fr)` }}>
          {candidates.map((candidate) => {
            const isWinner = winnerIds.has(candidate.assessmentId);
            return (
              <div
                key={candidate.assessmentId}
                className={cn(
                  "p-6 border-r border-stone-200 last:border-r-0",
                  isWinner && "bg-blue-50/50"
                )}
              >
                <div className="flex flex-col items-center gap-4">
                  {/* Overall Score Circle */}
                  <div className="relative">
                    <div
                      className={cn(
                        "h-24 w-24 rounded-full flex items-center justify-center border-4",
                        isWinner
                          ? "border-blue-600 bg-blue-50"
                          : "border-stone-200 bg-stone-50"
                      )}
                    >
                      <span
                        className={cn(
                          "text-3xl font-bold",
                          isWinner ? "text-blue-600" : "text-stone-900"
                        )}
                      >
                        {candidate.overallScore.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-col items-center gap-2 w-full">
                    <Badge className={getStrengthBadgeStyles(candidate.strengthLevel)}>
                      {candidate.strengthLevel}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Top {Math.round(100 - candidate.overallPercentile)}%
                      <span className="text-stone-400 ml-1">of {totalCandidates}</span>
                    </Badge>
                    <Badge className={getConfidenceBadgeStyles(candidate.confidence)}>
                      {candidate.confidence} confidence
                    </Badge>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-stone-600 text-center line-clamp-2">
                    {candidate.summary || "No summary available"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Render mobile layout (tabs)
  const renderMobileLayout = () => (
    <div className="md:hidden">
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        {/* Tab list */}
        <div className="sticky top-0 z-50 bg-white border-b border-stone-200">
          <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${candidates.length}, 1fr)` }}>
            {candidates.map((candidate, index) => (
              <TabsTrigger key={candidate.assessmentId} value={String(index)}>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(candidate.candidateName)}
                  </div>
                  <span className="text-xs truncate max-w-[80px]">
                    {candidate.candidateName || "Anonymous"}
                  </span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab content */}
        {candidates.map((candidate, index) => {
          const isWinner = winnerIds.has(candidate.assessmentId);
          return (
            <TabsContent key={candidate.assessmentId} value={String(index)}>
              <div className={cn("p-6", isWinner && "bg-blue-50/50")}>
                <div className="flex flex-col items-center gap-4">
                  {/* Overall Score Circle */}
                  <div className="relative">
                    <div
                      className={cn(
                        "h-32 w-32 rounded-full flex items-center justify-center border-4",
                        isWinner
                          ? "border-blue-600 bg-blue-50"
                          : "border-stone-200 bg-stone-50"
                      )}
                    >
                      <span
                        className={cn(
                          "text-4xl font-bold",
                          isWinner ? "text-blue-600" : "text-stone-900"
                        )}
                      >
                        {candidate.overallScore.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-col items-center gap-2 w-full">
                    <Badge className={getStrengthBadgeStyles(candidate.strengthLevel)}>
                      {candidate.strengthLevel}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Top {Math.round(100 - candidate.overallPercentile)}%
                      <span className="text-stone-400 ml-1">of {totalCandidates}</span>
                    </Badge>
                    <Badge className={getConfidenceBadgeStyles(candidate.confidence)}>
                      {candidate.confidence} confidence
                    </Badge>
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-stone-600 text-center">
                    {candidate.summary || "No summary available"}
                  </p>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Back Link (not sticky, above everything) */}
      <div className="px-6 py-4 border-b border-stone-200">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-stone-600 hover:text-stone-900 -ml-2"
        >
          <Link href={`/recruiter/candidates/s/${simulationId}`}>
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Back to {simulationName}
          </Link>
        </Button>
      </div>

      {/* Desktop Layout */}
      {renderDesktopLayout()}

      {/* Mobile Layout */}
      {renderMobileLayout()}

      {/* Placeholder for future sections */}
      <div className="p-6 text-center text-stone-400 text-sm">
        More comparison sections coming soon (dimensions, work style, strengths/growth, video)
      </div>
    </div>
  );
}
