/**
 * API Client
 *
 * Centralized fetch wrapper with consistent error handling and headers.
 * Handles the standardized API response format (success/error structure).
 * Automatically injects x-trace-id headers for end-to-end request tracing.
 */

import { generateTraceId, TRACE_ID_HEADER } from "@/lib/tracing";

/**
 * Error thrown by the API client on request failures
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: object;
  headers?: Record<string, string>;
  /** Trace ID to use. If not provided, one is auto-generated. */
  traceId?: string;
}

/**
 * Build headers with trace ID for a fetch request.
 * If a traceId is provided it is used; otherwise a new one is generated.
 */
export function buildTracedHeaders(
  traceId?: string,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    [TRACE_ID_HEADER]: traceId || generateTraceId(),
    ...extra,
  };
}

/**
 * Make a typed API request with consistent error handling
 *
 * @example
 * // GET request
 * const data = await api<{ messages: Message[] }>('/api/chat?assessmentId=123');
 *
 * @example
 * // POST request with body
 * const data = await api<{ token: string }>('/api/chat', {
 *   method: 'POST',
 *   body: { message: 'hello', coworkerId: '123' }
 * });
 *
 * @example
 * // Error handling
 * try {
 *   await api('/api/resource');
 * } catch (err) {
 *   if (err instanceof ApiClientError) {
 *     console.log(err.message, err.code, err.status);
 *   }
 * }
 */
/**
 * fetch() wrapper that retries transient network failures.
 *
 * Retries only on TypeError (DNS/connection refused, dev-server HMR reload,
 * browser-level abort). HTTP error responses (4xx/5xx) are returned as-is so
 * real server bugs still surface.
 *
 * Why: Long-running user actions (e.g. simulation creation) occasionally hit
 * a "Failed to fetch" when the dev server reloads or the network blips. A
 * couple of short retries hides the noise without masking real failures.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { retries?: number; backoffMs?: number[] }
): Promise<Response> {
  const retries = options?.retries ?? 2;
  const backoff = options?.backoffMs ?? [300, 900];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (!(err instanceof TypeError)) throw err;
      lastErr = err;
      if (attempt < retries) {
        const delay = backoff[attempt] ?? backoff[backoff.length - 1] ?? 300;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

export async function api<T>(endpoint: string, options?: ApiOptions): Promise<T> {
  const response = await fetch(endpoint, {
    method: options?.method ?? "GET",
    headers: buildTracedHeaders(options?.traceId, {
      "Content-Type": "application/json",
      ...options?.headers,
    }),
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new ApiClientError(
      data.error || "Request failed",
      data.code,
      response.status
    );
  }

  // Extract data from standardized responses, return as-is for legacy responses
  return data.success !== undefined ? data.data : data;
}
