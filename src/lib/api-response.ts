/**
 * API Response Helpers
 *
 * Standardized helpers for consistent API response formats across all routes.
 * Returns NextResponse objects with a unified structure.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiSuccess, ApiError } from "@/types";

/**
 * Create a successful API response
 *
 * @example
 * // Success with data
 * return success({ assessment });
 *
 * // Success with custom status
 * return success({ created: true }, 201);
 */
export function success<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error API response
 *
 * @example
 * // Basic error
 * return error("Not found", 404);
 *
 * // Error with code
 * return error("Assessment not found", 404, "NOT_FOUND");
 */
export function error(
  message: string,
  status: number,
  code?: string
): NextResponse<ApiError> {
  const body: ApiError = { success: false, error: message };
  if (code) {
    body.code = code;
  }
  return NextResponse.json(body, { status });
}

/**
 * Create a validation error response from Zod errors
 *
 * @example
 * const result = schema.safeParse(body);
 * if (!result.success) {
 *   return validationError(result.error);
 * }
 */
export function validationError(zodError: ZodError): NextResponse<ApiError> {
  const details = zodError.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details,
    } as ApiError,
    { status: 400 }
  );
}
