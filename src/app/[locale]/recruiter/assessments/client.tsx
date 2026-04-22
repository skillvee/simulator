"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Plus,
  Copy,
  Check,
  ArrowUpRight,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { AssessmentCardData } from "./_shared/data";

type TranslationFn = ReturnType<typeof useTranslations>;

// Skillvee palette — blue / indigo / slate family around #237CF1
const POSTERS = [
  { from: "#1E40AF", via: "#237CF1", to: "#60A5FA" },
  { from: "#1E3A8A", via: "#4338CA", to: "#6366F1" },
  { from: "#0369A1", via: "#0EA5E9", to: "#38BDF8" },
  { from: "#0F172A", via: "#1E3A8A", to: "#3B82F6" },
  { from: "#4338CA", via: "#6366F1", to: "#A5B4FC" },
  { from: "#1E293B", via: "#334155", to: "#64748B" },
  { from: "#0C4A6E", via: "#0369A1", to: "#0EA5E9" },
  { from: "#312E81", via: "#4F46E5", to: "#818CF8" },
  { from: "#237CF1", via: "#6366F1", to: "#8B5CF6" },
  { from: "#1E40AF", via: "#334155", to: "#1C1917" },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function posterFor(id: string) {
  return POSTERS[hashString(id) % POSTERS.length]!;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeTitle(name: string): string {
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    return name.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}

function formatRelativeTime(dateString: string, t: TranslationFn): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffHours < 1) return t("time.justNow");
  if (diffHours < 24) return t("time.hoursAgo", { hours: diffHours });
  if (diffDays === 1) return t("time.yesterday");
  if (diffDays < 7) return t("time.daysAgo", { days: diffDays });
  if (diffDays < 30)
    return t("time.weeksAgo", { weeks: Math.floor(diffDays / 7) });
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

interface AssessmentsListClientProps {
  simulations: AssessmentCardData[];
}

export function AssessmentsListClient({
  simulations,
}: AssessmentsListClientProps) {
  const t = useTranslations("recruiter.assessments");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const candidates = simulations.reduce(
      (s, x) => s + x.totalCandidates,
      0
    );
    const review = simulations.reduce(
      (s, x) => s + x.needsReviewCount,
      0
    );
    return { candidates, review };
  }, [simulations]);

  const sorted = useMemo(() => {
    return [...simulations].sort((a, b) => {
      const stateA =
        a.needsReviewCount > 0 ? 0 : a.totalCandidates > 0 ? 1 : 2;
      const stateB =
        b.needsReviewCount > 0 ? 0 : b.totalCandidates > 0 ? 1 : 2;
      if (stateA !== stateB) return stateA - stateB;
      const dateA = a.lastActivityDate ?? a.createdAt;
      const dateB = b.lastActivityDate ?? b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [simulations]);

  const handleCopy = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const link = `${baseUrl}/invite/${id}`;
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
    setCopiedId(id);
    toast.success(t("card.linkCopied"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (simulations.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-[1320px] px-8 py-12">
          <div className="mb-10 flex items-end justify-between">
            <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
              {t("title")}
            </h1>
            <Button
              asChild
              className="h-10 rounded-full bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Link href="/recruiter/simulations/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("createSimulation")}
              </Link>
            </Button>
          </div>
          <Card className="border-stone-200 bg-white">
            <CardContent className="p-12 text-center">
              <ClipboardCheck className="mx-auto h-16 w-16 text-stone-300" />
              <h2 className="mt-6 text-xl font-semibold text-stone-900">
                {t("empty.title")}
              </h2>
              <p className="mt-2 text-stone-500">{t("empty.description")}</p>
              <Button
                asChild
                className="mt-6 rounded-full bg-blue-600 px-5 text-white hover:bg-blue-700"
              >
                <Link href="/recruiter/simulations/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("empty.createButton")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1320px] px-8 py-12">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              {simulations.length} {t("stats.simulations")}
              <span className="mx-2 text-stone-300">·</span>
              {totals.candidates} {t("stats.candidates")}
              {totals.review > 0 && (
                <>
                  <span className="mx-2 text-stone-300">·</span>
                  <span className="font-medium text-stone-900">
                    {totals.review} {t("stats.toReview")}
                  </span>
                </>
              )}
            </p>
          </div>
          <Button
            asChild
            className="h-10 rounded-full bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Link href="/recruiter/simulations/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("createSimulation")}
            </Link>
          </Button>
        </div>

        {/* Poster grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((sim) => (
            <PosterTile
              key={sim.id}
              sim={sim}
              copied={copiedId === sim.id}
              onCopy={handleCopy}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PosterTile({
  sim,
  copied,
  onCopy,
  t,
}: {
  sim: AssessmentCardData;
  copied: boolean;
  onCopy: (e: React.MouseEvent, id: string) => void;
  t: TranslationFn;
}) {
  const poster = posterFor(sim.id);
  const empty = sim.totalCandidates === 0;

  const gradientStyle = {
    background: `linear-gradient(135deg, ${poster.from} 0%, ${poster.via} 50%, ${poster.to} 100%)`,
  };

  const activityText =
    sim.lastActivityDate && sim.lastActivityType
      ? `${t(`activity.${sim.lastActivityType}`, {
          name: sim.lastActivityUserName ?? t("activity.someone"),
        })} ${formatRelativeTime(sim.lastActivityDate, t)}`
      : null;

  return (
    <Link
      href={`/recruiter/assessments/${sim.id}`}
      className="group relative block aspect-[4/5]"
    >
      <div className="absolute inset-0 isolate overflow-hidden rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-stone-200/70 transition-[transform,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.3)] group-hover:ring-stone-300">
        {/* Full-bleed gradient */}
        <div
          className="absolute inset-0 transition-[filter] duration-500 ease-out group-hover:brightness-110 group-hover:saturate-110"
          style={gradientStyle}
        />

        {/* Soft noise */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Highlight orb */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />

        {/* Bottom shade for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

        {/* Review badge */}
        {sim.needsReviewCount > 0 && (
          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-stone-900 shadow-sm backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {t("card.needsReview", { count: sim.needsReviewCount })}
          </div>
        )}

        {/* Copy button */}
        <button
          onClick={(e) => onCopy(e, sim.id)}
          className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all ${
            copied
              ? "bg-white text-emerald-600"
              : "bg-white/25 text-white opacity-0 hover:bg-white/40 group-hover:opacity-100"
          }`}
          aria-label={t("card.copyInviteLink")}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Monogram + company pill */}
        <div className="absolute left-1/2 top-[34%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2.5">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-3xl font-semibold text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md transition-[background-color,box-shadow] duration-300 group-hover:bg-white/30 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.35)]">
            {initials(sim.companyName || sim.name)}
          </div>
          <div className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-md ring-1 ring-white/15 transition-colors duration-300 group-hover:bg-white/25 group-hover:ring-white/25">
            {sim.companyName}
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/85">
            <span>{t(`levels.${sim.targetLevel}`)}</span>
            <span className="text-white/50">·</span>
            {sim.isPublished ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {t("card.open")}
              </span>
            ) : (
              <span className="text-white/75">{t("card.draft")}</span>
            )}
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-lg font-semibold leading-tight text-white">
            {normalizeTitle(sim.name)}
          </h2>

          {/* Default state */}
          <div className="mt-3 flex items-end justify-between transition-opacity duration-300 group-hover:opacity-0">
            <div>
              {!empty ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tabular-nums text-white">
                    {sim.totalCandidates}
                  </span>
                  <span className="text-xs text-white/75">
                    {sim.totalCandidates === 1
                      ? t("card.candidate")
                      : t("card.candidates")}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-white/75">
                  {t("card.noCandidatesYet")}
                </span>
              )}
              {activityText && !empty && (
                <div className="mt-0.5 line-clamp-1 text-[11px] text-white/65">
                  {activityText}
                </div>
              )}
            </div>
            {sim.avgScore !== null && (
              <div className="text-right">
                <div className="text-xl font-semibold tabular-nums text-white">
                  {sim.avgScore.toFixed(1)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-white/65">
                  {t("card.avg")}
                </div>
              </div>
            )}
          </div>

          {/* Hover CTA */}
          <div className="pointer-events-none absolute inset-x-5 bottom-5 flex translate-y-1 items-center justify-between text-white opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <span className="text-sm font-medium">
              {t("card.openAssessment")}
            </span>
            <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
