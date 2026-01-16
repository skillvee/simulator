import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  categorizeError,
  calculateBackoffDelay,
  withRetry,
  createConnectionMonitor,
  saveProgress,
  loadProgress,
  clearProgress,
  hasRecentProgress,
  getProgressStorageKey,
} from "./error-recovery";

describe("error-recovery", () => {
  describe("categorizeError", () => {
    it("categorizes permission errors correctly", () => {
      const result = categorizeError(new Error("Permission denied"));
      expect(result.category).toBe("permission");
      expect(result.isRetryable).toBe(false);
    });

    it("categorizes NotAllowedError correctly", () => {
      const error = new DOMException("User denied permission", "NotAllowedError");
      const result = categorizeError(error);
      expect(result.category).toBe("permission");
      expect(result.isRetryable).toBe(false);
    });

    it("categorizes network errors correctly", () => {
      const result = categorizeError(new Error("Failed to fetch"));
      expect(result.category).toBe("network");
      expect(result.isRetryable).toBe(true);
    });

    it("categorizes timeout errors correctly", () => {
      const result = categorizeError(new Error("Request timeout"));
      expect(result.category).toBe("network");
      expect(result.isRetryable).toBe(true);
    });

    it("categorizes API rate limit errors correctly", () => {
      const result = categorizeError(new Error("Rate limit exceeded 429"));
      expect(result.category).toBe("api");
      expect(result.isRetryable).toBe(true);
    });

    it("categorizes session errors correctly", () => {
      const result = categorizeError(new Error("Session expired"));
      expect(result.category).toBe("session");
      expect(result.isRetryable).toBe(false);
    });

    it("categorizes 401 errors as session errors", () => {
      const result = categorizeError(new Error("401 Unauthorized"));
      expect(result.category).toBe("session");
      expect(result.isRetryable).toBe(false);
    });

    it("categorizes browser compatibility errors correctly", () => {
      const error = new DOMException("Feature not supported", "NotSupportedError");
      const result = categorizeError(error);
      expect(result.category).toBe("browser");
      expect(result.isRetryable).toBe(false);
    });

    it("categorizes resource not found errors correctly", () => {
      const result = categorizeError(new Error("Resource not found 404"));
      expect(result.category).toBe("resource");
      expect(result.isRetryable).toBe(false);
    });

    it("categorizes unknown errors with default retryable", () => {
      const result = categorizeError(new Error("Some random error"));
      expect(result.category).toBe("unknown");
      expect(result.isRetryable).toBe(true);
    });

    it("handles non-Error objects", () => {
      const result = categorizeError("string error");
      expect(result.message).toBe("string error");
    });

    it("provides user-friendly messages", () => {
      const result = categorizeError(new Error("Network error"));
      expect(result.userMessage).toBeTruthy();
      expect(result.userMessage.length).toBeGreaterThan(10);
    });

    it("provides recovery actions", () => {
      const result = categorizeError(new Error("Network error"));
      expect(result.recoveryAction).toBeTruthy();
    });
  });

  describe("calculateBackoffDelay", () => {
    it("calculates exponential backoff", () => {
      const delay0 = calculateBackoffDelay(0, 1000, 30000);
      const delay1 = calculateBackoffDelay(1, 1000, 30000);
      const delay2 = calculateBackoffDelay(2, 1000, 30000);

      // Base delay should be around 1000ms (with some jitter)
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(1250); // 1000 + 25% jitter

      // Second attempt should be around 2000ms
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2500);

      // Third attempt should be around 4000ms
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(5000);
    });

    it("respects max delay", () => {
      const delay = calculateBackoffDelay(10, 1000, 5000);
      expect(delay).toBeLessThanOrEqual(6250); // 5000 + 25% jitter
    });

    it("returns integer values", () => {
      const delay = calculateBackoffDelay(1, 1000, 30000);
      expect(Number.isInteger(delay)).toBe(true);
    });
  });

  describe("withRetry", () => {
    it("returns result on success", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const result = await withRetry(operation);
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("retries on retryable errors", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const result = await withRetry(operation, {
        maxAttempts: 3,
        baseDelayMs: 10,
      });

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("does not retry non-retryable errors", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Permission denied"));

      await expect(
        withRetry(operation, { maxAttempts: 3, baseDelayMs: 10 })
      ).rejects.toThrow("Permission denied");

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("stops after max attempts", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        withRetry(operation, { maxAttempts: 3, baseDelayMs: 10 })
      ).rejects.toThrow("Network error");

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("calls onRetry callback", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const onRetry = vi.fn();

      await withRetry(operation, {
        maxAttempts: 3,
        baseDelayMs: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Object), expect.any(Number));
    });
  });

  describe("createConnectionMonitor", () => {
    it("starts with connected health", () => {
      const monitor = createConnectionMonitor();
      expect(monitor.getStatus().health).toBe("connected");
    });

    it("records success correctly", () => {
      const monitor = createConnectionMonitor();
      monitor.recordSuccess();
      const status = monitor.getStatus();
      expect(status.health).toBe("connected");
      expect(status.lastSuccessfulConnection).toBeInstanceOf(Date);
      expect(status.consecutiveFailures).toBe(0);
    });

    it("records single failure as degraded", () => {
      const monitor = createConnectionMonitor();
      monitor.recordFailure(new Error("Network error"));
      const status = monitor.getStatus();
      expect(status.health).toBe("degraded");
      expect(status.consecutiveFailures).toBe(1);
    });

    it("records multiple failures as disconnected", () => {
      const monitor = createConnectionMonitor();
      monitor.recordFailure(new Error("Error 1"));
      monitor.recordFailure(new Error("Error 2"));
      monitor.recordFailure(new Error("Error 3"));
      const status = monitor.getStatus();
      expect(status.health).toBe("disconnected");
      expect(status.consecutiveFailures).toBe(3);
    });

    it("resets state correctly", () => {
      const monitor = createConnectionMonitor();
      monitor.recordFailure(new Error("Error"));
      monitor.reset();
      const status = monitor.getStatus();
      expect(status.health).toBe("connected");
      expect(status.consecutiveFailures).toBe(0);
    });

    it("success resets failure count", () => {
      const monitor = createConnectionMonitor();
      monitor.recordFailure(new Error("Error"));
      monitor.recordSuccess();
      const status = monitor.getStatus();
      expect(status.consecutiveFailures).toBe(0);
      expect(status.health).toBe("connected");
    });
  });

  describe("progress storage", () => {
    // Use a simple mock storage object and override global localStorage
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
      mockStorage = {};
      // Create a proper mock localStorage object
      const localStorageMock = {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
        length: 0,
        key: () => null,
      };
      Object.defineProperty(global, "localStorage", {
        value: localStorageMock,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      mockStorage = {};
    });

    describe("getProgressStorageKey", () => {
      it("generates correct key format", () => {
        const key = getProgressStorageKey("assessment-123", "hr-interview");
        expect(key).toBe("progress-assessment-123-hr-interview");
      });
    });

    describe("saveProgress", () => {
      it("saves progress to localStorage", () => {
        saveProgress("assessment-123", "hr-interview", { transcript: [] });
        const stored = mockStorage["progress-assessment-123-hr-interview"];
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored);
        expect(parsed.assessmentId).toBe("assessment-123");
        expect(parsed.type).toBe("hr-interview");
        expect(parsed.data).toEqual({ transcript: [] });
      });

      it("includes timestamp", () => {
        saveProgress("assessment-123", "hr-interview", {});
        const stored = JSON.parse(mockStorage["progress-assessment-123-hr-interview"]);
        expect(stored.lastUpdated).toBeTruthy();
        expect(new Date(stored.lastUpdated)).toBeInstanceOf(Date);
      });
    });

    describe("loadProgress", () => {
      it("loads saved progress", () => {
        saveProgress("assessment-123", "hr-interview", { transcript: ["message"] });
        const progress = loadProgress("assessment-123", "hr-interview");
        expect(progress).toBeTruthy();
        expect(progress?.data.transcript).toEqual(["message"]);
      });

      it("returns null for non-existent progress", () => {
        const progress = loadProgress("non-existent", "hr-interview");
        expect(progress).toBeNull();
      });
    });

    describe("clearProgress", () => {
      it("removes saved progress", () => {
        saveProgress("assessment-123", "hr-interview", {});
        clearProgress("assessment-123", "hr-interview");
        const progress = loadProgress("assessment-123", "hr-interview");
        expect(progress).toBeNull();
      });
    });

    describe("hasRecentProgress", () => {
      it("returns true for recent progress", () => {
        saveProgress("assessment-123", "hr-interview", {});
        const hasRecent = hasRecentProgress("assessment-123", "hr-interview");
        expect(hasRecent).toBe(true);
      });

      it("returns false for no progress", () => {
        const hasRecent = hasRecentProgress("non-existent", "hr-interview");
        expect(hasRecent).toBe(false);
      });

      it("returns false for old progress", () => {
        // Save old progress by manipulating the timestamp
        const key = getProgressStorageKey("assessment-123", "hr-interview");
        mockStorage[key] = JSON.stringify({
          assessmentId: "assessment-123",
          type: "hr-interview",
          lastUpdated: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
          data: {},
        });

        const hasRecent = hasRecentProgress(
          "assessment-123",
          "hr-interview",
          24 * 60 * 60 * 1000 // 24 hours max age
        );
        expect(hasRecent).toBe(false);
      });
    });
  });
});
