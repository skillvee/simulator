/**
 * API Client
 *
 * Centralized fetch wrapper with consistent error handling and headers.
 * Handles the standardized API response format (success/error structure).
 */

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
export async function api<T>(
  endpoint: string,
  options?: ApiOptions
): Promise<T> {
  const response = await fetch(endpoint, {
    method: options?.method ?? "GET",
    headers: { "Content-Type": "application/json", ...options?.headers },
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
