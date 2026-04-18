"use client";

import { cn } from "@/lib/utils";
import { scoreToBucket } from "@/components/assessment/helpers";

interface BucketBarProps {
  score: number;
  scoreScale: 4 | 5;
}

const BUCKET_COLORS = [
  "bg-stone-300",
  "bg-stone-400",
  "bg-blue-500",
  "bg-green-500",
];

export function BucketBar({ score, scoreScale }: BucketBarProps) {
  const bucket = scoreToBucket(score, scoreScale);
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-6 rounded-sm",
            i <= bucket ? BUCKET_COLORS[bucket] : "bg-stone-200"
          )}
        />
      ))}
    </div>
  );
}
