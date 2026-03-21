import type {
  AssessmentStatus,
  AssessmentLogEventType,
  ClientErrorType,
} from "@prisma/client";

// Serialized types from server (dates as strings)
export interface SerializedLog {
  id: string;
  eventType: AssessmentLogEventType;
  timestamp: string;
  durationMs: number | null;
  metadata: unknown;
}

export interface SerializedApiCall {
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
  promptType: string | null;
  promptVersion: string | null;
  traceId: string | null;
}

export interface SerializedRecordingSegment {
  id: string;
  segmentIndex: number;
  startTime: string;
  endTime: string | null;
  status: string;
  chunkPaths: string[];
}

export interface SerializedRecording {
  id: string;
  type: string;
  storageUrl: string;
  startTime: string;
  endTime: string | null;
  segments: SerializedRecordingSegment[];
}

export interface SerializedAssessment {
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
  conversations: SerializedConversation[];
  voiceSessions: SerializedVoiceSession[];
}

// Event types for unified timeline
export type TimelineEventType =
  | "log"
  | "apiCall"
  | "conversation"
  | "voiceSession"
  | "clientError"
  | "candidateEvent";

export interface TimelineEvent {
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
  // Conversation/voice fields
  coworkerName?: string;
  coworkerRole?: string;
  messageCount?: number;
  conversationType?: string;
  // Client error fields
  clientErrorType?: ClientErrorType;
  componentName?: string | null;
  url?: string;
  // Candidate event fields
  candidateEventType?: string;
}

// Serialized candidate event from server
export interface SerializedCandidateEvent {
  id: string;
  eventType: string;
  timestamp: string;
  metadata: unknown;
}

// Serialized conversation from server
export interface SerializedConversation {
  id: string;
  coworkerId: string | null;
  type: string;
  transcript: unknown;
  createdAt: string;
  updatedAt: string;
  coworker: {
    id: string;
    name: string;
    role: string;
  } | null;
}

// Serialized voice session from server
export interface SerializedVoiceSession {
  id: string;
  coworkerId: string;
  startTime: string;
  endTime: string | null;
  durationMs: number | null;
  transcript: unknown;
  connectionEvents: unknown;
  tokenName: string | null;
  errorMessage: string | null;
  coworker: {
    id: string;
    name: string;
    role: string;
  };
}

// Serialized client error from server
export interface SerializedClientError {
  id: string;
  errorType: ClientErrorType;
  message: string;
  stackTrace: string | null;
  componentName: string | null;
  url: string;
  timestamp: string;
  metadata: unknown;
}

// Unified error entry for the Errors tab
export type ErrorEntry =
  | {
      source: "client";
      id: string;
      timestamp: string;
      message: string;
      stackTrace: string | null;
      errorType: ClientErrorType;
      componentName: string | null;
      url: string;
      metadata: unknown;
    }
  | {
      source: "api";
      id: string;
      timestamp: string;
      message: string;
      stackTrace: string | null;
      endpoint: string | null;
      statusCode: number | null;
      modelVersion: string;
      promptType: string | null;
    };

// Toast notification type
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}
