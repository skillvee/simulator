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

import { POST, GET } from "./route";
import { isValidPrUrl } from "@/lib/pr-validation";
import { AssessmentStatus } from "@prisma/client";

describe("POST /api/assessment/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        prUrl: "https://github.com/org/repo/pull/123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        prUrl: "https://github.com/org/repo/pull/123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Assessment ID is required");
  });

  it("should return 400 when prUrl is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("PR URL is required");
  });

  it("should return 400 when prUrl is invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        prUrl: "https://example.com/not-a-pr",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid PR URL");
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue(null);

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        prUrl: "https://github.com/org/repo/pull/123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("should return 403 when user does not own assessment", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-2",
      status: AssessmentStatus.WORKING,
      startedAt: new Date(),
    });

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        prUrl: "https://github.com/org/repo/pull/123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("should return 400 when assessment is not in WORKING status", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      status: AssessmentStatus.HR_INTERVIEW,
      startedAt: new Date(),
    });

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        prUrl: "https://github.com/org/repo/pull/123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Cannot complete assessment");
  });

  it("should successfully complete assessment and transition to FINAL_DEFENSE", async () => {
    const startTime = new Date("2025-01-01T10:00:00Z");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      startedAt: startTime,
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.FINAL_DEFENSE,
      prUrl: "https://github.com/org/repo/pull/123",
      startedAt: startTime,
    });

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        prUrl: "https://github.com/org/repo/pull/123",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.assessment.status).toBe(AssessmentStatus.FINAL_DEFENSE);
    expect(json.data.assessment.prUrl).toBe("https://github.com/org/repo/pull/123");
    expect(json.data.timing.startedAt).toBeDefined();
    expect(json.data.timing.completedWorkingAt).toBeDefined();
    expect(json.data.timing.workingDurationSeconds).toBeGreaterThanOrEqual(0);
  });

  it("should update assessment with correct data", async () => {
    const startTime = new Date("2025-01-01T10:00:00Z");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      startedAt: startTime,
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.FINAL_DEFENSE,
      prUrl: "https://gitlab.com/org/repo/-/merge_requests/456",
      startedAt: startTime,
    });

    const request = new Request("http://localhost/api/assessment/complete", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        prUrl: "https://gitlab.com/org/repo/-/merge_requests/456",
      }),
    });

    await POST(request);

    expect(mockAssessmentUpdate).toHaveBeenCalledWith({
      where: { id: "test-id" },
      data: {
        status: AssessmentStatus.FINAL_DEFENSE,
        prUrl: "https://gitlab.com/org/repo/-/merge_requests/456",
      },
      select: expect.any(Object),
    });
  });
});

describe("GET /api/assessment/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/assessment/complete?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const request = new Request("http://localhost/api/assessment/complete");

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/assessment/complete?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("should return 403 when user does not own assessment", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-2",
      status: AssessmentStatus.WORKING,
      startedAt: new Date(),
      completedAt: null,
      prUrl: null,
    });

    const request = new Request(
      "http://localhost/api/assessment/complete?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it("should return assessment timing information", async () => {
    const startTime = new Date("2025-01-01T10:00:00Z");
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-1",
      status: AssessmentStatus.FINAL_DEFENSE,
      startedAt: startTime,
      completedAt: null,
      prUrl: "https://github.com/org/repo/pull/123",
    });

    const request = new Request(
      "http://localhost/api/assessment/complete?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.assessment.id).toBe("test-id");
    expect(json.data.assessment.status).toBe(AssessmentStatus.FINAL_DEFENSE);
    expect(json.data.assessment.prUrl).toBe("https://github.com/org/repo/pull/123");
    expect(json.data.timing.startedAt).toBe("2025-01-01T10:00:00.000Z");
    expect(json.data.timing.completedAt).toBeNull();
    expect(json.data.timing.elapsedSeconds).toBeGreaterThan(0);
  });
});

describe("isValidPrUrl", () => {
  it("should accept valid GitHub PR URLs", () => {
    expect(isValidPrUrl("https://github.com/owner/repo/pull/123")).toBe(true);
    expect(isValidPrUrl("https://github.com/my-org/my-repo/pull/1")).toBe(true);
    expect(
      isValidPrUrl("https://github.com/user123/project-name/pull/9999")
    ).toBe(true);
  });

  it("should accept valid GitLab MR URLs", () => {
    expect(
      isValidPrUrl("https://gitlab.com/owner/repo/-/merge_requests/123")
    ).toBe(true);
    expect(
      isValidPrUrl("https://gitlab.company.com/org/repo/-/merge_requests/456")
    ).toBe(true);
  });

  it("should accept valid Bitbucket PR URLs", () => {
    expect(
      isValidPrUrl("https://bitbucket.org/owner/repo/pull-requests/123")
    ).toBe(true);
  });

  it("should reject invalid URLs", () => {
    expect(isValidPrUrl("not-a-url")).toBe(false);
    expect(isValidPrUrl("http://github.com/owner/repo/pull/123")).toBe(false); // HTTP not allowed
    expect(isValidPrUrl("https://example.com")).toBe(false);
    expect(isValidPrUrl("https://github.com/owner/repo")).toBe(false); // No PR number
    expect(isValidPrUrl("https://github.com/owner/repo/issues/123")).toBe(
      false
    ); // Issues, not PR
  });
});
