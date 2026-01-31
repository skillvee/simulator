"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Calendar, Clock, Filter } from "lucide-react";

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

export function RecruiterCandidatesClient({
  candidates,
  scenarioOptions,
}: RecruiterCandidatesClientProps) {
  const [scenarioFilter, setScenarioFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((candidate) => (
                  <TableRow key={candidate.id} className="hover:bg-stone-50">
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
                  </TableRow>
                ))}
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
    </div>
  );
}
