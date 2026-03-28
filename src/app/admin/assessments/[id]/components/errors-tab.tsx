"use client";

import { useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  Server,
  FileWarning,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SerializedClientError, SerializedApiCall, ErrorEntry } from "./types";
import { formatDate, formatTime } from "./utils";

interface ErrorsTabProps {
  clientErrors: SerializedClientError[];
  apiCalls: SerializedApiCall[];
}

/** Error types that are not actionable — dev/framework noise */
const NOISE_ERROR_TYPES = new Set(["CONSOLE_LOG", "CONSOLE_WARN"]);

function isNoiseEntry(entry: ErrorEntry): boolean {
  return entry.source === "client" && NOISE_ERROR_TYPES.has(entry.errorType);
}

function buildErrorEntries(
  clientErrors: SerializedClientError[],
  apiCalls: SerializedApiCall[]
): ErrorEntry[] {
  const entries: ErrorEntry[] = [];

  for (const err of clientErrors) {
    entries.push({
      source: "client",
      id: err.id,
      timestamp: err.timestamp,
      message: err.message,
      stackTrace: err.stackTrace,
      errorType: err.errorType,
      componentName: err.componentName,
      url: err.url,
      metadata: err.metadata,
    });
  }

  for (const call of apiCalls) {
    if (call.errorMessage) {
      entries.push({
        source: "api",
        id: call.id,
        timestamp: call.requestTimestamp,
        message: call.errorMessage,
        stackTrace: call.stackTrace,
        endpoint: null, // AssessmentApiCall doesn't have endpoint field
        statusCode: call.statusCode,
        modelVersion: call.modelVersion,
        promptType: call.promptType,
      });
    }
  }

  entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return entries;
}

function getSourceBadge(entry: ErrorEntry) {
  if (entry.source === "client") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300"
      >
        <Globe className="h-3 w-3" />
        Client
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300"
    >
      <Server className="h-3 w-3" />
      API
    </Badge>
  );
}

function getErrorTypeBadge(entry: ErrorEntry) {
  if (entry.source === "client") {
    const labels: Record<string, string> = {
      UNHANDLED_EXCEPTION: "Unhandled Exception",
      CONSOLE_ERROR: "Console Error",
      CONSOLE_WARN: "Console Warn",
      CONSOLE_LOG: "Console Log",
      REACT_BOUNDARY: "React Boundary",
    };
    return (
      <Badge variant="secondary" className="text-xs">
        {labels[entry.errorType] ?? entry.errorType}
      </Badge>
    );
  }
  if (entry.statusCode) {
    return (
      <Badge variant="destructive" className="text-xs">
        HTTP {entry.statusCode}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-xs">
      Gemini Error
    </Badge>
  );
}

function ErrorItem({ entry }: { entry: ErrorEntry }) {
  const [expanded, setExpanded] = useState(false);
  const noise = isNoiseEntry(entry);

  return (
    <div
      className={`border-b border-border last:border-b-0 ${noise ? "opacity-50" : ""}`}
      data-testid={`error-entry-${entry.id}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>

        <div className="flex-shrink-0">
          <AlertCircle className={`h-5 w-5 ${noise ? "text-muted-foreground" : "text-destructive"}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatTime(entry.timestamp)}
            </span>
            {getSourceBadge(entry)}
            {getErrorTypeBadge(entry)}
          </div>
          <p className="truncate text-sm font-medium">{entry.message}</p>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-12 py-4">
          <div className="space-y-3">
            {/* Timestamp */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                TIMESTAMP
              </p>
              <p className="text-sm">{formatDate(entry.timestamp)}</p>
            </div>

            {/* Source-specific details */}
            {entry.source === "client" && (
              <>
                {entry.componentName && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      COMPONENT
                    </p>
                    <p className="text-sm font-mono">{entry.componentName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    URL
                  </p>
                  <p className="break-all text-sm font-mono">{entry.url}</p>
                </div>
                {entry.metadata && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      BROWSER METADATA
                    </p>
                    <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}

            {entry.source === "api" && (
              <>
                {entry.statusCode && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      STATUS CODE
                    </p>
                    <p className="text-sm font-mono">{entry.statusCode}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    MODEL VERSION
                  </p>
                  <p className="text-sm font-mono">{entry.modelVersion}</p>
                </div>
                {entry.promptType && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      PROMPT TYPE
                    </p>
                    <p className="text-sm font-mono">{entry.promptType}</p>
                  </div>
                )}
              </>
            )}

            {/* Stack trace */}
            {entry.stackTrace && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  STACK TRACE
                </p>
                <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {entry.stackTrace}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorsTab({ clientErrors, apiCalls }: ErrorsTabProps) {
  const entries = buildErrorEntries(clientErrors, apiCalls);

  if (entries.length === 0) {
    return (
      <Card data-testid="errors-empty-state">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <FileWarning className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-medium">No errors recorded</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This assessment completed without any tracked errors.
          </p>
        </div>
      </Card>
    );
  }

  const actionableCount = entries.filter((e) => !isNoiseEntry(e)).length;
  const noiseCount = entries.length - actionableCount;

  return (
    <Card data-testid="errors-tab">
      <div className="border-b border-border bg-muted/10 p-4">
        <h2 className="text-xs font-medium text-muted-foreground">
          ERRORS ({actionableCount} actionable{noiseCount > 0 ? `, ${noiseCount} noise` : ""})
        </h2>
      </div>
      <div>
        {entries.map((entry) => (
          <ErrorItem key={entry.id} entry={entry} />
        ))}
      </div>
    </Card>
  );
}
