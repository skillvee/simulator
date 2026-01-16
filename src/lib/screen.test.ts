import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkScreenCaptureSupport,
  isStreamActive,
  onStreamEnded,
  type ScreenPermissionState,
} from "./screen";

describe("screen utilities", () => {
  describe("checkScreenCaptureSupport", () => {
    it("should return false when window is undefined", () => {
      const originalWindow = global.window;
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });
      expect(checkScreenCaptureSupport()).toBe(false);
      Object.defineProperty(global, "window", {
        value: originalWindow,
        writable: true,
      });
    });

    it("should return false when getDisplayMedia is not available", () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, "navigator", {
        value: { mediaDevices: {} },
        writable: true,
      });
      expect(checkScreenCaptureSupport()).toBe(false);
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });

    it("should return true when getDisplayMedia is available", () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, "navigator", {
        value: { mediaDevices: { getDisplayMedia: vi.fn() } },
        writable: true,
      });
      expect(checkScreenCaptureSupport()).toBe(true);
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });
  });

  describe("isStreamActive", () => {
    it("should return false for null stream", () => {
      expect(isStreamActive(null)).toBe(false);
    });

    it("should return false when no tracks are live", () => {
      const mockStream = {
        getTracks: () => [
          { readyState: "ended" },
          { readyState: "ended" },
        ],
      } as unknown as MediaStream;
      expect(isStreamActive(mockStream)).toBe(false);
    });

    it("should return true when at least one track is live", () => {
      const mockStream = {
        getTracks: () => [
          { readyState: "ended" },
          { readyState: "live" },
        ],
      } as unknown as MediaStream;
      expect(isStreamActive(mockStream)).toBe(true);
    });
  });

  describe("onStreamEnded", () => {
    it("should add ended event listener and return cleanup function", () => {
      const mockCallback = vi.fn();
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();

      const mockTrack = {
        addEventListener,
        removeEventListener,
      };

      const mockStream = {
        getVideoTracks: () => [mockTrack],
      } as unknown as MediaStream;

      const cleanup = onStreamEnded(mockStream, mockCallback);

      expect(addEventListener).toHaveBeenCalledWith("ended", expect.any(Function));

      // Call cleanup
      cleanup();
      expect(removeEventListener).toHaveBeenCalledWith("ended", expect.any(Function));
    });

    it("should return no-op if no video track exists", () => {
      const mockCallback = vi.fn();
      const mockStream = {
        getVideoTracks: () => [],
      } as unknown as MediaStream;

      const cleanup = onStreamEnded(mockStream, mockCallback);
      expect(typeof cleanup).toBe("function");
      cleanup(); // Should not throw
    });

    it("should call callback when track ends", () => {
      const mockCallback = vi.fn();
      let endedHandler: (() => void) | null = null;

      const mockTrack = {
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === "ended") {
            endedHandler = handler;
          }
        }),
        removeEventListener: vi.fn(),
      };

      const mockStream = {
        getVideoTracks: () => [mockTrack],
      } as unknown as MediaStream;

      onStreamEnded(mockStream, mockCallback);

      // Simulate track ending
      expect(endedHandler).not.toBeNull();
      endedHandler!();
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe("ScreenPermissionState type", () => {
    it("should accept valid permission states", () => {
      const states: ScreenPermissionState[] = [
        "prompt",
        "granted",
        "denied",
        "unavailable",
        "stopped",
      ];
      expect(states).toHaveLength(5);
    });
  });
});
