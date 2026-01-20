import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";

// Define mocks before vi.mock calls (required for hoisting)
const mockAuthFn = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockGenerateReport = vi.fn();
const mockReportToPrismaJson = vi.fn((report) => report);
const mockAggregateSegments = vi.fn(() => ({
  activityTimeline: [],
  toolUsage: [],
  stuckMoments: [],
  totalActiveTime: 0,
  totalIdleTime: 0,
  overallFocusScore: 3,
  aiToolsUsed: false,
  keyObservations: [],
}));

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
  },
}));

// Mock analysis module (assessment-aggregation + recording-analysis)
vi.mock("@/lib/analysis", () => ({
  generateAssessmentReport: (...args: unknown[]) => mockGenerateReport(...args),
  reportToPrismaJson: (report: unknown) => mockReportToPrismaJson(report),
  aggregateSegmentAnalyses: () => mockAggregateSegments(),
}));

// Mock email module (now in @/lib/external)
vi.mock("@/lib/external", () => ({
  sendReportEmail: vi.fn().mockResolvedValue({ success: true }),
  isEmailServiceConfigured: vi.fn().mockReturnValue(false),
}));

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
        user: { name: "Other User" },
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
        user: { name: "Test User" },
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
      expect(data.cached).toBe(true);
      expect(data.report).toEqual(cachedReport);
      // Should not call generate function
      expect(mockGenerateReport).not.toHaveBeenCalled();
    });

    it("should regenerate report if forceRegenerate is true", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      const existingReport = { overallScore: 3 };
      const newReport = {
        generatedAt: "2024-01-16T10:00:00.000Z",
        overallScore: 4,
      };

      // First findUnique for validation
      mockFindUnique
        .mockResolvedValueOnce({
          id: "assessment-1",
          userId: "user-1",
          status: "COMPLETED",
          report: existingReport,
          user: { name: "Test User" },
        })
        // Second findUnique for collectAssessmentSignals
        .mockResolvedValueOnce({
          id: "assessment-1",
          userId: "user-1",
          status: "COMPLETED",
          report: existingReport,
          user: { id: "user-1", name: "Test User", email: "test@example.com" },
          scenario: {
            id: "scenario-1",
            name: "Test Scenario",
            companyName: "Test Co",
          },
          hrAssessment: null,
          conversations: [],
          recordings: [],
          prUrl: null,
          codeReview: null,
          ciStatus: null,
          startedAt: new Date(),
          completedAt: null,
        });

      mockGenerateReport.mockResolvedValue(newReport);
      mockUpdate.mockResolvedValue({
        id: "assessment-1",
        report: newReport,
      });

      const request = new Request(
        "http://localhost:3000/api/assessment/report",
        {
          method: "POST",
          body: JSON.stringify({
            assessmentId: "assessment-1",
            forceRegenerate: true,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cached).toBe(false);
      expect(mockGenerateReport).toHaveBeenCalled();
    });

    it("should generate new report if none exists", async () => {
      mockAuthFn.mockResolvedValue({ user: { id: "user-1" } });
      const newReport = {
        generatedAt: "2024-01-16T10:00:00.000Z",
        overallScore: 4,
      };

      mockFindUnique
        .mockResolvedValueOnce({
          id: "assessment-1",
          userId: "user-1",
          status: "COMPLETED",
          report: null,
          user: { name: "Test User" },
        })
        .mockResolvedValueOnce({
          id: "assessment-1",
          userId: "user-1",
          status: "COMPLETED",
          report: null,
          user: { id: "user-1", name: "Test User", email: "test@example.com" },
          scenario: {
            id: "scenario-1",
            name: "Test Scenario",
            companyName: "Test Co",
          },
          hrAssessment: null,
          conversations: [],
          recordings: [],
          prUrl: null,
          codeReview: null,
          ciStatus: null,
          startedAt: new Date(),
          completedAt: null,
        });

      mockGenerateReport.mockResolvedValue(newReport);
      mockUpdate.mockResolvedValue({
        id: "assessment-1",
        report: newReport,
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
      expect(data.cached).toBe(false);
      expect(mockUpdate).toHaveBeenCalled();
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
        status: "PROCESSING",
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
      expect(data.report).toEqual(existingReport);
      expect(data.assessmentStatus).toBe("COMPLETED");
    });
  });
});
