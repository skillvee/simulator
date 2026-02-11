"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  AlertTriangle,
  X,
  Copy,
  Check,
  Download,
  Settings2,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface SimulationCandidatesClientV3Props {
  simulationId: string;
  simulationName: string;
  targetLevel: TargetLevel;
  expectedScore: number;
  dimensionExpectations: Record<string, number> | null;
  archetypeName: string | null;
  roleFamilyName: string | null;
  candidates: CandidateData[];
}

type ExpectationStatus = "exceeds" | "meets" | "below";

const ALL_DIMENSIONS = [
  { key: "COMMUNICATION", abbr: "Comm", full: "Communication", desc: "Clarity, listening, and ability to explain and defend decisions" },
  { key: "PROBLEM_SOLVING", abbr: "Problem", full: "Problem Solving", desc: "How they structure problems, identify root causes, and design solutions" },
  { key: "TECHNICAL_KNOWLEDGE", abbr: "Tech", full: "Technical Knowledge", desc: "Quality, correctness, and efficiency of code produced" },
  { key: "COLLABORATION", abbr: "Collab", full: "Collaboration", desc: "How they respond to feedback, ask for help, and interact with teammates" },
  { key: "ADAPTABILITY", abbr: "Adapt", full: "Adaptability", desc: "Speed of adapting to new information, tools, or feedback" },
  { key: "LEADERSHIP", abbr: "Lead", full: "Leadership", desc: "Initiative, ownership, and ability to drive decisions forward" },
  { key: "CREATIVITY", abbr: "Creative", full: "Creativity", desc: "Use of AI tools, novel approaches, and resourcefulness" },
  { key: "TIME_MANAGEMENT", abbr: "Time", full: "Time Management", desc: "How they prioritize, sequence work, and manage their time" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getDimStatus(score: number, expectedScore: number): ExpectationStatus {
  const diff = score - expectedScore;
  if (diff >= 0.5) return "exceeds";
  if (diff >= -0.5) return "meets";
  return "below";
}

function getOverallFit(level: RelativeStrength | null): ExpectationStatus | null {
  if (!level) return null;
  if (level === "Exceptional" || level === "Strong") return "exceeds";
  if (level === "Meets expectations") return "meets";
  return "below";
}

const FIT_DISPLAY: Record<ExpectationStatus, { label: string; className: string; borderClass: string }> = {
  exceeds: {
    label: "Exceeds",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    borderClass: "border-l-emerald-500",
  },
  meets: {
    label: "Meets",
    className: "bg-gray-50 text-gray-600 border border-gray-200",
    borderClass: "border-l-gray-300",
  },
  below: {
    label: "Below",
    className: "bg-red-50 text-red-600 border border-red-200",
    borderClass: "border-l-red-400",
  },
};

const STATUS_LABEL_MAP: Record<ExpectationStatus, string> = {
  exceeds: "Exceeds expectations",
  meets: "Meets expectations",
  below: "Below expectations",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DimIndicator({ status }: { status: ExpectationStatus }) {
  if (status === "exceeds") {
    return (
      <div className="w-[22px] h-[22px] rounded-full bg-blue-100 flex items-center justify-center">
        <ArrowUpRight className="h-3 w-3 text-blue-600" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "meets") {
    return (
      <div className="w-[22px] h-[22px] rounded-full bg-gray-100 flex items-center justify-center">
        <Minus className="h-3 w-3 text-gray-400" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="w-[22px] h-[22px] rounded-full bg-red-100 flex items-center justify-center">
      <ArrowDownRight className="h-3 w-3 text-red-500" strokeWidth={2.5} />
    </div>
  );
}

function FitBadge({ fit, strengthLevel, overallScore, expectedScore }: {
  fit: ExpectationStatus;
  strengthLevel: RelativeStrength | null;
  overallScore: number | null;
  expectedScore: number;
}) {
  const display = FIT_DISPLAY[fit];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold cursor-help ${display.className}`}
          >
            {display.label}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium text-sm">{STATUS_LABEL_MAP[fit]}</p>
          {strengthLevel && (
            <p className="text-xs text-gray-400 mt-0.5">
              Original assessment: {strengthLevel}
            </p>
          )}
          {overallScore !== null && (
            <p className="text-xs text-gray-400">
              Score: {overallScore.toFixed(1)} / 4 (expected: {expectedScore.toFixed(1)})
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Filter / sort types
// ---------------------------------------------------------------------------

type SortOption = "fit" | "recent" | "name";
type StatusFilter = "all" | "COMPLETED" | "WORKING" | "WELCOME";
type FitFilter = "all" | "exceeds" | "meets" | "below";
type ExtraColumn = "percentile" | "summary" | "confidence" | "date" | "flags_detail";

const EXTRA_COLUMNS: { key: ExtraColumn; label: string }[] = [
  { key: "percentile", label: "Percentile" },
  { key: "summary", label: "Summary" },
  { key: "confidence", label: "Confidence" },
  { key: "date", label: "Completed Date" },
  { key: "flags_detail", label: "Flag Details" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SimulationCandidatesClientV3({
  simulationId,
  simulationName,
  targetLevel,
  expectedScore,
  dimensionExpectations,
  archetypeName,
  roleFamilyName,
  candidates,
}: SimulationCandidatesClientV3Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sortBy, setSortBy] = useState<SortOption>("fit");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fitFilter, setFitFilter] = useState<FitFilter>("all");
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

  // URL sync for compare mode
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
    const usedKeys = new Set<string>();
    for (const c of candidates) {
      for (const key of Object.keys(c.dimensionScores)) usedKeys.add(key);
    }
    return ALL_DIMENSIONS.filter((d) => usedKeys.has(d.key));
  }, [candidates]);

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

  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = [...candidates];
    if (statusFilter !== "all") filtered = filtered.filter((c) => c.status === statusFilter);
    if (fitFilter !== "all") {
      filtered = filtered.filter((c) => {
        const fit = getOverallFit(c.strengthLevel);
        return fit === fitFilter;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === "fit") {
        const aHasScore = a.overallScore !== null;
        const bHasScore = b.overallScore !== null;
        if (!aHasScore && !bHasScore) return 0;
        if (!aHasScore) return 1;
        if (!bHasScore) return -1;
        return b.overallScore! - a.overallScore!;
      } else if (sortBy === "recent") {
        const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bDate - aDate;
      } else {
        return (a.name?.toLowerCase() || "").localeCompare(b.name?.toLowerCase() || "");
      }
    });

    return filtered;
  }, [candidates, sortBy, statusFilter, fitFilter]);

  const handleDownloadXlsx = () => {
    const rows = filteredAndSortedCandidates.map((c) => {
      const fit = getOverallFit(c.strengthLevel);
      const row: Record<string, string | number | null> = {
        Name: c.name ?? "Anonymous",
        Email: c.email ?? "",
        Status: c.status,
        Fit: fit ? STATUS_LABEL_MAP[fit] : "",
      };

      for (const dim of activeDimensions) {
        const score = c.dimensionScores[dim.key];
        if (score !== undefined) {
          const status = getDimStatus(score, getExpectedForDim(dim.key));
          row[dim.full] = STATUS_LABEL_MAP[status];
        } else {
          row[dim.full] = "";
        }
      }

      row["Flags"] = c.redFlagCount;
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

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; clear: () => void }> = [];
    if (statusFilter !== "all") {
      filters.push({
        key: "status",
        label: `Status: ${statusFilter === "COMPLETED" ? "Completed" : statusFilter === "WORKING" ? "Working" : "Invited"}`,
        clear: () => setStatusFilter("all"),
      });
    }
    if (fitFilter !== "all") {
      filters.push({
        key: "fit",
        label: `Fit: ${fitFilter.charAt(0).toUpperCase() + fitFilter.slice(1)}`,
        clear: () => setFitFilter("all"),
      });
    }
    return filters;
  }, [statusFilter, fitFilter]);

  const totalColumns = (compareMode ? 1 : 0) + 3 + activeDimensions.length + extraColumns.size;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* V3 badge */}
      <div className="mb-4">
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          V3 — Expectation-based view
        </Badge>
      </div>

      {/* Header */}
      <div className="mb-6">
        <Link
          href="/recruiter/assessments"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2 transition-colors"
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
                {archetypeName
                  ? `Evaluated against ${archetypeName} expectations for ${levelInfo.yearsRange} experience`
                  : `Evaluated against ${levelInfo.label.toLowerCase()} expectations (${levelInfo.yearsRange})`
                }
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className={`rounded-lg transition-all ${copied ? "bg-blue-50 border-blue-200 text-blue-700" : ""}`}
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
                className={`rounded-lg ${extraColumns.size > 0 ? "border-blue-200 text-blue-700" : ""}`}
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
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50 w-48 animate-fade-in">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2 py-1">
                    Extra columns
                  </p>
                  {EXTRA_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700 transition-colors"
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
              className="rounded-lg"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              onClick={toggleCompareMode}
              variant={compareMode ? "default" : "outline"}
              size="sm"
              className={`rounded-lg ${compareMode ? "bg-blue-600 hover:bg-blue-700" : ""}`}
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
              <SelectTrigger className="w-[140px] h-8 text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fit">Best match</SelectItem>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[120px] h-8 text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="WORKING">Working</SelectItem>
                <SelectItem value="WELCOME">Invited</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fit</label>
            <Select value={fitFilter} onValueChange={(v) => setFitFilter(v as FitFilter)}>
              <SelectTrigger className="w-[130px] h-8 text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="exceeds">Exceeds</SelectItem>
                <SelectItem value="meets">Meets</SelectItem>
                <SelectItem value="below">Below</SelectItem>
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
                className="gap-1 cursor-pointer hover:bg-gray-200 text-xs rounded-full transition-colors"
                onClick={filter.clear}
              >
                {filter.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-3 px-1">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <div className="w-[18px] h-[18px] rounded-full bg-blue-100 flex items-center justify-center">
            <ArrowUpRight className="h-2.5 w-2.5 text-blue-600" strokeWidth={2.5} />
          </div>
          <span>Exceeds</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <div className="w-[18px] h-[18px] rounded-full bg-gray-100 flex items-center justify-center">
            <Minus className="h-2.5 w-2.5 text-gray-400" strokeWidth={2.5} />
          </div>
          <span>Meets</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <div className="w-[18px] h-[18px] rounded-full bg-red-100 flex items-center justify-center">
            <ArrowDownRight className="h-2.5 w-2.5 text-red-500" strokeWidth={2.5} />
          </div>
          <span>Below</span>
        </div>
        <span className="text-[11px] text-gray-300">
          relative to {levelInfo.label.toLowerCase()} expectations
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <colgroup>
            {compareMode && <col className="w-[40px]" />}
            <col className="w-[220px]" />
            <col className="w-[110px]" />
            {activeDimensions.map((dim) => (
              <col key={dim.key} className="w-[44px]" />
            ))}
            <col className="w-[56px]" />
            {extraColumns.has("percentile") && <col className="w-[90px]" />}
            {extraColumns.has("confidence") && <col className="w-[90px]" />}
            {extraColumns.has("date") && <col className="w-[80px]" />}
            {extraColumns.has("summary") && <col className="w-[200px]" />}
            {extraColumns.has("flags_detail") && <col className="w-[200px]" />}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-gray-50/60 border-b">
              {compareMode && <TableHead className="w-[40px]" />}
              <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide">
                Candidate
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-medium text-gray-500 uppercase tracking-wide">
                Fit
              </TableHead>
              {activeDimensions.map((dim) => (
                <TableHead
                  key={dim.key}
                  className="text-center whitespace-nowrap px-0 text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-[10px]">{dim.abbr}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">{dim.full}</p>
                        <p className="text-xs text-gray-400">{dim.desc}</p>
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
                const isIncomplete = candidate.status !== "COMPLETED";
                const overallFit = getOverallFit(candidate.strengthLevel);

                // Compute dimension summary for row tooltip
                const dimSummary = activeDimensions.map((dim) => {
                  const score = candidate.dimensionScores[dim.key];
                  if (score === undefined) return null;
                  return {
                    name: dim.full,
                    status: getDimStatus(score, getExpectedForDim(dim.key)),
                  };
                }).filter(Boolean) as { name: string; status: ExpectationStatus }[];

                const exceedsCount = dimSummary.filter((d) => d.status === "exceeds").length;
                const meetsCount = dimSummary.filter((d) => d.status === "meets").length;
                const belowCount = dimSummary.filter((d) => d.status === "below").length;

                return (
                  <TableRow
                    key={candidate.assessmentId}
                    onClick={() => handleRowClick(candidate.assessmentId)}
                    className={`group transition-colors ${
                      overallFit ? `border-l-[3px] ${FIT_DISPLAY[overallFit].borderClass}` : ""
                    } ${
                      compareMode
                        ? canSelect
                          ? "hover:bg-gray-50"
                          : "opacity-40"
                        : "cursor-pointer hover:bg-gray-50/80"
                    }`}
                  >
                    {compareMode && (
                      <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                        {canSelect ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(candidate.assessmentId)}
                            disabled={!isSelected && selectedIds.size >= 4}
                          />
                        ) : null}
                      </TableCell>
                    )}

                    {/* Candidate */}
                    <TableCell className="py-2.5 overflow-hidden">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 bg-gray-100 text-gray-600 flex items-center justify-center font-medium text-xs shrink-0">
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

                    {/* Fit */}
                    <TableCell className="py-2.5">
                      {overallFit ? (
                        <div className="flex flex-col gap-1">
                          <FitBadge
                            fit={overallFit}
                            strengthLevel={candidate.strengthLevel}
                            overallScore={candidate.overallScore}
                            expectedScore={expectedScore}
                          />
                          {dimSummary.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] pl-0.5">
                              {exceedsCount > 0 && (
                                <span className="text-blue-600 font-medium">{exceedsCount}&#8593;</span>
                              )}
                              {meetsCount > 0 && (
                                <span className="text-gray-400">{meetsCount}&#8594;</span>
                              )}
                              {belowCount > 0 && (
                                <span className="text-red-500 font-medium">{belowCount}&#8595;</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">&mdash;</span>
                      )}
                    </TableCell>

                    {/* Dimension indicators */}
                    {activeDimensions.map((dim) => {
                      const score = candidate.dimensionScores[dim.key];
                      const dimExpected = getExpectedForDim(dim.key);
                      return (
                        <TableCell key={dim.key} className="text-center py-2.5 px-0">
                          {score !== undefined ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center cursor-help">
                                    <DimIndicator status={getDimStatus(score, dimExpected)} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-medium text-sm">{dim.full}</p>
                                  <p className="text-xs text-gray-400">{dim.desc}</p>
                                  <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                                    <DimIndicator status={getDimStatus(score, dimExpected)} />
                                    <span className="font-medium">
                                      {STATUS_LABEL_MAP[getDimStatus(score, dimExpected)]}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    Score: {score.toFixed(1)} / 4 · Expected: {dimExpected.toFixed(1)} for {levelInfo.label.toLowerCase()}
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
                    <TableCell className="text-right py-2.5 pr-4">
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
                      <TableCell className="py-2.5 text-xs text-gray-600">
                        {candidate.percentile !== null ? `Top ${candidate.percentile}%` : <span className="text-gray-300">&mdash;</span>}
                      </TableCell>
                    )}
                    {extraColumns.has("confidence") && (
                      <TableCell className="py-2.5 text-xs text-gray-600">
                        {candidate.evaluationConfidence ?? <span className="text-gray-300">&mdash;</span>}
                      </TableCell>
                    )}
                    {extraColumns.has("date") && (
                      <TableCell className="py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {candidate.completedAt
                          ? new Date(candidate.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : <span className="text-gray-300">&mdash;</span>
                        }
                      </TableCell>
                    )}
                    {extraColumns.has("summary") && (
                      <TableCell className="py-2.5 text-xs text-gray-600 max-w-xs">
                        <span className="line-clamp-2">{candidate.summary ?? <span className="text-gray-300">&mdash;</span>}</span>
                      </TableCell>
                    )}
                    {extraColumns.has("flags_detail") && (
                      <TableCell className="py-2.5 text-xs text-gray-600 max-w-xs">
                        {candidate.redFlags.length > 0
                          ? <span className="line-clamp-2">{candidate.redFlags.join("; ")}</span>
                          : <span className="text-gray-300">&mdash;</span>
                        }
                      </TableCell>
                    )}
                  </TableRow>
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
              <Button variant="ghost" size="sm" onClick={toggleCompareMode} className="rounded-lg">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCompare}
                disabled={!canCompare}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-lg"
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
