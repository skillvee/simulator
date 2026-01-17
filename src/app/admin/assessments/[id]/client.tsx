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
    return <AlertCircle className="w-4 h-4" />;
  }
  if (event.eventType === "COMPLETED") {
    return <CheckCircle2 className="w-4 h-4" />;
  }
  if (event.eventType === "STARTED") {
    return <Play className="w-4 h-4" />;
  }
  if (event.type === "apiCall") {
    return <ExternalLink className="w-4 h-4" />;
  }
  return <Clock className="w-4 h-4" />;
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
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 border text-xs font-mono ${
        copied
          ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
          : "border-border hover:bg-muted"
      }`}
      title={`Copy ${label}`}
      data-testid={testId}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          Copy {label}
        </>
      )}
    </button>
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
    <div
      className="border-2 border-border"
      data-testid={`${testIdPrefix}-section`}
    >
      <div
        className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        data-testid={`${testIdPrefix}-header`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
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
        <div className="max-h-96 overflow-auto" data-testid={`${testIdPrefix}-content`}>
          <pre className="p-4 bg-foreground text-background font-mono text-xs whitespace-pre-wrap overflow-x-auto">
            <code className={`language-${language}`}>{displayContent}</code>
          </pre>
        </div>
      )}
    </div>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-2 border-border bg-muted/10">
        <div>
          <p className="font-mono text-xs text-muted-foreground">MODEL</p>
          <p className="font-mono text-sm">{event.modelVersion}</p>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">STATUS</p>
          <p
            className={`font-mono text-sm ${
              event.isError
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            }`}
          >
            {event.statusCode ?? (event.isError ? "Error" : "OK")}
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">DURATION</p>
          <p className="font-mono text-sm">
            {event.durationMs ? formatDuration(event.durationMs) : "N/A"}
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">TOKENS</p>
          <p className="font-mono text-sm">
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
      </div>

      {/* Timestamps section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-2 border-border bg-muted/10">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            REQUEST TIMESTAMP
          </p>
          <p className="font-mono text-sm">{formatDate(event.timestamp)}</p>
        </div>
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            RESPONSE TIMESTAMP
          </p>
          <p className="font-mono text-sm">
            {event.responseTimestamp
              ? formatDate(event.responseTimestamp)
              : "N/A"}
          </p>
        </div>
      </div>

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
        <div className="p-4 border-2 border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/50">
          {event.errorMessage && (
            <div className="mb-3">
              <p className="font-mono text-xs text-red-600 dark:text-red-400 mb-1">
                ERROR MESSAGE
              </p>
              <p className="font-mono text-sm text-red-800 dark:text-red-200">
                {event.errorMessage}
              </p>
            </div>
          )}
          {event.stackTrace && (
            <div>
              <p className="font-mono text-xs text-red-600 dark:text-red-400 mb-1">
                STACK TRACE
              </p>
              <pre className="font-mono text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/30 p-2 border border-red-300 dark:border-red-700">
                {event.stackTrace}
              </pre>
            </div>
          )}
        </div>
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
      <div
        className="w-full max-w-md mx-4 border-2 border-border bg-background p-6"
        onClick={(e) => e.stopPropagation()}
        data-testid="confirmation-dialog"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 border-2 border-amber-500 bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">Retry Assessment</h2>
            <p className="text-muted-foreground">
              This will create a <strong>new assessment</strong> and mark this one as superseded.
              The original assessment data will be preserved for historical reference.
            </p>
          </div>
        </div>

        <div className="p-4 border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 mb-6">
          <p className="font-mono text-sm text-amber-800 dark:text-amber-200">
            <strong>Warning:</strong> A new assessment record will be created with fresh logs.
            This operation cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border-2 border-border font-mono text-sm hover:bg-muted disabled:opacity-50"
            data-testid="cancel-retry-button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background font-mono text-sm hover:bg-background hover:text-foreground disabled:opacity-50"
            data-testid="confirm-retry-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Confirm Retry
              </>
            )}
          </button>
        </div>
      </div>
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
        ? "border-red-500 bg-red-50 dark:bg-red-950"
        : "border-blue-500 bg-blue-50 dark:bg-blue-950";

  const textClass =
    toast.type === "success"
      ? "text-green-800 dark:text-green-200"
      : toast.type === "error"
        ? "text-red-800 dark:text-red-200"
        : "text-blue-800 dark:text-blue-200";

  return (
    <div
      className={`flex items-center justify-between gap-4 p-4 border-2 ${bgClass} ${textClass}`}
      data-testid={`toast-${toast.type}`}
    >
      <div className="flex items-center gap-2">
        {toast.type === "success" ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : toast.type === "error" ? (
          <AlertCircle className="w-5 h-5" />
        ) : (
          <AlertCircle className="w-5 h-5" />
        )}
        <span className="font-mono text-sm">{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 hover:opacity-70"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function AssessmentTimelineClient({
  assessment,
}: AssessmentTimelineClientProps) {
  const router = useRouter();
  // Track expanded API call events (for showing details)
  const [expandedApiCalls, setExpandedApiCalls] = useState<Set<string>>(new Set());
  // Track expanded code sections within API call details (prompt/response)
  const [expandedCodeSections, setExpandedCodeSections] = useState<Set<string>>(new Set());
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
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate total duration
  const totalDurationMs =
    assessment.completedAt && assessment.startedAt
      ? new Date(assessment.completedAt).getTime() -
        new Date(assessment.startedAt).getTime()
      : null;

  // Check if assessment has errors
  const hasErrors = timelineEvents.some((e) => e.isError);

  // Get screen recording
  const screenRecording = assessment.recordings.find((r) => r.type === "screen");

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
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header with back link */}
      <Link
        href="/admin/assessments"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        data-testid="back-link"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-mono text-sm">Back to Assessments</span>
      </Link>

      <h1 className="text-3xl font-bold mb-8">Assessment Timeline</h1>

      {/* Candidate Info Card */}
      <div
        className="border-2 border-border p-6 mb-8"
        data-testid="candidate-info"
      >
        <h2 className="font-mono text-xs text-muted-foreground mb-4">
          CANDIDATE INFO
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-border bg-secondary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold" data-testid="candidate-name">
                {assessment.user.name || "Anonymous"}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span className="font-mono text-xs" data-testid="candidate-email">
                  {assessment.user.email || "No email"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-border bg-muted flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                SIMULATION COMPLETED
              </p>
              <p className="font-mono text-sm" data-testid="completion-date">
                {assessment.completedAt
                  ? formatDate(assessment.completedAt)
                  : "In Progress"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Total Duration Card */}
      <div
        className={`border-2 p-6 mb-8 ${
          hasErrors ? "border-red-500 bg-red-50 dark:bg-red-950" : "border-border"
        }`}
        data-testid="total-duration-card"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 border-2 flex items-center justify-center ${
                hasErrors
                  ? "border-red-500 bg-red-100 dark:bg-red-900"
                  : "border-border bg-secondary"
              }`}
            >
              <Timer className="w-6 h-6" />
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                TOTAL ASSESSMENT DURATION
              </p>
              <p
                className="text-3xl font-bold"
                data-testid="total-duration"
              >
                {totalDurationMs ? formatDuration(totalDurationMs) : "In Progress"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs px-3 py-1 ${
                assessment.status === "COMPLETED"
                  ? "bg-secondary text-secondary-foreground"
                  : hasErrors
                    ? "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200"
                    : "bg-muted text-muted-foreground"
              }`}
              data-testid="status-badge"
            >
              {assessment.status}
            </span>
            {hasErrors && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 font-mono text-xs">
                <AlertCircle className="w-3 h-3" />
                HAS ERRORS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Video Recording Link */}
      {screenRecording && (
        <div
          className="border-2 border-border p-4 mb-8 flex items-center justify-between"
          data-testid="video-recording-link"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-border bg-secondary flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                SCREEN RECORDING
              </p>
              <p className="text-sm">Recording available for context</p>
            </div>
          </div>
          <a
            href={screenRecording.storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-foreground bg-foreground text-background hover:bg-background hover:text-foreground font-mono text-sm"
            data-testid="view-recording-button"
          >
            <Play className="w-4 h-4" />
            View Recording
          </a>
        </div>
      )}

      {/* Retry Assessment Card */}
      {canRetry && (
        <div
          className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950 p-4 mb-8 flex items-center justify-between"
          data-testid="retry-assessment-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-amber-500 bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-mono text-xs text-amber-700 dark:text-amber-300">
                ADMIN ACTION
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {hasErrors
                  ? "This assessment has errors. You can retry it."
                  : "Retry this assessment to re-evaluate."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRetryDialog(true)}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-amber-600 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 font-mono text-sm"
            data-testid="retry-assessment-button"
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Retry Assessment
              </>
            )}
          </button>
        </div>
      )}

      {/* Superseded Notice */}
      {assessment.supersededBy && (
        <div
          className="border-2 border-muted-foreground/30 bg-muted/30 p-4 mb-8"
          data-testid="superseded-notice"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-muted-foreground/30 bg-muted flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                SUPERSEDED
              </p>
              <p className="text-sm text-muted-foreground">
                This assessment was replaced by a newer one.{" "}
                <Link
                  href={`/admin/assessments/${assessment.supersededBy}`}
                  className="underline hover:text-foreground"
                >
                  View new assessment
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Info */}
      <div className="border-2 border-border p-4 mb-8" data-testid="assessment-info">
        <h2 className="font-mono text-xs text-muted-foreground mb-3">
          ASSESSMENT INFO
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
          <div>
            <p className="text-muted-foreground text-xs">ID</p>
            <p className="truncate" title={assessment.id}>
              {assessment.id}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">SCENARIO</p>
            <p>{assessment.scenario.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">STARTED</p>
            <p>{formatDate(assessment.startedAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">EVENTS</p>
            <p>{timelineEvents.length} total</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-2 border-border" data-testid="timeline">
        <div className="border-b-2 border-border p-4 bg-muted/10">
          <h2 className="font-mono text-xs text-muted-foreground">
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
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

            {timelineEvents.map((event, index) => {
              const previousEvent = index > 0 ? timelineEvents[index - 1] : null;
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
                Boolean(event.errorMessage || event.stackTrace || event.metadata);
              const hasExpandableApiContent =
                event.type === "apiCall" &&
                Boolean(event.promptText || event.responseText);
              const hasExpandableContent = hasExpandableErrorContent || hasExpandableApiContent;
              const isExpanded = event.type === "apiCall" ? isApiCallExpanded : isErrorExpanded;

              return (
                <div
                  key={event.id}
                  className="relative"
                  data-testid={`timeline-event-${event.id}`}
                >
                  {/* Duration marker between events */}
                  {durationFromPrevious !== null && durationFromPrevious > 0 && (
                    <div
                      className="relative py-2 pl-16 pr-4"
                      data-testid={`duration-marker-${event.id}`}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                        <span
                          className={`px-2 py-0.5 border ${
                            durationFromPrevious > 30000
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                              : "border-border bg-muted/50"
                          }`}
                        >
                          +{formatDuration(durationFromPrevious)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Event card */}
                  <div
                    className={`relative flex items-start gap-4 p-4 ${
                      event.isError
                        ? "bg-red-50 dark:bg-red-950/50"
                        : index % 2 === 0
                          ? ""
                          : "bg-muted/10"
                    } ${hasExpandableContent ? "cursor-pointer" : ""}`}
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
                      className={`relative z-10 w-8 h-8 border-2 flex items-center justify-center flex-shrink-0 ${
                        event.isError
                          ? "border-red-500 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                          : event.eventType === "COMPLETED"
                            ? "border-secondary bg-secondary text-secondary-foreground"
                            : "border-border bg-background"
                      }`}
                    >
                      {getEventIcon(event)}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {event.type === "log" && event.eventType
                              ? EVENT_TYPE_LABELS[event.eventType]
                              : event.type === "apiCall"
                                ? "API Call"
                                : "Event"}
                            {hasExpandableContent && (
                              <span className="text-muted-foreground">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </span>
                            )}
                          </p>
                          {event.type === "apiCall" && event.modelVersion && (
                            <p className="font-mono text-xs text-muted-foreground">
                              Model: {event.modelVersion}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-mono text-xs text-muted-foreground">
                            {formatTime(event.timestamp)}
                          </p>
                          {event.durationMs !== null && event.durationMs > 0 && (
                            <p className="font-mono text-xs text-muted-foreground">
                              Duration: {formatDuration(event.durationMs)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* API call details */}
                      {event.type === "apiCall" && (
                        <div className="mt-2 flex items-center gap-4 font-mono text-xs">
                          {event.promptTokens != null && event.responseTokens != null && (
                            <span className="text-muted-foreground">
                              Tokens: {((event.promptTokens ?? 0) + (event.responseTokens ?? 0)).toLocaleString()}
                            </span>
                          )}
                          <span
                            className={
                              event.isError
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }
                          >
                            {event.isError
                              ? "Error"
                              : event.statusCode
                                ? `Status: ${event.statusCode}`
                                : "OK"}
                          </span>
                        </div>
                      )}

                      {/* Expandable error content (for log events with errors) */}
                      {isErrorExpanded && hasExpandableErrorContent && event.type === "log" && (
                        <div
                          className="mt-4 p-4 border-2 border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/50"
                          data-testid={`error-details-${event.id}`}
                        >
                          {event.errorMessage && (
                            <div className="mb-3">
                              <p className="font-mono text-xs text-red-600 dark:text-red-400 mb-1">
                                ERROR MESSAGE
                              </p>
                              <p className="font-mono text-sm text-red-800 dark:text-red-200">
                                {event.errorMessage}
                              </p>
                            </div>
                          )}
                          {event.stackTrace && (
                            <div className="mb-3">
                              <p className="font-mono text-xs text-red-600 dark:text-red-400 mb-1">
                                STACK TRACE
                              </p>
                              <pre className="font-mono text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/30 p-2 border border-red-300 dark:border-red-700">
                                {event.stackTrace}
                              </pre>
                            </div>
                          )}
                          {event.metadata != null && (
                            <div>
                              <p className="font-mono text-xs text-red-600 dark:text-red-400 mb-1">
                                METADATA
                              </p>
                              <pre className="font-mono text-xs text-red-800 dark:text-red-200 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto bg-red-50 dark:bg-red-900/30 p-2 border border-red-300 dark:border-red-700">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
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
      </div>

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
          className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md"
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
