"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import type { AssessmentStatus, AssessmentLogEventType } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Serialized types from server (dates as strings)
interface SerializedLog {
  id: string;
  eventType: AssessmentLogEventType;
  timestamp: string;
  durationMs: number | null;
  metadata: unknown;
}

interface SerializedApiCall {
  id: string;
  requestTimestamp: string;
  responseTimestamp: string | null;
  durationMs: number | null;
  modelVersion: string;
  statusCode: number | null;
  errorMessage: string | null;
  promptTokens: number | null;
  responseTokens: number | null;
}

interface SerializedAssessment {
  id: string;
  userId: string;
  scenarioId: string;
  status: AssessmentStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  scenario: {
    id: string;
    name: string;
  };
  logs: SerializedLog[];
  apiCalls: SerializedApiCall[];
}

interface Stats {
  total: number;
  completed: number;
  failed: number;
  successRate: number;
  avgDurationMs: number | null;
}

interface AssessmentsClientProps {
  assessments: SerializedAssessment[];
  stats: Stats;
}

type DateRange = "24h" | "7d" | "30d" | "all";

const STATUS_OPTIONS: AssessmentStatus[] = [
  "WELCOME",
  "WORKING",
  "COMPLETED",
];

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function hasError(assessment: SerializedAssessment): boolean {
  return assessment.logs.some((log) => log.eventType === "ERROR");
}

