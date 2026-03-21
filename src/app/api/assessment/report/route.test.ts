import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";
import { VideoAssessmentStatus } from "@prisma/client";

// Define mocks before vi.mock calls (required for hoisting)
const mockAuthFn = vi.fn();
const mockFindUnique = vi.fn();
const mockFindUniqueVideoAssessment = vi.fn();
const mockCreateVideoAssessment = vi.fn();
const mockUpdateVideoAssessment = vi.fn();
const mockUpdate = vi.fn();
const mockEvaluateVideo = vi.fn();
const mockGetEvaluationResults = vi.fn();

// Mock auth
vi.mock("@/auth", () => ({
  auth: () => mockAuthFn(),
}));

// Mock database
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    videoAssessment: {
      findUnique: (...args: unknown[]) => mockFindUniqueVideoAssessment(...args),
      create: (...args: unknown[]) => mockCreateVideoAssessment(...args),
      update: (...args: unknown[]) => mockUpdateVideoAssessment(...args),
    },
  },
}));

// Mock analysis module
vi.mock("@/lib/analysis", () => ({
  evaluateVideo: (...args: unknown[]) => mockEvaluateVideo(...args),
  getEvaluationResults: (...args: unknown[]) => mockGetEvaluationResults(...args),
}));

// Mock email module
vi.mock("@/lib/external", () => ({
  sendReportEmail: vi.fn().mockResolvedValue({ success: true }),
  isEmailServiceConfigured: vi.fn().mockReturnValue(false),
}));

// Sample video evaluation output
const sampleVideoEvaluationOutput = {
  evaluation_version: "1.1.0",
  overall_score: 4.0,
  dimension_scores: {
    COMMUNICATION: {
      score: 4,
      rationale: "Clear communication throughout",
      greenFlags: ["Articulate explanations"],
      redFlags: [],
      observable_behaviors: "Spoke clearly",
      timestamps: ["00:30"],
      trainable_gap: false,
    },
    PROBLEM_SOLVING: {
      score: 4,
      rationale: "Good analytical approach",
      greenFlags: ["Systematic debugging"],
      redFlags: [],
      observable_behaviors: "Broke down the problem",
      timestamps: ["01:00"],
      trainable_gap: false,
    },
    TECHNICAL_KNOWLEDGE: {
      score: 3,
      rationale: "Solid fundamentals",
      greenFlags: [],
      redFlags: ["Some gaps in advanced topics"],
      observable_behaviors: "Used basic patterns",
      timestamps: ["02:00"],
      trainable_gap: true,
    },
    COLLABORATION: {
      score: 4,
      rationale: "Good teamwork",
      greenFlags: ["Sought feedback"],
      redFlags: [],
      observable_behaviors: "Asked questions",
      timestamps: ["03:00"],
      trainable_gap: false,
    },
    ADAPTABILITY: {
      score: 4,
      rationale: "Handled changes well",
      greenFlags: ["Quick pivots"],
      redFlags: [],
      observable_behaviors: "Adjusted approach",
      timestamps: ["04:00"],
      trainable_gap: false,
    },
    LEADERSHIP: {
      score: 3,
      rationale: "Showed some initiative",
      greenFlags: [],
      redFlags: ["Could be more proactive"],
      observable_behaviors: "Followed guidance",
      timestamps: ["05:00"],
      trainable_gap: true,
    },
    CREATIVITY: {
      score: 4,
      rationale: "Creative solutions",
      greenFlags: ["Novel approach"],
      redFlags: [],
      observable_behaviors: "Tried different methods",
      timestamps: ["06:00"],
      trainable_gap: false,
    },
    TIME_MANAGEMENT: {
      score: 4,
      rationale: "Good time usage",
      greenFlags: ["Prioritized well"],
      redFlags: [],
      observable_behaviors: "Stayed focused",
      timestamps: ["07:00"],
      trainable_gap: false,
    },
  },
  hiringSignals: {
    overallGreenFlags: ["Strong communicator", "Collaborative"],
    overallRedFlags: ["Technical gaps in advanced areas"],
    recommendation: "hire" as const,
    recommendationRationale: "Strong candidate with good fundamentals",
  },
  key_highlights: [
    {
      timestamp: "00:30",
      type: "positive" as const,
      dimension: "COMMUNICATION",
      description: "Clear explanation of approach",
      quote: null,
    },
  ],
  overall_summary: "Strong candidate with good communication and problem-solving skills.",
  evaluation_confidence: "high" as const,
  insufficient_evidence_notes: null,
};

