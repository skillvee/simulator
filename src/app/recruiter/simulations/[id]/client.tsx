"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, AlertTriangle, Circle, X, Copy, Check, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RelativeStrength, TargetLevel } from "@/lib/rubric/level-expectations";
import { LEVEL_EXPECTATIONS } from "@/lib/rubric/level-expectations";

interface CandidateData {
  assessmentId: string;
  name: string | null;
  email: string | null;
  status: string;
  overallScore: number | null;
  percentile: number | null;
  strengthLevel: RelativeStrength | null;
  dimensionScores: Record<string, number>;
  redFlagCount: number;
  redFlags: string[];
  evaluationConfidence: string | null;
  summary: string | null;
  completedAt: string | null;
}

interface SimulationCandidatesClientProps {
  simulationId: string;
  simulationName: string;
  targetLevel: TargetLevel;
  expectedScore: number;
  dimensionExpectations: Record<string, number> | null;
  archetypeName: string | null;
  roleFamilyName: string | null;
  candidates: CandidateData[];
}

const ALL_DIMENSIONS = [
  { key: "COMMUNICATION", abbr: "Comm", full: "Communication" },
  { key: "PROBLEM_SOLVING", abbr: "Problem", full: "Problem Solving" },
  { key: "TECHNICAL_KNOWLEDGE", abbr: "Tech", full: "Technical Knowledge" },
  { key: "COLLABORATION", abbr: "Collab", full: "Collaboration" },
  { key: "ADAPTABILITY", abbr: "Adapt", full: "Adaptability" },
  { key: "LEADERSHIP", abbr: "Lead", full: "Leadership" },
  { key: "CREATIVITY", abbr: "Creative", full: "Creativity" },
  { key: "TIME_MANAGEMENT", abbr: "Time", full: "Time Management" },
] as const;

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "default";
    case "WORKING":
      return "secondary";
    case "WELCOME":
      return "outline";
    default:
      return "outline";
  }
}

