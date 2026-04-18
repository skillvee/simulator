"use client";

import { useTranslations } from "next-intl";
import type { CandidateResultsData } from "@/types";

interface WorkStyleSectionProps {
  results: CandidateResultsData;
}

export function CandidateWorkStyleSection({ results }: WorkStyleSectionProps) {
  const t = useTranslations("results.workStyle");
  const { metrics } = results;

  if (!metrics) return null;

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "\u2014";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  const metricItems = [
    {
      label: t("totalDuration"),
      value: formatDuration(metrics.totalDurationMinutes),
    },
    {
      label: t("activeWorkingTime"),
      value: formatDuration(metrics.workingPhaseMinutes),
    },
    {
      label: t("coworkersContacted"),
      value: metrics.coworkersContacted.toString(),
    },
    {
      label: t("aiToolsUsed"),
      value: metrics.aiToolsUsed ? t("yes") : t("no"),
    },
    {
      label: t("ciTests"),
      value:
        metrics.testsStatus === "unknown"
          ? "\u2014"
          : metrics.testsStatus.charAt(0).toUpperCase() +
            metrics.testsStatus.slice(1),
    },
  ];

  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="px-6 py-4 border-b border-stone-200">
        <h2 className="text-lg font-semibold text-stone-900">{t("title")}</h2>
      </div>

      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-4">
          {metricItems.map((item) => (
            <div key={item.label}>
              <p className="text-xs font-medium text-stone-500 mb-0.5">
                {item.label}
              </p>
              <p className="text-sm font-medium text-stone-900">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
