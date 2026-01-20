import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock database
const mockAssessmentFindFirst = vi.fn();
const mockAssessmentFindUnique = vi.fn();
const mockAssessmentUpdate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
      findUnique: (...args: unknown[]) => mockAssessmentFindUnique(...args),
      update: (...args: unknown[]) => mockAssessmentUpdate(...args),
    },
  },
}));

// Mock code review module
const mockAnalyzeCodeReview = vi.fn();
const mockBuildCodeReviewData = vi.fn();
const mockCodeReviewToPrismaJson = vi.fn();

vi.mock("@/lib/analysis", () => ({
  analyzeCodeReview: (...args: unknown[]) => mockAnalyzeCodeReview(...args),
  buildCodeReviewData: (...args: unknown[]) => mockBuildCodeReviewData(...args),
  codeReviewToPrismaJson: (...args: unknown[]) =>
    mockCodeReviewToPrismaJson(...args),
}));

// Mock github module (now in @/lib/external)
const mockFetchGitHubPrContent = vi.fn();

vi.mock("@/lib/external", () => ({
  fetchGitHubPrContent: (...args: unknown[]) =>
    mockFetchGitHubPrContent(...args),
}));

import { POST, GET } from "./route";

describe("POST /api/code-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/code-review", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 if missing assessmentId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/code-review", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 if assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/code-review", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 400 if no PR URL found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      prUrl: null,
      codeReview: null,
    });

    const request = new NextRequest("http://localhost/api/code-review", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("No PR URL found");
  });

  it("should return existing code review if already analyzed", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    const existingReview = {
      overallScore: 4,
      summary: { overallAssessment: "Good work" },
    };
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      prUrl: "https://github.com/owner/repo/pull/1",
      codeReview: existingReview,
    });

    const request = new NextRequest("http://localhost/api/code-review", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.analyzed).toBe(false);
    expect(json.data.codeReview).toEqual(existingReview);
    expect(json.data.message).toContain("already exists");
  });

  it("should run new analysis when forceReanalyze is true", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    const existingReview = {
      overallScore: 3,
      summary: { overallAssessment: "Old review" },
    };
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      prUrl: "https://github.com/owner/repo/pull/1",
      prSnapshot: null,
      codeReview: existingReview,
    });

    const newAnalysis = {
      overallScore: 4,
      summary: { overallAssessment: "New review" },
    };
    const newReviewData = {
      ...newAnalysis,
      prUrl: "https://github.com/owner/repo/pull/1",
      analyzedAt: new Date().toISOString(),
    };

    mockAnalyzeCodeReview.mockResolvedValue(newAnalysis);
    mockBuildCodeReviewData.mockReturnValue(newReviewData);
    mockCodeReviewToPrismaJson.mockReturnValue(newReviewData);
    mockAssessmentUpdate.mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/code-review", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        forceReanalyze: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.analyzed).toBe(true);
    expect(mockAnalyzeCodeReview).toHaveBeenCalled();
    expect(mockAssessmentUpdate).toHaveBeenCalled();
  });

  it("should run analysis for assessment without existing review", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      prUrl: "https://github.com/owner/repo/pull/1",
      prSnapshot: null,
      codeReview: null,
    });

    const analysis = {
      overallScore: 4,
      codeQualityScore: 4,
      patternScore: 3,
      securityScore: 5,
      maintainabilityScore: 4,
    };
    const reviewData = {
      ...analysis,
      prUrl: "https://github.com/owner/repo/pull/1",
      analyzedAt: new Date().toISOString(),
    };

    mockAnalyzeCodeReview.mockResolvedValue(analysis);
    mockBuildCodeReviewData.mockReturnValue(reviewData);
    mockCodeReviewToPrismaJson.mockReturnValue(reviewData);
    mockAssessmentUpdate.mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/code-review", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.analyzed).toBe(true);
    expect(json.data.codeReview).toEqual(reviewData);
  });

  it("should use existing prSnapshot if available", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    const prSnapshot = {
      url: "https://github.com/owner/repo/pull/1",
      title: "Test PR",
      diff: "some diff content",
    };
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      prUrl: "https://github.com/owner/repo/pull/1",
      prSnapshot,
      codeReview: null,
    });

    mockAnalyzeCodeReview.mockResolvedValue({ overallScore: 4 });
    mockBuildCodeReviewData.mockReturnValue({ overallScore: 4 });
    mockCodeReviewToPrismaJson.mockReturnValue({ overallScore: 4 });
    mockAssessmentUpdate.mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/code-review", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    await POST(request);

    // Should use the existing snapshot
    expect(mockAnalyzeCodeReview).toHaveBeenCalledWith(
      "https://github.com/owner/repo/pull/1",
      prSnapshot
    );
    // Should not fetch fresh content
    expect(mockFetchGitHubPrContent).not.toHaveBeenCalled();
  });
});

describe("GET /api/code-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/code-review?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 if missing assessmentId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/code-review");

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("assessmentId is required");
  });

  it("should return 404 if assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/code-review?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("should return message if no code review exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      prUrl: "https://github.com/owner/repo/pull/1",
      codeReview: null,
    });

    const request = new NextRequest(
      "http://localhost/api/code-review?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.hasCodeReview).toBe(false);
    expect(json.data.message).toContain("not been run yet");
  });

  it("should return code review if exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    const codeReview = {
      overallScore: 4,
      summary: { overallAssessment: "Good work" },
    };
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      prUrl: "https://github.com/owner/repo/pull/1",
      codeReview,
    });

    const request = new NextRequest(
      "http://localhost/api/code-review?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.hasCodeReview).toBe(true);
    expect(json.data.codeReview).toEqual(codeReview);
  });

  it("should return appropriate message when no PR URL", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      prUrl: null,
      codeReview: null,
    });

    const request = new NextRequest(
      "http://localhost/api/code-review?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.hasCodeReview).toBe(false);
    expect(json.data.message).toContain("No PR URL found");
  });
});
