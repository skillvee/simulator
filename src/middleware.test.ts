import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

/**
 * Test security headers applied by middleware.
 *
 * We test the applySecurityHeaders logic directly by importing the middleware
 * and checking headers on responses for different route patterns.
 */

// Mock auth to pass through to the callback
const middlewareCallback = vi.fn();
vi.mock("@/auth", () => ({
  auth: (cb: (...args: unknown[]) => unknown) => {
    middlewareCallback.mockImplementation(cb);
    return cb;
  },
}));

// Mock next-intl/middleware to pass through requests
vi.mock("next-intl/middleware", () => ({
  default: () => (req: any) => NextResponse.next(),
}));

// Mock i18n routing
vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["en", "es"],
    defaultLocale: "en",
  },
}))

vi.mock("@/lib/rate-limiter", () => ({
  aiChatLimiter: {},
  aiGenerationLimiter: {},
  aiAnalysisLimiter: {},
  applyRateLimit: () => ({ limited: false, remaining: 10 }),
}));

const EXPECTED_BASE_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-XSS-Protection": "0",
};

const EXPECTED_ASSESSMENT_HEADERS = {
  ...EXPECTED_BASE_HEADERS,
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
};

function createMockRequest(pathname: string, user?: { id: string; role: string }) {
  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    auth: user ? { user } : null,
    headers: new Headers(),
    ip: "127.0.0.1",
  };
}

describe("middleware security headers", () => {
  beforeEach(async () => {
    // Import middleware to register the callback
    vi.resetModules();
    await import("./middleware");
  });

  it("adds base security headers to public page routes", async () => {
    const req = createMockRequest("/en/sign-in");
    const response = middlewareCallback(req) as NextResponse;

    for (const [key, value] of Object.entries(EXPECTED_BASE_HEADERS)) {
      expect(response.headers.get(key)).toBe(value);
    }
  });

  it("adds base security headers to auth routes", async () => {
    const req = createMockRequest("/api/auth/callback");
    const response = middlewareCallback(req) as NextResponse;

    for (const [key, value] of Object.entries(EXPECTED_BASE_HEADERS)) {
      expect(response.headers.get(key)).toBe(value);
    }
  });

  it("adds base security headers to authenticated API routes", async () => {
    const req = createMockRequest("/api/some-endpoint", { id: "1", role: "USER" });
    const response = middlewareCallback(req) as NextResponse;

    for (const [key, value] of Object.entries(EXPECTED_BASE_HEADERS)) {
      expect(response.headers.get(key)).toBe(value);
    }
  });

  it("adds base security headers to 401 responses", async () => {
    const req = createMockRequest("/api/protected");
    const response = middlewareCallback(req) as NextResponse;

    expect(response.status).toBe(401);
    for (const [key, value] of Object.entries(EXPECTED_BASE_HEADERS)) {
      expect(response.headers.get(key)).toBe(value);
    }
  });

  it("adds assessment headers with camera/microphone for assessment routes", async () => {
    const req = createMockRequest("/en/assessments/test-123/work", { id: "1", role: "USER" });
    const response = middlewareCallback(req) as NextResponse;

    for (const [key, value] of Object.entries(EXPECTED_ASSESSMENT_HEADERS)) {
      expect(response.headers.get(key)).toBe(value);
    }
  });

  it("uses restrictive camera/microphone policy for non-assessment routes", async () => {
    const req = createMockRequest("/api/auth/callback");
    const response = middlewareCallback(req) as NextResponse;

    expect(response.headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()"
    );
  });

  it("adds security headers to redirect responses", async () => {
    const req = createMockRequest("/en/recruiter/dashboard");
    // No auth — should redirect to sign-in
    const response = middlewareCallback(req) as NextResponse;

    expect(response.status).toBe(307);
    // Recruiter routes get assessment headers (camera/microphone enabled)
    for (const [key, value] of Object.entries(EXPECTED_ASSESSMENT_HEADERS)) {
      expect(response.headers.get(key)).toBe(value);
    }
  });

  it("adds security headers to admin 403 responses", async () => {
    const req = createMockRequest("/api/admin/users", { id: "1", role: "USER" });
    const response = middlewareCallback(req) as NextResponse;

    expect(response.status).toBe(403);
    for (const [key, value] of Object.entries(EXPECTED_BASE_HEADERS)) {
      expect(response.headers.get(key)).toBe(value);
    }
  });
});
