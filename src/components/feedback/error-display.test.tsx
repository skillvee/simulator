/**
 * ErrorDisplay Component Tests
 *
 * Tests error display, inline error, and session recovery prompt components
 * using the test factory pattern.
 *
 * @since 2026-01-18
 * @see Issue #98: REF-008
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ErrorDisplay,
  InlineError,
  SessionRecoveryPrompt,
} from "./error-display";
import type { CategorizedError, ErrorCategory } from "@/lib/core";

// ============================================================================
// Test Factory
// ============================================================================

/**
 * Factory function to create mock CategorizedError objects.
 * Demonstrates the factory pattern for test data creation.
 */
function createMockError(
  overrides?: Partial<CategorizedError>
): CategorizedError {
  return {
    category: "unknown",
    message: "An error occurred",
    userMessage: "Something went wrong. Please try again.",
    isRetryable: true,
    recoveryAction: "Try Again",
    ...overrides,
  };
}

// ============================================================================
// ErrorDisplay Component Tests
// ============================================================================

describe("ErrorDisplay", () => {
  describe("rendering", () => {
    it("renders error title based on category", () => {
      const error = createMockError({ category: "network" });
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText("Connection Issue")).toBeInTheDocument();
    });

    it("renders user-friendly message", () => {
      const userMessage = "Custom error message for users";
      const error = createMockError({ userMessage });
      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(userMessage)).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const error = createMockError();
      const { container } = render(
        <ErrorDisplay error={error} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("error categories", () => {
    const categoryTests: Array<{ category: ErrorCategory; title: string }> = [
      { category: "network", title: "Connection Issue" },
      { category: "permission", title: "Permission Required" },
      { category: "api", title: "Service Error" },
      { category: "session", title: "Session Expired" },
      { category: "browser", title: "Browser Not Supported" },
      { category: "resource", title: "Not Available" },
      { category: "unknown", title: "Something Went Wrong" },
    ];

    categoryTests.forEach(({ category, title }) => {
      it(`shows correct title for ${category} error`, () => {
        const error = createMockError({ category });
        render(<ErrorDisplay error={error} />);

        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });
  });

  describe("retry functionality", () => {
    it("shows retry button for retryable errors", () => {
      const error = createMockError({ isRetryable: true });
      const onRetry = vi.fn();
      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", () => {
      const error = createMockError({ isRetryable: true });
      const onRetry = vi.fn();
      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("disables retry button when isRetrying is true", () => {
      const error = createMockError({ isRetryable: true });
      render(<ErrorDisplay error={error} onRetry={() => {}} isRetrying />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("shows retry progress when retrying", () => {
      const error = createMockError({ isRetryable: true });
      render(
        <ErrorDisplay
          error={error}
          onRetry={() => {}}
          isRetrying
          retryCount={2}
          maxRetries={3}
        />
      );

      // Check for the progress indicator specifically
      expect(screen.getByText("Retrying... (2/3)")).toBeInTheDocument();
    });

    it("does not show retry button for non-retryable errors without onRetry", () => {
      // Use an error without a recoveryAction to avoid the recovery button
      const error = createMockError({
        isRetryable: false,
        recoveryAction: undefined,
      });
      render(<ErrorDisplay error={error} />);

      // No buttons should be present
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("fallback functionality", () => {
    it("shows fallback button when showFallbackOption is true", () => {
      const error = createMockError();
      const onFallback = vi.fn();
      render(
        <ErrorDisplay
          error={error}
          onFallback={onFallback}
          showFallbackOption
        />
      );

      expect(
        screen.getByRole("button", { name: /continue with text/i })
      ).toBeInTheDocument();
    });

    it("uses custom fallback label", () => {
      const error = createMockError();
      render(
        <ErrorDisplay
          error={error}
          onFallback={() => {}}
          fallbackLabel="Switch to chat"
          showFallbackOption
        />
      );

      expect(
        screen.getByRole("button", { name: /switch to chat/i })
      ).toBeInTheDocument();
    });

    it("calls onFallback when fallback button is clicked", () => {
      const error = createMockError();
      const onFallback = vi.fn();
      render(
        <ErrorDisplay
          error={error}
          onFallback={onFallback}
          showFallbackOption
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /continue with text/i })
      );
      expect(onFallback).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// InlineError Component Tests
// ============================================================================

describe("InlineError", () => {
  it("renders error message", () => {
    render(<InlineError message="Connection failed" />);

    expect(screen.getByText("Connection failed")).toBeInTheDocument();
  });

  it("shows retry button when onRetry is provided", () => {
    render(<InlineError message="Error" onRetry={() => {}} />);

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = vi.fn();
    render(<InlineError message="Error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows retrying state", () => {
    render(<InlineError message="Error" onRetry={() => {}} isRetrying />);

    expect(screen.getByText("Retrying")).toBeInTheDocument();
  });

  it("disables retry button when retrying", () => {
    render(<InlineError message="Error" onRetry={() => {}} isRetrying />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies custom className", () => {
    const { container } = render(
      <InlineError message="Error" className="custom-inline" />
    );

    expect(container.firstChild).toHaveClass("custom-inline");
  });
});

// ============================================================================
// SessionRecoveryPrompt Component Tests
// ============================================================================

describe("SessionRecoveryPrompt", () => {
  const defaultProps = {
    onRecover: vi.fn(),
    onStartFresh: vi.fn(),
    lastSaved: new Date("2026-01-15T10:30:00").toISOString(),
  };

  it("renders recovery prompt title", () => {
    render(<SessionRecoveryPrompt {...defaultProps} />);

    expect(screen.getByText("Resume Your Session?")).toBeInTheDocument();
  });

  it("displays formatted last saved time", () => {
    render(<SessionRecoveryPrompt {...defaultProps} />);

    // The exact format depends on locale, so just check it renders
    expect(screen.getByText(/We found a saved session/)).toBeInTheDocument();
  });

  it("displays progress summary when provided", () => {
    render(
      <SessionRecoveryPrompt
        {...defaultProps}
        progressSummary="Completed 5 of 10 tasks"
      />
    );

    expect(screen.getByText("Completed 5 of 10 tasks")).toBeInTheDocument();
  });

  it("calls onRecover when Resume Session is clicked", () => {
    const onRecover = vi.fn();
    render(<SessionRecoveryPrompt {...defaultProps} onRecover={onRecover} />);

    fireEvent.click(screen.getByRole("button", { name: /resume session/i }));
    expect(onRecover).toHaveBeenCalledTimes(1);
  });

  it("calls onStartFresh when Start Fresh is clicked", () => {
    const onStartFresh = vi.fn();
    render(
      <SessionRecoveryPrompt {...defaultProps} onStartFresh={onStartFresh} />
    );

    fireEvent.click(screen.getByRole("button", { name: /start fresh/i }));
    expect(onStartFresh).toHaveBeenCalledTimes(1);
  });
});
