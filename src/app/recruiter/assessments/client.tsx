"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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

const LEVEL_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
};

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
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
  targetLevel: string
): string {
  const level = LEVEL_LABELS[targetLevel] ?? targetLevel;
  switch (strengthLabel) {
    case "Exceptional":
      return `Exceptional for ${level}`;
    case "Strong":
      return `Strong for ${level}`;
    case "Meets expectations":
      return `Meets ${level} bar`;
    case "Below expectations":
      return `Below ${level} bar`;
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

  const handleCopyLink = async (e: React.MouseEvent, simulationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
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
    toast.success("Shareable simulation link copied");
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
      const stateA = a.needsReviewCount > 0 ? 0 : a.totalCandidates > 0 ? 1 : 2;
      const stateB = b.needsReviewCount > 0 ? 0 : b.totalCandidates > 0 ? 1 : 2;
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
        <h1 className="text-2xl font-semibold text-stone-900">Assessments</h1>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/recruiter/simulations/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Simulation
          </Link>
        </Button>
      </div>

      {/* Stat pills */}
      {simulations.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <StatPill label="simulations" value={simulations.length} />
          <StatPill label="candidates" value={totalCandidates} />
          <StatPill label="completed" value={totalCompleted} />
          {totalInProgress > 0 && (
            <StatPill label="in progress" value={totalInProgress} />
          )}
          {totalNeedsReview > 0 && (
            <StatPill label="to review" value={totalNeedsReview} highlight />
          )}
        </div>
      )}

      {/* Grid */}
      {simulations.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="mx-auto h-16 w-16 text-stone-300" />
            <h2 className="mt-6 text-xl font-semibold text-stone-900">
              No assessments yet
            </h2>
            <p className="mt-2 text-stone-500">
              Create a simulation and invite candidates to see their assessment
              results here.
            </p>
            <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
              <Link href="/recruiter/simulations/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Simulation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((sim) => (
            <AssessmentCard
              key={sim.id}
              sim={sim}
              copiedId={copiedId}
              onCopyLink={handleCopyLink}
            />
          ))}
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
      className={`rounded-lg border px-3.5 py-2 ${
        highlight
          ? "border-blue-200 bg-blue-50"
          : "border-stone-100 bg-stone-50"
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

// --- Score Circle ---

function ScoreCircle({
  score,
  strengthLabel,
  targetLevel,
}: {
  score: number;
  strengthLabel: string | null;
  targetLevel: string;
}) {
  const colorClass = getScoreColor(strengthLabel);
  const shortLabel = getStrengthShortLabel(strengthLabel, targetLevel);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${colorClass}`}
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

function PipelineBar({ sim }: { sim: AssessmentCardData }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-stone-400" />
        <span className="text-xs text-stone-600">
          <span className="font-medium text-stone-900">
            {sim.totalCandidates}
          </span>{" "}
          candidate{sim.totalCandidates !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full bg-stone-100">
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
            {sim.completedCount} completed
          </span>
        )}
        {sim.inProgressCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {sim.inProgressCount} active
          </span>
        )}
        {sim.pendingCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-stone-300" />
            {sim.pendingCount} pending
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
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tech) => (
        <Badge
          key={tech}
          variant="secondary"
          className="border-0 bg-stone-100 px-1.5 py-0 text-[10px] font-normal text-stone-500"
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

function LastActivity({ sim }: { sim: AssessmentCardData }) {
  if (!sim.lastActivityDate) return null;

  return (
    <div className="border-t border-stone-100 pt-2">
      <div className="flex items-center gap-1 text-xs text-stone-400">
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">
          {sim.lastActivityDescription
            ? `${sim.lastActivityDescription} ${formatRelativeTime(sim.lastActivityDate)}`
            : formatRelativeTime(sim.lastActivityDate)}
        </span>
      </div>
    </div>
  );
}

// --- Company + Status Line ---

function CompanyStatus({
  sim,
  dimmed,
}: {
  sim: AssessmentCardData;
  dimmed?: boolean;
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
            className={`truncate text-xs ${dimmed ? "text-stone-400" : "text-stone-400"}`}
          >
            {sim.companyName}
          </span>
          <span className="text-stone-200">·</span>
        </>
      )}
      {sim.isPublished ? (
        <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Open
        </span>
      ) : (
        <span className="flex-shrink-0 text-[11px] text-stone-400">Draft</span>
      )}
    </div>
  );
}

// --- Main Card Component ---

