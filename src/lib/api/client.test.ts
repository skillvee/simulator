import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiClientError, buildTracedHeaders } from "./client";

// Mock the tracing module so trace IDs are predictable
vi.mock("@/lib/tracing", () => ({
  generateTraceId: vi.fn(() => "mock-trace-id"),
  TRACE_ID_HEADER: "x-trace-id",
}));

describe("api-client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("api function", () => {
    it("makes GET request by default", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      } as Response);

      await api("/api/test");

      expect(global.fetch).toHaveBeenCalledWith("/api/test", {
        method: "GET",
        headers: { "x-trace-id": "mock-trace-id", "Content-Type": "application/json" },
        body: undefined,
      });
    });

    it("makes POST request with JSON body", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 1 } }),
      } as Response);

      await api("/api/chat", {
        method: "POST",
        body: { message: "hello", coworkerId: "123" },
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/chat", {
        method: "POST",
        headers: { "x-trace-id": "mock-trace-id", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello", coworkerId: "123" }),
      });
    });

    it("supports PUT method", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
      } as Response);

      await api("/api/user", {
        method: "PUT",
        body: { name: "John" },
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/user", {
        method: "PUT",
        headers: { "x-trace-id": "mock-trace-id", "Content-Type": "application/json" },
        body: JSON.stringify({ name: "John" }),
      });
    });

    it("supports DELETE method", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      } as Response);

      await api("/api/user/123", { method: "DELETE" });

      expect(global.fetch).toHaveBeenCalledWith("/api/user/123", {
        method: "DELETE",
        headers: { "x-trace-id": "mock-trace-id", "Content-Type": "application/json" },
        body: undefined,
      });
    });

    it("supports PATCH method", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ patched: true }),
      } as Response);

      await api("/api/user/123", {
        method: "PATCH",
        body: { name: "Updated" },
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/user/123", {
        method: "PATCH",
        headers: { "x-trace-id": "mock-trace-id", "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
    });

    it("merges custom headers with default Content-Type", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "test" }),
      } as Response);

      await api("/api/test", {
        headers: { Authorization: "Bearer token123" },
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/test", {
        method: "GET",
        headers: {
          "x-trace-id": "mock-trace-id",
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        },
        body: undefined,
      });
    });

    it("returns data directly for non-standardized responses", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foo: "bar", baz: 123 }),
      } as Response);

      const result = await api<{ foo: string; baz: number }>("/api/legacy");

      expect(result).toEqual({ foo: "bar", baz: 123 });
    });

    it("extracts data from standardized success responses", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { token: "abc123", expiresAt: "2024-01-01" },
        }),
      } as Response);

      const result = await api<{ token: string; expiresAt: string }>(
        "/api/token"
      );

      expect(result).toEqual({ token: "abc123", expiresAt: "2024-01-01" });
    });

    it("throws ApiClientError on HTTP error response", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: "Assessment not found",
          code: "NOT_FOUND",
        }),
      } as Response);

      await expect(api("/api/assessment/123")).rejects.toThrow(ApiClientError);
      await expect(api("/api/assessment/123")).rejects.toMatchObject({
        message: "Assessment not found",
        code: "NOT_FOUND",
        status: 404,
      });
    });

    it("throws ApiClientError when success is false", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
        }),
      } as Response);

      await expect(api("/api/validate")).rejects.toThrow(ApiClientError);
      await expect(api("/api/validate")).rejects.toMatchObject({
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        status: 200,
      });
    });

    it("uses default error message when none provided", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      await expect(api("/api/fail")).rejects.toThrow("Request failed");
    });
  });

  describe("buildTracedHeaders", () => {
    it("should include x-trace-id header with provided traceId", () => {
      const headers = buildTracedHeaders("custom-trace-id");
      expect(headers["x-trace-id"]).toBe("custom-trace-id");
    });

    it("should generate a trace ID when none provided", () => {
      const headers = buildTracedHeaders();
      expect(headers["x-trace-id"]).toBe("mock-trace-id");
    });

    it("should merge extra headers", () => {
      const headers = buildTracedHeaders("trace-1", {
        "Content-Type": "application/json",
      });
      expect(headers["x-trace-id"]).toBe("trace-1");
      expect(headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("ApiClientError", () => {
    it("is an instance of Error", () => {
      const error = new ApiClientError("Test error");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiClientError);
    });

    it("stores message, code, and status", () => {
      const error = new ApiClientError("Not found", "NOT_FOUND", 404);
      expect(error.message).toBe("Not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.status).toBe(404);
    });

    it("has correct name property", () => {
      const error = new ApiClientError("Test");
      expect(error.name).toBe("ApiClientError");
    });
  });
});
