import { describe, it, expect } from "vitest";
import { generateTraceId, getTraceId, TRACE_ID_HEADER } from "./trace";

describe("trace", () => {
  describe("generateTraceId", () => {
    it("should return a UUID string", () => {
      const traceId = generateTraceId();
      // UUID v4 format: 8-4-4-4-12 hex digits
      expect(traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("should return unique IDs on each call", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("getTraceId", () => {
    it("should return existing trace ID from request header", () => {
      const existingId = "existing-trace-id-123";
      const request = new Request("https://example.com/api/test", {
        headers: { [TRACE_ID_HEADER]: existingId },
      });

      expect(getTraceId(request)).toBe(existingId);
    });

    it("should generate a new trace ID when header is missing", () => {
      const request = new Request("https://example.com/api/test");
      const traceId = getTraceId(request);

      expect(traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("should generate a new trace ID when header is empty", () => {
      const request = new Request("https://example.com/api/test", {
        headers: { [TRACE_ID_HEADER]: "" },
      });
      const traceId = getTraceId(request);

      // Empty string is falsy, so a new UUID should be generated
      expect(traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe("TRACE_ID_HEADER", () => {
    it("should be x-trace-id", () => {
      expect(TRACE_ID_HEADER).toBe("x-trace-id");
    });
  });
});
