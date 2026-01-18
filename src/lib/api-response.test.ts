import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { z } from "zod";
import { success, error, validationError } from "./api-response";

describe("API Response Helpers", () => {
  describe("success", () => {
    it("should return NextResponse with success: true and data", () => {
      const data = { id: "123", name: "Test" };
      const response = success(data);

      expect(response).toBeInstanceOf(NextResponse);
    });

    it("should include success: true in response body", async () => {
      const data = { assessment: { id: "abc" } };
      const response = success(data);

      const body = await response.json();
      expect(body).toEqual({
        success: true,
        data: { assessment: { id: "abc" } },
      });
    });

    it("should have 200 status by default", () => {
      const response = success({ test: true });
      expect(response.status).toBe(200);
    });

    it("should allow custom status code", () => {
      const response = success({ created: true }, 201);
      expect(response.status).toBe(201);
    });

    it("should work with primitive data types", async () => {
      const stringResponse = success("hello");
      const numberResponse = success(42);
      const boolResponse = success(true);
      const arrayResponse = success([1, 2, 3]);

      expect((await stringResponse.json()).data).toBe("hello");
      expect((await numberResponse.json()).data).toBe(42);
      expect((await boolResponse.json()).data).toBe(true);
      expect((await arrayResponse.json()).data).toEqual([1, 2, 3]);
    });

    it("should work with null data", async () => {
      const response = success(null);
      const body = await response.json();
      expect(body).toEqual({ success: true, data: null });
    });
  });

  describe("error", () => {
    it("should return NextResponse with success: false and error message", async () => {
      const response = error("Something went wrong", 500);

      expect(response).toBeInstanceOf(NextResponse);
      const body = await response.json();
      expect(body).toEqual({
        success: false,
        error: "Something went wrong",
      });
    });

    it("should use provided status code", () => {
      const response = error("Not found", 404);
      expect(response.status).toBe(404);
    });

    it("should include optional error code", async () => {
      const response = error("Not found", 404, "NOT_FOUND");
      const body = await response.json();

      expect(body).toEqual({
        success: false,
        error: "Not found",
        code: "NOT_FOUND",
      });
    });

    it("should work with common HTTP status codes", () => {
      expect(error("Bad request", 400).status).toBe(400);
      expect(error("Unauthorized", 401).status).toBe(401);
      expect(error("Forbidden", 403).status).toBe(403);
      expect(error("Not found", 404).status).toBe(404);
      expect(error("Internal error", 500).status).toBe(500);
    });
  });

  describe("validationError", () => {
    it("should return 400 status for validation errors", () => {
      const schema = z.object({ email: z.string().email() });
      const result = schema.safeParse({ email: "invalid" });

      if (!result.success) {
        const response = validationError(result.error);
        expect(response.status).toBe(400);
      }
    });

    it("should include success: false and error message", async () => {
      const schema = z.object({ email: z.string().email() });
      const result = schema.safeParse({ email: "invalid" });

      if (!result.success) {
        const response = validationError(result.error);
        const body = await response.json();

        expect(body.success).toBe(false);
        expect(body.error).toBe("Validation failed");
        expect(body.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should include Zod error details", async () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });
      const result = schema.safeParse({ email: "invalid", age: 10 });

      if (!result.success) {
        const response = validationError(result.error);
        const body = await response.json();

        expect(body.details).toBeDefined();
        expect(Array.isArray(body.details)).toBe(true);
        expect(body.details.length).toBe(2);
      }
    });

    it("should format Zod issues with path and message", async () => {
      const schema = z.object({ name: z.string().min(1) });
      const result = schema.safeParse({ name: "" });

      if (!result.success) {
        const response = validationError(result.error);
        const body = await response.json();

        expect(body.details[0]).toHaveProperty("path");
        expect(body.details[0]).toHaveProperty("message");
      }
    });
  });
});
