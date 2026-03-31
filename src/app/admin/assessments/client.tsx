"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MessageSquare,
  Mic,
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
  errorCount: number;
  textConversationCount: number;
  voiceSessionCount: number;
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

interface ScenarioOption {
  id: string;
  name: string;
}

interface AssessmentsClientProps {
  assessments: SerializedAssessment[];
  scenarios: ScenarioOption[];
  stats: Stats;
}

type DateRange = "24h" | "7d" | "30d" | "all";
type SortColumn = "date" | "duration" | "errors" | "status";
type SortDirection = "asc" | "desc";

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

const PAGE_SIZE = 25;

const STATUS_SORT_ORDER: Record<AssessmentStatus, number> = {
  WELCOME: 0,
  WORKING: 1,
  COMPLETED: 2,
};

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

function getDuration(assessment: SerializedAssessment): number | null {
  if (!assessment.completedAt || !assessment.startedAt) return null;
  return (
    new Date(assessment.completedAt).getTime() -
    new Date(assessment.startedAt).getTime()
  );
}

export function AssessmentsClient({
  assessments,
  scenarios,
  stats,
}: AssessmentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL search params
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") ?? ""
  );
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | "all">(
    (searchParams.get("status") as AssessmentStatus | "all") ?? "all"
  );
  const [dateRange, setDateRange] = useState<DateRange>(
    (searchParams.get("dateRange") as DateRange) ?? "all"
  );
  const [scenarioFilter, setScenarioFilter] = useState(
    searchParams.get("scenario") ?? "all"
  );
  const [hasErrorsFilter, setHasErrorsFilter] = useState(
    searchParams.get("hasErrors") === "true"
  );
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(
    (searchParams.get("sortBy") as SortColumn) ?? null
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    (searchParams.get("sortDir") as SortDirection) ?? "desc"
  );
  const [currentPage, setCurrentPage] = useState(
    Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sync filter state to URL
  const updateURL = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === "" || value === "all" || value === "false") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      // Remove page param if it's 1
      if (newParams.get("page") === "1") newParams.delete("page");
      const qs = newParams.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    updateURL({ search: value || null, page: null });
  };

  const handleStatusChange = (value: AssessmentStatus | "all") => {
    setStatusFilter(value);
    setCurrentPage(1);
    updateURL({ status: value === "all" ? null : value, page: null });
  };

  const handleDateRangeChange = (value: DateRange) => {
    setDateRange(value);
    setCurrentPage(1);
    updateURL({ dateRange: value === "all" ? null : value, page: null });
  };

  const handleScenarioChange = (value: string) => {
    setScenarioFilter(value);
    setCurrentPage(1);
    updateURL({ scenario: value === "all" ? null : value, page: null });
  };

  const handleHasErrorsChange = (value: boolean) => {
    setHasErrorsFilter(value);
    setCurrentPage(1);
    updateURL({ hasErrors: value ? "true" : null, page: null });
  };

  const handleSort = (column: SortColumn) => {
    let newDirection: SortDirection = "desc";
    if (sortColumn === column) {
      newDirection = sortDirection === "desc" ? "asc" : "desc";
    }
    setSortColumn(column);
    setSortDirection(newDirection);
    updateURL({ sortBy: column, sortDir: newDirection });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page: page > 1 ? String(page) : null });
  };

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) => {
      // Search filter
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

      // Scenario filter
      if (scenarioFilter !== "all" && assessment.scenarioId !== scenarioFilter) {
        return false;
      }

      // Has errors filter
      if (hasErrorsFilter && assessment.errorCount === 0) {
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
  }, [assessments, searchQuery, statusFilter, dateRange, scenarioFilter, hasErrorsFilter]);

  // Sort assessments
  const sortedAssessments = useMemo(() => {
    if (!sortColumn) return filteredAssessments;

    return [...filteredAssessments].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "date": {
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        }
        case "duration": {
          const dA = getDuration(a) ?? -1;
          const dB = getDuration(b) ?? -1;
          comparison = dA - dB;
          break;
        }
        case "errors": {
          comparison = a.errorCount - b.errorCount;
          break;
        }
        case "status": {
          comparison =
            STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
          break;
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredAssessments, sortColumn, sortDirection]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedAssessments.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedAssessments = sortedAssessments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

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
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
            data-testid="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
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
            handleStatusChange(e.target.value as AssessmentStatus | "all")
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

        {/* Scenario Filter */}
        <select
          value={scenarioFilter}
          onChange={(e) => handleScenarioChange(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          data-testid="scenario-filter"
        >
          <option value="all">All Scenarios</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Has Errors Filter */}
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={hasErrorsFilter}
            onChange={(e) => handleHasErrorsChange(e.target.checked)}
            className="accent-primary"
            data-testid="has-errors-filter"
          />
          Has errors
        </label>

        {/* Date Range Filter */}
        <div className="flex gap-1" data-testid="date-range-filter">
          {DATE_RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              onClick={() => handleDateRangeChange(option.value)}
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
        Showing {paginatedAssessments.length} of {sortedAssessments.length} assessments
        {sortedAssessments.length !== assessments.length &&
          ` (filtered from ${assessments.length})`}
      </p>

      {/* Assessments Table */}
      <Card data-testid="assessments-table">
        <CardContent className="p-0">
          {sortedAssessments.length === 0 ? (
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
                  <SortableHeader
                    label="STATUS"
                    column="status"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="CREATED"
                    column="date"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="DURATION"
                    column="duration"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="p-4 text-left text-xs font-medium text-muted-foreground">
                    INTERACTIONS
                  </th>
                  <SortableHeader
                    label="ERRORS"
                    column="errors"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {paginatedAssessments.map((assessment) => (
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="mt-4 flex items-center justify-between"
          data-testid="pagination"
        >
          <p className="text-sm text-muted-foreground">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage <= 1}
              data-testid="pagination-prev"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              data-testid="pagination-next"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn | null;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = activeColumn === column;

  return (
    <th
      className="cursor-pointer select-none p-4 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => onSort(column)}
      data-testid={`sort-${column}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
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
  const duration = getDuration(assessment);

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
        <td className="p-4 whitespace-nowrap">
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
          <div className="flex items-center gap-2">
            {assessment.textConversationCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {assessment.textConversationCount}
              </span>
            )}
            {assessment.voiceSessionCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Mic className="h-3 w-3" />
                {assessment.voiceSessionCount}
              </span>
            )}
            {assessment.textConversationCount === 0 && assessment.voiceSessionCount === 0 && (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        </td>
        <td className="p-4">
          {assessment.errorCount > 0 ? (
            <Badge variant="destructive" className="gap-1" data-testid={`error-badge-${assessment.id}`}>
              <AlertCircle className="h-3 w-3" />
              {assessment.errorCount}
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
          <td colSpan={7} className="border-b border-border p-0">
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
