"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleCodeSection } from "./collapsible-code-section";
import { formatDate, formatDuration } from "./utils";
import type { TimelineEvent } from "./types";

interface ApiCallDetailsProps {
  event: TimelineEvent;
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
}

export function ApiCallDetails({
  event,
  expandedSections,
  onToggleSection,
}: ApiCallDetailsProps) {
  if (event.type !== "apiCall") return null;

  const promptSectionId = `${event.id}-prompt`;
  const responseSectionId = `${event.id}-response`;

  return (
    <div
      className="mt-4 space-y-4"
      data-testid={`api-call-details-${event.id}`}
    >
      {/* Metadata section */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">MODEL</p>
            <p className="text-sm">{event.modelVersion}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">STATUS</p>
            <p
              className={`text-sm ${
                event.isError
                  ? "text-destructive"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {event.statusCode ?? (event.isError ? "Error" : "OK")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">DURATION</p>
            <p className="text-sm">
              {event.durationMs ? formatDuration(event.durationMs) : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">TOKENS</p>
            <p className="text-sm">
              {event.promptTokens != null ? (
                <>
                  {event.promptTokens?.toLocaleString()} prompt
                  {event.responseTokens != null && (
                    <> / {event.responseTokens.toLocaleString()} response</>
                  )}
                </>
              ) : (
                "N/A"
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timestamps section */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              REQUEST TIMESTAMP
            </p>
            <p className="text-sm">{formatDate(event.timestamp)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              RESPONSE TIMESTAMP
            </p>
            <p className="text-sm">
              {event.responseTimestamp
                ? formatDate(event.responseTimestamp)
                : "N/A"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prompt section */}
      {event.promptText && (
        <CollapsibleCodeSection
          title="Prompt Text"
          content={event.promptText}
          isExpanded={expandedSections.has(promptSectionId)}
          onToggle={() => onToggleSection(promptSectionId)}
          copyLabel="Prompt"
          testIdPrefix={`prompt-${event.id}`}
        />
      )}

      {/* Response section */}
      {event.responseText && (
        <CollapsibleCodeSection
          title="Response JSON"
          content={event.responseText}
          isExpanded={expandedSections.has(responseSectionId)}
          onToggle={() => onToggleSection(responseSectionId)}
          copyLabel="Response"
          testIdPrefix={`response-${event.id}`}
        />
      )}

      {/* Error section (if applicable) */}
      {event.isError && (event.errorMessage || event.stackTrace) && (
        <Card className="border-destructive bg-destructive/10">
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
              <div>
                <p className="mb-1 text-xs font-medium text-destructive">
                  STACK TRACE
                </p>
                <pre className="max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/5 p-2 font-mono text-xs text-destructive">
                  {event.stackTrace}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
