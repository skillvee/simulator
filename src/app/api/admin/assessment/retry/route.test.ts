import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { POST } from "./route";
import { db } from "@/server/db";
import { requireAdmin } from "@/lib/admin";
import { triggerVideoAssessment } from "@/lib/video-evaluation";

// Mock admin check
vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

// Mock video evaluation
vi.mock("@/lib/video-evaluation", () => ({
  triggerVideoAssessment: vi.fn(),
}));

// Mock the database
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    assessmentLog: {
      create: vi.fn(),
    },
  },
}));

// Helper to create a mock request
function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/assessment/retry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockOriginalAssessment = {
  id: "assess-1",
  userId: "user-1",
  scenarioId: "scenario-1",
  status: "COMPLETED",
  cvUrl: "https://storage.example.com/cv.pdf",
  parsedProfile: { name: "John Doe" },
  prUrl: "https://github.com/user/repo/pull/1",
  prSnapshot: { title: "Add feature" },
  ciStatus: { status: "passed" },
  codeReview: { score: 85 },
  logs: [
    { eventType: "COMPLETED" },
  ],
  user: { id: "user-1" },
  scenario: { id: "scenario-1", taskDescription: "Build a feature" },
  recordings: [
    { storageUrl: "https://storage.example.com/video.webm" },
  ],
};

const mockNewAssessment = {
  id: "assess-2",
  userId: "user-1",
  scenarioId: "scenario-1",
  status: "PROCESSING",
};

describe("POST /api/admin/assessment/retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireAdmin as Mock).mockResolvedValue(undefined);
    (db.assessment.create as Mock).mockResolvedValue(mockNewAssessment);
    (db.assessment.update as Mock).mockResolvedValue({});
    (db.assessmentLog.create as Mock).mockResolvedValue({});
    (triggerVideoAssessment as Mock).mockResolvedValue({
      success: true,
      videoAssessmentId: "va-1",
    });
  });

  it("returns 400 when assessmentId is missing", async () => {
    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("Assessment ID is required");
  });

  it("returns 404 when assessment is not found", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(null);

    const request = createRequest({ assessmentId: "nonexistent" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe("Assessment not found");
  });

  it("returns 400 when assessment status is not retriable and has no errors", async () => {
    const inProgressAssessment = {
      ...mockOriginalAssessment,
      status: "HR_INTERVIEW",
      logs: [{ eventType: "STARTED" }],
    };
    (db.assessment.findUnique as Mock).mockResolvedValue(inProgressAssessment);

    const request = createRequest({ assessmentId: "assess-1" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("Cannot retry assessment with status");
  });

  it("allows retry for COMPLETED assessments", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockOriginalAssessment);

    const request = createRequest({ assessmentId: "assess-1" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.newAssessmentId).toBe("assess-2");
    expect(data.oldAssessmentId).toBe("assess-1");
    expect(data.message).toBe("Reassessment queued successfully");
  });

  it("allows retry for assessments with ERROR logs", async () => {
    const assessmentWithError = {
      ...mockOriginalAssessment,
      status: "WORKING",
      logs: [
        { eventType: "STARTED" },
        { eventType: "ERROR" },
      ],
    };
    (db.assessment.findUnique as Mock).mockResolvedValue(assessmentWithError);

    const request = createRequest({ assessmentId: "assess-1" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("creates new assessment with PROCESSING status", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockOriginalAssessment);

    const request = createRequest({ assessmentId: "assess-1" });
    await POST(request);

    expect(db.assessment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        scenarioId: "scenario-1",
        status: "PROCESSING",
        cvUrl: "https://storage.example.com/cv.pdf",
        prUrl: "https://github.com/user/repo/pull/1",
      }),
    });
  });

  it("marks original assessment as superseded", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockOriginalAssessment);

    const request = createRequest({ assessmentId: "assess-1" });
    await POST(request);

    expect(db.assessment.update).toHaveBeenCalledWith({
      where: { id: "assess-1" },
      data: { supersededBy: "assess-2" },
    });
  });

  it("logs admin retry event with metadata", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockOriginalAssessment);

    const request = createRequest({ assessmentId: "assess-1" });
    await POST(request);

    expect(db.assessmentLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assessmentId: "assess-2",
        eventType: "STARTED",
        metadata: expect.objectContaining({
          triggered_by: "admin_retry",
          original_assessment_id: "assess-1",
        }),
      }),
    });
  });

  it("triggers video assessment when recording exists", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockOriginalAssessment);

    const request = createRequest({ assessmentId: "assess-1" });
    await POST(request);

    expect(triggerVideoAssessment).toHaveBeenCalledWith({
      assessmentId: "assess-2",
      candidateId: "user-1",
      videoUrl: "https://storage.example.com/video.webm",
      taskDescription: "Build a feature",
    });
  });

  it("does not trigger video assessment when no recording exists", async () => {
    const assessmentWithoutRecording = {
      ...mockOriginalAssessment,
      recordings: [],
    };
    (db.assessment.findUnique as Mock).mockResolvedValue(assessmentWithoutRecording);

    const request = createRequest({ assessmentId: "assess-1" });
    const response = await POST(request);
    const data = await response.json();

    expect(triggerVideoAssessment).not.toHaveBeenCalled();
    expect(data.videoAssessment.triggered).toBe(false);
  });

  it("returns video assessment info in response", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockOriginalAssessment);

    const request = createRequest({ assessmentId: "assess-1" });
    const response = await POST(request);
    const data = await response.json();

    expect(data.videoAssessment).toEqual({
      triggered: true,
      videoAssessmentId: "va-1",
    });
  });

  it("handles video assessment trigger failure gracefully", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockOriginalAssessment);
    (triggerVideoAssessment as Mock).mockResolvedValue({
      success: false,
      videoAssessmentId: null,
      error: "Failed to trigger",
    });

    const request = createRequest({ assessmentId: "assess-1" });
    const response = await POST(request);
    const data = await response.json();

    // Should still succeed overall
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("returns 401 when admin check fails", async () => {
    (requireAdmin as Mock).mockRejectedValue(new Error("Unauthorized"));

    const request = createRequest({ assessmentId: "assess-1" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toContain("Unauthorized");
  });

  it("returns 500 when database error occurs", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockOriginalAssessment);
    (db.assessment.create as Mock).mockRejectedValue(new Error("DB error"));

    const request = createRequest({ assessmentId: "assess-1" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("Failed to create reassessment");
  });
});
