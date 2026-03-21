/**
 * Trace ID Generation & Extraction
 *
 * Generates and retrieves trace IDs for end-to-end request tracing.
 * A trace ID follows a user action from client → API route → AI call → response.
 *
 * @since 2026-03-21
 */

const TRACE_ID_HEADER = "x-trace-id";

/**
 * Generate a unique trace ID using crypto.randomUUID().
 * Returns a standard UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000").
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}

/**
 * Extract trace ID from a request's headers, or generate a new one if not present.
 * Used in API route handlers to get the trace ID for the current request.
 */
export function getTraceId(request: Request): string {
  const existing = request.headers.get(TRACE_ID_HEADER);
  return existing || generateTraceId();
}

export { TRACE_ID_HEADER };