export function AssessmentsClient({
  assessments,
  stats,
}: AssessmentsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | "all">(
    "all"
  );
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter assessments based on criteria
  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) => {
      // Search filter (name, email, or assessment ID)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = assessment.user.name?.toLowerCase().includes(query);
        const matchesEmail = assessment.user.email
          ?.toLowerCase()
          .includes(query);
        const matchesId = assessment.id.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesId) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && assessment.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== "all") {
        const createdAt = new Date(assessment.createdAt);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (dateRange === "24h" && hoursDiff > 24) return false;
        if (dateRange === "7d" && hoursDiff > 24 * 7) return false;
        if (dateRange === "30d" && hoursDiff > 24 * 30) return false;
      }

      return true;
    });
  }, [assessments, searchQuery, statusFilter, dateRange]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="px-8 py-10">
      <h1 className="mb-8 text-3xl font-semibold">Assessment Diagnostics</h1>

      {/* Aggregate Stats */}
      <div
        className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
        data-testid="stats-grid"
      >
        <StatCard label="TOTAL ASSESSMENTS" value={stats.total} />
        <StatCard
          label="SUCCESS RATE"
          value={`${stats.successRate}%`}
          highlight={stats.successRate >= 80}
        />
        <StatCard
          label="AVG DURATION"
          value={
            stats.avgDurationMs ? formatDuration(stats.avgDurationMs) : "-"
          }
        />
        <StatCard
          label="FAILED"
          value={stats.failed}
          error={stats.failed > 0}
        />
      </div>

      {/* Filters */}
      <div
        className="mb-6 flex flex-wrap items-center gap-4"
        data-testid="filters"
      >
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            data-testid="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AssessmentStatus | "all")
          }
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="status-filter"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        {/* Date Range Filter */}
        <div className="flex gap-1" data-testid="date-range-filter">
          {DATE_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              variant={dateRange === option.value ? "default" : "outline"}
              size="sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-muted-foreground">
        Showing {filteredAssessments.length} of {assessments.length} assessments
      </p>

      {/* Assessments Table */}
      <Card data-testid="assessments-table">
        <CardContent className="p-0">
          {filteredAssessments.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No assessments found matching your criteria
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-8 p-4"></th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    CANDIDATE
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    STATUS
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    CREATED
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    DURATION
                  </th>
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    ERRORS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessments.map((assessment) => (
                  <AssessmentRow
                    key={assessment.id}
                    assessment={assessment}
                    isExpanded={expandedId === assessment.id}
                    onToggle={() => toggleExpand(assessment.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  error,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  error?: boolean;
}) {
  return (
    <Card
      className={
        error ? "border-destructive bg-destructive/10" : ""
      }
    >
      <CardContent className="p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={`text-2xl font-semibold ${
            error
              ? "text-destructive"
              : highlight
                ? "text-primary"
                : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function AssessmentRow({
  assessment,
  isExpanded,
  onToggle,
}: {
  assessment: SerializedAssessment;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasErrors = hasError(assessment);
  const duration =
    assessment.completedAt && assessment.startedAt
      ? new Date(assessment.completedAt).getTime() -
        new Date(assessment.startedAt).getTime()
      : null;

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-border transition-colors hover:bg-muted/50 ${
          isExpanded ? "bg-muted/30" : ""
        }`}
        onClick={onToggle}
        data-testid={`assessment-row-${assessment.id}`}
      >
        <td className="p-4">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </td>
        <td className="p-4">
          <p className="font-semibold">{assessment.user.name || "Anonymous"}</p>
          <p className="text-xs text-muted-foreground">
            {assessment.user.email || "No email"}
          </p>
        </td>
        <td className="p-4">
          <Badge
            variant={assessment.status === "COMPLETED" ? "default" : "secondary"}
            className={
              assessment.status === "COMPLETED"
                ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                : ""
            }
          >
            {assessment.status}
          </Badge>
        </td>
        <td className="p-4 text-sm text-muted-foreground">
          {formatDate(assessment.createdAt)}
        </td>
        <td className="p-4 text-sm">
          {duration ? formatDuration(duration) : "-"}
        </td>
        <td className="p-4">
          {hasErrors ? (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              ERROR
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="border-b border-border p-0">
            <AssessmentDetails assessment={assessment} />
          </td>
        </tr>
      )}
    </>
  );
}

function AssessmentDetails({
  assessment,
}: {
  assessment: SerializedAssessment;
}) {
  return (
    <div className="bg-muted/20 p-6" data-testid={`details-${assessment.id}`}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Assessment Info */}
        <div>
          <h4 className="mb-3 text-xs font-medium text-muted-foreground">
            ASSESSMENT INFO
          </h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">ID:</span> {assessment.id}
            </p>
            <p>
              <span className="text-muted-foreground">Simulation:</span>{" "}
              {assessment.scenario.name}
            </p>
            <p>
              <span className="text-muted-foreground">Started:</span>{" "}
              {formatDate(assessment.startedAt)}
            </p>
            {assessment.completedAt && (
              <p>
                <span className="text-muted-foreground">Completed:</span>{" "}
                {formatDate(assessment.completedAt)}
              </p>
            )}
          </div>
          {/* View Timeline Link */}
          <Button asChild className="mt-4" size="sm">
            <Link
              href={`/admin/assessments/${assessment.id}`}
              data-testid={`view-timeline-${assessment.id}`}
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              View Full Timeline
            </Link>
          </Button>
        </div>

        {/* Event Logs */}
        <div>
          <h4 className="mb-3 text-xs font-medium text-muted-foreground">
            EVENT LOG ({assessment.logs.length} events)
          </h4>
          {assessment.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events recorded</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {assessment.logs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>

        {/* API Calls */}
        <div className="md:col-span-2">
          <h4 className="mb-3 text-xs font-medium text-muted-foreground">
            API CALLS ({assessment.apiCalls.length} calls)
          </h4>
          {assessment.apiCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API calls recorded
            </p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                        TIME
                      </th>
                      <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                        MODEL
                      </th>
                      <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                        DURATION
                      </th>
                      <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                        TOKENS
                      </th>
                      <th className="p-2 text-left text-xs font-medium text-muted-foreground">
                        STATUS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessment.apiCalls.map((call) => (
                      <ApiCallRow key={call.id} call={call} />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: SerializedLog }) {
  const isError = log.eventType === "ERROR";

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-xs ${
        isError
          ? "bg-destructive/10 text-destructive"
          : ""
      }`}
    >
      <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <Badge
        variant={isError ? "destructive" : log.eventType === "COMPLETED" ? "default" : "secondary"}
        className={
          log.eventType === "COMPLETED"
            ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
            : ""
        }
      >
        {log.eventType}
      </Badge>
      {log.durationMs && (
        <span className="text-muted-foreground">
          +{formatDuration(log.durationMs)}
        </span>
      )}
    </div>
  );
}

function ApiCallRow({ call }: { call: SerializedApiCall }) {
  const hasError = call.errorMessage !== null;
  const totalTokens = (call.promptTokens ?? 0) + (call.responseTokens ?? 0);

  return (
    <tr
      className={`border-b border-border transition-colors hover:bg-muted/50 ${
        hasError ? "bg-destructive/5" : ""
      }`}
    >
      <td className="p-2 text-xs text-muted-foreground">
        {new Date(call.requestTimestamp).toLocaleTimeString()}
      </td>
      <td className="p-2 text-xs">{call.modelVersion}</td>
      <td className="p-2 text-xs">
        {call.durationMs ? formatDuration(call.durationMs) : "-"}
      </td>
      <td className="p-2 text-xs">
        {totalTokens > 0 ? totalTokens.toLocaleString() : "-"}
      </td>
      <td className="p-2">
        {hasError ? (
          <Badge
            variant="destructive"
            className="gap-1"
            title={call.errorMessage ?? undefined}
          >
            <AlertCircle className="h-3 w-3" /> Error
          </Badge>
        ) : (
          <Badge className="gap-1 bg-green-500/10 text-green-600 hover:bg-green-500/20">
            <CheckCircle2 className="h-3 w-3" />{" "}
            {call.statusCode ?? "OK"}
          </Badge>
        )}
      </td>
    </tr>
  );
}
