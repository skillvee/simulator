import { describe, it, expect, vi, beforeEach } from "vitest";
import { logRequest } from "./request-logger";

vi.mock("@/server/db", () => ({
  db: {
    apiRequestLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { db } from "@/server/db";

const mockCreate = db.apiRequestLog.create as ReturnType<typeof vi.fn>;
const mockUpdate = db.apiRequestLog.update as ReturnType<typeof vi.fn>;

describe("request-logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logRequest", () => {
    it("should create a log entry with required fields", async () => {
      mockCreate.mockResolvedValue({ id: "log-1" });

      const tracker = await logRequest({
        method: "POST",
        path: "/api/chat",
        traceId: "trace-123",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          method: "POST",
          path: "/api/chat",
          traceId: "trace-123",
          statusCode: 0,
          durationMs: 0,
        }),
      });
      expect(tracker.complete).toBeDefined();
    });

    it("should include optional userId and assessmentId", async () => {
      mockCreate.mockResolvedValue({ id: "log-2" });

      await logRequest({
        method: "GET",
        path: "/api/data",
        traceId: "trace-456",
        userId: "user-1",
        assessmentId: "assessment-1",
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          assessmentId: "assessment-1",
        }),
      });
    });

    it("should sanitize sensitive fields from request body", async () => {
      mockCreate.mockResolvedValue({ id: "log-3" });

      await logRequest({
        method: "POST",
        path: "/api/auth",
        traceId: "trace-789",
        requestBody: {
          email: "user@test.com",
          password: "secret123",
          token: "abc",
          name: "Test User",
        },
      });

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.data.requestBody).toEqual({
        email: "user@test.com",
        password: "[REDACTED]",
        token: "[REDACTED]",
        name: "Test User",
      });
    });

    it("should update log entry on complete with status and duration", async () => {
      mockCreate.mockResolvedValue({ id: "log-4" });
      mockUpdate.mockResolvedValue({});

      const tracker = await logRequest({
        method: "POST",
        path: "/api/chat",
        traceId: "trace-abc",
      });

      await tracker.complete(200);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "log-4" },
        data: expect.objectContaining({
          statusCode: 200,
          errorMessage: undefined,
        }),
      });

      // Duration should be >= 0
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should update log entry on complete with error message", async () => {
      mockCreate.mockResolvedValue({ id: "log-5" });
      mockUpdate.mockResolvedValue({});

      const tracker = await logRequest({
        method: "POST",
        path: "/api/chat",
        traceId: "trace-err",
      });

      await tracker.complete(500, "Internal server error");

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "log-5" },
        data: expect.objectContaining({
          statusCode: 500,
          errorMessage: "Internal server error",
        }),
      });
    });

    it("should handle undefined requestBody gracefully", async () => {
      mockCreate.mockResolvedValue({ id: "log-6" });

      await logRequest({
        method: "GET",
        path: "/api/data",
        traceId: "trace-no-body",
      });

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.data.requestBody).toBeUndefined();
    });
  });
});
