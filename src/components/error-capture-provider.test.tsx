/**
 * ErrorCaptureProvider Tests
 *
 * Tests console monkey-patching, window error handlers,
 * batching/debounce, and assessmentId extraction.
 *
 * @see Issue #281: US-003
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ErrorCaptureProvider } from "./error-capture-provider";

// Mock next/navigation
const mockPathname = vi.fn(() => "/assessments/test-123/work");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Track fetch calls
const fetchCalls: { url: string; body: Record<string, unknown> }[] = [];

describe("ErrorCaptureProvider", () => {
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchCalls.length = 0;

    // Save originals before component patches them
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string, init?: RequestInit) => {
        if (init?.body) {
          fetchCalls.push({ url, body: JSON.parse(init.body as string) });
        }
        return { ok: true };
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Restore console methods in case cleanup didn't run
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  it("preserves original console behavior", () => {
    const spy = vi.fn();
    console.error = spy;

    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.error("test error");
    expect(spy).toHaveBeenCalledWith("test error");

    unmount();
  });

  it("captures console.error and posts to /api/errors", () => {
    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.error("something broke");

    // Advance timer to trigger flush
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe("/api/errors");
    expect(fetchCalls[0].body.errorType).toBe("CONSOLE_ERROR");
    expect(fetchCalls[0].body.message).toBe("something broke");

    unmount();
  });

  it("captures console.warn", () => {
    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.warn("a warning");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.errorType).toBe("CONSOLE_WARN");
    expect(fetchCalls[0].body.message).toBe("a warning");

    unmount();
  });

  it("captures console.log", () => {
    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.log("a log message");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.errorType).toBe("CONSOLE_LOG");
    expect(fetchCalls[0].body.message).toBe("a log message");

    unmount();
  });

  it("batches multiple errors within 1 second", () => {
    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.error("error 1");
    console.warn("warning 1");
    console.log("log 1");

    // Not yet flushed
    expect(fetchCalls).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // All three sent in one batch
    expect(fetchCalls).toHaveLength(3);

    unmount();
  });

  it("extracts assessmentId from URL pathname", () => {
    mockPathname.mockReturnValue("/assessments/my-assessment-id/work");

    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.error("test");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchCalls[0].body.assessmentId).toBe("my-assessment-id");

    unmount();
  });

  it("does not include assessmentId when not on assessment page", () => {
    mockPathname.mockReturnValue("/dashboard");

    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.error("test");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchCalls[0].body.assessmentId).toBeUndefined();

    unmount();
  });

  it("handles window.onerror for unhandled exceptions", () => {
    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    const errorEvent = new ErrorEvent("error", {
      message: "Uncaught TypeError",
      error: new Error("Uncaught TypeError"),
      filename: "app.js",
      lineno: 42,
      colno: 10,
    });
    window.dispatchEvent(errorEvent);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.errorType).toBe("UNHANDLED_EXCEPTION");
    expect(fetchCalls[0].body.message).toBe("Uncaught TypeError");
    expect(fetchCalls[0].body.stackTrace).toBeDefined();
    expect(fetchCalls[0].body.metadata).toEqual(
      expect.objectContaining({ filename: "app.js", lineno: 42, colno: 10 })
    );

    unmount();
  });

  it("handles unhandled promise rejections", () => {
    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
      promise: Promise.resolve(),
      reason: new Error("Promise failed"),
    });
    window.dispatchEvent(rejectionEvent);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.errorType).toBe("UNHANDLED_EXCEPTION");
    expect(fetchCalls[0].body.message).toBe("Promise failed");
    expect(fetchCalls[0].body.metadata).toEqual(
      expect.objectContaining({ type: "unhandledrejection" })
    );

    unmount();
  });

  it("stringifies non-string console arguments", () => {
    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.error("context:", { key: "value" }, 42);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchCalls[0].body.message).toBe('context: {"key":"value"} 42');

    unmount();
  });

  it("restores console methods on unmount", () => {
    const origError = console.error;
    const origWarn = console.warn;
    const origLog = console.log;

    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    // Console methods are patched
    expect(console.error).not.toBe(origError);

    unmount();

    // Console methods are restored
    expect(console.error).toBe(origError);
    expect(console.warn).toBe(origWarn);
    expect(console.log).toBe(origLog);
  });

  it("flushes remaining buffer on unmount", () => {
    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    console.error("buffered error");

    // Unmount before timer fires — should flush immediately
    unmount();

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.message).toBe("buffered error");
  });

  it("silently drops fetch errors to avoid infinite loops", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    const { unmount } = render(
      <ErrorCaptureProvider>
        <div />
      </ErrorCaptureProvider>
    );

    // This should not throw or cause additional errors
    console.error("test");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // fetch was called but error was swallowed
    expect(global.fetch).toHaveBeenCalled();

    unmount();
  });
});
