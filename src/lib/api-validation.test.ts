/**
 * Tests for API Validation Helper
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { validateRequest } from "./api-validation";

describe("validateRequest", () => {
  const TestSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns data on valid input", async () => {
    const request = new Request("http://test.com", {
      method: "POST",
      body: JSON.stringify({ name: "John", age: 30 }),
    });

    const result = await validateRequest(request, TestSchema);

    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data).toEqual({ name: "John", age: 30 });
    }
  });

  it("returns error on invalid input - missing field", async () => {
    const request = new Request("http://test.com", {
      method: "POST",
      body: JSON.stringify({ name: "John" }),
    });

    const result = await validateRequest(request, TestSchema);

    expect(result).toHaveProperty("error");
    if ("error" in result) {
      const response = result.error;
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "age" }),
        ])
      );
    }
  });

  it("returns error on invalid input - wrong type", async () => {
    const request = new Request("http://test.com", {
      method: "POST",
      body: JSON.stringify({ name: "John", age: "not a number" }),
    });

    const result = await validateRequest(request, TestSchema);

    expect(result).toHaveProperty("error");
    if ("error" in result) {
      const response = result.error;
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation failed");
    }
  });

  it("returns error on invalid JSON", async () => {
    const request = new Request("http://test.com", {
      method: "POST",
      body: "not valid json",
    });

    const result = await validateRequest(request, TestSchema);

    expect(result).toHaveProperty("error");
    if ("error" in result) {
      const response = result.error;
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe("INVALID_JSON");
    }
  });

  it("returns error on empty body", async () => {
    const request = new Request("http://test.com", {
      method: "POST",
      body: "",
    });

    const result = await validateRequest(request, TestSchema);

    expect(result).toHaveProperty("error");
    if ("error" in result) {
      const response = result.error;
      expect(response.status).toBe(400);
    }
  });

  it("validates nested objects", async () => {
    const NestedSchema = z.object({
      user: z.object({
        email: z.string().email(),
      }),
    });

    const request = new Request("http://test.com", {
      method: "POST",
      body: JSON.stringify({ user: { email: "invalid" } }),
    });

    const result = await validateRequest(request, NestedSchema);

    expect(result).toHaveProperty("error");
    if ("error" in result) {
      const response = result.error;
      const body = await response.json();
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "user.email" }),
        ])
      );
    }
  });

  it("validates optional fields correctly", async () => {
    const OptionalSchema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });

    const request = new Request("http://test.com", {
      method: "POST",
      body: JSON.stringify({ required: "value" }),
    });

    const result = await validateRequest(request, OptionalSchema);

    expect(result).toHaveProperty("data");
    if ("data" in result) {
      expect(result.data).toEqual({ required: "value" });
    }
  });
});
