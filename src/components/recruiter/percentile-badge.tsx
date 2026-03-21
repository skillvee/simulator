"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Size variants for the PercentileBadge
 * - sm: inline text, for use within sentences
 * - md: standard badge size (default)
 * - lg: prominent card element
 */
export type PercentileBadgeSize = "sm" | "md" | "lg";

/**
 * Props for PercentileBadge component
 */
export interface PercentileBadgeProps {
  /** The percentile value (0-100) */
  percentile: number;
  /** Size variant: sm (inline), md (badge), lg (prominent) */
  size?: PercentileBadgeSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Get display text based on percentile value
 */
function getDisplayText(percentile: number): string {
  if (percentile >= 90) {
    return "Top 10%";
  }
  if (percentile >= 75) {
    return "Top 25%";
  }
  if (percentile >= 50) {
    return "Top 50%";
  }
  return `${percentile}${getOrdinalSuffix(percentile)} percentile`;
}

/**
 * Get styling classes based on percentile tier
 */
function getTierStyles(percentile: number): string {
  if (percentile >= 90) {
    // Gold/premium styling for Top 10%
    return "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 border-0";
  }
  if (percentile >= 75) {
    // Green styling for Top 25%
    return "bg-green-100 text-green-700 border-green-200";
  }
  if (percentile >= 50) {
    // Blue styling for Top 50%
    return "bg-blue-100 text-blue-700 border-blue-200";
  }
  // Neutral styling for below 50%
  return "bg-stone-100 text-stone-600 border-stone-200";
}

/**
 * Get size classes based on size prop
 */
function getSizeStyles(size: PercentileBadgeSize): string {
  switch (size) {
    case "sm":
      return "text-xs px-1.5 py-0.5";
    case "md":
      return "text-sm px-2 py-1";
    case "lg":
      return "text-base px-3 py-1.5 font-semibold";
  }
}

/**
 * PercentileBadge displays percentile rankings consistently across the app.
 *
 * Display formats:
 * - Top 10% (≥90): "Top 10%" with gold/premium styling
 * - Top 25% (≥75, <90): "Top 25%" with green styling
 * - Top 50% (≥50, <75): "Top 50%" with blue styling
 * - Below 50% (<50): "XX percentile" with neutral styling
 *
 * Includes a tooltip explaining: "Scored higher than XX% of all candidates"
 *
 * @since 2026-02-01
 * @see Issue #208: US-010
 */
export function PercentileBadge({
  percentile,
  size = "md",
  className,
}: PercentileBadgeProps) {
  const displayText = getDisplayText(percentile);
  const tooltipText = `Scored higher than ${percentile}% of all candidates`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-testid="percentile-badge"
          aria-label={tooltipText}
          className={cn(
            "inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors",
            getTierStyles(percentile),
            getSizeStyles(size),
            className
          )}
        >
          {displayText}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
