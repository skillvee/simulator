/**
 * API Request Validation Helper
 *
 * Provides a standardized way to validate API request bodies using Zod schemas.
 * Returns typed data on success or a formatted error response on failure.
 */

import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { validationError } from "./api-response";
import type { ApiError } from "@/types";

/**
 * Validate an API request body against a Zod schema
 *
 * @example
 * const validated = await validateRequest(request, ChatRequestSchema);
 * if ("error" in validated) return validated.error;
 * const { message, coworkerId } = validated.data;
 */
export async function validateRequest<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse<ApiError> }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
          code: "INVALID_JSON",
        } as ApiError,
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return { error: validationError(result.error) };
  }

  return { data: result.data };
}
