"use client";

import { AlertTriangle, RefreshCw, WifiOff, ShieldOff, MessageSquare, ArrowRight } from "lucide-react";
import type { CategorizedError, ErrorCategory } from "@/lib/error-recovery";

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
      return <WifiOff className="w-8 h-8" />;
    case "permission":
      return <ShieldOff className="w-8 h-8" />;
    default:
      return <AlertTriangle className="w-8 h-8" />;
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
  const showRetryProgress = retryCount !== undefined && maxRetries !== undefined;

  return (
    <div className={`border-2 border-red-500 bg-background p-6 ${className}`}>
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="text-red-500 mb-4">{getErrorIcon(error.category)}</div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-2">{getErrorTitle(error.category)}</h3>

        {/* User-friendly message */}
        <p className="text-muted-foreground mb-4 max-w-md">{error.userMessage}</p>

        {/* Retry progress indicator */}
        {showRetryProgress && isRetrying && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-secondary">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="font-mono text-sm">
                Retrying... ({retryCount}/{maxRetries})
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Retry button */}
          {error.isRetryable && onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {error.recoveryAction || "Try Again"}
                </>
              )}
            </button>
          )}

          {/* Fallback option (e.g., switch to text mode) */}
          {showFallbackOption && onFallback && (
            <button
              onClick={onFallback}
              className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 font-semibold border-2 border-secondary hover:bg-foreground hover:text-background hover:border-foreground"
            >
              <MessageSquare className="w-4 h-4" />
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
              className="flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
            >
              <ArrowRight className="w-4 h-4" />
              {error.recoveryAction}
            </button>
          )}
        </div>

        {/* Technical details (collapsed by default in production) */}
        {process.env.NODE_ENV === "development" && (
          <details className="mt-4 w-full text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground font-mono">
              Technical Details
            </summary>
            <pre className="mt-2 p-2 bg-muted text-xs font-mono overflow-auto max-h-32">
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
      className={`flex items-center justify-between gap-4 p-3 border-2 border-red-500 bg-red-50 dark:bg-red-950 ${className}`}
    >
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-secondary disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
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
        <div className="w-12 h-12 bg-secondary flex items-center justify-center mb-4">
          <RefreshCw className="w-6 h-6 text-secondary-foreground" />
        </div>

        <h3 className="text-xl font-bold mb-2">Resume Your Session?</h3>

        <p className="text-muted-foreground mb-2">
          We found a saved session from {formattedTime}.
        </p>

        {progressSummary && (
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            {progressSummary}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            onClick={onRecover}
            className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 font-semibold border-2 border-secondary hover:bg-foreground hover:text-background hover:border-foreground"
          >
            <RefreshCw className="w-4 h-4" />
            Resume Session
          </button>

          <button
            onClick={onStartFresh}
            className="flex items-center justify-center gap-2 bg-background text-foreground px-6 py-3 font-semibold border-2 border-foreground hover:bg-muted"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}
