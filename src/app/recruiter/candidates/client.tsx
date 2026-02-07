"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  TrendingUp,
  Clock,
  Plus,
  Search,
} from "lucide-react";
import type { CandidateSearchItem } from "./page";

interface SimulationStats {
  id: string;
  name: string;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  minScore: number | null;
  maxScore: number | null;
  topCandidate: { name: string; score: number } | null;
  lastActivityDate: string | null;
}

interface RecruiterCandidatesClientProps {
  simulationStats: SimulationStats[];
  allCandidates: CandidateSearchItem[];
}

/**
 * Format relative time for last activity
 */
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Get status badge color
 */
function getStatusBadgeColor(status: "COMPLETED" | "WORKING" | "WELCOME") {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-700 border-green-200";
    case "WORKING":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "WELCOME":
      return "bg-stone-100 text-stone-600 border-stone-200";
  }
}

/**
 * Use debounced search query
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function RecruiterCandidatesClient({
  simulationStats,
  allCandidates,
}: RecruiterCandidatesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Sort simulations by last activity (most recent first)
  const sortedSimulations = [...simulationStats].sort((a, b) => {
    if (!a.lastActivityDate) return 1;
    if (!b.lastActivityDate) return -1;
    return new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime();
  });

  // Filter candidates by search query (case-insensitive partial match)
  const filteredCandidates = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];

    const query = debouncedSearchQuery.toLowerCase();
    return allCandidates.filter(
      (candidate) =>
        candidate.candidateName.toLowerCase().includes(query) ||
        candidate.candidateEmail.toLowerCase().includes(query)
    );
  }, [debouncedSearchQuery, allCandidates]);

  const showDropdown = searchQuery.trim().length > 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Candidates</h1>
        <p className="mt-1 text-sm text-stone-500">
          Select a simulation to review candidates
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            type="text"
            placeholder="Search candidates by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && (
          <div className="absolute top-full mt-2 w-full bg-white border border-stone-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
            {filteredCandidates.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-500">
                No candidates found
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredCandidates.map((candidate) => (
                  <Link
                    key={candidate.assessmentId}
                    href={`/recruiter/candidates/s/${candidate.simulationId}`}
                    className="block px-4 py-3 hover:bg-stone-50 transition-colors"
                    onClick={() => setSearchQuery("")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-stone-900 truncate">
                          {candidate.candidateName}
                        </div>
                        <div className="text-sm text-stone-500 truncate">
                          {candidate.candidateEmail}
                        </div>
                        <div className="text-xs text-stone-400 mt-1 truncate">
                          {candidate.simulationName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadgeColor(
                            candidate.status
                          )}`}
                        >
                          {candidate.status === "COMPLETED"
                            ? "Completed"
                            : candidate.status === "WORKING"
                            ? "Working"
                            : "Welcome"}
                        </span>
                        {candidate.score !== null && (
                          <span className="text-sm font-medium text-stone-700">
                            {candidate.score.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simulations Grid */}
      {sortedSimulations.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <Users className="mx-auto h-16 w-16 text-stone-300" />
            <h2 className="mt-6 text-xl font-semibold text-stone-900">
              No simulations yet
            </h2>
            <p className="mt-2 text-stone-500">
              Create a simulation to start assessing candidates.
            </p>
            <Button
              asChild
              className="mt-6 bg-blue-600 hover:bg-blue-700"
            >
              <Link href="/recruiter/simulations/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Simulation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSimulations.map((sim) => (
            <Link
              key={sim.id}
              href={`/recruiter/candidates/s/${sim.id}`}
              className="block group"
            >
              <Card className="border-stone-200 bg-white hover:border-blue-300 hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="p-6">
                  {/* Simulation Name */}
                  <h3 className="text-lg font-semibold text-stone-900 mb-4 group-hover:text-blue-600 transition-colors">
                    {sim.name}
                  </h3>

                  {/* Candidate Count Breakdown */}
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-stone-500" />
                    <span className="text-sm text-stone-700">
                      {sim.completedCount > 0 ? (
                        <>
                          <span className="font-medium">{sim.completedCount}</span> completed
                          {sim.inProgressCount > 0 && (
                            <>, <span className="font-medium">{sim.inProgressCount}</span> in progress</>
                          )}
                        </>
                      ) : sim.inProgressCount > 0 ? (
                        <>
                          <span className="font-medium">{sim.inProgressCount}</span> in progress
                        </>
                      ) : (
                        <span className="text-stone-400">No candidates yet</span>
                      )}
                    </span>
                  </div>

                  {/* Score Range */}
                  {sim.minScore !== null && sim.maxScore !== null && (
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-stone-500" />
                      <span className="text-sm text-stone-700">
                        Scores: <span className="font-medium">{sim.minScore.toFixed(1)}</span> – <span className="font-medium">{sim.maxScore.toFixed(1)}</span>
                      </span>
                    </div>
                  )}

                  {/* Top Candidate */}
                  {sim.topCandidate && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-100">
                      <div className="text-xs text-blue-600 font-medium mb-1">Top Candidate</div>
                      <div className="text-sm text-stone-900 font-medium">{sim.topCandidate.name}</div>
                      <div className="text-xs text-stone-600 mt-1">
                        Score: {sim.topCandidate.score.toFixed(1)}
                      </div>
                    </div>
                  )}

                  {/* Last Activity */}
                  {sim.lastActivityDate && (
                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-4 pt-3 border-t border-stone-100">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Last activity: {formatRelativeTime(sim.lastActivityDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
