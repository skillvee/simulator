"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Server,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCodeSection } from "./collapsible-code-section";
import { CopyButton } from "./copy-button";
import { formatDate, formatTime, formatDuration } from "./utils";
import type { SerializedApiCall } from "./types";

interface ApiCallsTabProps {
  apiCalls: SerializedApiCall[];
}

export function ApiCallsTab({ apiCalls }: ApiCallsTabProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedCodeSections, setExpandedCodeSections] = useState<Set<string>>(
    new Set()
  );

  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  const toggleCodeSection = (sectionId: string) => {
    setExpandedCodeSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Summary stats
  const totalCalls = apiCalls.length;
  const failedCalls = apiCalls.filter((c) => c.errorMessage !== null).length;
  const totalPromptTokens = apiCalls.reduce(
    (sum, c) => sum + (c.promptTokens ?? 0),
    0
  );
  const totalResponseTokens = apiCalls.reduce(
    (sum, c) => sum + (c.responseTokens ?? 0),
    0
  );
  const avgDuration =
    totalCalls > 0
      ? Math.round(
          apiCalls.reduce((sum, c) => sum + (c.durationMs ?? 0), 0) /
            totalCalls
        )
      : 0;

  if (totalCalls === 0) {
    return (
      <Card data-testid="api-calls-tab">
        <CardContent className="p-12 text-center">
          <Server className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            No API calls recorded for this assessment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="api-calls-tab">
      {/* Summary Card */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 md:grid-cols-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              TOTAL CALLS
            </p>
            <p className="text-2xl font-semibold">{totalCalls}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">FAILED</p>
            <p
              className={`text-2xl font-semibold ${failedCalls > 0 ? "text-destructive" : "text-green-600"}`}
            >
              {failedCalls}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              AVG DURATION
            </p>
            <p className="text-2xl font-semibold">
              {formatDuration(avgDuration)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              PROMPT TOKENS
            </p>
            <p className="text-2xl font-semibold">
              {totalPromptTokens.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              RESPONSE TOKENS
            </p>
            <p className="text-2xl font-semibold">
              {totalResponseTokens.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="border-b border-border bg-muted/10 p-4">
          <h2 className="text-xs font-medium text-muted-foreground">
            API CALL LOG ({totalCalls} calls)
          </h2>
        </div>

        {/* Table Header */}
        <div className="hidden border-b border-border bg-muted/5 px-4 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[1fr_1fr_1fr_80px_80px_100px]">
          <span>TIMESTAMP</span>
          <span>PROMPT TYPE</span>
          <span>MODEL</span>
          <span>STATUS</span>
          <span>DURATION</span>
          <span>TOKENS</span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {apiCalls.map((call) => {
            const isExpanded = expandedRow === call.id;
            const isError = call.errorMessage !== null;
            const promptSectionId = `inspector-${call.id}-prompt`;
            const responseSectionId = `inspector-${call.id}-response`;

            return (
              <div key={call.id} data-testid={`api-call-row-${call.id}`}>
                {/* Row */}
                <div
                  className={`cursor-pointer px-4 py-3 transition-colors hover:bg-muted/30 ${
                    isExpanded ? "bg-muted/20" : ""
                  } ${isError ? "border-l-2 border-l-destructive" : ""}`}
                  onClick={() => toggleRow(call.id)}
                  data-testid={`api-call-trigger-${call.id}`}
                >
                  {/* Mobile layout */}
                  <div className="flex items-center gap-3 md:hidden">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {call.promptType ?? "unknown"}
                        </span>
                        {isError ? (
                          <Badge variant="destructive" className="text-xs">
                            {call.statusCode ?? "Error"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-green-500/10 text-xs text-green-600"
                          >
                            {call.statusCode ?? "OK"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(call.requestTimestamp)} ·{" "}
                        {call.modelVersion} ·{" "}
                        {call.durationMs
                          ? formatDuration(call.durationMs)
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden items-center md:grid md:grid-cols-[1fr_1fr_1fr_80px_80px_100px]">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm">
                        {formatTime(call.requestTimestamp)}
                      </span>
                    </div>
                    <span className="truncate text-sm">
                      {call.promptType ?? "—"}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {call.modelVersion}
                    </span>
                    <span>
                      {isError ? (
                        <Badge variant="destructive" className="text-xs">
                          {call.statusCode ?? "Err"}
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-xs text-green-600"
                        >
                          {call.statusCode ?? "OK"}
                        </Badge>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {call.durationMs
                        ? formatDuration(call.durationMs)
                        : "—"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {call.promptTokens != null
                        ? `${call.promptTokens.toLocaleString()} + ${(call.responseTokens ?? 0).toLocaleString()}`
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Expanded Detail View */}
                {isExpanded && (
                  <div
                    className="border-t border-border bg-muted/10 p-4"
                    data-testid={`api-call-detail-${call.id}`}
                  >
                    {/* Error section - prominent */}
                    {isError && (call.errorMessage || call.stackTrace) && (
                      <Card className="mb-4 border-destructive bg-destructive/10">
                        <CardContent className="p-4">
                          {call.errorMessage && (
                            <div className="mb-3">
                              <p className="mb-1 text-xs font-medium text-destructive">
                                ERROR MESSAGE
                              </p>
                              <p className="text-sm font-medium text-destructive">
                                {call.errorMessage}
                              </p>
                            </div>
                          )}
                          {call.stackTrace && (
                            <div>
                              <p className="mb-1 text-xs font-medium text-destructive">
                                STACK TRACE
                              </p>
                              <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
                                {call.stackTrace}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Metadata bar */}
                    <Card className="mb-4">
                      <CardContent className="grid grid-cols-2 gap-4 p-4 md:grid-cols-5">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            MODEL VERSION
                          </p>
                          <p className="text-sm">{call.modelVersion}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            PROMPT TYPE
                          </p>
                          <p className="text-sm">
                            {call.promptType ?? "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            PROMPT VERSION
                          </p>
                          <p className="text-sm">
                            {call.promptVersion ?? "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            TRACE ID
                          </p>
                          <p
                            className="truncate text-sm font-mono"
                            title={call.traceId ?? call.id}
                          >
                            {(call.traceId ?? call.id).slice(0, 16)}...
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            TOTAL TOKENS
                          </p>
                          <p className="text-sm">
                            {call.promptTokens != null ||
                            call.responseTokens != null
                              ? (
                                  (call.promptTokens ?? 0) +
                                  (call.responseTokens ?? 0)
                                ).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Timestamps */}
                    <Card className="mb-4">
                      <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            REQUEST
                          </p>
                          <p className="text-sm">
                            {formatDate(call.requestTimestamp)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            RESPONSE
                          </p>
                          <p className="text-sm">
                            {call.responseTimestamp
                              ? formatDate(call.responseTimestamp)
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            DURATION
                          </p>
                          <p className="text-sm">
                            {call.durationMs
                              ? formatDuration(call.durationMs)
                              : "N/A"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Prompt & Response side-by-side on desktop, stacked on mobile */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Prompt panel */}
                      <CollapsibleCodeSection
                        title="Prompt Text"
                        content={call.promptText}
                        isExpanded={expandedCodeSections.has(promptSectionId)}
                        onToggle={() => toggleCodeSection(promptSectionId)}
                        copyLabel="Prompt"
                        testIdPrefix={`inspector-prompt-${call.id}`}
                      />

                      {/* Response panel */}
                      {call.responseText ? (
                        <CollapsibleCodeSection
                          title="Response Text"
                          content={call.responseText}
                          isExpanded={expandedCodeSections.has(
                            responseSectionId
                          )}
                          onToggle={() => toggleCodeSection(responseSectionId)}
                          copyLabel="Response"
                          testIdPrefix={`inspector-response-${call.id}`}
                        />
                      ) : (
                        <Card className="flex items-center justify-center p-8">
                          <p className="text-sm text-muted-foreground">
                            No response data
                          </p>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
