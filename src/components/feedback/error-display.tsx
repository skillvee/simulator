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
import { Card, CardContent, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

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
    <Card
      className={cn("border-destructive bg-destructive/5 shadow-sm", className)}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4 text-destructive">
            {getErrorIcon(error.category)}
          </div>

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
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  Retrying... ({retryCount}/{maxRetries})
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Retry button */}
            {error.isRetryable && onRetry && (
              <Button onClick={onRetry} disabled={isRetrying}>
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
              </Button>
            )}

            {/* Fallback option (e.g., switch to text mode) */}
            {showFallbackOption && onFallback && (
              <Button variant="outline" onClick={onFallback}>
                <MessageSquare className="h-4 w-4" />
                {fallbackLabel}
              </Button>
            )}

            {/* Non-retryable - show recovery action */}
            {!error.isRetryable && error.recoveryAction && !onFallback && (
              <Button
                onClick={() => {
                  if (error.category === "session") {
                    window.location.href = "/sign-in";
                  } else if (error.category === "browser") {
                    // Just show the message, user needs to use different browser
                  } else {
                    window.location.reload();
                  }
                }}
              >
                <ArrowRight className="h-4 w-4" />
                {error.recoveryAction}
              </Button>
            )}
          </div>

          {/* Technical details (collapsed by default in production) */}
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 w-full text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Technical Details
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted p-2 text-xs">
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
      </CardContent>
    </Card>
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
    <Card className={cn("border-destructive bg-destructive/10", className)}>
      <CardContent className="flex items-center justify-between gap-4 p-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{message}</span>
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-auto px-2 py-1"
          >
            <RefreshCw
              className={cn("h-3 w-3", isRetrying && "animate-spin")}
            />
            {isRetrying ? "Retrying" : "Retry"}
          </Button>
        )}
      </CardContent>
    </Card>
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
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>

          <h3 className="mb-2 text-xl font-bold">Resume Your Session?</h3>

          <p className="mb-2 text-muted-foreground">
            We found a saved session from {formattedTime}.
          </p>

          {progressSummary && (
            <p className="mb-4 text-sm text-muted-foreground">
              {progressSummary}
            </p>
          )}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onRecover}>
              <RefreshCw className="h-4 w-4" />
              Resume Session
            </Button>

            <Button variant="outline" onClick={onStartFresh}>
              Start Fresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
