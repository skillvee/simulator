import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundaryFallback } from "./error-boundary-fallback";

describe("ErrorBoundaryFallback", () => {
  const mockFetch = vi.fn().mockResolvedValue({ ok: true });
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const defaultError = Object.assign(new Error("Test error"), {
    digest: "test-digest",
    stack: "Error: Test error\n    at TestComponent",
  });

  it("renders error message and try again button", () => {
    render(
      <ErrorBoundaryFallback error={defaultError} reset={vi.fn()} />
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls reset when try again is clicked", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<ErrorBoundaryFallback error={defaultError} reset={reset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("reports error to /api/errors on mount", () => {
    render(
      <ErrorBoundaryFallback
        error={defaultError}
        reset={vi.fn()}
        context="root"
      />
    );

    expect(mockFetch).toHaveBeenCalledWith("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining('"errorType":"REACT_BOUNDARY"'),
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message).toBe("Test error");
    expect(body.metadata.context).toBe("root");
    expect(body.metadata.digest).toBe("test-digest");
  });

  it("includes assessmentId when provided", () => {
    render(
      <ErrorBoundaryFallback
        error={defaultError}
        reset={vi.fn()}
        context="assessment-work"
        assessmentId="abc-123"
      />
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.assessmentId).toBe("abc-123");
  });

  it("does not include assessmentId when not provided", () => {
    render(
      <ErrorBoundaryFallback error={defaultError} reset={vi.fn()} />
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.assessmentId).toBeUndefined();
  });

  it("silently handles fetch failure", () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    // Should not throw
    expect(() =>
      render(<ErrorBoundaryFallback error={defaultError} reset={vi.fn()} />)
    ).not.toThrow();
  });

  it("includes stack trace in error report", () => {
    render(
      <ErrorBoundaryFallback error={defaultError} reset={vi.fn()} />
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.stackTrace).toContain("TestComponent");
  });
});
