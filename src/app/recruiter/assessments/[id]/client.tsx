"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, AlertTriangle, X, Copy, Check, Download, Settings2, Star } from "lucide-react";
import * as XLSX from "xlsx";
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
  dimensionMeta: Record<string, { name: string; description: string }> | null;
  archetypeName: string | null;
  roleFamilyName: string | null;
  candidates: CandidateData[];
}

/** Convert a slug like "problem_decomposition_design" to an abbreviation like "Prob D." */
function slugToAbbr(slug: string): string {
  const words = slug.split("_");
  if (words.length === 1) return words[0].charAt(0).toUpperCase() + words[0].slice(1, 4);
  // Take first word capitalized + first letter of remaining
  return words[0].charAt(0).toUpperCase() + words[0].slice(1, 4) + " " + words.slice(1).map(w => w[0].toUpperCase()).join("");
}

/** Convert a slug like "technical_execution" to "Technical Execution" */
function slugToName(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStrengthColor(level: RelativeStrength | null): string {
  switch (level) {
    case "Exceptional":
      return "bg-emerald-50 text-emerald-700";
    case "Strong":
      return "bg-blue-50 text-blue-700";
    case "Meets expectations":
      return "bg-gray-100 text-gray-600";
    case "Below expectations":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
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
          <div key={i} className="relative h-3.5 w-3.5">
            <Star className="absolute inset-0 h-3.5 w-3.5 text-gray-200" strokeWidth={1.5} />
            {isFilled && (
              <Star className="absolute inset-0 h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
            )}
            {isPartial && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${partialFill * 100}%` }}>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getDimColor(score: number, expectedScore: number): string {
  const diff = score - expectedScore;
  if (diff >= 0.5) return "text-blue-600 font-semibold";
  if (diff >= -0.5) return "text-gray-600";
  return "text-red-500 font-semibold";
}

function formatDimScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

type ExtraColumn = "percentile" | "summary" | "confidence" | "date" | "flags_detail";

const EXTRA_COLUMNS: { key: ExtraColumn; label: string }[] = [
  { key: "percentile", label: "Percentile" },
  { key: "summary", label: "Summary" },
  { key: "confidence", label: "Confidence" },
  { key: "date", label: "Completed Date" },
  { key: "flags_detail", label: "Flag Details" },
];

function getDimFitLabel(score: number, expectedScore: number): string {
  const diff = score - expectedScore;
  if (diff >= 0.5) return "Exceeds expectations";
  if (diff >= -0.5) return "Meets expectations";
  return "Below expectations";
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
  dimensionMeta,
  archetypeName,
  roleFamilyName,
  candidates,
}: SimulationCandidatesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [strengthFilter, setStrengthFilter] = useState<StrengthFilter>("all");
  const [minScoreFilter, setMinScoreFilter] = useState<MinScoreFilter>("none");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [extraColumns, setExtraColumns] = useState<Set<ExtraColumn>>(new Set());
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  const levelInfo = LEVEL_EXPECTATIONS[targetLevel];

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
      if (selectedIdsParam) setSelectedIds(new Set(selectedIdsParam.split(",")));
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
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [compareMode, selectedIds, searchParams]);

  const activeDimensions = useMemo(() => {
    // Collect all dimension slugs that appear in candidate scores
    const usedKeys = new Set<string>();
    for (const c of candidates) {
      for (const key of Object.keys(c.dimensionScores)) usedKeys.add(key);
    }
    // Build dimension info from metadata (from archetype) or derive from slugs
    return Array.from(usedKeys).map((slug) => {
      const meta = dimensionMeta?.[slug];
      return {
        key: slug,
        abbr: meta ? slugToAbbr(slug) : slugToAbbr(slug),
        full: meta?.name ?? slugToName(slug),
        desc: meta?.description ?? "",
      };
    });
  }, [candidates, dimensionMeta]);

  const handleRowClick = (assessmentId: string) => {
    if (compareMode) return;
    router.push(`/recruiter/assessments/${simulationId}/candidates/${assessmentId}`);
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) setSelectedIds(new Set());
  };

  const toggleSelection = (assessmentId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assessmentId)) newSet.delete(assessmentId);
      else if (newSet.size < 4) newSet.add(assessmentId);
      return newSet;
    });
  };

  const handleCompare = () => {
    const ids = Array.from(selectedIds).join(",");
    router.push(`/recruiter/assessments/${simulationId}/compare?ids=${ids}`);
  };

  const handleCopyLink = async () => {
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canCompare = selectedIds.size >= 2 && selectedIds.size <= 4;

  const toggleExtraColumn = (col: ExtraColumn) => {
    setExtraColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const handleDownloadXlsx = () => {
    const rows = filteredAndSortedCandidates.map((c) => {
      const row: Record<string, string | number | null> = {
        Name: c.name ?? "Anonymous",
        Email: c.email ?? "",
        Status: c.status,
        Score: c.overallScore !== null ? Math.round(c.overallScore * 10) / 10 : null,
        Fit: c.strengthLevel ?? "",
      };

      for (const dim of activeDimensions) {
        const score = c.dimensionScores[dim.key];
        row[dim.full] = score !== undefined ? score : null;
      }

      row["Flags"] = c.redFlagCount;

      // Always include extra columns in export regardless of visibility
      row["Percentile"] = c.percentile !== null ? `Top ${c.percentile}%` : "";
      row["Summary"] = c.summary ?? "";
      row["Confidence"] = c.evaluationConfidence ?? "";
      row["Completed Date"] = c.completedAt
        ? new Date(c.completedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : "";
      row["Flag Details"] = c.redFlags.join("; ");

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    const filename = `${simulationName.replace(/[^a-zA-Z0-9]/g, "_")}_candidates.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = [...candidates];
    if (statusFilter !== "all") filtered = filtered.filter((c) => c.status === statusFilter);
    if (strengthFilter !== "all") filtered = filtered.filter((c) => c.strengthLevel === strengthFilter);
    if (minScoreFilter !== "none") {
      const minScore = parseFloat(minScoreFilter);
      filtered = filtered.filter((c) => c.overallScore !== null && c.overallScore >= minScore);
    }

    filtered.sort((a, b) => {
      if (sortBy === "score") {
        const aHasScore = a.overallScore !== null;
        const bHasScore = b.overallScore !== null;
        if (!aHasScore && !bHasScore) return 0;
        if (!aHasScore) return 1;
        if (!bHasScore) return -1;
        if (b.overallScore !== a.overallScore) return b.overallScore! - a.overallScore!;
        return 0;
      } else if (sortBy === "recent") {
        const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bDate - aDate;
      } else {
        return (a.name?.toLowerCase() || "").localeCompare(b.name?.toLowerCase() || "");
      }
    });

    return filtered;
  }, [candidates, sortBy, statusFilter, strengthFilter, minScoreFilter]);

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; clear: () => void }> = [];
    if (statusFilter !== "all") {
      filters.push({
        key: "status",
        label: `Status: ${statusFilter === "COMPLETED" ? "Completed" : statusFilter === "WORKING" ? "Working" : "Welcome"}`,
        clear: () => setStatusFilter("all"),
      });
    }
    if (strengthFilter !== "all") {
      filters.push({ key: "strength", label: `Fit: ${strengthFilter}`, clear: () => setStrengthFilter("all") });
    }
    if (minScoreFilter !== "none") {
      filters.push({ key: "minScore", label: `Min Score: ${minScoreFilter}+`, clear: () => setMinScoreFilter("none") });
    }
    return filters;
  }, [statusFilter, strengthFilter, minScoreFilter]);

  const totalColumns = (compareMode ? 1 : 0) + 3 + activeDimensions.length + 1 + extraColumns.size;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/recruiter/assessments"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          All Assessments
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{simulationName}</h1>
              <Badge variant="outline" className="text-xs font-medium text-gray-500">
                {levelInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {filteredAndSortedCandidates.length} of {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
              {" · "}
              <span className="text-gray-400">
                {hasArchetype
                  ? `Scores adjusted and weighted for a ${archetypeName} with ${levelInfo.yearsRange} experience`
                  : `Scores adjusted for ${levelInfo.yearsRange} experience`
                }
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className={copied ? "bg-blue-50 border-blue-200 text-blue-700" : ""}
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
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className={extraColumns.size > 0 ? "border-blue-200 text-blue-700" : ""}
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                Columns
                {extraColumns.size > 0 && (
                  <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0">
                    {extraColumns.size}
                  </span>
                )}
              </Button>
              {showColumnConfig && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 w-48">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1">
                    Extra columns
                  </p>
                  {EXTRA_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                    >
                      <Checkbox
                        checked={extraColumns.has(col.key)}
                        onCheckedChange={() => toggleExtraColumn(col.key)}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadXlsx}
              title="Download as Excel"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              onClick={toggleCompareMode}
              variant={compareMode ? "default" : "outline"}
              size="sm"
              className={compareMode ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {compareMode ? "Exit Compare" : "Compare"}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sort</label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[150px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Highest score</SelectItem>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
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

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fit</label>
            <Select value={strengthFilter} onValueChange={(v) => setStrengthFilter(v as StrengthFilter)}>
              <SelectTrigger className="w-[170px] h-8 text-sm">
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

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Min</label>
            <Select value={minScoreFilter} onValueChange={(v) => setMinScoreFilter(v as MinScoreFilter)}>
              <SelectTrigger className="w-[90px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any</SelectItem>
                <SelectItem value="2.0">2.0+</SelectItem>
                <SelectItem value="2.5">2.5+</SelectItem>
                <SelectItem value="3.0">3.0+</SelectItem>
                <SelectItem value="3.5">3.5+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-gray-200 text-xs"
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
        <table className="w-full caption-bottom text-sm table-fixed">
          <colgroup>
            {compareMode && <col className="w-[40px]" />}
            <col className="w-[200px]" />
            <col className="w-[120px]" />
            <col className="w-[140px]" />
            {activeDimensions.map((dim) => (
              <col key={dim.key} style={{ width: `${100 / activeDimensions.length}%` }} />
            ))}
            <col className="w-[60px]" />
            {extraColumns.has("percentile") && <col className="w-[90px]" />}
            {extraColumns.has("confidence") && <col className="w-[90px]" />}
            {extraColumns.has("date") && <col className="w-[80px]" />}
            {extraColumns.has("summary") && <col className="w-[200px]" />}
            {extraColumns.has("flags_detail") && <col className="w-[200px]" />}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-gray-50/60 border-b">
              {compareMode && <TableHead className="w-[40px]"></TableHead>}
              <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide">
                Candidate
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide">
                Score
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fit
              </TableHead>
              {activeDimensions.map((dim) => (
                <TableHead
                  key={dim.key}
                  className="text-center whitespace-nowrap px-1 text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{dim.abbr}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">{dim.full}</p>
                        <p className="text-xs text-gray-400">{dim.desc}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Expected: {getExpectedForDim(dim.key)}/4 for {levelInfo.label.toLowerCase()}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
              ))}
              <TableHead className="whitespace-nowrap text-right text-xs font-medium text-gray-500 uppercase tracking-wide pr-4">
                Flags
              </TableHead>
              {extraColumns.has("percentile") && (
                <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Percentile
                </TableHead>
              )}
              {extraColumns.has("confidence") && (
                <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Confidence
                </TableHead>
              )}
              {extraColumns.has("date") && (
                <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Date
                </TableHead>
              )}
              {extraColumns.has("summary") && (
                <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[200px]">
                  Summary
                </TableHead>
              )}
              {extraColumns.has("flags_detail") && (
                <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[200px]">
                  Flag Details
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Expected scores reference row */}
            <TableRow className="bg-gray-50/40 border-b border-dashed">
              {compareMode && <TableCell className="py-1.5" />}
              <TableCell className="py-1.5">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  Expected
                </span>
              </TableCell>
              <TableCell className="py-1.5">
                <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                  {expectedScore.toFixed(1)}
                </span>
              </TableCell>
              <TableCell className="py-1.5" />
              {activeDimensions.map((dim) => (
                <TableCell key={dim.key} className="text-center py-1.5 px-1">
                  <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                    {formatDimScore(getExpectedForDim(dim.key))}
                  </span>
                </TableCell>
              ))}
              <TableCell className="py-1.5" />
              {extraColumns.has("percentile") && <TableCell className="py-1.5" />}
              {extraColumns.has("confidence") && <TableCell className="py-1.5" />}
              {extraColumns.has("date") && <TableCell className="py-1.5" />}
              {extraColumns.has("summary") && <TableCell className="py-1.5" />}
              {extraColumns.has("flags_detail") && <TableCell className="py-1.5" />}
            </TableRow>

            {filteredAndSortedCandidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={totalColumns} className="text-center text-gray-500 py-12">
                  {candidates.length === 0
                    ? "No candidates yet. Share the invite link to get started!"
                    : "No candidates match the selected filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedCandidates.map((candidate) => {
                const canSelect = candidate.status === "COMPLETED" && candidate.overallScore !== null;
                const isSelected = selectedIds.has(candidate.assessmentId);
                const hasScores = candidate.overallScore !== null;
                const isIncomplete = candidate.status !== "COMPLETED";

                return (
                  <TooltipProvider key={candidate.assessmentId}>
                    <Tooltip delayDuration={400}>
                      <TooltipTrigger asChild>
                        <TableRow
                          onClick={() => handleRowClick(candidate.assessmentId)}
                          className={`group ${
                            compareMode
                              ? canSelect
                                ? "hover:bg-gray-50"
                                : "opacity-40"
                              : "cursor-pointer hover:bg-gray-50"
                          }`}
                        >
                          {compareMode && (
                            <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                              {canSelect ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSelection(candidate.assessmentId)}
                                  disabled={!isSelected && selectedIds.size >= 4}
                                />
                              ) : null}
                            </TableCell>
                          )}

                          {/* Candidate: avatar + name + email, status only for incomplete */}
                          <TableCell className="py-2 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 bg-gray-100 text-gray-600 flex items-center justify-center font-medium text-xs shrink-0">
                                {getInitials(candidate.name)}
                              </Avatar>
                              <div className="min-w-0 overflow-hidden">
                                <span className="font-medium text-gray-900 text-sm truncate block">
                                  {candidate.name ?? "Anonymous"}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <span className="truncate max-w-[140px]">{candidate.email}</span>
                                  {isIncomplete && (
                                    <>
                                      <span className="text-gray-300">&middot;</span>
                                      <span className="text-gray-400">
                                        {candidate.status === "WORKING" ? "Working" : "Invited"}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Score: stars + number */}
                          <TableCell className="py-2">
                            {hasScores ? (
                              <div className="flex items-center gap-1.5">
                                <ScoreBar score={candidate.overallScore!} />
                                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                                  {candidate.overallScore!.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300">&mdash;</span>
                            )}
                          </TableCell>

                          {/* Fit: subtle chip, no percentile */}
                          <TableCell className="py-2">
                            {candidate.strengthLevel ? (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStrengthColor(candidate.strengthLevel)}`}
                              >
                                {candidate.strengthLevel}
                              </span>
                            ) : (
                              <span className="text-gray-300">&mdash;</span>
                            )}
                          </TableCell>

                          {/* Dimension scores: just numbers, color-coded */}
                          {activeDimensions.map((dim) => {
                            const score = candidate.dimensionScores[dim.key];
                            const dimExpected = getExpectedForDim(dim.key);
                            return (
                              <TableCell key={dim.key} className="text-center py-2 px-1">
                                {score !== undefined ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          className={`text-xs tabular-nums cursor-help ${getDimColor(score, dimExpected)}`}
                                        >
                                          {formatDimScore(score)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="font-medium">{dim.full}: {formatDimScore(score)}/4</p>
                                        <p className="text-xs text-gray-400">{dim.desc}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                          {getDimFitLabel(score, dimExpected)} (expected: {dimExpected})
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="text-gray-300 text-xs">&mdash;</span>
                                )}
                              </TableCell>
                            );
                          })}

                          {/* Flags */}
                          <TableCell className="text-right py-2 pr-4">
                            {candidate.redFlagCount > 0 ? (
                              <TooltipProvider>
                                <Tooltip delayDuration={200}>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 cursor-help">
                                      <AlertTriangle className="h-3 w-3" />
                                      {candidate.redFlagCount}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" align="start" className="max-w-xs">
                                    <p className="font-medium text-xs mb-1">Flags ({candidate.redFlagCount})</p>
                                    <ul className="text-xs space-y-0.5">
                                      {candidate.redFlags.slice(0, 8).map((flag, i) => (
                                        <li key={i} className="flex items-start gap-1">
                                          <span className="text-amber-500 mt-0.5 shrink-0">·</span>
                                          <span>{flag}</span>
                                        </li>
                                      ))}
                                      {candidate.redFlags.length > 8 && (
                                        <li className="text-gray-400">+{candidate.redFlags.length - 8} more</li>
                                      )}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                          </TableCell>

                          {/* Extra columns */}
                          {extraColumns.has("percentile") && (
                            <TableCell className="py-2 text-xs text-gray-600">
                              {candidate.percentile !== null ? `Top ${candidate.percentile}%` : <span className="text-gray-300">&mdash;</span>}
                            </TableCell>
                          )}
                          {extraColumns.has("confidence") && (
                            <TableCell className="py-2 text-xs text-gray-600">
                              {candidate.evaluationConfidence ?? <span className="text-gray-300">&mdash;</span>}
                            </TableCell>
                          )}
                          {extraColumns.has("date") && (
                            <TableCell className="py-2 text-xs text-gray-500 whitespace-nowrap">
                              {candidate.completedAt
                                ? new Date(candidate.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                : <span className="text-gray-300">&mdash;</span>
                              }
                            </TableCell>
                          )}
                          {extraColumns.has("summary") && (
                            <TableCell className="py-2 text-xs text-gray-600 max-w-xs">
                              <span className="line-clamp-2">{candidate.summary ?? <span className="text-gray-300">&mdash;</span>}</span>
                            </TableCell>
                          )}
                          {extraColumns.has("flags_detail") && (
                            <TableCell className="py-2 text-xs text-gray-600 max-w-xs">
                              {candidate.redFlags.length > 0
                                ? <span className="line-clamp-2">{candidate.redFlags.join("; ")}</span>
                                : <span className="text-gray-300">&mdash;</span>
                              }
                            </TableCell>
                          )}
                        </TableRow>
                      </TooltipTrigger>
                      {candidate.summary && (
                        <TooltipContent side="bottom" align="start" className="max-w-sm text-sm">
                          <p>{candidate.summary}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })
            )}
          </TableBody>
        </table>
      </div>

      {/* Floating Action Bar (compare mode) */}
      {compareMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-3 px-6 z-50">
          <div className="container mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedIds.size === 0 && "Select 2-4 candidates to compare"}
              {selectedIds.size === 1 && "Select at least 1 more"}
              {selectedIds.size >= 2 && (
                <span className="font-medium">{selectedIds.size} selected</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleCompareMode}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCompare}
                disabled={!canCompare}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
              >
                Compare {selectedIds.size >= 2 ? `(${selectedIds.size})` : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
