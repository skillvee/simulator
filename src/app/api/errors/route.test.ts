import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockClientErrorCreate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    clientError: {
      create: (...args: unknown[]) => mockClientErrorCreate(...args),
    },
  },
}));

// Mock rate limiter
const mockApplyRateLimit = vi.fn();
vi.mock("@/lib/rate-limiter", () => ({
  clientErrorLimiter: {},
  applyRateLimit: (...args: unknown[]) => mockApplyRateLimit(...args),
  getClientIp: () => "127.0.0.1",
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  errorType: "UNHANDLED_EXCEPTION",
  message: "Cannot read properties of undefined",
  url: "http://localhost:3000/work",
  stackTrace: "Error: at Component.render",
  componentName: "ChatPanel",
  assessmentId: "assess-1",
  metadata: { browser: "Chrome" },
};

describe("POST /api/errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApplyRateLimit.mockReturnValue({ limited: false, remaining: 49 });
  });

  it("should return 201 on successful error report", async () => {
    mockAuth.mockResolvedValue(null);
    mockClientErrorCreate.mockResolvedValue({ id: "error-1" });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBe("error-1");
  });

  it("should work without authentication", async () => {
    mockAuth.mockResolvedValue(null);
    mockClientErrorCreate.mockResolvedValue({ id: "error-1" });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(201);
  });

  it("should extract userId from session when available", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    mockClientErrorCreate.mockResolvedValue({ id: "error-1" });

    await POST(makeRequest({
      errorType: "CONSOLE_ERROR",
      message: "Something broke",
      url: "/work",
    }));

    expect(mockClientErrorCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-123",
      }),
    });
  });

  it("should prefer body userId over session userId", async () => {
    mockAuth.mockResolvedValue({ user: { id: "session-user" } });
    mockClientErrorCreate.mockResolvedValue({ id: "error-1" });

    await POST(makeRequest({
      ...validBody,
      userId: "body-user",
    }));

    expect(mockClientErrorCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "body-user",
      }),
    });
  });

  it("should return 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue(null);

    // Missing message
    const response1 = await POST(makeRequest({
      errorType: "UNHANDLED_EXCEPTION",
      url: "/work",
    }));
    expect(response1.status).toBe(400);

    // Missing errorType
    const response2 = await POST(makeRequest({
      message: "Error",
      url: "/work",
    }));
    expect(response2.status).toBe(400);

    // Missing url
    const response3 = await POST(makeRequest({
      errorType: "UNHANDLED_EXCEPTION",
      message: "Error",
    }));
    expect(response3.status).toBe(400);
  });

  it("should return 400 for invalid errorType", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest({
      errorType: "INVALID_TYPE",
      message: "Error",
      url: "/work",
    }));
    expect(response.status).toBe(400);
  });

  it("should return 400 for invalid JSON", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 429 when rate limited", async () => {
    mockAuth.mockResolvedValue(null);
    mockApplyRateLimit.mockReturnValue({ limited: true, remaining: 0 });

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("should rate limit by assessmentId when provided", async () => {
    mockAuth.mockResolvedValue(null);
    mockApplyRateLimit.mockReturnValue({ limited: false, remaining: 49 });
    mockClientErrorCreate.mockResolvedValue({ id: "error-1" });

    await POST(makeRequest(validBody));

    expect(mockApplyRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      expect.anything(),
      "assess-1"
    );
  });

  it("should rate limit by IP when no assessmentId", async () => {
    mockAuth.mockResolvedValue(null);
    mockApplyRateLimit.mockReturnValue({ limited: false, remaining: 49 });
    mockClientErrorCreate.mockResolvedValue({ id: "error-1" });

    await POST(makeRequest({
      errorType: "CONSOLE_ERROR",
      message: "Error",
      url: "/work",
    }));

    // Should use IP (from getClientIp mock: "127.0.0.1") since no assessmentId
    expect(mockApplyRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      expect.anything(),
      "127.0.0.1"
    );
  });

  it("should pass correct data to db.clientError.create", async () => {
    mockAuth.mockResolvedValue(null);
    mockClientErrorCreate.mockResolvedValue({ id: "error-1" });

    await POST(makeRequest(validBody));

    expect(mockClientErrorCreate).toHaveBeenCalledWith({
      data: {
        assessmentId: "assess-1",
        userId: undefined,
        errorType: "UNHANDLED_EXCEPTION",
        message: "Cannot read properties of undefined",
        stackTrace: "Error: at Component.render",
        componentName: "ChatPanel",
        url: "http://localhost:3000/work",
        timestamp: expect.any(Date),
        metadata: { browser: "Chrome" },
      },
    });
  });

  it("should handle optional fields gracefully", async () => {
    mockAuth.mockResolvedValue(null);
    mockClientErrorCreate.mockResolvedValue({ id: "error-1" });

    await POST(makeRequest({
      errorType: "CONSOLE_WARN",
      message: "Warning message",
      url: "/page",
    }));

    expect(mockClientErrorCreate).toHaveBeenCalledWith({
      data: {
        assessmentId: undefined,
        userId: undefined,
        errorType: "CONSOLE_WARN",
        message: "Warning message",
        stackTrace: undefined,
        componentName: undefined,
        url: "/page",
        timestamp: expect.any(Date),
        metadata: undefined,
      },
    });
  });

  it("should return 500 on database error", async () => {
    mockAuth.mockResolvedValue(null);
    mockClientErrorCreate.mockRejectedValue(new Error("DB error"));

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.success).toBe(false);
  });
});
