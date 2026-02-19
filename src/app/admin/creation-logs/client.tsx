"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, Loader2, Save, AlertTriangle } from "lucide-react";

interface CreationLog {
  id: string;
  userId: string;
  status: "STARTED" | "GENERATING" | "SAVING" | "COMPLETED" | "FAILED";
  roleTitle: string | null;
  companyName: string | null;
  techStack: string[];
  seniorityLevel: string | null;
  archetypeId: string | null;
  source: string;
  scenarioId: string | null;
  failedStep: string | null;
  errorMessage: string | null;
  errorDetails: unknown;
  createdAt: Date | string;
  completedAt: Date | string | null;
  user: { name: string | null; email: string | null };
  scenario: { id: string; name: string } | null;
}

interface CreationLogsClientProps {
  logs: CreationLog[];
}

const STATUS_CONFIG = {
  STARTED: { label: "Started", icon: Clock, className: "bg-blue-500/10 text-blue-600 border-blue-200" },
  GENERATING: { label: "Generating", icon: Loader2, className: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  SAVING: { label: "Saving", icon: Save, className: "bg-purple-500/10 text-purple-600 border-purple-200" },
  COMPLETED: { label: "Completed", icon: CheckCircle, className: "bg-green-500/10 text-green-600 border-green-200" },
  FAILED: { label: "Failed", icon: XCircle, className: "bg-red-500/10 text-red-600 border-red-200" },
} as const;

const STEP_LABELS: Record<string, string> = {
  parse_jd: "Job Description Parsing",
  generate_tasks: "Task Generation",
  generate_coworkers: "Coworker Generation",
  generate_preview: "Preview Generation",
  save_scenario: "Saving Simulation",
  save_coworkers: "Saving Coworkers",
};

function formatDate(dateStr: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function formatDuration(start: Date | string, end: Date | string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function CreationLogsClient({ logs }: CreationLogsClientProps) {
  const [selectedLog, setSelectedLog] = useState<CreationLog | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredLogs = statusFilter === "all"
    ? logs
    : logs.filter((log) => log.status === statusFilter);

  const stats = {
    total: logs.length,
    completed: logs.filter((l) => l.status === "COMPLETED").length,
    failed: logs.filter((l) => l.status === "FAILED").length,
    inProgress: logs.filter((l) => ["STARTED", "GENERATING", "SAVING"].includes(l.status)).length,
  };

  const successRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div className="px-8 py-10">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold">Simulation Creation Logs</h1>
        <p className="text-muted-foreground">
          Track every simulation creation attempt — successful and failed
        </p>
      </header>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Attempts</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Successful</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold">{successRate}%</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({stats.total})</SelectItem>
            <SelectItem value="COMPLETED">Completed ({stats.completed})</SelectItem>
            <SelectItem value="FAILED">Failed ({stats.failed})</SelectItem>
            <SelectItem value="STARTED">Started ({logs.filter(l => l.status === "STARTED").length})</SelectItem>
            <SelectItem value="GENERATING">Generating ({logs.filter(l => l.status === "GENERATING").length})</SelectItem>
            <SelectItem value="SAVING">Saving ({logs.filter(l => l.status === "SAVING").length})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {statusFilter === "all"
                ? "No simulation creation attempts yet"
                : `No ${statusFilter.toLowerCase()} attempts`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">STATUS</th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">USER</th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">ROLE / COMPANY</th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">SOURCE</th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">FAILED AT</th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">DURATION</th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground">DATE</th>
                    <th className="p-4 text-left text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const config = STATUS_CONFIG[log.status];
                    const StatusIcon = config.icon;
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/50 cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="p-4">
                          <Badge variant="outline" className={config.className}>
                            <StatusIcon className={`mr-1 h-3 w-3 ${log.status === "GENERATING" ? "animate-spin" : ""}`} />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium">{log.user.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium">{log.roleTitle || "—"}</p>
                          <p className="text-xs text-muted-foreground">{log.companyName || "—"}</p>
                        </td>
                        <td className="p-4">
                          <Badge variant="secondary" className="text-xs">
                            {log.source === "jd_paste" ? "JD Paste" : "Guided"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {log.failedStep ? (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span className="text-sm text-red-600">
                                {STEP_LABELS[log.failedStep] || log.failedStep}
                              </span>
                            </div>
                          ) : log.status === "COMPLETED" ? (
                            <span className="text-sm text-muted-foreground">—</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatDuration(log.createdAt, log.completedAt)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm">
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Creation Attempt Details
                  <Badge variant="outline" className={STATUS_CONFIG[selectedLog.status].className}>
                    {STATUS_CONFIG[selectedLog.status].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {formatDate(selectedLog.createdAt)}
                  {selectedLog.completedAt && ` — ${formatDuration(selectedLog.createdAt, selectedLog.completedAt)}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* User */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">User</p>
                  <p className="text-sm">{selectedLog.user.name || "Unknown"} ({selectedLog.user.email})</p>
                </div>

                {/* Role & Company */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Role Title</p>
                    <p className="text-sm">{selectedLog.roleTitle || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Company</p>
                    <p className="text-sm">{selectedLog.companyName || "—"}</p>
                  </div>
                </div>

                {/* Tech Stack */}
                {selectedLog.techStack.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Tech Stack</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedLog.techStack.map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs">{tech}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source & Seniority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Source</p>
                    <p className="text-sm">{selectedLog.source === "jd_paste" ? "Job Description Paste" : "Guided Form"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Seniority Level</p>
                    <p className="text-sm capitalize">{selectedLog.seniorityLevel || "—"}</p>
                  </div>
                </div>

                {/* Linked Simulation */}
                {selectedLog.scenario && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Created Simulation</p>
                    <Link
                      href={`/admin/scenarios/${selectedLog.scenario.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedLog.scenario.name}
                    </Link>
                  </div>
                )}

                {/* Error Section */}
                {selectedLog.status === "FAILED" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-semibold text-red-600">Failure Details</p>
                    </div>
                    {selectedLog.failedStep && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-red-500">Failed Step</p>
                        <p className="text-sm text-red-700 dark:text-red-400">
                          {STEP_LABELS[selectedLog.failedStep] || selectedLog.failedStep}
                        </p>
                      </div>
                    )}
                    {selectedLog.errorMessage && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-red-500">Error Message</p>
                        <p className="text-sm text-red-700 dark:text-red-400">{selectedLog.errorMessage}</p>
                      </div>
                    )}
                    {selectedLog.errorDetails != null && (
                      <div>
                        <p className="text-xs font-medium text-red-500">Error Details</p>
                        <pre className="mt-1 max-h-40 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">
                          {typeof selectedLog.errorDetails === "string"
                            ? selectedLog.errorDetails
                            : JSON.stringify(selectedLog.errorDetails, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
