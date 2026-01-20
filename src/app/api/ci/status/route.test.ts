import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindUnique = vi.fn();
const mockAssessmentUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findUnique: (...args: unknown[]) => mockAssessmentFindUnique(...args),
      update: (...args: unknown[]) => mockAssessmentUpdate(...args),
    },
  },
}));

// Mock fetchPrCiStatus (now in @/lib/external)
const mockFetchPrCiStatus = vi.fn();
vi.mock("@/lib/external", () => ({
  fetchPrCiStatus: (...args: unknown[]) => mockFetchPrCiStatus(...args),
}));

import { GET, POST } from "./route";

describe("GET /api/ci/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/ci/status?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const request = new Request("http://localhost/api/ci/status");

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Assessment ID is required");
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/ci/status?assessmentId=nonexistent"
    );

    const response = await GET(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 403 when user does not own assessment", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-2",
      prUrl: "https://github.com/owner/repo/pull/123",
    });

    const request = new Request(
      "http://localhost/api/ci/status?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized to access this assessment");
  });

  it("should return 400 when no PR URL found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      prUrl: null,
    });

    const request = new Request(
      "http://localhost/api/ci/status?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No PR URL found for this assessment");
  });

  it("should return cached status if fresh", async () => {
    const cachedStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "success",
      checksCount: 2,
      checksCompleted: 2,
      checksPassed: 2,
      checksFailed: 0,
      checks: [],
    };

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      prUrl: "https://github.com/owner/repo/pull/123",
      ciStatus: cachedStatus,
    });

    const request = new Request(
      "http://localhost/api/ci/status?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.cached).toBe(true);
    expect(data.ciStatus.overallStatus).toBe("success");
    expect(mockFetchPrCiStatus).not.toHaveBeenCalled();
  });

  it("should fetch fresh status if cache is stale", async () => {
    const staleDate = new Date(Date.now() - 60000).toISOString(); // 60 seconds ago
    const cachedStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: staleDate,
      overallStatus: "pending",
      checksCount: 1,
      checksCompleted: 0,
      checksPassed: 0,
      checksFailed: 0,
      checks: [],
    };

    const freshStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "success",
      checksCount: 1,
      checksCompleted: 1,
      checksPassed: 1,
      checksFailed: 0,
      checks: [],
    };

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      prUrl: "https://github.com/owner/repo/pull/123",
      ciStatus: cachedStatus,
    });
    mockFetchPrCiStatus.mockResolvedValue(freshStatus);
    mockAssessmentUpdate.mockResolvedValue({});

    const request = new Request(
      "http://localhost/api/ci/status?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.cached).toBe(false);
    expect(data.ciStatus.overallStatus).toBe("success");
    expect(mockFetchPrCiStatus).toHaveBeenCalledWith(
      "https://github.com/owner/repo/pull/123"
    );
  });

  it("should fetch fresh status if no cache exists", async () => {
    const freshStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "success",
      checksCount: 2,
      checksCompleted: 2,
      checksPassed: 2,
      checksFailed: 0,
      checks: [],
    };

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      prUrl: "https://github.com/owner/repo/pull/123",
      ciStatus: null,
    });
    mockFetchPrCiStatus.mockResolvedValue(freshStatus);
    mockAssessmentUpdate.mockResolvedValue({});

    const request = new Request(
      "http://localhost/api/ci/status?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.cached).toBe(false);
    expect(mockFetchPrCiStatus).toHaveBeenCalled();
    expect(mockAssessmentUpdate).toHaveBeenCalled();
  });
});

describe("POST /api/ci/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/ci/status", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const request = new Request("http://localhost/api/ci/status", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Assessment ID is required");
  });

  it("should force refresh CI status", async () => {
    const freshStatus = {
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "failure",
      checksCount: 2,
      checksCompleted: 2,
      checksPassed: 1,
      checksFailed: 1,
      checks: [],
    };

    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      prUrl: "https://github.com/owner/repo/pull/123",
    });
    mockFetchPrCiStatus.mockResolvedValue(freshStatus);
    mockAssessmentUpdate.mockResolvedValue({});

    const request = new Request("http://localhost/api/ci/status", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.refreshed).toBe(true);
    expect(data.ciStatus.overallStatus).toBe("failure");
    expect(mockFetchPrCiStatus).toHaveBeenCalled();
    expect(mockAssessmentUpdate).toHaveBeenCalled();
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue(null);

    const request = new Request("http://localhost/api/ci/status", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "nonexistent" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("should return 403 when user does not own assessment", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-2",
      prUrl: "https://github.com/owner/repo/pull/123",
    });

    const request = new Request("http://localhost/api/ci/status", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("should return 400 when no PR URL found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      prUrl: null,
    });

    const request = new Request("http://localhost/api/ci/status", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No PR URL found for this assessment");
  });
});
