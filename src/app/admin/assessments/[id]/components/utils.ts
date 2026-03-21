import type { AssessmentLogEventType } from "@prisma/client";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
  ExternalLink,
  MessageSquare,
  Mic,
  AlertTriangle,
  Eye,
  EyeOff,
  MousePointer,
} from "lucide-react";
import type { TimelineEvent } from "./types";

// Format duration in human-readable format
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

// Format date for display
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

// Format time for timeline display
export function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

// Calculate duration between events
export function calculateDurationBetweenEvents(
  current: string,
  previous: string
): number {
  return new Date(current).getTime() - new Date(previous).getTime();
}

// Event type display labels
export const EVENT_TYPE_LABELS: Record<AssessmentLogEventType, string> = {
  STARTED: "Assessment Started",
  PROMPT_SENT: "Prompt Sent",
  RESPONSE_RECEIVED: "Response Received",
  PARSING_STARTED: "Parsing Started",
  PARSING_COMPLETED: "Parsing Completed",
  ERROR: "Error",
  COMPLETED: "Assessment Completed",
};

// Get icon for event type
export function getEventIcon(event: TimelineEvent) {
  if (event.type === "clientError") {
    return AlertTriangle;
  }
  if (event.type === "conversation") {
    return MessageSquare;
  }
  if (event.type === "voiceSession") {
    return Mic;
  }
  if (event.type === "candidateEvent") {
    const et = event.candidateEventType;
    if (et === "TAB_SWITCH" || et === "TAB_HIDDEN") return EyeOff;
    if (et === "TAB_VISIBLE" || et === "TAB_FOCUS") return Eye;
    return MousePointer;
  }
  if (event.isError) {
    return AlertCircle;
  }
  if (event.eventType === "COMPLETED") {
    return CheckCircle2;
  }
  if (event.eventType === "STARTED") {
    return Play;
  }
  if (event.type === "apiCall") {
    return ExternalLink;
  }
  return Clock;
}

// Color classes for timeline event types
export function getTimelineEventColor(event: TimelineEvent): {
  dot: string;
  label: string;
  bg: string;
} {
  if (event.type === "log" && event.eventType === "STARTED") {
    return {
      dot: "bg-green-500/20 text-green-600",
      label: "Milestone",
      bg: "bg-green-500/5",
    };
  }
  if (event.type === "log" && event.eventType === "COMPLETED") {
    return {
      dot: "bg-green-500/20 text-green-600",
      label: "Milestone",
      bg: "bg-green-500/5",
    };
  }
  if (event.isError || event.type === "clientError") {
    return {
      dot: "bg-destructive/20 text-destructive",
      label: "Error",
      bg: "bg-destructive/5",
    };
  }
  if (event.type === "conversation" || event.type === "voiceSession") {
    return {
      dot: "bg-blue-500/20 text-blue-600",
      label: "Conversation",
      bg: "bg-blue-500/5",
    };
  }
  if (event.type === "apiCall") {
    return {
      dot: "bg-orange-500/20 text-orange-600",
      label: "API Call",
      bg: "bg-orange-500/5",
    };
  }
  if (event.type === "candidateEvent") {
    return {
      dot: "bg-gray-500/20 text-gray-600",
      label: "Candidate",
      bg: "bg-gray-500/5",
    };
  }
  // Default for other log events
  return {
    dot: "bg-muted text-muted-foreground",
    label: "System",
    bg: "",
  };
}

// Candidate event type display labels
export const CANDIDATE_EVENT_LABELS: Record<string, string> = {
  TAB_SWITCH: "Tab Switch",
  TAB_HIDDEN: "Tab Hidden",
  TAB_VISIBLE: "Tab Visible",
  TAB_FOCUS: "Tab Focused",
  IDLE_START: "Idle Period Started",
  IDLE_END: "Idle Period Ended",
  COPY: "Content Copied",
  PASTE: "Content Pasted",
  SCREENSHOT: "Screenshot Taken",
};
