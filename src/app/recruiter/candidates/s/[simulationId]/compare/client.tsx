"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, AlertCircle, ShieldAlert, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from "lucide-react";
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

/**
 * Render a 4-segment score bar (same as table)
 */
function ScoreBar({ score }: { score: number }) {
  const percentage = (score / 5) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden flex">
        <div
          className="bg-blue-600 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-stone-900 w-8 text-right">
        {score.toFixed(1)}
      </span>
    </div>
  );
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
// Strengths & Growth Areas Section
// ============================================================================

interface StrengthsGrowthSectionProps {
  candidates: CandidateComparison[];
}

/**
 * Derive top 3 strengths from highest-scoring dimensions' green flags
 */
function deriveTopStrengths(candidate: CandidateComparison): string[] {
  // Sort dimensions by score descending
  const sorted = [...candidate.dimensionScores].sort((a, b) => b.score - a.score);

  const strengths: string[] = [];
  for (const dim of sorted) {
    if (strengths.length >= 3) break;
    if (dim.greenFlags.length > 0) {
      // Pick first green flag and format: "**Dimension:** green flag text"
      strengths.push(`**${dim.dimension}:** ${dim.greenFlags[0]}`);
    }
  }

  return strengths;
}

/**
 * Derive growth areas from lowest-scoring dimensions' red flags
 */
function deriveGrowthAreas(candidate: CandidateComparison): string[] {
  // Sort dimensions by score ascending (lowest first)
  const sorted = [...candidate.dimensionScores].sort((a, b) => a.score - b.score);

  const growthAreas: string[] = [];
  for (const dim of sorted) {
    if (growthAreas.length >= 3) break;
    if (dim.redFlags.length > 0) {
      // Pick first red flag and format: "**Dimension:** red flag text"
      growthAreas.push(`**${dim.dimension}:** ${dim.redFlags[0]}`);
    }
  }

  return growthAreas;
}

