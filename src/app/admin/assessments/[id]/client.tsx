"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  Timer,
  Video,
  Play,
  RefreshCw,
  Loader2,
  MessageSquare,
  Clock,
  AlertTriangle,
  Server,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type SerializedAssessment,
  type SerializedClientError,
  type TimelineEvent,
  type Toast,
  formatDuration,
  formatDate,
  calculateDurationBetweenEvents,
  CandidateInfoCard,
  ConfirmationDialog,
  ToastNotification,
  TimelineEventItem,
  ConversationsTab,
  ErrorsTab,
  ApiCallsTab,
} from "./components";

// Re-export formatDuration for backwards compatibility (used in tests)
export { formatDuration } from "./components";

interface AssessmentTimelineClientProps {
  assessment: SerializedAssessment;
  clientErrors: SerializedClientError[];
}

export function AssessmentTimelineClient({
  assessment,
  clientErrors,
}: AssessmentTimelineClientProps) {
  const router = useRouter();
  // Track expanded API call events (for showing details)
  const [expandedApiCalls, setExpandedApiCalls] = useState<Set<string>>(
    new Set()
  );
  // Track expanded code sections within API call details (prompt/response)
  const [expandedCodeSections, setExpandedCodeSections] = useState<Set<string>>(
    new Set()
  );
  // Track expanded error details (existing functionality)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  // Retry assessment state
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Build unified timeline from logs and API calls
  const timelineEvents: TimelineEvent[] = [
    ...assessment.logs.map((log) => ({
      id: log.id,
      type: "log" as const,
      timestamp: log.timestamp,
      eventType: log.eventType,
      durationMs: log.durationMs,
      isError: log.eventType === "ERROR",
      metadata: log.metadata,
    })),
    ...assessment.apiCalls.map((call) => ({
      id: call.id,
      type: "apiCall" as const,
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
    })),
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Calculate total duration
  const totalDurationMs =
    assessment.completedAt && assessment.startedAt
      ? new Date(assessment.completedAt).getTime() -
        new Date(assessment.startedAt).getTime()
      : null;

  // Check if assessment has errors
  const hasErrors = timelineEvents.some((e) => e.isError);

  // Total error count for the Errors tab badge
  const apiErrorCount = assessment.apiCalls.filter(
    (c) => c.errorMessage !== null
  ).length;
  const totalErrorCount = clientErrors.length + apiErrorCount;

  // Get screen recording
  const screenRecording = assessment.recordings.find(
    (r) => r.type === "screen"
  );

  // Toggle error expansion
  const toggleErrorExpansion = (id: string) => {
    setExpandedErrors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle API call details expansion
  const toggleApiCallExpansion = (id: string) => {
    setExpandedApiCalls((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle code section expansion (prompt/response within API call details)
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

  // Add toast helper
  const addToast = (message: string, type: Toast["type"]) => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Dismiss toast helper
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Handle retry assessment
  const handleRetryAssessment = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch("/api/admin/assessment/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: assessment.id }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to retry assessment");
      }

      addToast("Reassessment queued successfully", "success");
      setShowRetryDialog(false);

      // Navigate to the new assessment after a short delay
      setTimeout(() => {
        router.push(`/admin/assessments/${data.newAssessmentId}`);
      }, 1500);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to retry assessment",
        "error"
      );
    } finally {
      setIsRetrying(false);
    }
  };

  // Check if assessment can be retried
  const canRetry =
    (assessment.status === "COMPLETED" || hasErrors) &&
    !assessment.supersededBy;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Header with back link */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/admin/assessments" data-testid="back-link">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assessments
        </Link>
      </Button>

      <h1 className="mb-8 text-3xl font-semibold">Assessment Timeline</h1>

      {/* Candidate Info Card */}
      <CandidateInfoCard
        userName={assessment.user.name}
        userEmail={assessment.user.email}
        completedAt={assessment.completedAt}
      />

      {/* Total Duration Card */}
      <Card
        className={`mb-8 ${hasErrors ? "border-destructive bg-destructive/10" : ""}`}
        data-testid="total-duration-card"
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  hasErrors ? "bg-destructive/20" : "bg-primary/10"
                }`}
              >
                <Timer
                  className={`h-6 w-6 ${hasErrors ? "text-destructive" : "text-primary"}`}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  TOTAL ASSESSMENT DURATION
                </p>
                <p
                  className="text-3xl font-semibold"
                  data-testid="total-duration"
                >
                  {totalDurationMs
                    ? formatDuration(totalDurationMs)
                    : "In Progress"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  assessment.status === "COMPLETED"
                    ? "default"
                    : hasErrors
                      ? "destructive"
                      : "secondary"
                }
                className={
                  assessment.status === "COMPLETED"
                    ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    : ""
                }
                data-testid="status-badge"
              >
                {assessment.status}
              </Badge>
              {hasErrors && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  HAS ERRORS
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Recording Link */}
      {screenRecording && (
        <Card className="mb-8" data-testid="video-recording-link">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  SCREEN RECORDING
                </p>
                <p className="text-sm">Recording available for context</p>
              </div>
            </div>
            <Button asChild data-testid="view-recording-button">
              <a
                href={screenRecording.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Play className="mr-2 h-4 w-4" />
                View Recording
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Retry Assessment Card */}
      {canRetry && (
        <Card
          className="mb-8 border-amber-500 bg-amber-50 dark:bg-amber-950"
          data-testid="retry-assessment-card"
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  ADMIN ACTION
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {hasErrors
                    ? "This assessment has errors. You can retry it."
                    : "Retry this assessment to re-evaluate."}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowRetryDialog(true)}
              disabled={isRetrying}
              className="bg-amber-600 text-white hover:bg-amber-700"
              data-testid="retry-assessment-button"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Assessment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Superseded Notice */}
      {assessment.supersededBy && (
        <Card className="mb-8 bg-muted/30" data-testid="superseded-notice">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                SUPERSEDED
              </p>
              <p className="text-sm text-muted-foreground">
                This assessment was replaced by a newer one.{" "}
                <Link
                  href={`/admin/assessments/${assessment.supersededBy}`}
                  className="text-primary underline hover:text-primary/80"
                >
                  View new assessment
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Info */}
      <Card className="mb-8" data-testid="assessment-info">
        <CardContent className="p-4">
          <h2 className="mb-3 text-xs font-medium text-muted-foreground">
            ASSESSMENT INFO
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">ID</p>
              <p className="truncate" title={assessment.id}>
                {assessment.id}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                SCENARIO
              </p>
              <p>{assessment.scenario.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                STARTED
              </p>
              <p>{formatDate(assessment.startedAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                EVENTS
              </p>
              <p>{timelineEvents.length} total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Timeline & Conversations */}
      <Tabs defaultValue="timeline" data-testid="assessment-tabs">
        <TabsList className="mb-6">
          <TabsTrigger value="timeline" className="gap-2">
            <Clock className="h-4 w-4" />
            Timeline
            <Badge variant="secondary" className="ml-1 text-xs">
              {timelineEvents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="conversations" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversations
            <Badge variant="secondary" className="ml-1 text-xs">
              {assessment.conversations.length + assessment.voiceSessions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="api-calls" className="gap-2">
            <Server className="h-4 w-4" />
            API Calls
            <Badge variant="secondary" className="ml-1 text-xs">
              {assessment.apiCalls.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Errors
            <Badge
              variant={totalErrorCount > 0 ? "destructive" : "secondary"}
              className="ml-1 text-xs"
            >
              {totalErrorCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card data-testid="timeline">
            <div className="border-b border-border bg-muted/10 p-4">
              <h2 className="text-xs font-medium text-muted-foreground">
                EVENT TIMELINE ({timelineEvents.length} events)
              </h2>
            </div>

            {timelineEvents.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No events recorded for this assessment
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute bottom-0 left-8 top-0 w-0.5 bg-border" />

                {timelineEvents.map((event, index) => {
                  const previousEvent =
                    index > 0 ? timelineEvents[index - 1] : null;
                  const durationFromPrevious = previousEvent
                    ? calculateDurationBetweenEvents(
                        event.timestamp,
                        previousEvent.timestamp
                      )
                    : null;

                  return (
                    <TimelineEventItem
                      key={event.id}
                      event={event}
                      index={index}
                      durationFromPrevious={durationFromPrevious}
                      isErrorExpanded={expandedErrors.has(event.id)}
                      isApiCallExpanded={expandedApiCalls.has(event.id)}
                      expandedCodeSections={expandedCodeSections}
                      onToggleErrorExpansion={toggleErrorExpansion}
                      onToggleApiCallExpansion={toggleApiCallExpansion}
                      onToggleCodeSection={toggleCodeSection}
                    />
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="api-calls">
          <ApiCallsTab apiCalls={assessment.apiCalls} />
        </TabsContent>

        <TabsContent value="conversations">
          <ConversationsTab
            conversations={assessment.conversations}
            voiceSessions={assessment.voiceSessions}
          />
        </TabsContent>

        <TabsContent value="errors">
          <ErrorsTab
            clientErrors={clientErrors}
            apiCalls={assessment.apiCalls}
          />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRetryDialog}
        onClose={() => setShowRetryDialog(false)}
        onConfirm={handleRetryAssessment}
        isLoading={isRetrying}
      />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-50 flex max-w-md flex-col gap-2"
          data-testid="toast-container"
        >
          {toasts.map((toast) => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
