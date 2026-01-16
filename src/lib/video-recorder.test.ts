import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkMediaRecorderSupport,
  getBestMimeType,
} from "./video-recorder";

describe("video-recorder", () => {
  describe("checkMediaRecorderSupport", () => {
    const originalMediaRecorder = global.MediaRecorder;

    afterEach(() => {
      // Restore original
      if (originalMediaRecorder) {
        global.MediaRecorder = originalMediaRecorder;
      } else {
        // @ts-expect-error - cleaning up mock
        delete global.MediaRecorder;
      }
    });

    it("returns false when MediaRecorder is not available", () => {
      // @ts-expect-error - testing undefined case
      delete global.MediaRecorder;
      expect(checkMediaRecorderSupport()).toBe(false);
    });

    it("returns false when isTypeSupported returns false", () => {
      global.MediaRecorder = {
        isTypeSupported: vi.fn().mockReturnValue(false),
      } as unknown as typeof MediaRecorder;
      expect(checkMediaRecorderSupport()).toBe(false);
    });

    it("returns true when isTypeSupported returns true", () => {
      global.MediaRecorder = {
        isTypeSupported: vi.fn().mockReturnValue(true),
      } as unknown as typeof MediaRecorder;
      expect(checkMediaRecorderSupport()).toBe(true);
    });

    it("checks the specified MIME type", () => {
      const mockIsTypeSupported = vi.fn().mockReturnValue(true);
      global.MediaRecorder = {
        isTypeSupported: mockIsTypeSupported,
      } as unknown as typeof MediaRecorder;

      checkMediaRecorderSupport("video/webm;codecs=vp8");
      expect(mockIsTypeSupported).toHaveBeenCalledWith("video/webm;codecs=vp8");
    });
  });

  describe("getBestMimeType", () => {
    const originalMediaRecorder = global.MediaRecorder;

    beforeEach(() => {
      // Default mock that supports all types
      global.MediaRecorder = {
        isTypeSupported: vi.fn().mockReturnValue(true),
      } as unknown as typeof MediaRecorder;
    });

    afterEach(() => {
      if (originalMediaRecorder) {
        global.MediaRecorder = originalMediaRecorder;
      } else {
        // @ts-expect-error - cleaning up mock
        delete global.MediaRecorder;
      }
    });

    it("returns vp9 codec as first preference", () => {
      expect(getBestMimeType()).toBe("video/webm;codecs=vp9");
    });

    it("falls back to vp8 if vp9 not supported", () => {
      const mockIsTypeSupported = vi.fn().mockImplementation((type: string) => {
        return type !== "video/webm;codecs=vp9";
      });
      global.MediaRecorder = {
        isTypeSupported: mockIsTypeSupported,
      } as unknown as typeof MediaRecorder;

      expect(getBestMimeType()).toBe("video/webm;codecs=vp8");
    });

    it("falls back to plain webm if codecs not supported", () => {
      const mockIsTypeSupported = vi.fn().mockImplementation((type: string) => {
        return type === "video/webm";
      });
      global.MediaRecorder = {
        isTypeSupported: mockIsTypeSupported,
      } as unknown as typeof MediaRecorder;

      expect(getBestMimeType()).toBe("video/webm");
    });

    it("falls back to mp4 if webm not supported", () => {
      const mockIsTypeSupported = vi.fn().mockImplementation((type: string) => {
        return type === "video/mp4";
      });
      global.MediaRecorder = {
        isTypeSupported: mockIsTypeSupported,
      } as unknown as typeof MediaRecorder;

      expect(getBestMimeType()).toBe("video/mp4");
    });

    it("returns empty string if nothing supported", () => {
      const mockIsTypeSupported = vi.fn().mockReturnValue(false);
      global.MediaRecorder = {
        isTypeSupported: mockIsTypeSupported,
      } as unknown as typeof MediaRecorder;

      expect(getBestMimeType()).toBe("");
    });
  });
});
