"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Hourglass,
} from "lucide-react";
import { isInProgressStatus } from "@/lib/core";
import type { CandidateAssessmentData } from "./page";

type TranslationFn = ReturnType<typeof useTranslations>;

function formatRelativeTime(dateString: string, t: TranslationFn) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return t("time.justNow");
  if (diffHours < 24) return t("time.hoursAgo", { hours: diffHours });
  if (diffDays === 1) return t("time.yesterday");
  if (diffDays < 7) return t("time.daysAgo", { days: diffDays });
  if (diffDays < 30) return t("time.weeksAgo", { weeks: Math.floor(diffDays / 7) });
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDuration(startedAt: string, completedAt: string, t: TranslationFn): string {
  const durationMs =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const totalMinutes = Math.round(durationMs / 60000);

  if (totalMinutes < 60) return t("time.minutes", { minutes: totalMinutes });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? t("time.hoursMinutes", { hours, minutes }) : t("time.hours", { hours });
}

function normalizeTitle(name: string): string {
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    return name.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}

function getScoreColor(score: number): string {
  if (score >= 4) return "border-green-400 bg-green-50 text-green-700";
  if (score >= 3) return "border-blue-400 bg-blue-50 text-blue-700";
  if (score >= 2) return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-stone-300 bg-stone-50 text-stone-600";
}

