"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Copy,
  Check,
  Users,
  Clock,
  ClipboardCheck,
  Eye,
  Link as LinkIcon,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AssessmentCardData } from "./page";

type TranslationFn = ReturnType<typeof useTranslations>;

function formatRelativeTime(dateString: string, t: TranslationFn) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return t('time.justNow');
  if (diffHours < 24) return t('time.hoursAgo', { hours: diffHours });
  if (diffDays === 1) return t('time.yesterday');
  if (diffDays < 7) return t('time.daysAgo', { days: diffDays });
  if (diffDays < 30) return t('time.weeksAgo', { weeks: Math.floor(diffDays / 7) });
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizeTitle(name: string): string {
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    return name.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}

function getScoreColor(strengthLabel: string | null) {
  switch (strengthLabel) {
    case "Exceptional":
      return "border-green-400 bg-green-50 text-green-700";
    case "Strong":
      return "border-blue-400 bg-blue-50 text-blue-700";
    case "Meets expectations":
      return "border-stone-300 bg-stone-50 text-stone-600";
    case "Below expectations":
      return "border-amber-300 bg-amber-50 text-amber-700";
    default:
      return "border-stone-300 bg-stone-50 text-stone-600";
  }
}

function getStrengthShortLabel(
  strengthLabel: string | null,
  targetLevel: string,
  t: TranslationFn
): string {
  const level = t(`levels.${targetLevel}`);
  switch (strengthLabel) {
    case "Exceptional":
      return t('strengthLabels.exceptional', { level });
    case "Strong":
      return t('strengthLabels.strong', { level });
    case "Meets expectations":
      return t('strengthLabels.meets', { level });
    case "Below expectations":
      return t('strengthLabels.below', { level });
    default:
      return "";
  }
}

interface AssessmentsListClientProps {
  simulations: AssessmentCardData[];
}

export function AssessmentsListClient({
  simulations,
}: AssessmentsListClientProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const t = useTranslations('recruiter.assessments');

  const handleCopyLink = async (
    e: React.MouseEvent,
    simulationId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const link = `${baseUrl}/invite/${simulationId}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopiedId(simulationId);
    toast.success(t('card.linkCopied'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Aggregate stats
  const totalCandidates = simulations.reduce(
    (sum, s) => sum + s.totalCandidates,
    0
  );
  const totalCompleted = simulations.reduce(
    (sum, s) => sum + s.completedCount,
    0
  );
  const totalInProgress = simulations.reduce(
    (sum, s) => sum + s.inProgressCount,
    0
  );
  const totalNeedsReview = simulations.reduce(
    (sum, s) => sum + s.needsReviewCount,
    0
  );

  // Sort by urgency: needs-review first, then active, then empty
  const sorted = useMemo(() => {
    return [...simulations].sort((a, b) => {
      const stateA =
        a.needsReviewCount > 0 ? 0 : a.totalCandidates > 0 ? 1 : 2;
      const stateB =
        b.needsReviewCount > 0 ? 0 : b.totalCandidates > 0 ? 1 : 2;
      if (stateA !== stateB) return stateA - stateB;
      // Within same state, sort by most recent activity, then creation date
      const dateA = a.lastActivityDate ?? a.createdAt;
      const dateB = b.lastActivityDate ?? b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [simulations]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">{t('title')}</h1>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/recruiter/simulations/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('createSimulation')}
          </Link>
        </Button>
      </div>

      {/* Stat pills */}
      {simulations.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <StatPill t={t} label="simulations" value={simulations.length} />
          <StatPill t={t} label="candidates" value={totalCandidates} />
          <StatPill t={t} label="completed" value={totalCompleted} />
          {totalInProgress > 0 && (
            <StatPill t={t} label="inProgress" value={totalInProgress} />
          )}
          {totalNeedsReview > 0 && (
            <StatPill
              t={t}
              label="toReview"
              value={totalNeedsReview}
              highlight
            />
          )}
        </div>
      )}

      {/* Grid */}
      {simulations.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="mx-auto h-16 w-16 text-stone-300" />
            <h2 className="mt-6 text-xl font-semibold text-stone-900">
              {t('empty.title')}
            </h2>
            <p className="mt-2 text-stone-500">
              {t('empty.description')}
            </p>
            <Button
              asChild
              className="mt-6 bg-blue-600 hover:bg-blue-700"
            >
              <Link href="/recruiter/simulations/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('empty.createButton')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((sim) => (
            <AssessmentCard
              key={sim.id}
              sim={sim}
              copiedId={copiedId}
              onCopyLink={handleCopyLink}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Stat Pill ---

function StatPill({
  t,
  label,
  value,
  highlight,
}: {
  t: TranslationFn;
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
        {t(`stats.${label}`)}
      </div>
    </div>
  );
}

// --- Score Circle ---

function ScoreCircle({
  score,
  strengthLabel,
  targetLevel,
  t,
}: {
  score: number;
  strengthLabel: string | null;
  targetLevel: string;
  t: TranslationFn;
}) {
  const colorClass = getScoreColor(strengthLabel);
  const shortLabel = getStrengthShortLabel(strengthLabel, targetLevel, t);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${colorClass}`}
      >
        {score.toFixed(1)}
      </div>
      {shortLabel && (
        <span className="text-[11px] text-stone-500">{shortLabel}</span>
      )}
    </div>
  );
}

