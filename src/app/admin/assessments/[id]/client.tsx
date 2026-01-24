"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Play,
  User,
  Mail,
  Calendar,
  Timer,
  ExternalLink,
  Video,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AssessmentStatus, AssessmentLogEventType } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  stackTrace: string | null;
  promptTokens: number | null;
  responseTokens: number | null;
  promptText: string;
  responseText: string | null;
}

interface SerializedRecording {
  id: string;
  type: string;
  storageUrl: string;
  startTime: string;
  endTime: string | null;
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
  supersededBy: string | null;
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
  recordings: SerializedRecording[];
}

interface AssessmentTimelineClientProps {
  assessment: SerializedAssessment;
}

// Event types for unified timeline
type TimelineEventType = "log" | "apiCall";

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  eventType?: AssessmentLogEventType;
  modelVersion?: string;
  durationMs: number | null;
  isError: boolean;
  metadata?: unknown;
  errorMessage?: string | null;
  stackTrace?: string | null;
  statusCode?: number | null;
  promptTokens?: number | null;
  responseTokens?: number | null;
  promptText?: string;
  responseText?: string | null;
  responseTimestamp?: string | null;
}

// Format duration in human-readable format
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

// Format date for display
function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

// Format time for timeline display
function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

// Calculate duration between events
function calculateDurationBetweenEvents(
  current: string,
  previous: string
): number {
  return new Date(current).getTime() - new Date(previous).getTime();
}

// Event type display labels
const EVENT_TYPE_LABELS: Record<AssessmentLogEventType, string> = {
  STARTED: "Assessment Started",
  PROMPT_SENT: "Prompt Sent",
  RESPONSE_RECEIVED: "Response Received",
  PARSING_STARTED: "Parsing Started",
  PARSING_COMPLETED: "Parsing Completed",
  ERROR: "Error",
  COMPLETED: "Assessment Completed",
};

// Get icon for event type
function getEventIcon(event: TimelineEvent) {
  if (event.isError) {
    return <AlertCircle className="h-4 w-4" />;
  }
  if (event.eventType === "COMPLETED") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  if (event.eventType === "STARTED") {
    return <Play className="h-4 w-4" />;
  }
  if (event.type === "apiCall") {
    return <ExternalLink className="h-4 w-4" />;
  }
  return <Clock className="h-4 w-4" />;
}

// Copy button component with visual feedback
function CopyButton({
  text,
  label,
  testId,
}: {
  text: string;
  label: string;
  testId: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className={
        copied
          ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
          : ""
      }
      title={`Copy ${label}`}
      data-testid={testId}
    >
      {copied ? (
        <>
          <Check className="mr-1.5 h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-1.5 h-3 w-3" />
          Copy {label}
        </>
      )}
    </Button>
  );
}

// Collapsible code section component
function CollapsibleCodeSection({
  title,
  content,
  isExpanded,
  onToggle,
  copyLabel,
  testIdPrefix,
}: {
  title: string;
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
  copyLabel: string;
  testIdPrefix: string;
}) {
  // Format JSON if possible
  let displayContent = content;
  let language = "text";
  try {
    const parsed = JSON.parse(content);
    displayContent = JSON.stringify(parsed, null, 2);
    language = "json";
  } catch {
    // Not valid JSON, display as-is
  }

  return (
    <Card data-testid={`${testIdPrefix}-section`}>
      <div
        className="flex cursor-pointer items-center justify-between rounded-t-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        data-testid={`${testIdPrefix}-header`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">
            ({content.length.toLocaleString()} chars)
          </span>
        </div>
        <CopyButton
          text={content}
          label={copyLabel}
          testId={`${testIdPrefix}-copy-button`}
        />
      </div>
      {isExpanded && (
        <div
          className="max-h-96 overflow-auto"
          data-testid={`${testIdPrefix}-content`}
        >
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-b-xl bg-foreground p-4 font-mono text-xs text-background">
            <code className={`language-${language}`}>{displayContent}</code>
          </pre>
        </div>
      )}
    </Card>
  );
}