function StrengthsGrowthSection({ candidates }: StrengthsGrowthSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-b border-stone-200 bg-white">
      {/* Section Header */}
      <div
        className="px-6 py-4 border-b border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-stone-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-stone-400" />
          )}
          Strengths & Growth Areas
        </h2>
      </div>

      {/* Content Rows */}
      {isExpanded && (
        <div>
          {/* Top 3 Strengths Row */}
          <div
            className="grid border-b border-stone-200"
            style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
          >
            {/* Row Label */}
            <div className="p-4 border-r border-stone-200 flex items-center">
              <span className="font-medium text-stone-900">Top 3 Strengths</span>
            </div>

            {/* Candidate Columns */}
            {candidates.map((candidate) => {
              const strengths = deriveTopStrengths(candidate);
              return (
                <div
                  key={candidate.assessmentId}
                  className="p-4 border-r border-stone-200 last:border-r-0"
                >
                  {strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-stone-600 flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span dangerouslySetInnerHTML={{ __html: strength.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-stone-400 italic">No strengths available</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Growth Areas Row */}
          <div
            className="grid"
            style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
          >
            {/* Row Label */}
            <div className="p-4 border-r border-stone-200 flex items-center">
              <span className="font-medium text-stone-900">Growth Areas</span>
            </div>

            {/* Candidate Columns */}
            {candidates.map((candidate) => {
              const growthAreas = deriveGrowthAreas(candidate);
              return (
                <div
                  key={candidate.assessmentId}
                  className="p-4 border-r border-stone-200 last:border-r-0"
                >
                  {growthAreas.length > 0 ? (
                    <ul className="space-y-2">
                      {growthAreas.map((area, idx) => (
                        <li key={idx} className="text-sm text-stone-600 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span dangerouslySetInnerHTML={{ __html: area.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-stone-400 italic">No growth areas available</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Key Evidence Section
// ============================================================================

interface KeyEvidenceSectionProps {
  candidates: CandidateComparison[];
}

interface EvidenceMoment {
  timestamp: string;
  description: string;
}

/**
 * Extract 2-3 key video moments from highest and lowest scoring dimensions
 */
function deriveKeyEvidence(candidate: CandidateComparison): EvidenceMoment[] {
  const moments: EvidenceMoment[] = [];

  // Sort dimensions by score
  const sorted = [...candidate.dimensionScores].sort((a, b) => b.score - a.score);

  // Get highest scoring dimension with timestamps
  for (const dim of sorted) {
    if (moments.length >= 2) break;
    if (dim.timestamps.length > 0 && dim.rationale) {
      // Extract first sentence or ~80 chars from rationale
      const description = dim.rationale.split('.')[0].substring(0, 80) + (dim.rationale.length > 80 ? '...' : '');
      moments.push({
        timestamp: dim.timestamps[0],
        description: `**${dim.dimension}:** ${description}`,
      });
    }
  }

  // Get lowest scoring dimension with timestamps
  const reversed = [...sorted].reverse();
  for (const dim of reversed) {
    if (moments.length >= 3) break;
    // Avoid duplicates
    if (moments.some(m => m.timestamp === dim.timestamps[0])) continue;
    if (dim.timestamps.length > 0 && dim.rationale) {
      const description = dim.rationale.split('.')[0].substring(0, 80) + (dim.rationale.length > 80 ? '...' : '');
      moments.push({
        timestamp: dim.timestamps[0],
        description: `**${dim.dimension}:** ${description}`,
      });
    }
  }

  return moments;
}

function KeyEvidenceSection({ candidates }: KeyEvidenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-stone-200 bg-white">
      {/* Section Header */}
      <div
        className="px-6 py-4 border-b border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-stone-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-stone-400" />
          )}
          Key Evidence
        </h2>
      </div>

      {/* Content */}
      {isExpanded && (
        <div
          className="grid"
          style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
        >
          {/* Empty label column */}
          <div className="border-r border-stone-200"></div>

          {/* Candidate Columns */}
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
                            console.log(
                              `Timestamp clicked: ${moment.timestamp} for ${candidate.candidateName}`
                            );
                            // Video modal will be wired in separate issue (US-014)
                          }}
                          className="inline-flex items-center gap-2 text-left w-full hover:bg-stone-50 p-2 rounded transition-colors"
                        >
                          <Badge className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200 flex-shrink-0">
                            [{moment.timestamp}]
                          </Badge>
                          <span
                            className="text-xs"
                            dangerouslySetInnerHTML={{
                              __html: moment.description.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                            }}
                          />
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

// ============================================================================
// Work Style Section
// ============================================================================

interface WorkStyleSectionProps {
  candidates: CandidateComparison[];
}

function WorkStyleSection({ candidates }: WorkStyleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "—";
    return `${minutes} min`;
  };

  const formatAiToolsUsed = (used: boolean): { text: string; color: string } => {
    return used
      ? { text: "Yes", color: "text-green-700" }
      : { text: "No", color: "text-stone-500" };
  };

  const formatTestsStatus = (status: string): { text: string; color: string } => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "passing":
        return { text: "Passing", color: "text-green-700" };
      case "failing":
        return { text: "Failing", color: "text-red-700" };
      case "none":
        return { text: "None", color: "text-stone-500" };
      default:
        return { text: "Unknown", color: "text-stone-500" };
    }
  };

  const metricRows = [
    {
      label: "Total Duration",
      getValue: (candidate: CandidateComparison) =>
        formatDuration(candidate.metrics.totalDurationMinutes),
      getColor: () => "text-stone-900",
    },
    {
      label: "Active Working Time",
      getValue: (candidate: CandidateComparison) =>
        formatDuration(candidate.metrics.workingPhaseMinutes),
      getColor: () => "text-stone-900",
    },
    {
      label: "Coworkers Contacted",
      getValue: (candidate: CandidateComparison) =>
        candidate.metrics.coworkersContacted.toString(),
      getColor: () => "text-stone-900",
    },
    {
      label: "AI Tools Used",
      getValue: (candidate: CandidateComparison) =>
        formatAiToolsUsed(candidate.metrics.aiToolsUsed).text,
      getColor: (candidate: CandidateComparison) =>
        formatAiToolsUsed(candidate.metrics.aiToolsUsed).color,
    },
    {
      label: "CI Tests",
      getValue: (candidate: CandidateComparison) =>
        formatTestsStatus(candidate.metrics.testsStatus).text,
      getColor: (candidate: CandidateComparison) =>
        formatTestsStatus(candidate.metrics.testsStatus).color,
    },
  ];

  return (
    <div className="border-b border-stone-200 bg-white">
      {/* Section Header */}
      <div
        className="px-6 py-4 border-b border-stone-200 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-stone-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-stone-400" />
          )}
          Work Style
        </h2>
      </div>

      {/* Metric Rows */}
      {isExpanded && (
        <div>
          {metricRows.map((row) => (
            <div
              key={row.label}
              className="grid border-b border-stone-200 last:border-b-0"
              style={{ gridTemplateColumns: `200px repeat(${candidates.length}, 1fr)` }}
            >
              {/* Metric Label */}
              <div className="p-4 border-r border-stone-200 flex items-center">
                <span className="font-medium text-stone-900">{row.label}</span>
              </div>

              {/* Candidate Columns */}
              {candidates.map((candidate) => (
                <div
                  key={candidate.assessmentId}
                  className="p-4 border-r border-stone-200 last:border-r-0 flex items-center"
                >
                  <span className={cn("text-sm", row.getColor(candidate))}>
                    {row.getValue(candidate)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Core Dimensions Section
// ============================================================================

interface CoreDimensionsSectionProps {
  candidates: CandidateComparison[];
}

function CoreDimensionsSection({ candidates }: CoreDimensionsSectionProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Get union of all dimensions across candidates, sorted alphabetically
  const allDimensions = useMemo(() => {
    const dimensionSet = new Set<string>();
    candidates.forEach((candidate) => {
      candidate.dimensionScores.forEach((score) => {
        dimensionSet.add(score.dimension);
      });
    });
    return Array.from(dimensionSet).sort();
  }, [candidates]);

  // Toggle individual row expansion
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

  // Expand all rows
  const expandAll = () => {
    setExpandedRows(new Set(allDimensions));
  };

  // Collapse all rows
  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  // For each dimension, find the highest score(s) to highlight winner(s)
  const getDimensionWinners = (dimension: string): Set<string> => {
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
            <ChevronUp className="mr-1.5 h-4 w-4" />
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
              {/* Collapsed Row */}
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
                    <ChevronUp className="h-4 w-4 text-stone-400 flex-shrink-0" />
                  )}
                  <span className="font-medium text-stone-900">{dimension}</span>
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
                        <div className="space-y-2">
                          <ScoreBar score={dimScore.score} />
                          <Badge variant="outline" className="text-xs">
                            Top {Math.round(100 - dimScore.percentile)}%
                          </Badge>
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
                  {/* Empty cell for dimension label column */}
                  <div className="border-r border-stone-200"></div>

                  {/* Candidate Detail Columns */}
                  {candidates.map((candidate) => {
                    const dimScore = candidate.dimensionScores.find(
                      (s) => s.dimension === dimension
                    );
                    const isWinner = dimScore && winners.has(candidate.assessmentId);

                    return (
                      <div
                        key={candidate.assessmentId}
                        className={cn(
                          "p-4 border-r border-stone-200 last:border-r-0 space-y-3",
                          isWinner && "bg-blue-50/50"
                        )}
                      >
                        {dimScore ? (
                          <>
                            {/* Green Flags */}
                            {dimScore.greenFlags.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Strengths
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

                            {/* Red Flags */}
                            {dimScore.redFlags.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-orange-700 mb-1.5 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Areas for Growth
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

                            {/* Timestamps */}
                            {dimScore.timestamps.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-stone-700 mb-1.5">
                                  Evidence
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {dimScore.timestamps.map((timestamp, idx) => (
                                    <button
                                      key={idx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log(
                                          `Timestamp clicked: ${timestamp} for ${candidate.candidateName}`
                                        );
                                        // Video modal will be wired in separate issue (US-014)
                                      }}
                                      className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-800 hover:bg-blue-200 rounded border border-blue-200 transition-colors"
                                    >
                                      [{timestamp}]
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-stone-400 italic">
                            Not assessed on this dimension
                          </div>
                        )}
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

      {/* Core Dimensions Section */}
      <CoreDimensionsSection candidates={candidates} />

      {/* Work Style Section */}
      <WorkStyleSection candidates={candidates} />

      {/* Strengths & Growth Areas Section */}
      <StrengthsGrowthSection candidates={candidates} />

      {/* Key Evidence Section */}
      <KeyEvidenceSection candidates={candidates} />
    </div>
  );
}