// --- Progress Bar ---

function PipelineBar({ sim, t }: { sim: AssessmentCardData; t: TranslationFn }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Users className="h-3.5 w-3.5 text-stone-400" />
        <span className="text-xs text-stone-600">
          <span className="font-medium text-stone-900">
            {sim.totalCandidates}
          </span>{" "}
          {sim.totalCandidates !== 1 ? t('card.candidates') : t('card.candidate')}
        </span>
      </div>

      <div className="flex h-2 w-full rounded-full overflow-hidden bg-stone-100 mb-2">
        {sim.completedCount > 0 && (
          <div
            className="bg-green-500"
            style={{
              width: `${(sim.completedCount / sim.totalCandidates) * 100}%`,
            }}
          />
        )}
        {sim.inProgressCount > 0 && (
          <div
            className="bg-blue-500"
            style={{
              width: `${(sim.inProgressCount / sim.totalCandidates) * 100}%`,
            }}
          />
        )}
        {sim.pendingCount > 0 && (
          <div
            className="bg-stone-300"
            style={{
              width: `${(sim.pendingCount / sim.totalCandidates) * 100}%`,
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-stone-500">
        {sim.completedCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {sim.completedCount} {t('card.completed')}
          </span>
        )}
        {sim.inProgressCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {sim.inProgressCount} {t('card.active')}
          </span>
        )}
        {sim.pendingCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-stone-300" />
            {sim.pendingCount} {t('card.pending')}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Tech Stack Tags ---

function TechStackTags({ techStack }: { techStack: string[] }) {
  if (techStack.length === 0) return null;
  const visible = techStack.slice(0, 3);
  const overflow = techStack.length - 3;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((tech) => (
        <Badge
          key={tech}
          variant="secondary"
          className="bg-stone-100 text-stone-500 text-[10px] px-1.5 py-0 font-normal border-0"
        >
          {tech}
        </Badge>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-stone-400">+{overflow}</span>
      )}
    </div>
  );
}

// --- Last Activity Footer ---

function LastActivity({ sim, t }: { sim: AssessmentCardData; t: TranslationFn }) {
  if (!sim.lastActivityDate) return null;

  const getActivityText = () => {
    if (sim.lastActivityType && sim.lastActivityUserName) {
      return t(`activity.${sim.lastActivityType}`, { name: sim.lastActivityUserName });
    } else if (sim.lastActivityType) {
      return t(`activity.${sim.lastActivityType}`, { name: t('activity.someone') });
    }
    return sim.lastActivityDescription;
  };

  return (
    <div className="pt-2 border-t border-stone-100">
      <div className="flex items-center gap-1 text-xs text-stone-400">
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">
          {getActivityText()}
          {sim.lastActivityDate && ` ${formatRelativeTime(sim.lastActivityDate, t)}`}
        </span>
      </div>
    </div>
  );
}

// --- Company + Status Line ---

function CompanyStatus({
  sim,
  dimmed,
  t,
}: {
  sim: AssessmentCardData;
  dimmed?: boolean;
  t: TranslationFn;
}) {
  // Hide company if title already contains it
  const showCompany = !sim.name
    .toLowerCase()
    .includes(sim.companyName.toLowerCase());

  return (
    <div className="flex items-center gap-1.5">
      {showCompany && (
        <>
          <span
            className={`text-xs truncate ${dimmed ? "text-stone-400" : "text-stone-400"}`}
          >
            {sim.companyName}
          </span>
          <span className="text-stone-200">·</span>
        </>
      )}
      {sim.isPublished ? (
        <span className="flex items-center gap-1 text-[11px] text-green-600 flex-shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          {t('card.open')}
        </span>
      ) : (
        <span className="text-[11px] text-stone-400 flex-shrink-0">
          {t('card.draft')}
        </span>
      )}
    </div>
  );
}

// --- Main Card Component ---

function AssessmentCard({
  sim,
  copiedId,
  onCopyLink,
  t,
}: {
  sim: AssessmentCardData;
  copiedId: string | null;
  onCopyLink: (e: React.MouseEvent, id: string) => void;
  t: TranslationFn;
}) {
  const hasUnreviewed = sim.needsReviewCount > 0;
  const hasCandidates = sim.totalCandidates > 0;

  // State A: Needs attention
  if (hasUnreviewed) {
    return (
      <Link
        href={`/recruiter/assessments/${sim.id}`}
        className="block group"
      >
        <Card className="bg-white shadow-sm hover:shadow-md transition-all h-full flex flex-col rounded-xl border border-stone-200 hover:border-blue-300">
          <CardContent className="p-4 flex flex-col flex-1 gap-3">
            {/* Review CTA — primary element */}
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="text-base font-semibold text-blue-700">
                {sim.needsReviewCount} to review
              </span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Title + level + copy */}
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-stone-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-1">
                {normalizeTitle(sim.name)}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 text-stone-500 border-stone-200"
                >
                  {t(`levels.${sim.targetLevel}`)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => onCopyLink(e, sim.id)}
                  className={`h-6 w-6 p-0 ${
                    copiedId === sim.id
                      ? "text-blue-700"
                      : "text-stone-300 hover:text-stone-500"
                  }`}
                >
                  {copiedId === sim.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Company + status */}
            <CompanyStatus sim={sim} t={t} />

            {/* Tech stack */}
            <TechStackTags techStack={sim.techStack} />

            {/* Pipeline */}
            <PipelineBar sim={sim} t={t} />

            {/* Score with context */}
            {sim.avgScore !== null && (
              <div className="pt-2 border-t border-stone-100">
                <ScoreCircle
                  score={sim.avgScore}
                  strengthLabel={sim.strengthLabel}
                  targetLevel={sim.targetLevel}
                  t={t}
                />
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Last activity */}
            <LastActivity sim={sim} t={t} />
          </CardContent>
        </Card>
      </Link>
    );
  }

  // State B: Active (has candidates, none to review)
  if (hasCandidates) {
    return (
      <Link
        href={`/recruiter/assessments/${sim.id}`}
        className="block group"
      >
        <Card className="bg-white shadow-sm hover:shadow-md transition-all h-full flex flex-col rounded-xl border border-stone-200 hover:border-blue-300">
          <CardContent className="p-4 flex flex-col flex-1 gap-2.5">
            {/* Title + level + copy */}
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-stone-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                {normalizeTitle(sim.name)}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 text-stone-500 border-stone-200"
                >
                  {t(`levels.${sim.targetLevel}`)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => onCopyLink(e, sim.id)}
                  className={`h-6 w-6 p-0 ${
                    copiedId === sim.id
                      ? "text-blue-700"
                      : "text-stone-300 hover:text-stone-500"
                  }`}
                >
                  {copiedId === sim.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Company + status */}
            <CompanyStatus sim={sim} t={t} />

            {/* Tech stack */}
            <TechStackTags techStack={sim.techStack} />

            {/* Pipeline */}
            <PipelineBar sim={sim} t={t} />

            {/* Score with context */}
            {sim.avgScore !== null && (
              <div className="pt-2 border-t border-stone-100">
                <ScoreCircle
                  score={sim.avgScore}
                  strengthLabel={sim.strengthLabel}
                  targetLevel={sim.targetLevel}
                  t={t}
                />
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Last activity — more prominent for active cards */}
            {sim.lastActivityDate && (
              <div className="pt-2 border-t border-stone-100">
                <div className="flex items-center gap-1 text-xs text-stone-500">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {sim.lastActivityDescription
                      ? `${sim.lastActivityDescription} ${formatRelativeTime(sim.lastActivityDate, t)}`
                      : formatRelativeTime(sim.lastActivityDate, t)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    );
  }

  // State C: Empty (no candidates)
  return (
    <Link
      href={`/recruiter/assessments/${sim.id}`}
      className="block group"
    >
      <Card className="bg-stone-50/50 shadow-none hover:shadow-sm transition-all h-full flex flex-col rounded-xl border border-stone-200 hover:border-blue-300">
        <CardContent className="p-3.5 flex flex-col flex-1 gap-2">
          {/* Title + copy */}
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-stone-700 group-hover:text-blue-600 transition-colors leading-tight line-clamp-1">
              {normalizeTitle(sim.name)}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => onCopyLink(e, sim.id)}
              className={`h-6 w-6 p-0 flex-shrink-0 ml-2 ${
                copiedId === sim.id
                  ? "text-blue-700"
                  : "text-stone-300 hover:text-stone-500"
              }`}
            >
              {copiedId === sim.id ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Company + status */}
          <CompanyStatus sim={sim} dimmed t={t} />

          {/* Empty state */}
          <div className="py-2">
            <p className="text-xs text-stone-400 mb-2">No candidates yet</p>
            <button
              onClick={(e) => onCopyLink(e, sim.id)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              <LinkIcon className="h-3 w-3" />
              Copy invite link
            </button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