describe("Assessment Report API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/assessment/report", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuthFn.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({ assessmentId: "test-id" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if assessmentId is missing", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Assessment ID is required");
    });

    it("should return 404 if assessment not found", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({ assessmentId: "nonexistent-id" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Assessment not found");
    });

    it("should return 403 if user does not own assessment", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-2", // Different user
        status: "COMPLETED",
        report: null,
        user: { name: "Other User", email: "other@test.com" },
        startedAt: new Date(),
        completedAt: new Date(),
        conversations: [],
        recordings: [],
        scenario: { taskDescription: "Test task" },
      });

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({ assessmentId: "assessment-1" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized to access this assessment");
    });

    it("should return cached report if exists and forceRegenerate is false", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      const cachedReport = {
        generatedAt: "2024-01-15T10:00:00.000Z",
        overallScore: 4,
      };
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-1",
        status: "COMPLETED",
        report: cachedReport,
        user: { name: "Test User", email: "test@example.com" },
        startedAt: new Date(),
        completedAt: new Date(),
        conversations: [],
        recordings: [{ storageUrl: "https://example.com/video.mp4" }],
        scenario: { taskDescription: "Test task" },
      });

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({ assessmentId: "assessment-1" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cached).toBe(true);
      expect(data.data.report).toEqual(cachedReport);
      // Should not call video evaluation
      expect(mockEvaluateVideo).not.toHaveBeenCalled();
    });

    it("should return 400 if no video recording exists", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-1",
        status: "COMPLETED",
        report: null,
        user: { name: "Test User", email: "test@example.com" },
        startedAt: new Date(),
        completedAt: new Date(),
        conversations: [],
        recordings: [], // No recordings
        scenario: { taskDescription: "Test task" },
      });

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({ assessmentId: "assessment-1" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No video recording found");
    });

    it("should use existing video evaluation if completed", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-1",
        status: "COMPLETED",
        report: null,
        user: { name: "Test User", email: "test@example.com" },
        startedAt: new Date(),
        completedAt: new Date(),
        conversations: [],
        recordings: [{ storageUrl: "https://example.com/video.mp4" }],
        scenario: { taskDescription: "Test task" },
      });
      mockFindUniqueVideoAssessment.mockResolvedValue({
        id: "video-assessment-1",
        status: VideoAssessmentStatus.COMPLETED,
        summary: { rawAiResponse: sampleVideoEvaluationOutput },
      });
      mockUpdate.mockResolvedValue({ id: "assessment-1" });

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({ assessmentId: "assessment-1" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cached).toBe(false);
      expect(data.data.report.overallScore).toBe(4.0);
      // Should not trigger new evaluation
      expect(mockEvaluateVideo).not.toHaveBeenCalled();
    });

    it("should return 202 if video evaluation is still processing", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-1",
        status: "COMPLETED",
        report: null,
        user: { name: "Test User", email: "test@example.com" },
        startedAt: new Date(),
        completedAt: new Date(),
        conversations: [],
        recordings: [{ storageUrl: "https://example.com/video.mp4" }],
        scenario: { taskDescription: "Test task" },
      });
      mockFindUniqueVideoAssessment.mockResolvedValue({
        id: "video-assessment-1",
        status: VideoAssessmentStatus.PROCESSING,
        summary: null,
      });

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({ assessmentId: "assessment-1" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data.error).toContain("still in progress");
    });

    it("should trigger video evaluation if no video assessment exists", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-1",
        status: "COMPLETED",
        report: null,
        user: { name: "Test User", email: "test@example.com" },
        startedAt: new Date(),
        completedAt: new Date(),
        conversations: [],
        recordings: [{ storageUrl: "https://example.com/video.mp4" }],
        scenario: { taskDescription: "Test task" },
      });
      mockFindUniqueVideoAssessment.mockResolvedValue(null);
      mockCreateVideoAssessment.mockResolvedValue({
        id: "new-video-assessment-1",
      });
      mockEvaluateVideo.mockResolvedValue({
        success: true,
        assessmentId: "new-video-assessment-1",
        overallScore: 4.0,
      });
      mockGetEvaluationResults.mockResolvedValue({
        summary: { rawAiResponse: sampleVideoEvaluationOutput },
      });
      mockUpdate.mockResolvedValue({ id: "assessment-1" });

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({ assessmentId: "assessment-1" }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockEvaluateVideo).toHaveBeenCalled();
      expect(data.data.report.overallScore).toBe(4.0);
    });
  });

  describe("GET /api/assessment/report", () => {
    it("should return 401 if not authenticated", async () => {
      mockAuthFn.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/assessment/report?assessmentId=test-id"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if assessmentId is missing", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });

      const request = new Request(
        "http://localhost:3000/api/assessment/report"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Assessment ID is required");
    });

    it("should return 404 if assessment not found", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/assessment/report?assessmentId=nonexistent"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Assessment not found");
    });

    it("should return 403 if user does not own assessment", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-2",
        status: "COMPLETED",
        report: { overallScore: 4 },
        user: { name: "Other User" },
      });

      const request = new Request(
        "http://localhost:3000/api/assessment/report?assessmentId=assessment-1"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized to access this assessment");
    });

    it("should return 404 if no report generated yet", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-1",
        status: "COMPLETED",
        report: null,
        user: { name: "Test User" },
      });

      const request = new Request(
        "http://localhost:3000/api/assessment/report?assessmentId=assessment-1"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("No report generated yet");
    });

    it("should return existing report", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      const existingReport = {
        generatedAt: "2024-01-15T10:00:00.000Z",
        overallScore: 4.2,
        overallLevel: "strong",
      };
      mockFindUnique.mockResolvedValue({
        id: "assessment-1",
        userId: "user-1",
        status: "COMPLETED",
        report: existingReport,
        user: { name: "Test User" },
      });

      const request = new Request(
        "http://localhost:3000/api/assessment/report?assessmentId=assessment-1"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.report).toEqual(existingReport);
      expect(data.data.assessmentStatus).toBe("COMPLETED");
    });
  });
});
