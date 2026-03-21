/**
 * Request Logger
 *
 * Logs API requests to the ApiRequestLog table for tracing and diagnostics.
 * Called at the start of API route handlers, returns a function to finalize
 * the log with status code and duration when the request completes.
 *
 * @since 2026-03-21
 */

import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface RequestLogOptions {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request path (e.g., "/api/chat") */
  path: string;
  /** Trace ID for end-to-end tracing */
  traceId: string;
  /** User ID if authenticated */
  userId?: string;
  /** Assessment ID if applicable */
  assessmentId?: string;
  /** Sanitized request body (no passwords/tokens) */
  requestBody?: Record<string, unknown>;
}

export interface RequestLogTracker {
  /** Finalize the log entry with response details */
  complete: (statusCode: number, errorMessage?: string) => Promise<void>;
}

// ============================================================================
// Sensitive Field Filtering
// ============================================================================

const SENSITIVE_FIELDS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apiKey",
  "api_key",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
]);

/**
 * Remove sensitive fields from request body before logging.
 */
function sanitizeBody(
  body: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!body) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ============================================================================
// Core Function
// ============================================================================

/**
 * Log an API request and return a tracker to finalize with response details.
 *
 * @example
 * ```typescript
 * const traceId = getTraceId(request);
 * const tracker = await logRequest({
 *   method: "POST",
 *   path: "/api/chat",
 *   traceId,
 *   userId: session.user.id,
 *   assessmentId,
 * });
 *
 * try {
 *   // ... handle request ...
 *   await tracker.complete(200);
 * } catch (error) {
 *   await tracker.complete(500, error.message);
 * }
 * ```
 */
export async function logRequest(
  options: RequestLogOptions
): Promise<RequestLogTracker> {
  const { method, path, traceId, userId, assessmentId, requestBody } = options;

  const timestamp = new Date();
  const sanitizedBody = sanitizeBody(requestBody);

  const logEntry = await db.apiRequestLog.create({
    data: {
      method,
      path,
      traceId,
      userId,
      assessmentId,
      requestBody: sanitizedBody
        ? (sanitizedBody as unknown as Prisma.InputJsonValue)
        : undefined,
      statusCode: 0, // Updated on complete
      durationMs: 0, // Updated on complete
      timestamp,
    },
  });

  const complete = async (
    statusCode: number,
    errorMessage?: string
  ): Promise<void> => {
    const durationMs = Date.now() - timestamp.getTime();

    await db.apiRequestLog.update({
      where: { id: logEntry.id },
      data: {
        statusCode,
        durationMs,
        errorMessage,
      },
    });
  };

  return { complete };
}
