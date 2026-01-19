"use client";

import {
  AlertTriangle,
  RefreshCw,
  WifiOff,
  ShieldOff,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import type { CategorizedError, ErrorCategory } from "@/lib/core";

interface ErrorDisplayProps {
  error: CategorizedError;
  onRetry?: () => void;
  onFallback?: () => void;
  fallbackLabel?: string;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  showFallbackOption?: boolean;
  className?: string;
}

function getErrorIcon(category: ErrorCategory) {
  switch (category) {
    case "network":
      return <WifiOff className="h-8 w-8" />;
    case "permission":
      return <ShieldOff className="h-8 w-8" />;
    default:
      return <AlertTriangle className="h-8 w-8" />;
  }
}

function getErrorTitle(category: ErrorCategory): string {
  switch (category) {
    case "network":
      return "Connection Issue";
    case "permission":
      return "Permission Required";
    case "api":
      return "Service Error";
    case "session":
      return "Session Expired";
    case "browser":
      return "Browser Not Supported";
    case "resource":
      return "Not Available";
    default:
      return "Something Went Wrong";
  }
}

export function ErrorDisplay({
  error,
  onRetry,
  onFallback,
  fallbackLabel = "Continue with text",
  isRetrying = false,
  retryCount,
  maxRetries,
  showFallbackOption = false,
  className = "",
}: ErrorDisplayProps) {
  const showRetryProgress =
    retryCount !== undefined && maxRetries !== undefined;

  return (
    <div className={`border-2 border-red-500 bg-background p-6 ${className}`}>
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-4 text-red-500">{getErrorIcon(error.category)}</div>

        {/* Title */}
        <h3 className="mb-2 text-xl font-bold">
          {getErrorTitle(error.category)}
        </h3>

        {/* User-friendly message */}
        <p className="mb-4 max-w-md text-muted-foreground">
          {error.userMessage}
        </p>

        {/* Retry progress indicator */}
        {showRetryProgress && isRetrying && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-secondary">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="font-mono text-sm">
                Retrying... ({retryCount}/{maxRetries})
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Retry button */}
          {error.isRetryable && onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="flex items-center justify-center gap-2 border-2 border-foreground bg-foreground px-6 py-3 font-semibold text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {error.recoveryAction || "Try Again"}
                </>
              )}
            </button>
          )}

          {/* Fallback option (e.g., switch to text mode) */}
          {showFallbackOption && onFallback && (
            <button
              onClick={onFallback}
              className="flex items-center justify-center gap-2 border-2 border-secondary bg-secondary px-6 py-3 font-semibold text-secondary-foreground hover:border-foreground hover:bg-foreground hover:text-background"
            >
              <MessageSquare className="h-4 w-4" />
              {fallbackLabel}
            </button>
          )}

          {/* Non-retryable - show recovery action */}
          {!error.isRetryable && error.recoveryAction && !onFallback && (
            <button
              onClick={() => {
                if (error.category === "session") {
                  window.location.href = "/sign-in";
                } else if (error.category === "browser") {
                  // Just show the message, user needs to use different browser
                } else {
                  window.location.reload();
                }
              }}
              className="flex items-center justify-center gap-2 border-2 border-foreground bg-foreground px-6 py-3 font-semibold text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
            >
              <ArrowRight className="h-4 w-4" />
              {error.recoveryAction}
            </button>
          )}
        </div>

        {/* Technical details (collapsed by default in production) */}
        {process.env.NODE_ENV === "development" && (
          <details className="mt-4 w-full text-left">
            <summary className="cursor-pointer font-mono text-xs text-muted-foreground">
              Technical Details
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto bg-muted p-2 font-mono text-xs">
              {JSON.stringify(
                {
                  category: error.category,
                  message: error.message,
                  isRetryable: error.isRetryable,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline error display for smaller spaces
 */
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function InlineError({
  message,
  onRetry,
  isRetrying = false,
  className = "",
}: InlineErrorProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-2 border-red-500 bg-red-50 p-3 dark:bg-red-950 ${className}`}
    >
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-secondary disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3 w-3 ${isRetrying ? "animate-spin" : ""}`}
          />
          {isRetrying ? "Retrying" : "Retry"}
        </button>
      )}
    </div>
  );
}

/**
 * Session recovery prompt component
 */
interface SessionRecoveryPromptProps {
  onRecover: () => void;
  onStartFresh: () => void;
  lastSaved: string;
  progressSummary?: string;
}

export function SessionRecoveryPrompt({
  onRecover,
  onStartFresh,
  lastSaved,
  progressSummary,
}: SessionRecoveryPromptProps) {
  const formattedTime = new Date(lastSaved).toLocaleString();

  return (
    <div className="border-2 border-secondary bg-background p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center bg-secondary">
          <RefreshCw className="h-6 w-6 text-secondary-foreground" />
        </div>

        <h3 className="mb-2 text-xl font-bold">Resume Your Session?</h3>

        <p className="mb-2 text-muted-foreground">
          We found a saved session from {formattedTime}.
        </p>

        {progressSummary && (
          <p className="mb-4 font-mono text-sm text-muted-foreground">
            {progressSummary}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onRecover}
            className="flex items-center justify-center gap-2 border-2 border-secondary bg-secondary px-6 py-3 font-semibold text-secondary-foreground hover:border-foreground hover:bg-foreground hover:text-background"
          >
            <RefreshCw className="h-4 w-4" />
            Resume Session
          </button>

          <button
            onClick={onStartFresh}
            className="flex items-center justify-center gap-2 border-2 border-foreground bg-background px-6 py-3 font-semibold text-foreground hover:bg-muted"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
