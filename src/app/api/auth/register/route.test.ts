import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// Mock the database - note: findUnique removed in DI-003 (race condition fix)
const mockCreate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    user: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// Mock bcrypt - source uses named import { hash }
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed_password"),
}));

// Import after mocks
import { POST } from "./route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a new user with valid email and password", async () => {
    mockCreate.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      role: "USER",
    });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe("test@example.com");
    expect(data.user.role).toBe("USER");
  });

  it("rejects registration with missing email", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toContainEqual(
      expect.objectContaining({ path: "email" })
    );
  });

  it("rejects registration with missing password", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toContainEqual(
      expect.objectContaining({ path: "password" })
    );
  });

  it("rejects registration with password less than 8 characters", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "short",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toContainEqual(
      expect.objectContaining({
        path: "password",
        message: "Password must be at least 8 characters",
      })
    );
  });

  it("rejects registration with invalid email format", async () => {
    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toContainEqual(
      expect.objectContaining({ path: "email", message: "Invalid email format" })
    );
  });

  // ============================================================================
  // Race Condition Prevention Tests (DI-003)
  // Uses P2002 error handling instead of check-then-create pattern
  // ============================================================================

  it("returns 409 when P2002 unique constraint error occurs (duplicate email)", async () => {
    // Simulate Prisma P2002 error for unique constraint violation
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the fields: (`email`)",
      {
        code: "P2002",
        clientVersion: "5.0.0",
        meta: { target: ["email"] },
      }
    );
    mockCreate.mockRejectedValue(prismaError);

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Email already registered");
  });

  it("handles race condition where concurrent registrations both attempt creation", async () => {
    // First call succeeds
    mockCreate
      .mockResolvedValueOnce({
        id: "user-123",
        email: "race@example.com",
        name: null,
        role: "USER",
      })
      // Second call fails with P2002 (unique constraint)
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed on the fields: (`email`)",
          {
            code: "P2002",
            clientVersion: "5.0.0",
            meta: { target: ["email"] },
          }
        )
      );

    const request1 = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "race@example.com",
        password: "password123",
      }),
    });

    const request2 = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "race@example.com",
        password: "password123",
      }),
    });

    // Simulate concurrent requests
    const [response1, response2] = await Promise.all([
      POST(request1),
      POST(request2),
    ]);

    // One should succeed (201), one should get proper duplicate error (409)
    const statuses = [response1.status, response2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it("does not expose internal Prisma error details to user", async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed on the constraint: `User_email_key`",
      {
        code: "P2002",
        clientVersion: "5.0.0",
        meta: { target: ["email"] },
      }
    );
    mockCreate.mockRejectedValue(prismaError);

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "existing@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    // User-friendly message, not internal Prisma details
    expect(data.error).toBe("Email already registered");
    expect(data.error).not.toContain("User_email_key");
    expect(data.error).not.toContain("constraint");
    expect(data.error).not.toContain("Prisma");
  });

  it("returns 500 for non-P2002 Prisma errors", async () => {
    // Different Prisma error (e.g., connection error P1001)
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Can't reach database server",
      {
        code: "P1001",
        clientVersion: "5.0.0",
      }
    );
    mockCreate.mockRejectedValue(prismaError);

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("returns 500 for non-Prisma database errors", async () => {
    mockCreate.mockRejectedValue(new Error("Unknown database error"));

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("creates user with USER role by default", async () => {
    mockCreate.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
    });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "USER",
        }),
      })
    );
  });

  it("hashes the password before storing", async () => {
    const bcrypt = await import("bcryptjs");
    mockCreate.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
    });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    await POST(request);

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          password: "hashed_password",
        }),
      })
    );
  });

  it("does not return password in response", async () => {
    mockCreate.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
      password: "hashed_password",
    });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.user.password).toBeUndefined();
  });

  it("sets emailVerified to current date for credentials registration", async () => {
    mockCreate.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "USER",
    });

    const request = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailVerified: expect.any(Date),
        }),
      })
    );
  });
});
