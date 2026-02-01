"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for DimensionScoreCard component
 */
export interface DimensionScoreCardProps {
  /** Dimension name (e.g., "PROBLEM_SOLVING") */
  dimension: string;
  /** Score on 1-5 scale */
  score: number;
  /** Percentile rank (0-100) */
  percentile: number;
  /** Observable behaviors that support the score */
  observableBehaviors: string[];
  /** Video timestamps where evidence was observed (e.g., ["2:34", "5:12"]) */
  timestamps: string[];
  /** Whether this dimension is a trainable gap */
  trainableGap: boolean;
  /** Callback when a timestamp chip is clicked */
  onTimestampClick: (seconds: number) => void;
}

/**
 * Format dimension name for display
 * PROBLEM_SOLVING -> Problem Solving
 * COMMUNICATION -> Communication
 */
function formatDimensionName(dimension: string): string {
  return dimension
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Convert timestamp string to seconds
 * "2:34" -> 154
 * "1:05:30" -> 3930
 */
function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Get border color based on score
 * >= 4: green
 * 3: yellow
 * <= 2: red
 */
function getScoreBorderColor(score: number): string {
  if (score >= 4) return "border-l-green-500";
  if (score >= 3) return "border-l-yellow-500";
  return "border-l-red-500";
}

/**
 * Render score as filled circles (1-5 scale)
 * e.g., score 4 -> ●●●●○
 */
function ScoreCircles({ score }: { score: number }) {
  const roundedScore = Math.round(score);
  const circles = [];

  for (let i = 1; i <= 5; i++) {
    circles.push(
      <span
        key={i}
        className={cn(
          "text-lg",
          i <= roundedScore ? "text-stone-800" : "text-stone-300"
        )}
      >
        {i <= roundedScore ? "●" : "○"}
      </span>
    );
  }

  return <div className="flex gap-0.5">{circles}</div>;
}

/**
 * Format percentile for display
 * 85 -> "Top 15%" or "85th percentile"
 */
function formatPercentile(percentile: number): string {
  const topPercent = Math.round(100 - percentile);
  if (topPercent <= 25) {
    return `Top ${topPercent}%`;
  }
  return `${Math.round(percentile)}th percentile`;
}

/**
 * DimensionScoreCard displays a candidate's score for a single assessment dimension
 * with supporting evidence including observable behaviors and video timestamps.
 */
export function DimensionScoreCard({
  dimension,
  score,
  percentile,
  observableBehaviors,
  timestamps,
  trainableGap,
  onTimestampClick,
}: DimensionScoreCardProps) {
  const handleTimestampClick = (timestamp: string) => {
    const seconds = timestampToSeconds(timestamp);
    onTimestampClick(seconds);
  };

  return (
    <Card
      className={cn(
        "border-stone-200 bg-white shadow-sm border-l-4",
        getScoreBorderColor(score)
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-medium text-stone-900">
            {formatDimensionName(dimension)}
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreCircles score={score} />
            <Badge
              variant="secondary"
              className="text-xs bg-stone-100 text-stone-600"
            >
              {formatPercentile(percentile)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Trainable gap indicator */}
        {trainableGap && (
          <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
            <GraduationCap className="h-3.5 w-3.5" />
            Trainable
          </Badge>
        )}

        {/* Observable behaviors */}
        {observableBehaviors.length > 0 && (
          <ul className="space-y-1.5">
            {observableBehaviors.map((behavior, idx) => (
              <li
                key={idx}
                className="text-sm text-stone-600 flex items-start gap-2"
              >
                <span className="text-stone-400 mt-1">•</span>
                <span>{behavior}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Timestamp chips */}
        {timestamps.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {timestamps.map((timestamp, idx) => (
              <button
                key={idx}
                onClick={() => handleTimestampClick(timestamp)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                {timestamp}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
