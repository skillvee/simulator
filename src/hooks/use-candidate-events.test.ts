import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCandidateEvents } from "./use-candidate-events";

// Mock fetch and sendBeacon
const mockSendBeacon = vi.fn(() => true);
const mockFetch = vi.fn(() => Promise.resolve(new Response()));

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(navigator, "sendBeacon", {
    value: mockSendBeacon,
    writable: true,
    configurable: true,
  });
  global.fetch = mockFetch as unknown as typeof fetch;
  mockSendBeacon.mockClear();
  mockFetch.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCandidateEvents", () => {
  it("tracks visibilitychange events", () => {
    renderHook(() => useCandidateEvents("test-assessment"));

    // Simulate tab hidden
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // Simulate tab visible
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // Flush via interval
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    expect(mockSendBeacon).toHaveBeenCalledWith("/api/events", expect.any(Blob));
  });

  it("tracks paste events with length only", () => {
    renderHook(() => useCandidateEvents("test-assessment"));

    const pasteEvent = new Event("paste") as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: { getData: () => "hello world" },
    });
    document.dispatchEvent(pasteEvent);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
  });

  it("tracks copy events", () => {
    renderHook(() => useCandidateEvents("test-assessment"));

    document.dispatchEvent(new Event("copy"));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
  });

  it("detects idle after 60 seconds of inactivity", () => {
    renderHook(() => useCandidateEvents("test-assessment"));

    // Advance past idle timeout
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Flush buffer
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // Should have flushed IDLE_START
    expect(mockSendBeacon).toHaveBeenCalled();
  });

  it("detects idle end on activity after idle", () => {
    renderHook(() => useCandidateEvents("test-assessment"));

    // Go idle
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Resume activity
    act(() => {
      document.dispatchEvent(new MouseEvent("mousemove"));
    });

    // Flush
    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // Should have IDLE_START and IDLE_END
    expect(mockSendBeacon).toHaveBeenCalled();
  });

  it("buffers events and flushes every 5 seconds", () => {
    renderHook(() => useCandidateEvents("test-assessment"));

    document.dispatchEvent(new Event("copy"));

    // Not flushed yet at 3s
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(mockSendBeacon).not.toHaveBeenCalled();

    // Flushed at 5s
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
  });

  it("does not flush when buffer is empty", () => {
    renderHook(() => useCandidateEvents("test-assessment"));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  it("flushes on beforeunload", () => {
    renderHook(() => useCandidateEvents("test-assessment"));

    document.dispatchEvent(new Event("copy"));

    window.dispatchEvent(new Event("beforeunload"));

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
  });

  it("falls back to fetch when sendBeacon fails", () => {
    mockSendBeacon.mockReturnValueOnce(false);
    renderHook(() => useCandidateEvents("test-assessment"));

    document.dispatchEvent(new Event("copy"));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(mockSendBeacon).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
      })
    );
  });

  it("cleans up listeners on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useCandidateEvents("test-assessment"));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("paste", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("copy", expect.any(Function));
    removeSpy.mockRestore();
  });
});
