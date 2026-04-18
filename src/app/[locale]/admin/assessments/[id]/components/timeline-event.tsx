"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiCallDetails } from "./api-call-details";
import {
  formatDuration,
  formatTime,
  getEventIcon,
  EVENT_TYPE_LABELS,
} from "./utils";
import type { TimelineEvent as TimelineEventType } from "./types";

interface TimelineEventProps {
  event: TimelineEventType;
  index: number;
  durationFromPrevious: number | null;
  isErrorExpanded: boolean;
  isApiCallExpanded: boolean;
  expandedCodeSections: Set<string>;
  onToggleErrorExpansion: (id: string) => void;
  onToggleApiCallExpansion: (id: string) => void;
  onToggleCodeSection: (sectionId: string) => void;
}

export function TimelineEvent({
  event,
  index,
  durationFromPrevious,
  isErrorExpanded,
  isApiCallExpanded,
  expandedCodeSections,
  onToggleErrorExpansion,
  onToggleApiCallExpansion,
  onToggleCodeSection,
}: TimelineEventProps) {
  const hasExpandableErrorContent =
    event.isError &&
    Boolean(event.errorMessage || event.stackTrace || event.metadata);
  const hasExpandableApiContent =
    event.type === "apiCall" &&
    Boolean(event.promptText || event.responseText);
  const hasExpandableContent =
    hasExpandableErrorContent || hasExpandableApiContent;
  const isExpanded =
    event.type === "apiCall" ? isApiCallExpanded : isErrorExpanded;

  const IconComponent = getEventIcon(event);

  return (
    <div className="relative" data-testid={`timeline-event-${event.id}`}>
      {/* Duration marker between events */}
      {durationFromPrevious !== null && durationFromPrevious > 0 && (
        <div
          className="relative py-2 pl-16 pr-4"
          data-testid={`duration-marker-${event.id}`}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className={
                durationFromPrevious > 30000
                  ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : ""
              }
            >
              +{formatDuration(durationFromPrevious)}
            </Badge>
          </div>
        </div>
      )}

      {/* Event card */}
      <div
        className={`relative flex items-start gap-4 p-4 transition-colors ${
          event.isError
            ? "bg-destructive/5"
            : index % 2 === 0
              ? ""
              : "bg-muted/10"
        } ${hasExpandableContent ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={() => {
          if (event.type === "apiCall" && hasExpandableApiContent) {
            onToggleApiCallExpansion(event.id);
          } else if (hasExpandableErrorContent) {
            onToggleErrorExpansion(event.id);
          }
        }}
      >
        {/* Timeline dot */}
        <div
          className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
            event.isError
              ? "bg-destructive/20 text-destructive"
              : event.eventType === "COMPLETED"
                ? "bg-green-500/20 text-green-600"
                : "bg-muted"
          }`}
        >
          <IconComponent className="h-4 w-4" />
        </div>

        {/* Event content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                {event.type === "log" && event.eventType
                  ? EVENT_TYPE_LABELS[event.eventType]
                  : event.type === "apiCall"
                    ? "API Call"
                    : "Event"}
                {hasExpandableContent && (
                  <span className="text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                )}
              </p>
              {event.type === "apiCall" && event.modelVersion && (
                <p className="text-xs text-muted-foreground">
                  Model: {event.modelVersion}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-muted-foreground">
                {formatTime(event.timestamp)}
              </p>
              {event.durationMs !== null && event.durationMs > 0 && (
                <p className="text-xs text-muted-foreground">
                  Duration: {formatDuration(event.durationMs)}
                </p>
              )}
            </div>
          </div>

          {/* API call details */}
          {event.type === "apiCall" && (
            <div className="mt-2 flex items-center gap-4 text-xs">
              {event.promptTokens != null && event.responseTokens != null && (
                <span className="text-muted-foreground">
                  Tokens:{" "}
                  {(
                    (event.promptTokens ?? 0) + (event.responseTokens ?? 0)
                  ).toLocaleString()}
                </span>
              )}
              <Badge
                variant={event.isError ? "destructive" : "default"}
                className={
                  !event.isError
                    ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    : ""
                }
              >
                {event.isError
                  ? "Error"
                  : event.statusCode
                    ? `Status: ${event.statusCode}`
                    : "OK"}
              </Badge>
            </div>
          )}

          {/* Expandable error content (for log events with errors) */}
          {isErrorExpanded && hasExpandableErrorContent && event.type === "log" && (
            <Card
              className="mt-4 border-destructive bg-destructive/10"
              data-testid={`error-details-${event.id}`}
            >
              <CardContent className="p-4">
                {event.errorMessage && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-destructive">
                      ERROR MESSAGE
                    </p>
                    <p className="text-sm text-destructive">
                      {event.errorMessage}
                    </p>
                  </div>
                )}
                {event.stackTrace && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-destructive">
                      STACK TRACE
                    </p>
                    <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
                      {event.stackTrace}
                    </pre>
                  </div>
                )}
                {event.metadata != null && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-destructive">
                      METADATA
                    </p>
                    <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Expandable API call details */}
          {isApiCallExpanded && event.type === "apiCall" && (
            <ApiCallDetails
              event={event}
              expandedSections={expandedCodeSections}
              onToggleSection={onToggleCodeSection}
            />
          )}
        </div>
      </div>
    </div>
  );
}