function getStrengthBadgeColor(level: RelativeStrength | null): string {
  switch (level) {
    case "Exceptional":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Strong":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "Meets expectations":
      return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    case "Below expectations":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
}

function getDimensionFitColor(score: number, expectedScore: number): string {
  const diff = score - expectedScore;
  if (diff >= 0.5) return "text-green-700";
  if (diff >= -0.5) return "text-gray-700";
  return "text-red-700";
}

function getDimensionBarColor(score: number, expectedScore: number): string {
  const diff = score - expectedScore;
  if (diff >= 0.5) return "bg-green-400";
  if (diff >= -0.5) return "bg-blue-400";
  return "bg-red-400";
}

function getDimensionFitLabel(score: number, expectedScore: number): string {
  const diff = score - expectedScore;
  if (diff >= 0.5) return "Exceeds expectations";
  if (diff >= -0.5) return "Meets expectations";
  return "Below expectations";
}

/**
 * Dimension score cell with a bar and an expectation marker.
 * The bar fills from 0 to score/4. A vertical dashed line sits at expectedScore/4
 * so you can immediately see whether the candidate reached the expectation.
 */
function DimensionScoreCell({
  score,
  expectedScore,
  dimFull,
}: {
  score: number;
  expectedScore: number;
  dimFull: string;
}) {
  const fillPct = (score / 4) * 100;
  const markerPct = (expectedScore / 4) * 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-0.5 cursor-help w-14 mx-auto">
            <span
              className={`text-xs font-semibold tabular-nums ${getDimensionFitColor(score, expectedScore)}`}
            >
              {score.toFixed(1)}
            </span>
            <div className="relative w-full h-2 rounded-full bg-gray-100 overflow-visible">
              {/* Score fill */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${getDimensionBarColor(score, expectedScore)}`}
                style={{ width: `${fillPct}%` }}
              />
              {/* Expected score marker */}
              <div
                className="absolute top-[-1px] bottom-[-1px] w-0.5 bg-gray-900/60 rounded-full"
                style={{ left: `${markerPct}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{dimFull}: {score.toFixed(1)}/4</p>
          <p className="text-xs text-gray-400">
            {getDimensionFitLabel(score, expectedScore)} (expected: {expectedScore})
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ScoreBar({ score }: { score: number }) {
  const segments = 4;
  const filledSegments = Math.floor(score);
  const partialFill = score % 1;

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filledSegments;
        const isPartial = i === filledSegments && partialFill > 0;

        return (
          <div key={i} className="relative h-4 w-4">
            {/* Empty star (background) */}
            <Star className="absolute inset-0 h-4 w-4 text-gray-200" strokeWidth={1.5} />
            {/* Filled star */}
            {isFilled && (
              <Star className="absolute inset-0 h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={1.5} />
            )}
            {/* Partial star */}
            {isPartial && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${partialFill * 100}%` }}>
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={1.5} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "\u2014";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function ConfidenceIndicator({
  confidence,
}: {
  confidence: string | null;
}) {
  if (!confidence) return null;

  const normalizedConfidence = confidence.toLowerCase();

  let icon: React.ReactNode;
  let label: string;

  if (normalizedConfidence === "high") {
    icon = <Circle className="h-2.5 w-2.5 fill-current text-green-600" />;
    label = "High";
  } else if (normalizedConfidence === "medium") {
    icon = (
      <div className="relative h-2.5 w-2.5">
        <Circle className="h-2.5 w-2.5 text-yellow-600" />
        <div className="absolute inset-0 overflow-hidden w-1/2">
          <Circle className="h-2.5 w-2.5 fill-current text-yellow-600" />
        </div>
      </div>
    );
    label = "Medium";
  } else {
    icon = <Circle className="h-2.5 w-2.5 text-gray-400" />;
    label = "Low";
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help inline-flex">{icon}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Evaluation confidence: {label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FlagBadge({ count, flags }: { count: number; flags: string[] }) {
  if (count === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs font-medium gap-1 py-0 px-1.5 cursor-help">
            <AlertTriangle className="h-2.5 w-2.5" />
            {count}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" align="start" className="max-w-xs">
          <p className="font-medium text-xs mb-1">Flags ({count})</p>
          <ul className="text-xs space-y-0.5">
            {flags.slice(0, 8).map((flag, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                <span>{flag}</span>
              </li>
            ))}
            {flags.length > 8 && (
              <li className="text-gray-400">+{flags.length - 8} more</li>
            )}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type SortOption = "score" | "recent" | "name";
type StatusFilter = "all" | "COMPLETED" | "WORKING" | "WELCOME";
type StrengthFilter =
  | "all"
  | "Exceptional"
  | "Strong"
  | "Meets expectations"
  | "Below expectations";
type MinScoreFilter = "none" | "1.0" | "2.0" | "2.5" | "3.0" | "3.5";

export function SimulationCandidatesClient({
  simulationId,
  simulationName,
  targetLevel,
  expectedScore,
  dimensionExpectations,
  archetypeName,
  roleFamilyName,
  candidates,
}: SimulationCandidatesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [strengthFilter, setStrengthFilter] =
    useState<StrengthFilter>("all");
  const [minScoreFilter, setMinScoreFilter] =
    useState<MinScoreFilter>("none");

  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const levelInfo = LEVEL_EXPECTATIONS[targetLevel];

  // Helper: get expected score for a specific dimension
  const getExpectedForDim = (dimKey: string): number => {
    if (dimensionExpectations && dimensionExpectations[dimKey] !== undefined) {
      return dimensionExpectations[dimKey];
    }
    return expectedScore;
  };

  const hasArchetype = !!archetypeName;

  useEffect(() => {
    const compareModeParam = searchParams.get("compareMode");
    const selectedIdsParam = searchParams.get("selectedIds");

    if (compareModeParam === "true") {
      setCompareMode(true);
      if (selectedIdsParam) {
        setSelectedIds(new Set(selectedIdsParam.split(",")));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (compareMode) {
      params.set("compareMode", "true");
      if (selectedIds.size > 0) {
        params.set("selectedIds", Array.from(selectedIds).join(","));
      } else {
        params.delete("selectedIds");
      }
    } else {
      params.delete("compareMode");
      params.delete("selectedIds");
    }

    const newUrl = params.toString()
      ? `?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [compareMode, selectedIds, searchParams]);

  // Determine which dimensions are actually used across all candidates
  const activeDimensions = useMemo(() => {
    const usedKeys = new Set<string>();
    for (const c of candidates) {
      for (const key of Object.keys(c.dimensionScores)) {
        usedKeys.add(key);
      }
    }
    return ALL_DIMENSIONS.filter((d) => usedKeys.has(d.key));
  }, [candidates]);

  const handleRowClick = (assessmentId: string) => {
    if (compareMode) return;
    router.push(
      `/recruiter/simulations/${simulationId}/candidates/${assessmentId}`
    );
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) {
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (assessmentId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assessmentId)) {
        newSet.delete(assessmentId);
      } else if (newSet.size < 4) {
        newSet.add(assessmentId);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    const ids = Array.from(selectedIds).join(",");
    router.push(
      `/recruiter/simulations/${simulationId}/compare?ids=${ids}`
    );
  };

  const handleCopyLink = async () => {
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canCompare = selectedIds.size >= 2 && selectedIds.size <= 4;

  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = [...candidates];

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (strengthFilter !== "all") {
      filtered = filtered.filter((c) => c.strengthLevel === strengthFilter);
    }
    if (minScoreFilter !== "none") {
      const minScore = parseFloat(minScoreFilter);
      filtered = filtered.filter(
        (c) => c.overallScore !== null && c.overallScore >= minScore
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "score") {
        const aHasScore = a.overallScore !== null;
        const bHasScore = b.overallScore !== null;

        if (!aHasScore && !bHasScore) {
          const aDate = a.completedAt
            ? new Date(a.completedAt).getTime()
            : 0;
          const bDate = b.completedAt
            ? new Date(b.completedAt).getTime()
            : 0;
          return bDate - aDate;
        }
        if (!aHasScore) return 1;
        if (!bHasScore) return -1;

        if (b.overallScore !== a.overallScore) {
          return b.overallScore! - a.overallScore!;
        }

        const aDate = a.completedAt
          ? new Date(a.completedAt).getTime()
          : 0;
        const bDate = b.completedAt
          ? new Date(b.completedAt).getTime()
          : 0;
        return bDate - aDate;
      } else if (sortBy === "recent") {
        const aDate = a.completedAt
          ? new Date(a.completedAt).getTime()
          : 0;
        const bDate = b.completedAt
          ? new Date(b.completedAt).getTime()
          : 0;
        return bDate - aDate;
      } else {
        const aName = a.name?.toLowerCase() || "";
        const bName = b.name?.toLowerCase() || "";
        return aName.localeCompare(bName);
      }
    });

    return filtered;
  }, [candidates, sortBy, statusFilter, strengthFilter, minScoreFilter]);

  const activeFilters = useMemo(() => {
    const filters: Array<{
      key: string;
      label: string;
      clear: () => void;
    }> = [];

    if (statusFilter !== "all") {
      filters.push({
        key: "status",
        label: `Status: ${statusFilter === "COMPLETED" ? "Completed" : statusFilter === "WORKING" ? "Working" : "Welcome"}`,
        clear: () => setStatusFilter("all"),
      });
    }

    if (strengthFilter !== "all") {
      filters.push({
        key: "strength",
        label: `Fit: ${strengthFilter}`,
        clear: () => setStrengthFilter("all"),
      });
    }

    if (minScoreFilter !== "none") {
      filters.push({
        key: "minScore",
        label: `Min Score: ${minScoreFilter}+`,
        clear: () => setMinScoreFilter("none"),
      });
    }

    return filters;
  }, [statusFilter, strengthFilter, minScoreFilter]);

  const totalColumns = (compareMode ? 1 : 0) + 3 + activeDimensions.length + 1;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/recruiter/simulations"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          All Simulations
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">
                {simulationName}
              </h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs font-medium cursor-help">
                      {levelInfo.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{levelInfo.yearsRange} experience</p>
                    <p className="text-xs text-gray-400">
                      {hasArchetype
                        ? "Expectations vary by dimension (see column markers)"
                        : `Expected score: ${expectedScore}/4`
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {archetypeName && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs font-medium cursor-help">
                        {archetypeName}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{roleFamilyName} · {archetypeName}</p>
                      <p className="text-xs text-gray-400">
                        Per-dimension expectations adjusted for this role archetype
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredAndSortedCandidates.length} of{" "}
              {candidates.length} candidate
              {candidates.length !== 1 ? "s" : ""}
              {" · "}
              <span className="text-gray-500">
                {hasArchetype
                  ? `Scores adjusted and weighted for a ${archetypeName} with ${levelInfo.yearsRange} experience`
                  : `Scores adjusted for ${levelInfo.yearsRange} experience`
                }
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className={`transition-colors ${
                copied
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : ""
              }`}
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Invite Link
                </>
              )}
            </Button>
            <Button
              onClick={toggleCompareMode}
              variant={compareMode ? "default" : "outline"}
              className={
                compareMode ? "bg-blue-600 hover:bg-blue-700" : ""
              }
            >
              {compareMode ? "Exit Compare Mode" : "Compare"}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Highest score</SelectItem>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Status:
            </label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as StatusFilter)
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="WORKING">Working</SelectItem>
                <SelectItem value="WELCOME">Welcome</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Fit:
            </label>
            <Select
              value={strengthFilter}
              onValueChange={(value) =>
                setStrengthFilter(value as StrengthFilter)
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Exceptional">Exceptional</SelectItem>
                <SelectItem value="Strong">Strong</SelectItem>
                <SelectItem value="Meets expectations">Meets expectations</SelectItem>
                <SelectItem value="Below expectations">Below expectations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Min Score:
            </label>
            <Select
              value={minScoreFilter}
              onValueChange={(value) =>
                setMinScoreFilter(value as MinScoreFilter)
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="1.0">1.0+</SelectItem>
                <SelectItem value="2.0">2.0+</SelectItem>
                <SelectItem value="2.5">2.5+</SelectItem>
                <SelectItem value="3.0">3.0+</SelectItem>
                <SelectItem value="3.5">3.5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-600">Active filters:</span>
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-1.5 cursor-pointer hover:bg-gray-200"
                onClick={filter.clear}
              >
                {filter.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              {compareMode && <TableHead className="w-[40px]"></TableHead>}
              <TableHead className="whitespace-nowrap min-w-[220px]">Candidate</TableHead>
              <TableHead className="whitespace-nowrap">Score</TableHead>
              <TableHead className="whitespace-nowrap">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help border-b border-dashed border-gray-400">Fit</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Fit relative to {levelInfo.label.toLowerCase()} expectations</p>
                      <p className="text-xs text-gray-400">Expected overall: {expectedScore}/4</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              {activeDimensions.map((dim) => {
                const dimExpected = getExpectedForDim(dim.key);
                return (
                  <TableHead
                    key={dim.key}
                    className="text-center whitespace-nowrap px-1"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center gap-0.5 cursor-help">
                            <span className="text-xs font-medium text-gray-500">
                              {dim.abbr}
                            </span>
                            {/* Mini reference bar showing where the expectation marker sits */}
                            <div className="relative w-14 h-1 rounded-full bg-gray-200">
                              <div
                                className="absolute top-[-1px] bottom-[-1px] w-0.5 bg-gray-900/40 rounded-full"
                                style={{ left: `${(dimExpected / 4) * 100}%` }}
                              />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{dim.full}</p>
                          <p className="text-xs text-gray-400">
                            Expected: {dimExpected}/4
                            {hasArchetype ? ` (${archetypeName} · ${levelInfo.label.toLowerCase()})` : ` (${levelInfo.label.toLowerCase()})`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                );
              })}
              <TableHead className="whitespace-nowrap text-right">Flags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCandidates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  className="text-center text-gray-500 py-12"
                >
                  {candidates.length === 0
                    ? "No candidates yet. Share the invite link to get started!"
                    : "No candidates match the selected filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedCandidates.map((candidate) => {
                const canSelect =
                  candidate.status === "COMPLETED" &&
                  candidate.overallScore !== null;
                const isSelected = selectedIds.has(
                  candidate.assessmentId
                );
                const hasScores = candidate.overallScore !== null;

                return (
                  <TooltipProvider key={candidate.assessmentId}>
                    <Tooltip delayDuration={400}>
                      <TooltipTrigger asChild>
                        <TableRow
                          onClick={() =>
                            handleRowClick(candidate.assessmentId)
                          }
                          className={`group ${
                            compareMode
                              ? canSelect
                                ? "hover:bg-gray-50"
                                : "opacity-50"
                              : "cursor-pointer hover:bg-gray-50"
                          }`}
                        >
                          {compareMode && (
                            <TableCell
                              className="py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canSelect ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleSelection(candidate.assessmentId)
                                  }
                                  disabled={
                                    !isSelected && selectedIds.size >= 4
                                  }
                                />
                              ) : null}
                            </TableCell>
                          )}

                          {/* Candidate: avatar + name + email + status + date */}
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs shrink-0">
                                {getInitials(candidate.name)}
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-gray-900 text-sm truncate">
                                    {candidate.name ?? "Anonymous"}
                                  </span>
                                  <ConfidenceIndicator
                                    confidence={
                                      candidate.evaluationConfidence
                                    }
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <span className="truncate">
                                    {candidate.email}
                                  </span>
                                  <span className="text-gray-300">&middot;</span>
                                  <Badge
                                    variant={getStatusBadgeVariant(candidate.status)}
                                    className="text-[10px] py-0 px-1.5 h-4"
                                  >
                                    {candidate.status === "COMPLETED" && "Completed"}
                                    {candidate.status === "WORKING" && "Working"}
                                    {candidate.status === "WELCOME" && "Welcome"}
                                    {!["COMPLETED", "WORKING", "WELCOME"].includes(
                                      candidate.status
                                    ) && candidate.status}
                                  </Badge>
                                  {candidate.completedAt && (
                                    <>
                                      <span className="text-gray-300">&middot;</span>
                                      <span className="whitespace-nowrap">
                                        {formatDate(candidate.completedAt)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Overall Score */}
                          <TableCell className="py-2.5">
                            {hasScores ? (
                              <div className="flex items-center gap-1.5">
                                <ScoreBar score={candidate.overallScore!} />
                                <span className="text-sm font-medium text-gray-900 tabular-nums">
                                  {candidate.overallScore!.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">{"\u2014"}</span>
                            )}
                          </TableCell>

                          {/* Fit (role-relative strength) + Percentile */}
                          <TableCell className="py-2.5">
                            {candidate.strengthLevel ? (
                              <div className="flex flex-col items-start gap-0.5">
                                <Badge
                                  className={`text-xs ${getStrengthBadgeColor(
                                    candidate.strengthLevel
                                  )}`}
                                >
                                  {candidate.strengthLevel}
                                </Badge>
                                {candidate.percentile !== null && (
                                  <span className="text-[10px] text-gray-500 pl-1">
                                    Top {candidate.percentile}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">{"\u2014"}</span>
                            )}
                          </TableCell>

                          {/* Dimension score cells — consistent columns, role-relative coloring */}
                          {activeDimensions.map((dim) => {
                            const score = candidate.dimensionScores[dim.key];
                            const dimExpected = getExpectedForDim(dim.key);
                            return (
                              <TableCell
                                key={dim.key}
                                className="text-center py-2.5 px-1"
                              >
                                {score !== undefined ? (
                                  <DimensionScoreCell
                                    score={score}
                                    expectedScore={dimExpected}
                                    dimFull={dim.full}
                                  />
                                ) : (
                                  <span className="text-gray-300 text-xs">{"\u2014"}</span>
                                )}
                              </TableCell>
                            );
                          })}

                          {/* Flags */}
                          <TableCell className="text-right py-2.5">
                            <FlagBadge count={candidate.redFlagCount} flags={candidate.redFlags} />
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                      {candidate.summary && (
                        <TooltipContent
                          side="bottom"
                          align="start"
                          className="max-w-sm text-sm"
                        >
                          <p>{candidate.summary}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Floating Action Bar (compare mode only) */}
      {compareMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 px-6 z-50">
          <div className="container mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {selectedIds.size === 0 &&
                "Select 2-4 candidates to compare"}
              {selectedIds.size === 1 &&
                "Select at least 1 more candidate"}
              {selectedIds.size >= 2 && (
                <span className="font-medium">
                  {selectedIds.size} candidate
                  {selectedIds.size !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={toggleCompareMode}>
                Cancel
              </Button>
              <Button
                onClick={handleCompare}
                disabled={!canCompare}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
              >
                Compare{" "}
                {selectedIds.size >= 2 ? selectedIds.size : ""}{" "}
                candidate
                {selectedIds.size !== 1 && selectedIds.size >= 2
                  ? "s"
                  : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
