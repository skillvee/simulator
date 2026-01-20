import { describe, it, expect, vi, beforeEach } from "vitest";
import { VideoAssessmentStatus } from "@prisma/client";

// Mock requireAdmin (now in @/lib/core)
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/core", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

// Mock database
const mockVideoAssessmentFindMany = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    videoAssessment: {
      findMany: (...args: unknown[]) => mockVideoAssessmentFindMany(...args),
    },
  },
}));

// Mock video-evaluation (now in @/lib/analysis)
const mockRetryVideoAssessment = vi.fn();
const mockForceRetryVideoAssessment = vi.fn();
vi.mock("@/lib/analysis", () => ({
  retryVideoAssessment: (...args: unknown[]) =>
    mockRetryVideoAssessment(...args),
  forceRetryVideoAssessment: (...args: unknown[]) =>
    mockForceRetryVideoAssessment(...args),
}));

import { POST, GET } from "./route";

describe("POST /api/admin/video-assessment/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: "admin-123", role: "ADMIN" });
  });

  it("should retry a failed video assessment", async () => {
    mockRetryVideoAssessment.mockResolvedValue({
      success: true,
      videoAssessmentId: "video-123",
    });

    const request = new Request(
      "http://localhost/api/admin/video-assessment/retry",
      {
        method: "POST",
        body: JSON.stringify({ videoAssessmentId: "video-123" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.videoAssessmentId).toBe("video-123");
    expect(data.message).toBe("Video assessment retry initiated");
  });

  it("should force retry when force=true", async () => {
    mockForceRetryVideoAssessment.mockResolvedValue({
      success: true,
      videoAssessmentId: "video-123",
    });

    const request = new Request(
      "http://localhost/api/admin/video-assessment/retry",
      {
        method: "POST",
        body: JSON.stringify({ videoAssessmentId: "video-123", force: true }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.videoAssessmentId).toBe("video-123");
    expect(data.message).toBe(
      "Video assessment force-retry initiated (retry count reset)"
    );

    // Should call forceRetryVideoAssessment instead of retryVideoAssessment
    expect(mockForceRetryVideoAssessment).toHaveBeenCalledWith("video-123");
    expect(mockRetryVideoAssessment).not.toHaveBeenCalled();
  });

  it("should return 400 when videoAssessmentId is missing", async () => {
    const request = new Request(
      "http://localhost/api/admin/video-assessment/retry",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("videoAssessmentId is required");
  });

  it("should return 400 when retry fails", async () => {
    mockRetryVideoAssessment.mockResolvedValue({
      success: false,
      videoAssessmentId: "video-123",
      error: "Assessment is not in FAILED status",
    });

    const request = new Request(
      "http://localhost/api/admin/video-assessment/retry",
      {
        method: "POST",
        body: JSON.stringify({ videoAssessmentId: "video-123" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Assessment is not in FAILED status");
  });

  it("should return 500 on internal error", async () => {
    mockRetryVideoAssessment.mockRejectedValue(new Error("DB error"));

    const request = new Request(
      "http://localhost/api/admin/video-assessment/retry",
      {
        method: "POST",
        body: JSON.stringify({ videoAssessmentId: "video-123" }),
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});

describe("GET /api/admin/video-assessment/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: "admin-123", role: "ADMIN" });
  });

  it("should list failed video assessments", async () => {
    const mockFailedAssessments = [
      {
        id: "video-1",
        candidateId: "user-1",
        assessmentId: "assessment-1",
        videoUrl: "https://storage.example.com/video1.webm",
        createdAt: new Date("2024-01-10T10:00:00Z"),
        retryCount: 3,
        lastFailureReason: "Gemini API timeout",
        candidate: { name: "John Doe", email: "john@example.com" },
        assessment: {
          scenario: { name: "Frontend Challenge" },
        },
        logs: [
          {
            timestamp: new Date("2024-01-10T10:05:00Z"),
            metadata: { error_message: "API timeout" },
          },
        ],
      },
      {
        id: "video-2",
        candidateId: "user-2",
        assessmentId: "assessment-2",
        videoUrl: "https://storage.example.com/video2.webm",
        createdAt: new Date("2024-01-11T10:00:00Z"),
        retryCount: 1,
        lastFailureReason: null,
        candidate: { name: "Jane Smith", email: "jane@example.com" },
        assessment: null,
        logs: [],
      },
    ];

    mockVideoAssessmentFindMany.mockResolvedValue(mockFailedAssessments);

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.count).toBe(2);
    expect(data.failedAssessments).toHaveLength(2);

    expect(data.failedAssessments[0]).toEqual({
      id: "video-1",
      candidateId: "user-1",
      candidateName: "John Doe",
      candidateEmail: "john@example.com",
      assessmentId: "assessment-1",
      scenarioName: "Frontend Challenge",
      videoUrl: "https://storage.example.com/video1.webm",
      createdAt: "2024-01-10T10:00:00.000Z",
      retryCount: 3,
      lastFailureReason: "Gemini API timeout",
      canAutoRetry: false, // retryCount >= 3
      lastError: { error_message: "API timeout" },
      lastErrorAt: "2024-01-10T10:05:00.000Z",
    });

    // Second assessment has no logs and no scenario, but can auto-retry
    expect(data.failedAssessments[1].lastError).toBeUndefined();
    expect(data.failedAssessments[1].scenarioName).toBeUndefined();
    expect(data.failedAssessments[1].canAutoRetry).toBe(true); // retryCount < 3
    expect(data.failedAssessments[1].retryCount).toBe(1);
  });

  it("should return empty list when no failed assessments", async () => {
    mockVideoAssessmentFindMany.mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.count).toBe(0);
    expect(data.failedAssessments).toHaveLength(0);
  });

  it("should query for FAILED status only", async () => {
    mockVideoAssessmentFindMany.mockResolvedValue([]);

    await GET();

    expect(mockVideoAssessmentFindMany).toHaveBeenCalledWith({
      where: {
        status: VideoAssessmentStatus.FAILED,
      },
      select: expect.any(Object),
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return 500 on internal error", async () => {
    mockVideoAssessmentFindMany.mockRejectedValue(new Error("DB error"));

    const response = await GET();
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});
