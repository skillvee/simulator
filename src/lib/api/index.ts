/**
 * API Utilities
 *
 * Centralized utilities for API routes and client-side API calls.
 * - client: Typed fetch wrapper with consistent error handling
 * - response: Standardized API response helpers (success, error, validationError)
 * - validation: Request body validation using Zod schemas
 */

export { api, ApiClientError, buildTracedHeaders } from "./client";
export { success, error, validationError } from "./response";
export { validateRequest } from "./validation";
