"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Layers,
  List,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface SerializedError {
  id: string;
  source: "client" | "api";
  timestamp: string;
  errorType: string;
  message: string;
  stackTrace: string | null;
  componentName: string | null;
  url: string | null;
  assessmentId: string | null;
  assessmentName: string | null;
  userId: string | null;
  userName: string | null;
  statusCode?: number | null;
  modelVersion?: string;
  promptType?: string | null;
}

interface SummaryStats {
  totalErrorsLast24h: number;
  totalErrorsPrior24h: number;
  mostCommonError: string;
  mostCommonCount: number;
  mostAffectedAssessment: { id: string; name: string; count: number };
}

interface FilterOptions {
  assessments: { id: string; name: string }[];
  users: { id: string; name: string }[];
}

interface ErrorDashboardClientProps {
  errors: SerializedError[];
  summaryStats: SummaryStats;
  filterOptions: FilterOptions;
}

interface GroupedError {
  signature: string;
  count: number;
  lastSeen: string;
  affectedAssessments: Set<string>;
  errors: SerializedError[];
  errorType: string;
  source: "client" | "api";
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const ERROR_TYPES = [
  { value: "all", label: "All Types" },
  { value: "CONSOLE_ERROR", label: "Console Error" },
  { value: "CONSOLE_WARN", label: "Console Warn" },
  { value: "CONSOLE_LOG", label: "Console Log" },
  { value: "UNHANDLED_EXCEPTION", label: "Unhandled Exception" },
  { value: "REACT_BOUNDARY", label: "React Boundary" },
  { value: "API_ERROR", label: "API Error" },
];

const DATE_RANGES = [
  { value: "24h", label: "Last 24 hours" },
  { value: "3d", label: "Last 3 days" },
  { value: "7d", label: "Last 7 days" },
];

const PAGE_SIZE = 50;

const ERROR_TYPE_LABELS: Record<string, string> = {
  UNHANDLED_EXCEPTION: "Exception",
  CONSOLE_ERROR: "Error",
  CONSOLE_WARN: "Warning",
  CONSOLE_LOG: "Log",
  REACT_BOUNDARY: "React",
  API_ERROR: "API",
};

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function formatTimestamp(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function getErrorSignature(error: SerializedError): string {
  // Normalize the message to group similar errors
  return error.message
    .replace(/[0-9a-f]{8,}/gi, "<id>") // Replace long hex strings
    .replace(/\d{13,}/g, "<timestamp>") // Replace timestamps
    .replace(/https?:\/\/[^\s]+/g, "<url>") // Replace URLs
    .slice(0, 150);
}

function getErrorTypeBadge(errorType: string, source: "client" | "api") {
  const label = ERROR_TYPE_LABELS[errorType] || errorType;

  if (source === "api" || errorType === "UNHANDLED_EXCEPTION" || errorType === "REACT_BOUNDARY") {
    return (
      <Badge variant="destructive" className="text-xs">
        {label}
      </Badge>
    );
  }
  if (errorType === "CONSOLE_WARN") {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 bg-amber-50 text-amber-700 text-xs"
      >
        {label}
      </Badge>
    );
  }
  if (errorType === "CONSOLE_LOG") {
    return (
      <Badge variant="secondary" className="text-xs">
        {label}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-red-300 bg-red-50 text-red-700 text-xs"
    >
      {label}
    </Badge>
  );
}

// -------------------------------------------------------------------
// Components
// -------------------------------------------------------------------

function SummaryCards({ stats }: { stats: SummaryStats }) {
  const trend = stats.totalErrorsLast24h - stats.totalErrorsPrior24h;
  const trendPercent =
    stats.totalErrorsPrior24h > 0
      ? Math.round((trend / stats.totalErrorsPrior24h) * 100)
      : stats.totalErrorsLast24h > 0
        ? 100
        : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Errors (24h) */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Errors (24h)
            </p>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold">{stats.totalErrorsLast24h}</p>
        </CardContent>
      </Card>

      {/* Error Rate Trend */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              vs Prior 24h
            </p>
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : trend < 0 ? (
              <TrendingDown className="h-4 w-4 text-green-500" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <p className="mt-2 text-3xl font-bold">
            <span
              className={
                trend > 0
                  ? "text-red-600"
                  : trend < 0
                    ? "text-green-600"
                    : ""
              }
            >
              {trend > 0 ? "+" : ""}
              {trendPercent}%
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalErrorsPrior24h} errors prior period
          </p>
        </CardContent>
      </Card>

      {/* Most Common Error */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Most Common
            </p>
            <Badge variant="secondary" className="text-xs">
              {stats.mostCommonCount}x
            </Badge>
          </div>
          <p
            className="mt-2 text-sm font-medium truncate"
            title={stats.mostCommonError}
          >
            {stats.mostCommonError}
          </p>
        </CardContent>
      </Card>

      {/* Most Affected Assessment */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Most Affected
          </p>
          {stats.mostAffectedAssessment.id ? (
            <>
              <Link
                href={`/admin/assessments/${stats.mostAffectedAssessment.id}`}
                className="mt-2 block text-sm font-medium text-[#237CF1] hover:underline truncate"
              >
                {stats.mostAffectedAssessment.name}
              </Link>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.mostAffectedAssessment.count} errors
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">N/A</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorRow({ error }: { error: SerializedError }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
      {/* Timestamp */}
      <span className="flex-shrink-0 text-xs text-muted-foreground font-mono w-[130px] pt-0.5">
        {formatTimestamp(error.timestamp)}
      </span>

      {/* Type badge */}
      <div className="flex-shrink-0 w-[80px]">
        {getErrorTypeBadge(error.errorType, error.source)}
      </div>

      {/* Message */}
      <p className="flex-1 text-sm truncate min-w-0" title={error.message}>
        {error.message}
      </p>

      {/* Assessment link */}
      <div className="flex-shrink-0 w-[140px] text-right">
        {error.assessmentId ? (
          <Link
            href={`/admin/assessments/${error.assessmentId}`}
            className="text-xs text-[#237CF1] hover:underline truncate block"
            title={error.assessmentName || error.assessmentId}
          >
            {error.assessmentName || error.assessmentId.slice(0, 8)}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* User */}
      <span className="flex-shrink-0 w-[120px] text-xs text-muted-foreground truncate text-right">
        {error.userName || "—"}
      </span>
    </div>
  );
}

function GroupedErrorRow({ group }: { group: GroupedError }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="pt-0.5 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>

        <div className="flex-shrink-0 w-[80px]">
          {getErrorTypeBadge(group.errorType, group.source)}
        </div>

        <p className="flex-1 text-sm truncate min-w-0" title={group.signature}>
          {group.signature}
        </p>

        <Badge variant="secondary" className="flex-shrink-0 text-xs">
          {group.count}x
        </Badge>

        <span className="flex-shrink-0 text-xs text-muted-foreground w-[130px] text-right font-mono">
          {formatTimestamp(group.lastSeen)}
        </span>

        <span className="flex-shrink-0 text-xs text-muted-foreground w-[100px] text-right">
          {group.affectedAssessments.size} assessment
          {group.affectedAssessments.size !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="bg-muted/10 border-t border-border">
          {group.errors.slice(0, 10).map((error) => (
            <ErrorRow key={error.id} error={error} />
          ))}
          {group.errors.length > 10 && (
            <p className="px-4 py-2 text-xs text-muted-foreground text-center">
              + {group.errors.length - 10} more occurrences
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------

export function ErrorDashboardClient({
  errors,
  summaryStats,
  filterOptions,
}: ErrorDashboardClientProps) {
  const [dateRange, setDateRange] = useState("7d");
  const [errorType, setErrorType] = useState("all");
  const [assessmentId, setAssessmentId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [grouped, setGrouped] = useState(false);
  const [page, setPage] = useState(1);

  // Filter errors
  const filteredErrors = useMemo(() => {
    let filtered = errors;

    // Date range filter
    const now = new Date();
    const rangeMs =
      dateRange === "24h"
        ? 24 * 60 * 60 * 1000
        : dateRange === "3d"
          ? 3 * 24 * 60 * 60 * 1000
          : 7 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() - rangeMs);
    filtered = filtered.filter((e) => new Date(e.timestamp) >= cutoff);

    // Error type filter
    if (errorType !== "all") {
      filtered = filtered.filter((e) => e.errorType === errorType);
    }

    // Assessment filter
    if (assessmentId !== "all") {
      filtered = filtered.filter((e) => e.assessmentId === assessmentId);
    }

    // User filter
    if (userId !== "all") {
      filtered = filtered.filter((e) => e.userId === userId);
    }

    return filtered;
  }, [errors, dateRange, errorType, assessmentId, userId]);

  // Group errors by signature
  const groupedErrors = useMemo(() => {
    if (!grouped) return [];

    const groups = new Map<string, GroupedError>();
    for (const error of filteredErrors) {
      const sig = getErrorSignature(error);
      const existing = groups.get(sig);
      if (existing) {
        existing.count++;
        if (error.timestamp > existing.lastSeen) {
          existing.lastSeen = error.timestamp;
        }
        if (error.assessmentId) {
          existing.affectedAssessments.add(error.assessmentId);
        }
        existing.errors.push(error);
      } else {
        groups.set(sig, {
          signature: sig,
          count: 1,
          lastSeen: error.timestamp,
          affectedAssessments: new Set(
            error.assessmentId ? [error.assessmentId] : []
          ),
          errors: [error],
          errorType: error.errorType,
          source: error.source,
        });
      }
    }

    return Array.from(groups.values()).sort((a, b) => b.count - a.count);
  }, [filteredErrors, grouped]);

  // Pagination
  const totalItems = grouped ? groupedErrors.length : filteredErrors.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedErrors = grouped
    ? groupedErrors.slice(startIdx, startIdx + PAGE_SIZE)
    : filteredErrors.slice(startIdx, startIdx + PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = (setter: (val: string) => void) => (val: string) => {
    setter(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Error Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-assessment error monitoring and analysis
        </p>
      </div>

      {/* Summary Cards */}
      <SummaryCards stats={summaryStats} />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range */}
            <Select value={dateRange} onValueChange={handleFilterChange(setDateRange)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Error Type */}
            <Select value={errorType} onValueChange={handleFilterChange(setErrorType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ERROR_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assessment */}
            <Select value={assessmentId} onValueChange={handleFilterChange(setAssessmentId)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Assessments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assessments</SelectItem>
                {filterOptions.assessments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User */}
            <Select value={userId} onValueChange={handleFilterChange(setUserId)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {filterOptions.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Group toggle */}
            <Button
              variant={grouped ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setGrouped(!grouped);
                setPage(1);
              }}
              className="gap-2"
            >
              {grouped ? (
                <Layers className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
              {grouped ? "Grouped" : "List"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        {/* Header */}
        <div className="border-b border-border px-4 py-3 bg-muted/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {filteredErrors.length} error{filteredErrors.length !== 1 ? "s" : ""} found
            </p>
            {!grouped && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="w-[130px] font-mono">Time</span>
                <span className="w-[80px]">Type</span>
                <span className="flex-1">Message</span>
                <span className="w-[140px] text-right">Assessment</span>
                <span className="w-[120px] text-right">User</span>
              </div>
            )}
          </div>
        </div>

        {/* Rows */}
        <div>
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No errors found for the selected filters.
              </p>
            </div>
          ) : grouped ? (
            (paginatedErrors as GroupedError[]).map((group) => (
              <GroupedErrorRow key={group.signature} group={group} />
            ))
          ) : (
            (paginatedErrors as SerializedError[]).map((error) => (
              <ErrorRow key={error.id} error={error} />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalItems} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
