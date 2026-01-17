/**
 * Assessment Logging Service
 *
 * Provides logging utilities for tracking assessment events and API calls.
 * Logs are stored in VideoAssessmentLog and VideoAssessmentApiCall tables for diagnostics.
 *
 * All timestamps are stored in UTC with millisecond precision.
 *
 * @since 2026-01-16
 */

import { db } from "@/server/db";
import { AssessmentLogEventType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface LogEventOptions {
  videoAssessmentId: string;
  eventType: AssessmentLogEventType;
  metadata?: Record<string, unknown>;
  previousEventTimestamp?: Date;
}

export interface LogApiCallOptions {
  videoAssessmentId: string;
  promptText: string;
  modelVersion: string;
}

export interface ApiCallResult {
  responseText?: string;
  statusCode?: number;
  errorMessage?: string;
  stackTrace?: string;
  promptTokens?: number;
  responseTokens?: number;
}

export interface VideoAssessmentLogger {
  logEvent: (
    eventType: AssessmentLogEventType,
    metadata?: Record<string, unknown>
  ) => Promise<Date>;
  startApiCall: (promptText: string, modelVersion: string) => ApiCallTracker;
  getLastEventTimestamp: () => Date | null;
}

export interface ApiCallTracker {
  complete: (result: ApiCallResult) => Promise<void>;
  fail: (error: Error) => Promise<void>;
}

// ============================================================================
// Core Logging Functions
// ============================================================================

/**
 * Logs a single video assessment event to the database.
 * All timestamps are stored in UTC with millisecond precision.
 * Returns the timestamp of the logged event for duration calculations.
 */
export async function logVideoAssessmentEvent(
  options: LogEventOptions
): Promise<Date> {
  const { videoAssessmentId, eventType, metadata, previousEventTimestamp } = options;

  const now = new Date();
  let durationMs: number | null = null;

  // Calculate duration since previous event if provided
  if (previousEventTimestamp) {
    durationMs = now.getTime() - previousEventTimestamp.getTime();
  }

  await db.videoAssessmentLog.create({
    data: {
      videoAssessmentId,
      eventType,
      timestamp: now,
      durationMs,
      metadata: metadata
        ? (metadata as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return now;
}

/**
 * Logs an API call with request details, then updates with response.
 * Captures timing with millisecond precision.
 */
export async function logVideoAssessmentApiCall(
  options: LogApiCallOptions
): Promise<{
  id: string;
  requestTimestamp: Date;
  updateWithResponse: (result: ApiCallResult) => Promise<void>;
}> {
  const { videoAssessmentId, promptText, modelVersion } = options;

  const requestTimestamp = new Date();

  const apiCall = await db.videoAssessmentApiCall.create({
    data: {
      videoAssessmentId,
      requestTimestamp,
      promptText,
      modelVersion,
    },
  });

  return {
    id: apiCall.id,
    requestTimestamp,
    updateWithResponse: async (result: ApiCallResult) => {
      const responseTimestamp = new Date();
      const durationMs = responseTimestamp.getTime() - requestTimestamp.getTime();

      await db.videoAssessmentApiCall.update({
        where: { id: apiCall.id },
        data: {
          responseTimestamp,
          durationMs,
          responseText: result.responseText,
          statusCode: result.statusCode,
          errorMessage: result.errorMessage,
          stackTrace: result.stackTrace,
          promptTokens: result.promptTokens,
          responseTokens: result.responseTokens,
        },
      });
    },
  };
}

// ============================================================================
// Video Assessment Logger Factory
// ============================================================================

/**
 * Creates a video assessment logger instance for tracking events throughout
 * an assessment's lifecycle. Automatically tracks timestamps for duration
 * calculations between events.
 *
 * @param videoAssessmentId - The ID of the video assessment to log events for
 * @returns Logger instance with methods to log events and API calls
 */
export function createVideoAssessmentLogger(
  videoAssessmentId: string
): VideoAssessmentLogger {
  let lastEventTimestamp: Date | null = null;

  return {
    /**
     * Logs an event and returns the timestamp.
     * Duration is automatically calculated from the previous event.
     */
    logEvent: async (
      eventType: AssessmentLogEventType,
      metadata?: Record<string, unknown>
    ): Promise<Date> => {
      const timestamp = await logVideoAssessmentEvent({
        videoAssessmentId,
        eventType,
        metadata,
        previousEventTimestamp: lastEventTimestamp ?? undefined,
      });
      lastEventTimestamp = timestamp;
      return timestamp;
    },

    /**
     * Starts tracking an API call.
     * Returns a tracker that should be completed or failed when the call finishes.
     */
    startApiCall: (promptText: string, modelVersion: string): ApiCallTracker => {
      let apiCallPromise: ReturnType<typeof logVideoAssessmentApiCall> | null = null;

      // Start the API call logging (don't await here)
      const initPromise = logVideoAssessmentApiCall({
        videoAssessmentId,
        promptText,
        modelVersion,
      }).then((result) => {
        apiCallPromise = Promise.resolve(result);
        return result;
      });

      return {
        complete: async (result: ApiCallResult) => {
          const apiCall = await (apiCallPromise ?? initPromise);
          await apiCall.updateWithResponse(result);
        },
        fail: async (error: Error) => {
          const apiCall = await (apiCallPromise ?? initPromise);
          await apiCall.updateWithResponse({
            errorMessage: error.message,
            stackTrace: error.stack,
            statusCode: 500,
          });
        },
      };
    },

    /**
     * Gets the timestamp of the last logged event.
     */
    getLastEventTimestamp: () => lastEventTimestamp,
  };
}

// ============================================================================
// Convenience Functions for Video Assessment Logging
// ============================================================================

/**
 * Logs a started event for a video assessment job.
 * Includes job_id in metadata per acceptance criteria.
 */
export async function logJobStarted(
  videoAssessmentId: string,
  jobId: string
): Promise<Date> {
  return logVideoAssessmentEvent({
    videoAssessmentId,
    eventType: AssessmentLogEventType.STARTED,
    metadata: { job_id: jobId },
  });
}

/**
 * Logs when a prompt is sent to the AI model.
 * Includes prompt_length in metadata per acceptance criteria.
 */
export async function logPromptSent(
  videoAssessmentId: string,
  promptLength: number,
  previousTimestamp?: Date
): Promise<Date> {
  return logVideoAssessmentEvent({
    videoAssessmentId,
    eventType: AssessmentLogEventType.PROMPT_SENT,
    metadata: { prompt_length: promptLength },
    previousEventTimestamp: previousTimestamp,
  });
}

/**
 * Logs when a response is received from the AI model.
 * Includes response_length and status_code in metadata per acceptance criteria.
 */
export async function logResponseReceived(
  videoAssessmentId: string,
  responseLength: number,
  statusCode: number,
  previousTimestamp?: Date
): Promise<Date> {
  return logVideoAssessmentEvent({
    videoAssessmentId,
    eventType: AssessmentLogEventType.RESPONSE_RECEIVED,
    metadata: { response_length: responseLength, status_code: statusCode },
    previousEventTimestamp: previousTimestamp,
  });
}

/**
 * Logs when JSON parsing begins.
 */
export async function logParsingStarted(
  videoAssessmentId: string,
  previousTimestamp?: Date
): Promise<Date> {
  return logVideoAssessmentEvent({
    videoAssessmentId,
    eventType: AssessmentLogEventType.PARSING_STARTED,
    previousEventTimestamp: previousTimestamp,
  });
}

/**
 * Logs when parsing completes successfully.
 * Includes parsed_dimension_count in metadata per acceptance criteria.
 */
export async function logParsingCompleted(
  videoAssessmentId: string,
  dimensionCount: number,
  previousTimestamp?: Date
): Promise<Date> {
  return logVideoAssessmentEvent({
    videoAssessmentId,
    eventType: AssessmentLogEventType.PARSING_COMPLETED,
    metadata: { parsed_dimension_count: dimensionCount },
    previousEventTimestamp: previousTimestamp,
  });
}

/**
 * Logs an error event with full error message and stack trace.
 */
export async function logError(
  videoAssessmentId: string,
  error: Error,
  previousTimestamp?: Date
): Promise<Date> {
  return logVideoAssessmentEvent({
    videoAssessmentId,
    eventType: AssessmentLogEventType.ERROR,
    metadata: {
      error_message: error.message,
      error_name: error.name,
      stack_trace: error.stack,
    },
    previousEventTimestamp: previousTimestamp,
  });
}

/**
 * Logs when a video assessment completes successfully.
 */
export async function logCompleted(
  videoAssessmentId: string,
  previousTimestamp?: Date
): Promise<Date> {
  return logVideoAssessmentEvent({
    videoAssessmentId,
    eventType: AssessmentLogEventType.COMPLETED,
    previousEventTimestamp: previousTimestamp,
  });
}
