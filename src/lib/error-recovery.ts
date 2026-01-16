/**
 * Error Recovery Utilities
 *
 * Provides consistent error handling, retry logic, and recovery mechanisms
 * across the application, especially for Gemini API and voice conversations.
 */

// Error categories for different handling strategies
export type ErrorCategory =
  | "network" // Transient network issues - retry with backoff
  | "permission" // Permission denied - show instructions
  | "api" // API errors - may or may not retry
  | "resource" // Resource not found/unavailable
  | "browser" // Browser compatibility
  | "session" // Session expired/invalid
  | "unknown"; // Fallback category

export interface CategorizedError {
  category: ErrorCategory;
  message: string;
  originalError?: unknown;
  isRetryable: boolean;
  userMessage: string;
  recoveryAction?: string;
}

/**
 * Categorize an error for appropriate handling
 */
export function categorizeError(error: unknown): CategorizedError {
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "";

  // Permission errors
  if (
    errorMessage.includes("Permission denied") ||
    errorMessage.includes("NotAllowedError") ||
    errorName === "NotAllowedError" ||
    errorName === "PermissionDeniedError"
  ) {
    return {
      category: "permission",
      message: errorMessage,
      originalError: error,
      isRetryable: false,
      userMessage:
        "Permission was denied. Please enable access in your browser settings.",
      recoveryAction: "Check browser permissions and try again",
    };
  }

  // Network errors
  if (
    errorMessage.includes("fetch") ||
    errorMessage.includes("network") ||
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("NetworkError") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("ETIMEDOUT") ||
    errorName === "TypeError" // Often fetch failures
  ) {
    return {
      category: "network",
      message: errorMessage,
      originalError: error,
      isRetryable: true,
      userMessage:
        "Connection issue detected. Please check your internet connection.",
      recoveryAction: "Retry connection",
    };
  }

  // API errors (Gemini specific)
  if (
    errorMessage.includes("API") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("429") ||
    errorMessage.includes("503") ||
    errorMessage.includes("500")
  ) {
    const isRateLimit =
      errorMessage.includes("quota") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("429");
    return {
      category: "api",
      message: errorMessage,
      originalError: error,
      isRetryable: true,
      userMessage: isRateLimit
        ? "Service is temporarily busy. Please wait a moment and try again."
        : "Service encountered an error. Please try again.",
      recoveryAction: "Retry",
    };
  }

  // Session errors
  if (
    errorMessage.includes("session") ||
    errorMessage.includes("expired") ||
    errorMessage.includes("Unauthorized") ||
    errorMessage.includes("401")
  ) {
    return {
      category: "session",
      message: errorMessage,
      originalError: error,
      isRetryable: false,
      userMessage: "Your session has expired. Please sign in again.",
      recoveryAction: "Sign in",
    };
  }

  // Browser compatibility
  if (
    errorMessage.includes("not supported") ||
    errorMessage.includes("NotSupportedError") ||
    errorName === "NotSupportedError" ||
    errorMessage.includes("NotFoundError") ||
    errorName === "NotFoundError"
  ) {
    return {
      category: "browser",
      message: errorMessage,
      originalError: error,
      isRetryable: false,
      userMessage:
        "This feature is not supported in your browser. Please try a modern browser like Chrome, Firefox, or Safari.",
      recoveryAction: "Use a different browser",
    };
  }

  // Resource errors
  if (
    errorMessage.includes("not found") ||
    errorMessage.includes("404") ||
    errorMessage.includes("unavailable")
  ) {
    return {
      category: "resource",
      message: errorMessage,
      originalError: error,
      isRetryable: false,
      userMessage: "The requested resource is not available.",
      recoveryAction: "Go back",
    };
  }

  // Unknown/default
  return {
    category: "unknown",
    message: errorMessage,
    originalError: error,
    isRetryable: true, // Default to retryable
    userMessage: "Something went wrong. Please try again.",
    recoveryAction: "Retry",
  };
}

/**
 * Exponential backoff delay calculation
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000
): number {
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  // Add jitter (0-25% of delay)
  const jitter = delay * Math.random() * 0.25;
  return Math.floor(delay + jitter);
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  onRetry?: (attempt: number, error: CategorizedError, delay: number) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Execute an async operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, onRetry } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: CategorizedError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = categorizeError(error);

      // Don't retry non-retryable errors
      if (!lastError.isRetryable) {
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === maxAttempts - 1) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateBackoffDelay(attempt, baseDelayMs, maxDelayMs);
      onRetry?.(attempt + 1, lastError, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but just in case
  throw lastError?.originalError || new Error("Retry failed");
}

/**
 * Connection status for monitoring
 */
export type ConnectionHealth = "connected" | "degraded" | "disconnected";

export interface ConnectionStatus {
  health: ConnectionHealth;
  lastSuccessfulConnection: Date | null;
  consecutiveFailures: number;
  lastError: CategorizedError | null;
}

/**
 * Create a connection health monitor
 */
export function createConnectionMonitor() {
  let status: ConnectionStatus = {
    health: "connected",
    lastSuccessfulConnection: null,
    consecutiveFailures: 0,
    lastError: null,
  };

  return {
    getStatus: () => ({ ...status }),

    recordSuccess: () => {
      status = {
        health: "connected",
        lastSuccessfulConnection: new Date(),
        consecutiveFailures: 0,
        lastError: null,
      };
    },

    recordFailure: (error: unknown) => {
      const categorized = categorizeError(error);
      status = {
        health: status.consecutiveFailures >= 2 ? "disconnected" : "degraded",
        lastSuccessfulConnection: status.lastSuccessfulConnection,
        consecutiveFailures: status.consecutiveFailures + 1,
        lastError: categorized,
      };
      return categorized;
    },

    reset: () => {
      status = {
        health: "connected",
        lastSuccessfulConnection: null,
        consecutiveFailures: 0,
        lastError: null,
      };
    },
  };
}

/**
 * Session progress storage key generator
 */
export function getProgressStorageKey(assessmentId: string, type: string): string {
  return `progress-${assessmentId}-${type}`;
}

/**
 * Progress data interface for session recovery
 */
export interface SessionProgress {
  assessmentId: string;
  type: string;
  lastUpdated: string;
  data: Record<string, unknown>;
}

/**
 * Save progress to localStorage for recovery
 */
export function saveProgress(
  assessmentId: string,
  type: string,
  data: Record<string, unknown>
): void {
  try {
    const key = getProgressStorageKey(assessmentId, type);
    const progress: SessionProgress = {
      assessmentId,
      type,
      lastUpdated: new Date().toISOString(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
}

/**
 * Load progress from localStorage
 */
export function loadProgress(
  assessmentId: string,
  type: string
): SessionProgress | null {
  try {
    const key = getProgressStorageKey(assessmentId, type);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as SessionProgress;
  } catch (error) {
    console.error("Failed to load progress:", error);
    return null;
  }
}

/**
 * Clear progress after successful completion
 */
export function clearProgress(assessmentId: string, type: string): void {
  try {
    const key = getProgressStorageKey(assessmentId, type);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear progress:", error);
  }
}

/**
 * Check if progress exists and is recent (within maxAge)
 */
export function hasRecentProgress(
  assessmentId: string,
  type: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // Default 24 hours
): boolean {
  const progress = loadProgress(assessmentId, type);
  if (!progress) return false;

  const lastUpdated = new Date(progress.lastUpdated).getTime();
  const now = Date.now();
  return now - lastUpdated < maxAgeMs;
}
