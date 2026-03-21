/**
 * AI Call Logging Service
 *
 * Provides logging utilities for tracking AI API calls with context about
 * prompt types, versions, and models used. Enables debugging assessment
 * issues and tracking prompt effectiveness.
 *
 * Logs are stored in the AssessmentApiCall table for diagnostics.
 *
 * @since 2026-01-19
 */

import { db } from "@/server/db";

// ============================================================================
// Types
// ============================================================================

export interface LogAICallOptions {
  /** The assessment ID this call is associated with */
  assessmentId: string;
  /** The API endpoint being called (e.g., "/api/chat", "/api/interview/assessment") */
  endpoint: string;
  /** The full prompt text sent to the AI */
  promptText: string;
  /** The model version being used (e.g., "gemini-2.0-flash-exp") */
  modelVersion: string;
  /** The type of prompt (e.g., "HR_INTERVIEW", "CODE_REVIEW", "CHAT") */
  promptType?: string;
  /** The version of the prompt template (e.g., "1.0.0") */
  promptVersion?: string;
  /** The specific model used (e.g., "gemini-3-flash-preview") */
  modelUsed?: string;
  /** Approximate token count for the request */
  tokenCount?: number;
  /** Trace ID for end-to-end request tracing */
  traceId?: string;
}

export interface AICallResult {
  /** The response text from the AI */
  responseText?: string;
  /** HTTP status code of the response */
  statusCode?: number;
  /** Error message if the call failed */
  errorMessage?: string;
  /** Stack trace if an error occurred */
  stackTrace?: string;
  /** Token count for the prompt */
  promptTokens?: number;
  /** Token count for the response */
  responseTokens?: number;
}

export interface AICallTracker {
  /** The ID of the created log entry */
  id: string;
  /** The timestamp when the request was made */
  requestTimestamp: Date;
  /** Updates the log entry with response details */
  complete: (result: AICallResult) => Promise<void>;
  /** Updates the log entry with error details */
  fail: (error: Error) => Promise<void>;
}

// ============================================================================
// Core Logging Function
// ============================================================================

/**
 * Logs an AI API call and returns a tracker to update with the response.
 *
 * This function captures AI context (prompt type, version, model) for debugging
 * and analysis purposes.
 *
 * @example
 * ```typescript
 * const tracker = await logAICall({
 *   assessmentId: assessment.id,
 *   endpoint: "/api/chat",
 *   promptText: fullPrompt,
 *   modelVersion: "gemini-2.0-flash-exp",
 *   promptType: "CHAT",
 *   promptVersion: "1.0",
 *   modelUsed: "gemini-2.0-flash-exp",
 * });
 *
 * try {
 *   const response = await callAI(fullPrompt);
 *   await tracker.complete({
 *     responseText: response.text,
 *     statusCode: 200,
 *     promptTokens: response.usageMetadata?.promptTokenCount,
 *     responseTokens: response.usageMetadata?.candidatesTokenCount,
 *   });
 * } catch (error) {
 *   await tracker.fail(error);
 * }
 * ```
 */
export async function logAICall(
  options: LogAICallOptions
): Promise<AICallTracker> {
  const {
    assessmentId,
    endpoint: _endpoint,
    promptText,
    modelVersion,
    promptType,
    promptVersion,
    modelUsed,
    tokenCount,
    traceId,
  } = options;

  const requestTimestamp = new Date();

  const apiCall = await db.assessmentApiCall.create({
    data: {
      assessmentId,
      requestTimestamp,
      promptText,
      modelVersion,
      promptType,
      promptVersion,
      modelUsed,
      tokenCount,
      traceId,
    },
  });

  const complete = async (result: AICallResult): Promise<void> => {
    const responseTimestamp = new Date();
    const durationMs = responseTimestamp.getTime() - requestTimestamp.getTime();

    await db.assessmentApiCall.update({
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
  };

  const fail = async (error: Error): Promise<void> => {
    await complete({
      errorMessage: error.message,
      stackTrace: error.stack,
      statusCode: 500,
    });
  };

  return {
    id: apiCall.id,
    requestTimestamp,
    complete,
    fail,
  };
}

// ============================================================================
// Convenience Function (Simple One-Shot Logging)
// ============================================================================

/**
 * Logs a completed AI call in a single operation.
 * Use this when you don't need to track the call lifecycle (start -> complete/fail).
 *
 * @example
 * ```typescript
 * await logCompletedAICall({
 *   assessmentId: assessment.id,
 *   endpoint: "/api/code-review",
 *   promptText: prompt,
 *   modelVersion: "gemini-2.0-flash-exp",
 *   promptType: "CODE_REVIEW",
 *   promptVersion: "1.0",
 *   responseText: response.text,
 *   statusCode: 200,
 * });
 * ```
 */
export async function logCompletedAICall(
  options: LogAICallOptions & AICallResult
): Promise<string> {
  const {
    assessmentId,
    endpoint: _endpoint,
    promptText,
    modelVersion,
    promptType,
    promptVersion,
    modelUsed,
    tokenCount,
    traceId,
    responseText,
    statusCode,
    errorMessage,
    stackTrace,
    promptTokens,
    responseTokens,
  } = options;

  const requestTimestamp = new Date();
  const responseTimestamp = new Date();

  // For one-shot logging, we use the same timestamp (no real duration)
  const apiCall = await db.assessmentApiCall.create({
    data: {
      assessmentId,
      requestTimestamp,
      responseTimestamp,
      durationMs: 0, // No real duration measurement for one-shot logging
      promptText,
      modelVersion,
      promptType,
      promptVersion,
      modelUsed,
      tokenCount,
      traceId,
      responseText,
      statusCode,
      errorMessage,
      stackTrace,
      promptTokens,
      responseTokens,
    },
  });

  return apiCall.id;
}