// API Call Details component
function ApiCallDetails({
  event,
  expandedSections,
  onToggleSection,
}: {
  event: TimelineEvent;
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string) => void;
}) {
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

// Confirmation Dialog Component
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      data-testid="confirmation-dialog-overlay"
    >
      <Card
        className="mx-4 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        data-testid="confirmation-dialog"
      >
        <CardContent className="p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="mb-2 text-xl font-semibold">Retry Assessment</h2>
              <p className="text-muted-foreground">
                This will create a <strong>new assessment</strong> and mark this
                one as superseded. The original assessment data will be preserved
                for historical reference.
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Warning:</strong> A new assessment record will be created
              with fresh logs. This operation cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              data-testid="cancel-retry-button"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              data-testid="confirm-retry-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Confirm Retry
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Toast Notification Component
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

function ToastNotification({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const bgClass =
    toast.type === "success"
      ? "border-green-500 bg-green-50 dark:bg-green-950"
      : toast.type === "error"
        ? "border-destructive bg-destructive/10"
        : "border-primary bg-primary/10";

  const textClass =
    toast.type === "success"
      ? "text-green-800 dark:text-green-200"
      : toast.type === "error"
        ? "text-destructive"
        : "text-primary";

  return (
    <Card
      className={`${bgClass}`}
      data-testid={`toast-${toast.type}`}
    >
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className={`flex items-center gap-2 ${textClass}`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : toast.type === "error" ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm">{toast.message}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(toast.id)}
          className={textClass}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function AssessmentTimelineClient({
  assessment,
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
    (assessment.status === "COMPLETED" ||
      assessment.status === "PROCESSING" ||
      hasErrors) &&
    !assessment.supersededBy;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Header with back link */}
      <Button variant="ghost" asChild className="mb-6">
        <Link
          href="/admin/assessments"
          data-testid="back-link"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assessments
        </Link>
      </Button>

      <h1 className="mb-8 text-3xl font-semibold">Assessment Timeline</h1>

      {/* Candidate Info Card */}
      <Card className="mb-8" data-testid="candidate-info">
        <CardContent className="p-6">
          <h2 className="mb-4 text-xs font-medium text-muted-foreground">
            CANDIDATE INFO
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold" data-testid="candidate-name">
                  {assessment.user.name || "Anonymous"}
                </p>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span
                    className="text-xs"
                    data-testid="candidate-email"
                  >
                    {assessment.user.email || "No email"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  SIMULATION COMPLETED
                </p>
                <p className="text-sm" data-testid="completion-date">
                  {assessment.completedAt
                    ? formatDate(assessment.completedAt)
                    : "In Progress"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Duration Card */}
      <Card
        className={`mb-8 ${
          hasErrors
            ? "border-destructive bg-destructive/10"
            : ""
        }`}
        data-testid="total-duration-card"
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  hasErrors
                    ? "bg-destructive/20"
                    : "bg-primary/10"
                }`}
              >
                <Timer className={`h-6 w-6 ${hasErrors ? "text-destructive" : "text-primary"}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  TOTAL ASSESSMENT DURATION
                </p>
                <p className="text-3xl font-semibold" data-testid="total-duration">
                  {totalDurationMs
                    ? formatDuration(totalDurationMs)
                    : "In Progress"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={assessment.status === "COMPLETED" ? "default" : hasErrors ? "destructive" : "secondary"}
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
        <Card
          className="mb-8 bg-muted/30"
          data-testid="superseded-notice"
        >
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
              <p className="text-xs font-medium text-muted-foreground">SCENARIO</p>
              <p>{assessment.scenario.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">STARTED</p>
              <p>{formatDate(assessment.startedAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">EVENTS</p>
              <p>{timelineEvents.length} total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
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

              const isErrorExpanded = expandedErrors.has(event.id);
              const isApiCallExpanded = expandedApiCalls.has(event.id);
              const hasExpandableErrorContent =
                event.isError &&
                Boolean(
                  event.errorMessage || event.stackTrace || event.metadata
                );
              const hasExpandableApiContent =
                event.type === "apiCall" &&
                Boolean(event.promptText || event.responseText);
              const hasExpandableContent =
                hasExpandableErrorContent || hasExpandableApiContent;
              const isExpanded =
                event.type === "apiCall" ? isApiCallExpanded : isErrorExpanded;

              return (
                <div
                  key={event.id}
                  className="relative"
                  data-testid={`timeline-event-${event.id}`}
                >
                  {/* Duration marker between events */}
                  {durationFromPrevious !== null &&
                    durationFromPrevious > 0 && (
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
                        toggleApiCallExpansion(event.id);
                      } else if (hasExpandableErrorContent) {
                        toggleErrorExpansion(event.id);
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
                      {getEventIcon(event)}
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
                          {event.durationMs !== null &&
                            event.durationMs > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Duration: {formatDuration(event.durationMs)}
                              </p>
                            )}
                        </div>
                      </div>

                      {/* API call details */}
                      {event.type === "apiCall" && (
                        <div className="mt-2 flex items-center gap-4 text-xs">
                          {event.promptTokens != null &&
                            event.responseTokens != null && (
                              <span className="text-muted-foreground">
                                Tokens:{" "}
                                {(
                                  (event.promptTokens ?? 0) +
                                  (event.responseTokens ?? 0)
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
                      {isErrorExpanded &&
                        hasExpandableErrorContent &&
                        event.type === "log" && (
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
                          onToggleSection={toggleCodeSection}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
