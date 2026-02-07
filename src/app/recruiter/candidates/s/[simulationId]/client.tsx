"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, AlertTriangle, Circle, X } from "lucide-react";
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

/**
 * Candidate strength levels based on overall score (1-4 scale)
 */
type CandidateStrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

/**
 * Candidate data for the scoped table
 */
interface CandidateData {
  assessmentId: string;
  name: string | null;
  email: string | null;
  status: string;
  overallScore: number | null;
  percentile: number | null;
  strengthLevel: CandidateStrengthLevel | null;
  topDimension: { name: string; score: number } | null;
  midDimension: { name: string; score: number } | null;
  bottomDimension: { name: string; score: number } | null;
  redFlagCount: number;
  evaluationConfidence: string | null;
  summary: string | null;
  completedAt: string | null;
}

interface ScopedCandidatesClientProps {
  simulationId: string;
  simulationName: string;
  candidates: CandidateData[];
}

/**
 * Get initials from name
 */
function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get badge variant for status
 */
function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "default"; // green
    case "WORKING":
      return "secondary"; // blue
    case "WELCOME":
      return "outline"; // gray
    default:
      return "outline";
  }
}

/**
 * Get badge variant for strength level
 */
function getStrengthBadgeColor(level: CandidateStrengthLevel | null): string {
  switch (level) {
    case "Exceptional":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Strong":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "Proficient":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "Developing":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
}

/**
 * Render 4-segment score bar
 */
function ScoreBar({ score }: { score: number }) {
  // Each segment represents 1 point on the 1-4 scale
  // A score of 3.2 fills 3 full segments and ~20% of the 4th
  const segments = 4;
  const filledSegments = Math.floor(score);
  const partialFill = (score % 1) * 100;

  return (
    <div className="flex gap-1">
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filledSegments;
        const isPartial = i === filledSegments && partialFill > 0;

        return (
          <div
            key={i}
            className="h-5 w-8 rounded-sm border border-gray-300 overflow-hidden bg-gray-100"
          >
            {isFilled && <div className="h-full w-full bg-blue-500" />}
            {isPartial && (
              <div
                className="h-full bg-blue-500"
                style={{ width: `${partialFill}%` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Format completed date
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Abbreviate dimension names for compact display
 */
function abbreviateDimension(dimension: string): string {
  const abbreviations: Record<string, string> = {
    COMMUNICATION: "Comm",
    PROBLEM_SOLVING: "Problem",
    TECHNICAL_KNOWLEDGE: "Tech",
    COLLABORATION: "Collab",
    ADAPTABILITY: "Adapt",
    LEADERSHIP: "Lead",
    CREATIVITY: "Creative",
    TIME_MANAGEMENT: "Time",
  };

  return abbreviations[dimension] ?? dimension;
}

/**
 * Get full dimension name for tooltip
 */
function getFullDimensionName(dimension: string): string {
  const fullNames: Record<string, string> = {
    COMMUNICATION: "Communication",
    PROBLEM_SOLVING: "Problem Solving",
    TECHNICAL_KNOWLEDGE: "Technical Knowledge",
    COLLABORATION: "Collaboration",
    ADAPTABILITY: "Adaptability",
    LEADERSHIP: "Leadership",
    CREATIVITY: "Creativity",
    TIME_MANAGEMENT: "Time Management",
  };

  return fullNames[dimension] ?? dimension;
}

/**
 * Get color class for dimension score
 */
function getDimensionScoreColor(score: number): string {
  if (score >= 3.5) return "bg-green-100 text-green-800 hover:bg-green-100";
  if (score >= 2.5) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  return "bg-orange-100 text-orange-800 hover:bg-orange-100";
}

/**
 * Dimension mini score badge with tooltip
 */
function DimensionMiniScore({ name, score }: { name: string; score: number }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`text-xs font-medium ${getDimensionScoreColor(score)}`}>
            {abbreviateDimension(name)} {score.toFixed(1)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getFullDimensionName(name)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Confidence indicator icon with tooltip
 */
function ConfidenceIndicator({ confidence }: { confidence: string | null }) {
  if (!confidence) return null;

  // Normalize confidence to lowercase for comparison
  const normalizedConfidence = confidence.toLowerCase();

  let icon: React.ReactNode;
  let label: string;

  if (normalizedConfidence === "high") {
    icon = <Circle className="h-3 w-3 fill-current text-green-600" />;
    label = "High";
  } else if (normalizedConfidence === "medium") {
    icon = (
      <div className="relative h-3 w-3">
        <Circle className="h-3 w-3 text-yellow-600" />
        <div className="absolute inset-0 overflow-hidden w-1/2">
          <Circle className="h-3 w-3 fill-current text-yellow-600" />
        </div>
      </div>
    );
    label = "Medium";
  } else {
    icon = <Circle className="h-3 w-3 text-gray-400" />;
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

/**
 * Red flag count badge (hidden when count is 0)
 */
function RedFlagBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs font-medium gap-1">
      <AlertTriangle className="h-3 w-3" />
      {count} {count === 1 ? "flag" : "flags"}
    </Badge>
  );
}

type SortOption = "score" | "recent" | "name";
type StatusFilter = "all" | "COMPLETED" | "WORKING" | "WELCOME";
type StrengthFilter = "all" | "Exceptional" | "Strong" | "Proficient" | "Developing";
type MinScoreFilter = "none" | "1.0" | "2.0" | "2.5" | "3.0" | "3.5";

export function ScopedCandidatesClient({
  simulationId,
  simulationName,
  candidates,
}: ScopedCandidatesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter and sort state
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [strengthFilter, setStrengthFilter] = useState<StrengthFilter>("all");
  const [minScoreFilter, setMinScoreFilter] = useState<MinScoreFilter>("none");

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize compare mode from URL params
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

  // Update URL when compare mode or selection changes
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

  const handleRowClick = (assessmentId: string) => {
    // Don't navigate if in compare mode - let checkbox handle it
    if (compareMode) return;
    router.push(`/recruiter/candidates/s/${simulationId}/${assessmentId}`);
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) {
      // Exiting compare mode - clear selections
      setSelectedIds(new Set());
    }
  };

  const toggleSelection = (assessmentId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(assessmentId)) {
        newSet.delete(assessmentId);
      } else if (newSet.size < 4) {
        // Max 4 selections
        newSet.add(assessmentId);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    const ids = Array.from(selectedIds).join(",");
    router.push(`/recruiter/candidates/s/${simulationId}/compare?ids=${ids}`);
  };

  const canCompare = selectedIds.size >= 2 && selectedIds.size <= 4;

  // Filter and sort candidates
  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = [...candidates];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Apply strength filter
    if (strengthFilter !== "all") {
      filtered = filtered.filter((c) => c.strengthLevel === strengthFilter);
    }

    // Apply minimum score filter
    if (minScoreFilter !== "none") {
      const minScore = parseFloat(minScoreFilter);
      filtered = filtered.filter((c) => c.overallScore !== null && c.overallScore >= minScore);
    }

    // Sort candidates
    filtered.sort((a, b) => {
      if (sortBy === "score") {
        // Default: Highest score (descending), tiebreaker: most recent completion
        // Non-scored candidates always at bottom
        const aHasScore = a.overallScore !== null;
        const bHasScore = b.overallScore !== null;

        if (!aHasScore && !bHasScore) {
          // Both non-scored: sort by completed date (most recent first)
          const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bDate - aDate;
        }
        if (!aHasScore) return 1; // a goes to bottom
        if (!bHasScore) return -1; // b goes to bottom

        // Both have scores: sort by score descending
        if (b.overallScore !== a.overallScore) {
          return b.overallScore! - a.overallScore!;
        }

        // Tiebreaker: most recent completion
        const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bDate - aDate;
      } else if (sortBy === "recent") {
        // Most recent by completedAt descending
        const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bDate - aDate;
      } else {
        // Name A-Z (alphabetical)
        const aName = a.name?.toLowerCase() || "";
        const bName = b.name?.toLowerCase() || "";
        return aName.localeCompare(bName);
      }
    });

    return filtered;
  }, [candidates, sortBy, statusFilter, strengthFilter, minScoreFilter]);

  // Active filters count
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
      filters.push({
        key: "strength",
        label: `Strength: ${strengthFilter}`,
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/recruiter/candidates"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          All Simulations
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{simulationName}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Showing {filteredAndSortedCandidates.length} of {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={toggleCompareMode}
            variant={compareMode ? "default" : "outline"}
            className={compareMode ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {compareMode ? "Exit Compare Mode" : "Compare"}
          </Button>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="mb-4 space-y-3">
        {/* Controls Row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[160px]">
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

          {/* Strength Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Strength:</label>
            <Select value={strengthFilter} onValueChange={(value) => setStrengthFilter(value as StrengthFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Exceptional">Exceptional</SelectItem>
                <SelectItem value="Strong">Strong</SelectItem>
                <SelectItem value="Proficient">Proficient</SelectItem>
                <SelectItem value="Developing">Developing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Min Score Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Min Score:</label>
            <Select value={minScoreFilter} onValueChange={(value) => setMinScoreFilter(value as MinScoreFilter)}>
              <SelectTrigger className="w-[140px]">
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

        {/* Active Filters Chips */}
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
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {compareMode && <TableHead className="w-[50px]"></TableHead>}
              <TableHead className="w-[300px]">Candidate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Overall Score</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead>Percentile</TableHead>
              <TableHead>Strength</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCandidates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={compareMode ? 8 : 7} className="text-center text-gray-500 py-12">
                  {candidates.length === 0
                    ? "No candidates found for this simulation"
                    : "No candidates match the selected filters"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedCandidates.map((candidate) => {
                // Determine if candidate can be selected (completed with video scores)
                const canSelect = candidate.status === "COMPLETED" && candidate.overallScore !== null;
                const isSelected = selectedIds.has(candidate.assessmentId);

                return (
                  <TableRow
                    key={candidate.assessmentId}
                    onClick={() => handleRowClick(candidate.assessmentId)}
                    className={compareMode ? (canSelect ? "hover:bg-gray-50" : "") : "cursor-pointer hover:bg-gray-50"}
                  >
                    {/* Checkbox (compare mode only) */}
                    {compareMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canSelect ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(candidate.assessmentId)}
                            disabled={!isSelected && selectedIds.size >= 4}
                          />
                        ) : null}
                      </TableCell>
                    )}

                    {/* Avatar + Name + Email + Summary + Flags + Confidence */}
                    <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                        {getInitials(candidate.name)}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {candidate.name ?? "Anonymous"}
                          </span>
                          <RedFlagBadge count={candidate.redFlagCount} />
                          <ConfidenceIndicator confidence={candidate.evaluationConfidence} />
                        </div>
                        <div className="text-sm text-gray-500">{candidate.email}</div>
                        {candidate.summary && (
                          <div className="text-xs text-gray-500 mt-1 max-w-md">
                            {candidate.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(candidate.status)}>
                      {candidate.status === "COMPLETED" && "Completed"}
                      {candidate.status === "WORKING" && "Working"}
                      {candidate.status === "WELCOME" && "Welcome"}
                      {!["COMPLETED", "WORKING", "WELCOME"].includes(candidate.status) &&
                        candidate.status}
                    </Badge>
                  </TableCell>

                  {/* Overall Score */}
                  <TableCell>
                    {candidate.overallScore !== null ? (
                      <div className="flex items-center gap-2">
                        <ScoreBar score={candidate.overallScore} />
                        <span className="text-sm text-gray-600">
                          {candidate.overallScore.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Dimension Mini-Scores */}
                  <TableCell>
                    {candidate.topDimension &&
                    candidate.midDimension &&
                    candidate.bottomDimension ? (
                      <div className="flex gap-1.5">
                        <DimensionMiniScore
                          name={candidate.topDimension.name}
                          score={candidate.topDimension.score}
                        />
                        <DimensionMiniScore
                          name={candidate.midDimension.name}
                          score={candidate.midDimension.score}
                        />
                        <DimensionMiniScore
                          name={candidate.bottomDimension.name}
                          score={candidate.bottomDimension.score}
                        />
                      </div>
                    ) : candidate.topDimension ? (
                      <div className="flex gap-1.5">
                        <DimensionMiniScore
                          name={candidate.topDimension.name}
                          score={candidate.topDimension.score}
                        />
                        {candidate.midDimension && (
                          <DimensionMiniScore
                            name={candidate.midDimension.name}
                            score={candidate.midDimension.score}
                          />
                        )}
                        {candidate.bottomDimension && (
                          <DimensionMiniScore
                            name={candidate.bottomDimension.name}
                            score={candidate.bottomDimension.score}
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Percentile */}
                  <TableCell>
                    {candidate.percentile !== null ? (
                      <Badge variant="outline" className="font-normal">
                        Top {candidate.percentile}%
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                  {/* Strength Level */}
                  <TableCell>
                    {candidate.strengthLevel ? (
                      <Badge className={getStrengthBadgeColor(candidate.strengthLevel)}>
                        {candidate.strengthLevel}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>

                    {/* Completed Date */}
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(candidate.completedAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Floating Action Bar (compare mode only) */}
      {compareMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg py-4 px-6 z-50">
          <div className="container mx-auto max-w-7xl flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {selectedIds.size === 0 && "Select 2-4 candidates to compare"}
              {selectedIds.size === 1 && "Select at least 1 more candidate"}
              {selectedIds.size >= 2 && (
                <span className="font-medium">
                  {selectedIds.size} candidate{selectedIds.size !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={toggleCompareMode}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompare}
                disabled={!canCompare}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
              >
                Compare {selectedIds.size >= 2 ? selectedIds.size : ""} candidate{selectedIds.size !== 1 && selectedIds.size >= 2 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
