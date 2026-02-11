"use client";

import { cn } from "@/lib/utils";
import { getScoreColor } from "./helpers";

interface ScoreDotsProps {
  score: number;
  maxScore?: number;
  showNumber?: boolean;
  size?: "sm" | "md";
}

export function ScoreDots({ score, maxScore = 4, showNumber = true, size = "sm" }: ScoreDotsProps) {
  const roundedScore = Math.round(score);
  const colors = getScoreColor(score);
  const dotSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex items-center gap-1.5">
      {showNumber && (
        <span className={cn(
          "font-semibold rounded-md px-1.5 py-0.5 text-xs tabular-nums",
          colors.bg,
          colors.text
        )}>
          {score.toFixed(1)}
        </span>
      )}
      <div className={cn("flex gap-0.5", dotSize)}>
        {Array.from({ length: maxScore }, (_, i) => (
          <span
            key={i}
            className={cn(
              i < roundedScore ? colors.fill : "text-stone-300"
            )}
          >
            {i < roundedScore ? "\u25CF" : "\u25CB"}
          </span>
        ))}
      </div>
    </div>
  );
}
