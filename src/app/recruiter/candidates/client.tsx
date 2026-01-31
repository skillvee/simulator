"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Calendar, Clock, Filter } from "lucide-react";

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

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 hover:bg-green-100";
      case "WORKING":
        return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "WELCOME":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/recruiter/dashboard"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">Candidates</h1>
        <p className="mt-2 text-gray-600">
          View all candidates who have taken your assessments
        </p>
      </div>

      {/* Filters */}
      {candidates.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <select
            value={scenarioFilter}
            onChange={(e) => setScenarioFilter(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="text-gray-500 hover:text-gray-700"
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Candidates Table/List */}
      {candidates.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Users className="mx-auto h-16 w-16 text-gray-300" />
            <h2 className="mt-6 text-xl font-semibold text-gray-900">
              No candidates yet
            </h2>
            <p className="mt-2 text-gray-500">
              Share your scenario link to get started.
            </p>
            <Button
              asChild
              className="mt-6 bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Link href="/recruiter/scenarios">View Your Scenarios</Link>
            </Button>
          </CardContent>
        </Card>
      ) : filteredCandidates.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-12 text-center">
            <Filter className="mx-auto h-16 w-16 text-gray-300" />
            <h2 className="mt-6 text-xl font-semibold text-gray-900">
              No matching candidates
            </h2>
            <p className="mt-2 text-gray-500">
              Try adjusting your filters to see more results.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setScenarioFilter("all");
                setStatusFilter("all");
              }}
              className="mt-6 border-gray-200"
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      Candidate
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      Scenario
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Started
                      </div>
                    </th>
                    <th className="p-4 text-left text-xs font-medium uppercase text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Completed
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50"
                    >
                      <td className="p-4">
                        <p className="font-medium text-gray-900">
                          {candidate.user.name || "Anonymous"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {candidate.user.email || "No email"}
                        </p>
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/recruiter/scenarios/${candidate.scenario.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {candidate.scenario.name}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="secondary"
                          className={getStatusBadgeStyles(candidate.status)}
                        >
                          {candidate.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {formatDateTime(candidate.createdAt)}
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {candidate.completedAt
                          ? formatDate(candidate.completedAt)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      {candidates.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </div>
      )}
    </div>
  );
}
