/**
 * API Response Types
 *
 * Generic types for consistent API response structures
 * across all endpoints.
 */

/**
 * Successful API response
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/**
 * Error API response
 */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Union type for API responses
 * Use this when a function/endpoint can return either success or error
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Helper to create a success response
 */
export function createSuccessResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

/**
 * Helper to create an error response
 */
export function createErrorResponse(
  error: string,
  code?: string,
  details?: unknown
): ApiError {
  return { success: false, error, code, details };
}

/**
 * Type guard to check if a response is successful
 */
export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiSuccess<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return response.success === false;
}
