"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Calendar,
  Clock,
  Filter,
  ExternalLink,
  GitCompare,
  X,
} from "lucide-react";

interface CandidateData {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  scenario: {
    id: string;
    name: string;
  };
}

interface ScenarioOption {
  id: string;
  name: string;
}

interface RecruiterCandidatesClientProps {
  candidates: CandidateData[];
  scenarioOptions: ScenarioOption[];
}

const MAX_COMPARE_CANDIDATES = 4;

export function RecruiterCandidatesClient({
  candidates,
  scenarioOptions,
}: RecruiterCandidatesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [scenarioFilter, setScenarioFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set()
  );

  // Restore selection from URL params on mount
  useEffect(() => {
    const compareIds = searchParams.get("compare");
    if (compareIds) {
      const ids = compareIds.split(",").filter(Boolean);
      if (ids.length > 0) {
        setSelectedCandidates(new Set(ids));
        setCompareMode(true);
      }
    }
  }, [searchParams]);

  // Persist selection to URL params
  const updateUrlParams = useCallback(
    (selected: Set<string>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (selected.size > 0) {
        params.set("compare", Array.from(selected).join(","));
      } else {
        params.delete("compare");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleToggleCandidate = useCallback(
    (candidateId: string) => {
      setSelectedCandidates((prev) => {
        const next = new Set(prev);
        if (next.has(candidateId)) {
          next.delete(candidateId);
        } else if (next.size < MAX_COMPARE_CANDIDATES) {
          next.add(candidateId);
        }
        updateUrlParams(next);
        return next;
      });
    },
    [updateUrlParams]
  );

  const handleExitCompareMode = useCallback(() => {
    setCompareMode(false);
    setSelectedCandidates(new Set());
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compare");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleCompare = useCallback(() => {
    const ids = Array.from(selectedCandidates).join(",");
    router.push(`/recruiter/candidates/compare?ids=${ids}`);
  }, [router, selectedCandidates]);

  const canSelectMore = selectedCandidates.size < MAX_COMPARE_CANDIDATES;

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const matchesScenario =
        scenarioFilter === "all" || candidate.scenario.id === scenarioFilter;
      const matchesStatus =
        statusFilter === "all" || candidate.status === statusFilter;
      return matchesScenario && matchesStatus;
    });
  }, [candidates, scenarioFilter, statusFilter]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Candidates</h1>
        <p className="mt-1 text-sm text-stone-500">
          View all candidates who have taken your assessments
        </p>
      </div>

      {/* Filters */}
      {candidates.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">Filters:</span>
          </div>
          <select
            value={scenarioFilter}
            onChange={(e) => setScenarioFilter(e.target.value)}
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All scenarios</option>
            {scenarioOptions.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="WELCOME">Welcome</option>
            <option value="WORKING">Working</option>
            <option value="COMPLETED">Completed</option>
          </select>
          {(scenarioFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setScenarioFilter("all");
                setStatusFilter("all");
              }}
              className="text-stone-500 hover:text-stone-700"
            >
              Clear filters
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {compareMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitCompareMode}
                className="border-stone-300 text-stone-600 hover:bg-stone-100"
              >
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompareMode(true)}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <GitCompare className="mr-1.5 h-4 w-4" />
                Compare
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Candidates Table/List */}
      {candidates.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <Users className="mx-auto h-16 w-16 text-stone-300" />
            <h2 className="mt-6 text-xl font-semibold text-stone-900">
              No candidates yet
            </h2>
            <p className="mt-2 text-stone-500">
              Share your scenario link to get started.
            </p>
            <Button
              asChild
              className="mt-6 bg-blue-600 hover:bg-blue-700"
            >
              <Link href="/recruiter/scenarios">View Your Scenarios</Link>
            </Button>
          </CardContent>
        </Card>
      ) : filteredCandidates.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <Filter className="mx-auto h-16 w-16 text-stone-300" />
            <h2 className="mt-6 text-xl font-semibold text-stone-900">
              No matching candidates
            </h2>
            <p className="mt-2 text-stone-500">
              Try adjusting your filters to see more results.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setScenarioFilter("all");
                setStatusFilter("all");
              }}
              className="mt-6 border-stone-200"
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-stone-200 bg-white overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50 hover:bg-stone-50">
                  {compareMode && <TableHead className="w-[50px]"></TableHead>}
                  <TableHead>Candidate</TableHead>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Started
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Completed
                    </div>
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((candidate) => {
                  const isCompleted = candidate.status === "COMPLETED";
                  const isSelected = selectedCandidates.has(candidate.id);
                  const canSelect = isCompleted && (isSelected || canSelectMore);

                  return (
                    <TableRow
                      key={candidate.id}
                      className={`hover:bg-stone-50 ${
                        compareMode && isSelected
                          ? "bg-blue-50 hover:bg-blue-50"
                          : ""
                      }`}
                    >
                      {compareMode && (
                        <TableCell className="w-[50px]">
                          {isCompleted ? (
                            canSelect ? (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleToggleCandidate(candidate.id)
                                }
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={false}
                                      disabled
                                      className="opacity-50 cursor-not-allowed"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Maximum 4 candidates
                                </TooltipContent>
                              </Tooltip>
                            )
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Checkbox
                                    checked={false}
                                    disabled
                                    className="opacity-30 cursor-not-allowed"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Only completed assessments can be compared
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-medium">
                          {candidate.user.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-stone-900">
                            {candidate.user.name || "Anonymous"}
                          </p>
                          <p className="text-sm text-stone-500">
                            {candidate.user.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/recruiter/scenarios/${candidate.scenario.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {candidate.scenario.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          candidate.status === "COMPLETED"
                            ? "bg-blue-100 text-blue-700 border-0"
                            : "bg-stone-100 text-stone-600 border-0"
                        }
                      >
                        {candidate.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-stone-500">
                      {formatDateTime(candidate.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-stone-500">
                      {candidate.completedAt
                        ? formatDate(candidate.completedAt)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {candidate.status === "COMPLETED" && (
                        <Link
                          href={`/recruiter/candidates/${candidate.id}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          View
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      {candidates.length > 0 && (
        <div className="mt-4 text-sm text-stone-500">
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </div>
      )}

      {/* Floating Compare Bar */}
      {compareMode && selectedCandidates.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 rounded-lg border border-blue-200 bg-white px-6 py-3 shadow-lg">
            <span className="text-sm font-medium text-stone-700">
              {selectedCandidates.size} candidate
              {selectedCandidates.size !== 1 ? "s" : ""} selected
            </span>
            <Button
              onClick={handleCompare}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Compare {selectedCandidates.size} candidates
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitCompareMode}
              className="text-stone-500 hover:text-stone-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