function getLevelLabel(level: string): string {
  return level.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CandidateDashboardClientProps {
  assessments: CandidateAssessmentData[];
  userName: string | null;
}

export function CandidateDashboardClient({
  assessments,
  userName,
}: CandidateDashboardClientProps) {
  const t = useTranslations("dashboard");
  const inProgress = assessments.filter((a) => isInProgressStatus(a.status));
  const pending = assessments.filter((a) => a.status === "WELCOME");
  const completed = assessments.filter((a) => a.status === "COMPLETED");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">
          {userName ? t("header.welcomeBack", { name: userName.split(" ")[0] }) : t("header.myAssessments")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t("header.subtitle")}
        </p>
      </div>

      {/* Stat pills */}
      {assessments.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <StatPill label={t("stats.total")} value={assessments.length} />
          {inProgress.length > 0 && (
            <StatPill label={t("stats.inProgress")} value={inProgress.length} highlight />
          )}
          {pending.length > 0 && (
            <StatPill label={t("stats.pending")} value={pending.length} />
          )}
          <StatPill label={t("stats.completed")} value={completed.length} />
        </div>
      )}

      {assessments.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto h-16 w-16 text-stone-300" />
            <h2 className="mt-6 text-xl font-semibold text-stone-900">
              {t("emptyState.title")}
            </h2>
            <p className="mt-2 text-stone-500 max-w-md mx-auto">
              {t("emptyState.description")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* In Progress Section */}
          {inProgress.length > 0 && (
            <AssessmentSection
              title={t("sections.inProgress")}
              icon={<Play className="h-4 w-4 text-blue-600" />}
              assessments={inProgress}
              t={t}
            />
          )}

          {/* Pending Section */}
          {pending.length > 0 && (
            <AssessmentSection
              title={t("sections.readyToStart")}
              icon={<Hourglass className="h-4 w-4 text-amber-600" />}
              assessments={pending}
              t={t}
            />
          )}

          {/* Completed Section */}
          {completed.length > 0 && (
            <AssessmentSection
              title={t("sections.completed")}
              icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
              assessments={completed}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
}

// --- Stat Pill ---

function StatPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3.5 py-2 border ${
        highlight
          ? "bg-blue-50 border-blue-200"
          : "bg-stone-50 border-stone-100"
      }`}
    >
      <div
        className={`text-lg font-semibold tabular-nums ${
          highlight ? "text-blue-700" : "text-stone-900"
        }`}
      >
        {value}
      </div>
      <div
        className={`text-[11px] ${
          highlight ? "text-blue-600" : "text-stone-500"
        }`}
      >
        {label}
      </div>
    </div>
  );
}

// --- Section ---

function AssessmentSection({
  title,
  icon,
  assessments,
  t,
}: {
  title: string;
  icon: React.ReactNode;
  assessments: CandidateAssessmentData[];
  t: TranslationFn;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">
          {title}
        </h2>
        <span className="text-xs text-stone-400">({assessments.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assessments.map((assessment) => (
          <AssessmentCard key={assessment.id} assessment={assessment} t={t} />
        ))}
      </div>
    </div>
  );
}

// --- Assessment Card ---

function AssessmentCard({
  assessment,
  t,
}: {
  assessment: CandidateAssessmentData;
  t: TranslationFn;
}) {
  const isCompleted = assessment.status === "COMPLETED";
  const isPending = assessment.status === "WELCOME";
  const isWorking = isInProgressStatus(assessment.status);

  const href = isCompleted && assessment.overallScore !== null
    ? `/assessments/${assessment.id}/results`
    : `/assessments/${assessment.id}/${isPending ? "welcome" : "work"}`;

  return (
    <Link href={href} className="block group">
      <Card
        className={`bg-white shadow-sm hover:shadow-md transition-all h-full flex flex-col rounded-xl border hover:border-blue-300 ${
          isWorking
            ? "border-blue-200"
            : isPending
              ? "border-amber-200"
              : "border-stone-200"
        }`}
      >
        <CardContent className="p-4 flex flex-col flex-1 gap-2.5">
          {/* Status indicator for in-progress */}
          {isWorking && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-xs font-medium text-blue-600">
                {t("status.inProgress")}
              </span>
            </div>
          )}

          {isPending && (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-xs font-medium text-amber-600">
                {t("status.readyToStart")}
              </span>
            </div>
          )}

          {/* Title + level */}
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-stone-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
              {normalizeTitle(assessment.scenarioName)}
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 text-stone-500 border-stone-200 flex-shrink-0 ml-2"
            >
              {t(`levels.${assessment.targetLevel}`)}
            </Badge>
          </div>

          {/* Company */}
          <span className="text-xs text-stone-400 truncate">
            {assessment.companyName}
          </span>

          {/* Tech stack */}
          {assessment.techStack.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {assessment.techStack.slice(0, 3).map((tech) => (
                <Badge
                  key={tech}
                  variant="secondary"
                  className="bg-stone-100 text-stone-500 text-[10px] px-1.5 py-0 font-normal border-0"
                >
                  {tech}
                </Badge>
              ))}
              {assessment.techStack.length > 3 && (
                <span className="text-[10px] text-stone-400">
                  {t("card.more", { count: assessment.techStack.length - 3 })}
                </span>
              )}
            </div>
          )}

          {/* Score for completed */}
          {isCompleted && assessment.overallScore !== null && (
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${getScoreColor(assessment.overallScore)}`}
                >
                  {assessment.overallScore.toFixed(1)}
                </div>
                {assessment.overallLevel && (
                  <span className="text-[11px] text-stone-500">
                    {getLevelLabel(assessment.overallLevel)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Processing state for completed without score */}
          {isCompleted && assessment.overallScore === null && (
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center gap-1.5">
                {assessment.videoStatus === "FAILED" ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs text-red-600">
                      {t("card.processingFailed")}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 text-stone-400 animate-pulse" />
                    <span className="text-xs text-stone-500">
                      {t("card.resultsBeingProcessed")}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-stone-400">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span>
                {isCompleted && assessment.completedAt
                  ? t("card.completedTime", { time: formatRelativeTime(assessment.completedAt, t) })
                  : isWorking
                    ? t("card.startedTime", { time: formatRelativeTime(assessment.startedAt, t) })
                    : t("card.invitedTime", { time: formatRelativeTime(assessment.startedAt, t) })}
              </span>
            </div>

            {isCompleted && assessment.completedAt && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-stone-400 border-stone-200"
              >
                {formatDuration(assessment.startedAt, assessment.completedAt, t)}
              </Badge>
            )}

            {!isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                {isPending ? t("card.start") : t("card.continue")}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
