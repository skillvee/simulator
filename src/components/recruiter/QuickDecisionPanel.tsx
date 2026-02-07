"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Play,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseTimestampToSeconds } from "@/lib/utils/timestamp";

/**
 * Candidate strength levels
 */
export type StrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

/**
 * Dimension data for the panel
 */
export interface DimensionData {
  dimension: string;
  score: number;
  percentile: number;
  observableBehaviors: string;
  timestamps: string[];
  trainableGap: boolean;
}

/**
 * Props for QuickDecisionPanel component
 */
export interface QuickDecisionPanelProps {
  /** Assessment ID for comparison link */
  assessmentId: string;
  /** Scenario ID (simulation ID) for routing */
  scenarioId: string;
  /** Overall score (1-5 scale) */
  overallScore: number;
  /** Overall percentile (0-100) */
  overallPercentile: number | null;
  /** Candidate strength level */
  strengthLevel: StrengthLevel;
  /** All dimension scores for determining top/bottom */
  dimensionScores: DimensionData[];
  /** Callback when a timestamp is clicked */
  onTimestampClick: (seconds: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get strength level badge styling
 */
function getStrengthBadgeStyles(level: StrengthLevel): string {
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
 * Get strength level container styling
 */
function getStrengthContainerStyles(level: StrengthLevel): string {
  switch (level) {
    case "Exceptional":
      return "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200";
    case "Strong":
      return "bg-green-50 border-green-200";
    case "Proficient":
      return "bg-blue-50 border-blue-200";
    case "Developing":
      return "bg-stone-50 border-stone-200";
  }
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
 * Get top 2 dimensions by percentile (for "Where they shined")
 */
function getTopDimensions(dimensions: DimensionData[]): DimensionData[] {
  return [...dimensions]
    .sort((a, b) => b.percentile - a.percentile)
    .slice(0, 2);
}

/**
 * Get bottom 2 dimensions (score < 3 or trainableGap = true)
 */
function getAreasToProbe(dimensions: DimensionData[]): DimensionData[] {
  // Filter to only those with score < 3 or trainableGap
  const probeWorthy = dimensions.filter(
    (d) => d.score < 3 || d.trainableGap
  );

  // Sort by score ascending (lowest first), then return bottom 2
  return probeWorthy
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);
}

/**
 * Get key timestamps for "Jump to evidence" section
 * Returns timestamps from top dimensions
 */
function getKeyTimestamps(dimensions: DimensionData[]): { timestamp: string; dimension: string }[] {
  const topDimensions = getTopDimensions(dimensions);
  const timestamps: { timestamp: string; dimension: string }[] = [];

  for (const dim of topDimensions) {
    // Take first timestamp from each top dimension
    if (dim.timestamps.length > 0) {
      timestamps.push({
        timestamp: dim.timestamps[0],
        dimension: formatDimensionName(dim.dimension),
      });
    }
  }

  return timestamps.slice(0, 3); // Max 3 timestamps
}

/**
 * Extract a brief behavior quote (first sentence or first 80 chars)
 */
function getBriefQuote(behaviors: string): string {
  if (!behaviors) return "";

  // Get first sentence
  const firstSentence = behaviors.split(/[.!?]/)[0];
  if (firstSentence.length <= 80) {
    return firstSentence + ".";
  }

  // Truncate to ~80 chars at word boundary
  const truncated = behaviors.substring(0, 80).replace(/\s+\S*$/, "");
  return truncated + "...";
}

/**
 * QuickDecisionPanel provides a TL;DR summary for busy hiring managers
 * with strength level, key insights, and quick links to evidence.
 *
 * Desktop: Sticky sidebar
 * Mobile: Collapsible header
 */
export function QuickDecisionPanel({
  assessmentId,
  scenarioId,
  overallScore,
  overallPercentile,
  strengthLevel,
  dimensionScores,
  onTimestampClick,
  className,
}: QuickDecisionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const topDimensions = getTopDimensions(dimensionScores);
  const areasToProbe = getAreasToProbe(dimensionScores);
  const keyTimestamps = getKeyTimestamps(dimensionScores);

  const handleTimestampClick = (timestamp: string) => {
    const seconds = parseTimestampToSeconds(timestamp);
    if (seconds !== null) {
      onTimestampClick(seconds);
    }
  };

  return (
    <div
      className={cn(
        // Desktop: sticky sidebar
        "lg:sticky lg:top-6 lg:self-start",
        className
      )}
    >
      <Card className={cn(
        "shadow-lg border-2",
        getStrengthContainerStyles(strengthLevel)
      )}>
        {/* Mobile header with toggle */}
        <div
          className="lg:hidden flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Badge className={cn("text-base px-3 py-1.5 font-semibold", getStrengthBadgeStyles(strengthLevel))}>
              {strengthLevel}
            </Badge>
            <span className="text-lg font-bold text-stone-900">
              {overallScore.toFixed(1)}/5
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-stone-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-stone-500" />
          )}
        </div>

        {/* Main content - always visible on desktop, collapsible on mobile */}
        <CardContent
          className={cn(
            "p-4 lg:p-5 space-y-5",
            // Mobile: collapse/expand animation
            "lg:block",
            isExpanded ? "block" : "hidden"
          )}
        >
          {/* Strength level - prominent on desktop (hidden on mobile as it's in header) */}
          <div className="hidden lg:block text-center pb-4 border-b border-stone-200">
            <Badge className={cn(
              "text-xl px-5 py-2.5 font-bold",
              getStrengthBadgeStyles(strengthLevel)
            )}>
              {strengthLevel}
            </Badge>
          </div>

          {/* Overall score + percentile */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-stone-900">
                {overallScore.toFixed(1)}
              </span>
              <span className="text-xl text-stone-400">/ 5.0</span>
            </div>
            {overallPercentile !== null && (
              <Badge
                variant="secondary"
                className="mt-2 bg-stone-100 text-stone-600"
              >
                Top {Math.round(100 - overallPercentile)}%
              </Badge>
            )}
          </div>

          {/* Where they shined */}
          {topDimensions.length > 0 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <TrendingUp className="h-4 w-4" />
                Where they shined
              </h4>
              <div className="space-y-2">
                {topDimensions.map((dim) => (
                  <div
                    key={dim.dimension}
                    className="bg-white/60 rounded-lg p-3 border border-green-100"
                  >
                    <p className="font-medium text-sm text-stone-900">
                      {formatDimensionName(dim.dimension)}
                    </p>
                    <p className="text-xs text-stone-600 mt-1 italic">
                      &ldquo;{getBriefQuote(dim.observableBehaviors)}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas to probe */}
          {areasToProbe.length > 0 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Areas to probe
              </h4>
              <div className="space-y-2">
                {areasToProbe.map((dim) => (
                  <div
                    key={dim.dimension}
                    className="bg-white/60 rounded-lg p-3 border border-amber-100"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-stone-900">
                        {formatDimensionName(dim.dimension)}
                      </p>
                      {dim.trainableGap && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                          Trainable
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Score: {dim.score.toFixed(1)}/5
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jump to evidence */}
          {keyTimestamps.length > 0 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                <Play className="h-4 w-4" />
                Jump to evidence
              </h4>
              <div className="flex flex-wrap gap-2">
                {keyTimestamps.map(({ timestamp, dimension }, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTimestampClick(timestamp)}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded bg-white/60 hover:bg-blue-50 transition-colors border border-blue-100"
                    title={dimension}
                  >
                    {timestamp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Compare button */}
          <div className="pt-2 border-t border-stone-200">
            <Button
              asChild
              variant="outline"
              className="w-full border-stone-300 hover:bg-white"
            >
              <Link href={`/recruiter/candidates/s/${scenarioId}/compare?ids=${assessmentId}`}>
                <Users className="mr-2 h-4 w-4" />
                Compare
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
