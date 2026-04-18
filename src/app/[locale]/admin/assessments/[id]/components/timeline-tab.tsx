"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ChatMessage } from "@/types";
import { ApiCallDetails } from "./api-call-details";
import {
  formatDuration,
  formatTime,
  calculateDurationBetweenEvents,
  getEventIcon,
  getTimelineEventColor,
  EVENT_TYPE_LABELS,
  CANDIDATE_EVENT_LABELS,
} from "./utils";
import type {
  TimelineEvent,
  SerializedAssessment,
  SerializedClientError,
  SerializedCandidateEvent,
} from "./types";

interface TimelineTabProps {
  assessment: SerializedAssessment;
  clientErrors: SerializedClientError[];
  candidateEvents: SerializedCandidateEvent[];
}

/**
 * Build a unified timeline from all data sources:
 * - AssessmentLog (milestones, system events)
 * - AssessmentApiCall (API calls)
 * - Conversation (text conversations, grouped)
 * - VoiceSession (voice conversations)
 * - ClientError (client-side errors)
 * - CandidateEvent (tab switches, idle periods, etc.)
 */
function buildUnifiedTimeline(
  assessment: SerializedAssessment,
  clientErrors: SerializedClientError[],
  candidateEvents: SerializedCandidateEvent[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Assessment logs
  for (const log of assessment.logs) {
    events.push({
      id: log.id,
      type: "log",
      timestamp: log.timestamp,
      eventType: log.eventType,
      durationMs: log.durationMs,
      isError: log.eventType === "ERROR",
      metadata: log.metadata,
    });
  }

  // 2. API calls
  for (const call of assessment.apiCalls) {
    events.push({
      id: call.id,
      type: "apiCall",
      timestamp: call.requestTimestamp,
      modelVersion: call.modelVersion,
      durationMs: call.durationMs,
      isError: call.errorMessage !== null,
      errorMessage: call.errorMessage,
      stackTrace: call.stackTrace,
      statusCode: call.statusCode,
      promptTokens: call.promptTokens,
      responseTokens: call.responseTokens,
      promptText: call.promptText,
      responseText: call.responseText,
      responseTimestamp: call.responseTimestamp,
    });
  }

  // 3. Conversations (grouped — one timeline entry per conversation)
  for (const conv of assessment.conversations) {
    const transcript = (conv.transcript as ChatMessage[]) ?? [];
    const firstMessageTime = transcript[0]?.timestamp ?? conv.createdAt;
    events.push({
      id: `conv-${conv.id}`,
      type: "conversation",
      timestamp: typeof firstMessageTime === "string" ? firstMessageTime : conv.createdAt,
      durationMs: null,
      isError: false,
      coworkerName: conv.coworker?.name ?? "Unknown",
      coworkerRole: conv.coworker?.role ?? "Unknown",
      messageCount: transcript.length,
      conversationType: conv.type,
    });
  }

  // 4. Voice sessions
  for (const vs of assessment.voiceSessions) {
    events.push({
      id: `voice-${vs.id}`,
      type: "voiceSession",
      timestamp: vs.startTime,
      durationMs: vs.durationMs,
      isError: vs.errorMessage !== null,
      errorMessage: vs.errorMessage,
      coworkerName: vs.coworker?.name ?? "Unknown",
      coworkerRole: vs.coworker?.role ?? "Unknown",
    });
  }

  // 5. Client errors
  for (const err of clientErrors) {
    events.push({
      id: `cerr-${err.id}`,
      type: "clientError",
      timestamp: err.timestamp,
      durationMs: null,
      isError: true,
      errorMessage: err.message,
      stackTrace: err.stackTrace,
      clientErrorType: err.errorType,
      componentName: err.componentName,
      url: err.url,
      metadata: err.metadata,
    });
  }

  // 6. Candidate events
  for (const evt of candidateEvents) {
    events.push({
      id: `cevt-${evt.id}`,
      type: "candidateEvent",
      timestamp: evt.timestamp,
      durationMs: null,
      isError: false,
      candidateEventType: evt.eventType,
      metadata: evt.metadata,
    });
  }

  // Sort chronologically
  events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return events;
}

/**
 * Calculate elapsed time markers along the timeline axis.
 * Returns positions (as event indices) where 5-minute markers should appear.
 */
function getElapsedTimeMarkers(
  events: TimelineEvent[],
  startTime: string
): { afterIndex: number; label: string }[] {
  if (events.length === 0) return [];

  const startMs = new Date(startTime).getTime();
  const markers: { afterIndex: number; label: string }[] = [];
  const intervalMs = 5 * 60 * 1000; // 5 minutes

  // Find total duration
  const lastEventMs = new Date(events[events.length - 1].timestamp).getTime();
  const totalMs = lastEventMs - startMs;

  // Generate markers at 5-minute intervals
  for (let elapsed = intervalMs; elapsed <= totalMs; elapsed += intervalMs) {
    const targetMs = startMs + elapsed;
    // Find the event index just before this marker
    let afterIndex = -1;
    for (let i = 0; i < events.length; i++) {
      if (new Date(events[i].timestamp).getTime() <= targetMs) {
        afterIndex = i;
      } else {
        break;
      }
    }
    if (afterIndex >= 0) {
      const minutes = Math.round(elapsed / 60000);
      markers.push({ afterIndex, label: `${minutes} min` });
    }
  }

  // Deduplicate markers at same index (keep latest)
  const deduped = new Map<number, string>();
  for (const m of markers) {
    deduped.set(m.afterIndex, m.label);
  }
  return Array.from(deduped.entries()).map(([afterIndex, label]) => ({
    afterIndex,
    label,
  }));
}

// Get the description for a timeline event
function getEventDescription(event: TimelineEvent): string {
  switch (event.type) {
    case "log":
      return event.eventType
        ? EVENT_TYPE_LABELS[event.eventType] ?? event.eventType
        : "System Event";
    case "apiCall":
      return `API Call${event.modelVersion ? ` — ${event.modelVersion}` : ""}`;
    case "conversation":
      return `Chat with ${event.coworkerName}${event.messageCount ? ` (${event.messageCount} messages)` : ""}`;
    case "voiceSession":
      return `Voice call with ${event.coworkerName}`;
    case "clientError":
      return event.errorMessage
        ? event.errorMessage.length > 80
          ? event.errorMessage.slice(0, 80) + "…"
          : event.errorMessage
        : "Client Error";
    case "candidateEvent":
      return (
        CANDIDATE_EVENT_LABELS[event.candidateEventType ?? ""] ??
        event.candidateEventType ??
        "Candidate Event"
      );
    default:
      return "Event";
  }
}

// Get the type badge for color-coding
function TypeBadge({ event }: { event: TimelineEvent }) {
  const color = getTimelineEventColor(event);

  const badgeClasses: Record<string, string> = {
    Milestone: "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    Error: "border-destructive bg-destructive/10 text-destructive",
    Conversation: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    "API Call": "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    Candidate: "border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    System: "border-muted bg-muted/50 text-muted-foreground",
  };

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium ${badgeClasses[color.label] ?? ""}`}
    >
      {color.label}
    </Badge>
  );
}

export function TimelineTab({
  assessment,
  clientErrors,
  candidateEvents,
}: TimelineTabProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedCodeSections, setExpandedCodeSections] = useState<Set<string>>(
    new Set()
  );

  const events = useMemo(
    () => buildUnifiedTimeline(assessment, clientErrors, candidateEvents),
    [assessment, clientErrors, candidateEvents]
  );

  const elapsedMarkers = useMemo(
    () => getElapsedTimeMarkers(events, assessment.startedAt),
    [events, assessment.startedAt]
  );

  // Build a set of indices that have markers after them
  const markerMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of elapsedMarkers) {
      map.set(m.afterIndex, m.label);
    }
    return map;
  }, [elapsedMarkers]);

  const toggleExpansion = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCodeSection = (sectionId: string) => {
    setExpandedCodeSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Count by type for summary
  const counts = useMemo(() => {
    const c = { log: 0, apiCall: 0, conversation: 0, voiceSession: 0, clientError: 0, candidateEvent: 0 };
    for (const e of events) c[e.type]++;
    return c;
  }, [events]);

  return (
    <Card data-testid="timeline-tab">
      {/* Summary header */}
      <div className="border-b border-border bg-muted/10 p-4">
        <h2 className="mb-3 text-xs font-medium text-muted-foreground">
          UNIFIED TIMELINE ({events.length} events)
        </h2>
        <div className="flex flex-wrap gap-2">
          {counts.log > 0 && (
            <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
              {counts.log} System
            </Badge>
          )}
          {(counts.conversation + counts.voiceSession) > 0 && (
            <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {counts.conversation + counts.voiceSession} Conversations
            </Badge>
          )}
          {counts.apiCall > 0 && (
            <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              {counts.apiCall} API Calls
            </Badge>
          )}
          {counts.clientError > 0 && (
            <Badge variant="outline" className="border-destructive bg-destructive/10 text-destructive">
              {counts.clientError} Errors
            </Badge>
          )}
          {counts.candidateEvent > 0 && (
            <Badge variant="outline" className="border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {counts.candidateEvent} Candidate Events
            </Badge>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          No events recorded for this assessment
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute bottom-0 left-8 top-0 w-0.5 bg-border" />

          {events.map((event, index) => {
            const previousEvent = index > 0 ? events[index - 1] : null;
            const durationFromPrevious = previousEvent
              ? calculateDurationBetweenEvents(
                  event.timestamp,
                  previousEvent.timestamp
                )
              : null;

            const isExpanded = expandedItems.has(event.id);
            const hasExpandableContent = getHasExpandableContent(event);
            const IconComponent = getEventIcon(event);
            const colors = getTimelineEventColor(event);
            const elapsedMarker = markerMap.get(index);

            return (
              <div key={event.id}>
                {/* Elapsed time marker */}
                {elapsedMarker && (
                  <div
                    className="relative flex items-center py-1 pl-4 pr-4"
                    data-testid={`elapsed-marker-${index}`}
                  >
                    <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="ml-4 flex-1 border-t border-dashed border-primary/30" />
                    <Badge className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">
                      {elapsedMarker}
                    </Badge>
                  </div>
                )}

                {/* Duration gap marker */}
                {durationFromPrevious !== null && durationFromPrevious > 30000 && (
                  <div className="relative py-1 pl-16 pr-4" data-testid={`duration-marker-${event.id}`}>
                    <Badge
                      variant="outline"
                      className="border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    >
                      +{formatDuration(durationFromPrevious)}
                    </Badge>
                  </div>
                )}

                {/* Event card */}
                <div data-testid={`timeline-event-${event.id}`}>
                <div
                  className={`relative flex items-start gap-4 p-4 transition-colors ${colors.bg} ${
                    hasExpandableContent ? "cursor-pointer hover:bg-muted/30" : ""
                  }`}
                  onClick={() => {
                    if (hasExpandableContent) toggleExpansion(event.id);
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${colors.dot}`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </div>

                  {/* Event content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold">
                          <span className="truncate">
                            {getEventDescription(event)}
                          </span>
                          {hasExpandableContent && (
                            <span className="flex-shrink-0 text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </p>
                        {/* Subtitle details */}
                        {event.type === "conversation" && event.coworkerRole && (
                          <p className="text-xs text-muted-foreground">
                            {event.coworkerRole} — {event.conversationType ?? "text"}
                          </p>
                        )}
                        {event.type === "voiceSession" && event.coworkerRole && (
                          <p className="text-xs text-muted-foreground">
                            {event.coworkerRole} — voice
                          </p>
                        )}
                        {event.type === "apiCall" && event.modelVersion && (
                          <p className="text-xs text-muted-foreground">
                            Model: {event.modelVersion}
                          </p>
                        )}
                        {event.type === "clientError" && event.componentName && (
                          <p className="text-xs text-muted-foreground">
                            Component: {event.componentName}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(event.timestamp)}
                        </p>
                        <TypeBadge event={event} />
                        {event.durationMs != null && event.durationMs > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(event.durationMs)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* API call inline details */}
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

                    {/* Expanded content */}
                    {isExpanded && renderExpandedContent(event, expandedCodeSections, toggleCodeSection)}
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function getHasExpandableContent(event: TimelineEvent): boolean {
  switch (event.type) {
    case "apiCall":
      return Boolean(event.promptText || event.responseText);
    case "log":
      return (
        event.isError &&
        Boolean(event.errorMessage || event.stackTrace || event.metadata)
      );
    case "clientError":
      return Boolean(event.errorMessage || event.stackTrace || event.metadata);
    case "candidateEvent":
      return event.metadata != null;
    default:
      return false;
  }
}

function renderExpandedContent(
  event: TimelineEvent,
  expandedCodeSections: Set<string>,
  toggleCodeSection: (id: string) => void
) {
  switch (event.type) {
    case "apiCall":
      return (
        <ApiCallDetails
          event={event}
          expandedSections={expandedCodeSections}
          onToggleSection={toggleCodeSection}
        />
      );
    case "log":
      if (!event.isError) return null;
      return (
        <Card className="mt-4 border-destructive bg-destructive/10" data-testid={`error-details-${event.id}`}>
          <CardContent className="p-4">
            {event.errorMessage && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-destructive">ERROR MESSAGE</p>
                <p className="text-sm text-destructive">{event.errorMessage}</p>
              </div>
            )}
            {event.stackTrace && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-destructive">STACK TRACE</p>
                <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
                  {event.stackTrace}
                </pre>
              </div>
            )}
            {event.metadata != null && (
              <div>
                <p className="mb-1 text-xs font-medium text-destructive">METADATA</p>
                <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      );
    case "clientError":
      return (
        <Card className="mt-4 border-destructive bg-destructive/10" data-testid={`client-error-details-${event.id}`}>
          <CardContent className="p-4">
            {event.clientErrorType && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-destructive">ERROR TYPE</p>
                <Badge variant="destructive" className="text-xs">{event.clientErrorType}</Badge>
              </div>
            )}
            {event.errorMessage && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-destructive">MESSAGE</p>
                <p className="text-sm text-destructive">{event.errorMessage}</p>
              </div>
            )}
            {event.url && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-destructive">URL</p>
                <p className="text-sm text-muted-foreground">{event.url}</p>
              </div>
            )}
            {event.stackTrace && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-destructive">STACK TRACE</p>
                <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
                  {event.stackTrace}
                </pre>
              </div>
            )}
            {event.metadata != null && (
              <div>
                <p className="mb-1 text-xs font-medium text-destructive">METADATA</p>
                <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      );
    case "candidateEvent":
      if (event.metadata == null) return null;
      return (
        <Card className="mt-4 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" data-testid={`candidate-event-details-${event.id}`}>
          <CardContent className="p-4">
            <p className="mb-1 text-xs font-medium text-muted-foreground">METADATA</p>
            <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border bg-white p-2 font-mono text-xs dark:bg-gray-800">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    default:
      return null;
  }
}
