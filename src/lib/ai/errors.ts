/**
 * AI Error Context System
 *
 * Provides structured error handling for AI operations with full context
 * about which prompt and model failed, enabling easier debugging.
 *
 * Usage:
 * ```typescript
 * import { wrapAICall, AIError } from "@/lib/ai";
 *
 * const result = await wrapAICall(
 *   () => gemini.models.generateContent({ model: TEXT_MODEL, contents }),
 *   { model: TEXT_MODEL, promptType: "cv-parsing", promptVersion: "1.0" }
 * );
 * ```
 */

/**
 * Custom error class for AI operations that includes context about
 * the model, prompt type, and prompt version that failed.
 */
export class AIError extends Error {
  public readonly name = "AIError";

  constructor(
    message: string,
    public readonly model: string,
    public readonly promptType: string,
    public readonly promptVersion: string,
    public readonly originalError?: Error
  ) {
    super(message);

    // Maintains proper stack trace for where the error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }

  /**
   * Returns a formatted string with all error context for logging
   */
  toDetailedString(): string {
    const parts = [
      `AIError: ${this.message}`,
      `  Model: ${this.model}`,
      `  Prompt Type: ${this.promptType}`,
      `  Prompt Version: ${this.promptVersion}`,
    ];

    if (this.originalError) {
      parts.push(`  Original Error: ${this.originalError.message}`);
    }

    return parts.join("\n");
  }
}

/**
 * Context information for AI calls
 */
export interface AICallContext {
  /** The model being used (e.g., "gemini-3-flash-preview") */
  model: string;
  /** The type of prompt being executed (e.g., "cv-parsing", "hr-assessment") */
  promptType: string;
  /** Version of the prompt (e.g., "1.0", "2024-01") */
  promptVersion: string;
}

/**
 * Wraps an AI call with error context.
 * If the call fails, throws an AIError with full context about what failed.
 *
 * @param fn - The async function that performs the AI call
 * @param context - Context information about the AI call
 * @returns The result of the AI call
 * @throws AIError if the call fails
 *
 * @example
 * ```typescript
 * const response = await wrapAICall(
 *   async () => {
 *     const result = await gemini.models.generateContent({
 *       model: TEXT_MODEL,
 *       contents: [{ role: "user", parts: [{ text: prompt }] }],
 *     });
 *     return result;
 *   },
 *   {
 *     model: TEXT_MODEL,
 *     promptType: "cv-parsing",
 *     promptVersion: "1.0",
 *   }
 * );
 * ```
 */
export async function wrapAICall<T>(
  fn: () => Promise<T>,
  context: AICallContext
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw new AIError(
      error instanceof Error ? error.message : String(error),
      context.model,
      context.promptType,
      context.promptVersion,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Type guard to check if an error is an AIError
 */
export function isAIError(error: unknown): error is AIError {
  return error instanceof AIError;
}