function AssessmentCard({
  sim,
  copiedId,
  onCopyLink,
}: {
  sim: AssessmentCardData;
  copiedId: string | null;
  onCopyLink: (e: React.MouseEvent, id: string) => void;
}) {
  const hasUnreviewed = sim.needsReviewCount > 0;
  const hasCandidates = sim.totalCandidates > 0;

  // State A: Needs attention
  if (hasUnreviewed) {
    return (
      <Link href={`/recruiter/assessments/${sim.id}`} className="group block">
        <Card className="flex h-full flex-col rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
          <CardContent className="flex flex-1 flex-col gap-3 p-4">
            {/* Review CTA — primary element */}
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 flex-shrink-0 text-blue-600" />
              <span className="text-base font-semibold text-blue-700">
                {sim.needsReviewCount} to review
              </span>
              <ArrowRight className="ml-auto h-3.5 w-3.5 text-blue-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>

            {/* Title + level + copy */}
            <div className="flex items-start justify-between">
              <h3 className="line-clamp-1 text-sm font-medium leading-tight text-stone-900 transition-colors group-hover:text-blue-600">
                {normalizeTitle(sim.name)}
              </h3>
              <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                <Badge
                  variant="outline"
                  className="border-stone-200 px-1.5 py-0 text-[10px] text-stone-500"
                >
                  {LEVEL_LABELS[sim.targetLevel] ?? sim.targetLevel}
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
            <CompanyStatus sim={sim} />

            {/* Tech stack */}
            <TechStackTags techStack={sim.techStack} />

            {/* Pipeline */}
            <PipelineBar sim={sim} />

            {/* Score with context */}
            {sim.avgScore !== null && (
              <div className="border-t border-stone-100 pt-2">
                <ScoreCircle
                  score={sim.avgScore}
                  strengthLabel={sim.strengthLabel}
                  targetLevel={sim.targetLevel}
                />
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Last activity */}
            <LastActivity sim={sim} />
          </CardContent>
        </Card>
      </Link>
    );
  }

  // State B: Active (has candidates, none to review)
  if (hasCandidates) {
    return (
      <Link href={`/recruiter/assessments/${sim.id}`} className="group block">
        <Card className="flex h-full flex-col rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
          <CardContent className="flex flex-1 flex-col gap-2.5 p-4">
            {/* Title + level + copy */}
            <div className="flex items-start justify-between">
              <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-stone-900 transition-colors group-hover:text-blue-600">
                {normalizeTitle(sim.name)}
              </h3>
              <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                <Badge
                  variant="outline"
                  className="border-stone-200 px-1.5 py-0 text-[10px] text-stone-500"
                >
                  {LEVEL_LABELS[sim.targetLevel] ?? sim.targetLevel}
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
            <CompanyStatus sim={sim} />

            {/* Tech stack */}
            <TechStackTags techStack={sim.techStack} />

            {/* Pipeline */}
            <PipelineBar sim={sim} />

            {/* Score with context */}
            {sim.avgScore !== null && (
              <div className="border-t border-stone-100 pt-2">
                <ScoreCircle
                  score={sim.avgScore}
                  strengthLabel={sim.strengthLabel}
                  targetLevel={sim.targetLevel}
                />
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Last activity — more prominent for active cards */}
            {sim.lastActivityDate && (
              <div className="border-t border-stone-100 pt-2">
                <div className="flex items-center gap-1 text-xs text-stone-500">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {sim.lastActivityDescription
                      ? `${sim.lastActivityDescription} ${formatRelativeTime(sim.lastActivityDate)}`
                      : formatRelativeTime(sim.lastActivityDate)}
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
    <Link href={`/recruiter/assessments/${sim.id}`} className="group block">
      <Card className="flex h-full flex-col rounded-xl border border-stone-200 bg-stone-50/50 shadow-none transition-all hover:border-blue-300 hover:shadow-sm">
        <CardContent className="flex flex-1 flex-col gap-2 p-3.5">
          {/* Title + copy */}
          <div className="flex items-start justify-between">
            <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-stone-700 transition-colors group-hover:text-blue-600">
              {normalizeTitle(sim.name)}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => onCopyLink(e, sim.id)}
              className={`ml-2 h-6 w-6 flex-shrink-0 p-0 ${
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
          <CompanyStatus sim={sim} dimmed />

          {/* Empty state */}
          <div className="py-2">
            <p className="mb-2 text-xs text-stone-400">No candidates yet</p>
            <button
              onClick={(e) => onCopyLink(e, sim.id)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
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
