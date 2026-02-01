"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Candidate strength levels
 */
export type StrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

/**
 * Props for HiringSignalsSummary component
 */
export interface HiringSignalsSummaryProps {
  /** Green flags - behaviors that stood out positively */
  greenFlags: string[];
  /** Red flags - concerns or gaps worth discussing in interviews */
  redFlags: string[];
  /** Overall strength level of the candidate */
  strengthLevel: StrengthLevel;
  /** Overall summary text (2-3 sentences) */
  overallSummary: string;
}

/**
 * Get strength level badge styling
 */
function getStrengthBadgeStyles(level: StrengthLevel): string {
  switch (level) {
    case "Exceptional":
      return "bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 border-0 text-lg px-4 py-2";
    case "Strong":
      return "bg-green-100 text-green-700 border-0 text-lg px-4 py-2";
    case "Proficient":
      return "bg-blue-100 text-blue-700 border-0 text-lg px-4 py-2";
    case "Developing":
      return "bg-stone-100 text-stone-600 border-0 text-lg px-4 py-2";
  }
}

/**
 * HiringSignalsSummary displays green flags, red flags, and an overall
 * summary with strength level badge for recruiters to quickly assess candidates.
 */
export function HiringSignalsSummary({
  greenFlags,
  redFlags,
  strengthLevel,
  overallSummary,
}: HiringSignalsSummaryProps) {
  const hasGreenFlags = greenFlags.length > 0;
  const hasRedFlags = redFlags.length > 0;

  return (
    <div className="space-y-6">
      {/* Two-column layout for flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Green Flags - Where they shined */}
        <Card className="border-green-200 bg-green-50/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Where they shined
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasGreenFlags ? (
              <ul className="space-y-2">
                {greenFlags.map((flag, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600 italic">
                No significant signals identified
              </p>
            )}
          </CardContent>
        </Card>

        {/* Red Flags - Areas to probe */}
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Areas to probe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasRedFlags ? (
              <ul className="space-y-2">
                {redFlags.map((flag, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-amber-700"
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-amber-600 italic">
                No significant signals identified
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary section */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Large strength badge */}
            <div className="shrink-0">
              <Badge className={cn(getStrengthBadgeStyles(strengthLevel), "font-semibold")}>
                {strengthLevel}
              </Badge>
            </div>

            {/* Overall summary text */}
            <p className="text-stone-600 leading-relaxed">
              {overallSummary}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
