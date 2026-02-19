import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentStatus } from "@prisma/client";

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

// Mock github cleanup (now in @/lib/external)
const mockCleanupPrAfterAssessment = vi.fn();
const mockFetchPrCiStatus = vi.fn();
vi.mock("@/lib/external", () => ({
  cleanupPrAfterAssessment: (...args: unknown[]) =>
    mockCleanupPrAfterAssessment(...args),
  fetchPrCiStatus: (...args: unknown[]) => mockFetchPrCiStatus(...args),
}));

// Mock video evaluation module (now in @/lib/analysis)
const mockTriggerVideoAssessment = vi.fn();
vi.mock("@/lib/analysis", () => ({
  triggerVideoAssessment: (...args: unknown[]) =>
    mockTriggerVideoAssessment(...args),
}));

// Mock profile photo generation (in @/lib/candidate)
const mockGenerateProfilePhoto = vi.fn();
vi.mock("@/lib/candidate", () => ({
  generateProfilePhoto: (...args: unknown[]) =>
    mockGenerateProfilePhoto(...args),
}));

import { POST } from "./route";

describe("POST /api/assessment/finalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Assessment ID is required");
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue(null);

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 403 when user does not own the assessment", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "other-user", // Different user
      status: AssessmentStatus.WORKING,
      startedAt: new Date(),
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe("Unauthorized to modify this assessment");
  });

  it("should return 400 when assessment is not in WORKING status", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WELCOME, // Wrong status
      startedAt: new Date(),
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("Must be in WORKING status");
  });

  it("should finalize assessment without PR and return timing info", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl: null,
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl: null,
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.assessment.status).toBe(AssessmentStatus.COMPLETED);
    expect(data.timing.startedAt).toBe(startedAt.toISOString());
    expect(data.timing.completedAt).toBeDefined();
    expect(data.timing.totalDurationSeconds).toBeGreaterThan(0);
    expect(data.prCleanup).toBeNull(); // No PR to clean up
    expect(data.videoAssessment).toEqual({
      triggered: false,
      videoAssessmentId: null,
      hasRecording: false,
    });
    expect(data.profilePhoto).toBeDefined();

    // Should not call cleanup when no PR URL
    expect(mockCleanupPrAfterAssessment).not.toHaveBeenCalled();
    // Should not call video assessment when no recording
    expect(mockTriggerVideoAssessment).not.toHaveBeenCalled();
  });

  it("should finalize assessment and cleanup PR", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");
    const prUrl = "https://github.com/owner/repo/pull/123";

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl,
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });
    mockCleanupPrAfterAssessment.mockResolvedValue({
      success: true,
      action: "closed",
      message: "Successfully closed PR #123",
      prSnapshot: {
        url: prUrl,
        provider: "github",
        fetchedAt: "2024-01-01T12:00:00Z",
        title: "Test PR",
        body: "PR body",
        state: "open",
      },
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl,
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.prCleanup).toEqual({
      success: true,
      action: "closed",
      message: "Successfully closed PR #123",
    });

    // Verify cleanup was called with PR URL
    expect(mockCleanupPrAfterAssessment).toHaveBeenCalledWith(prUrl);

    // Verify prSnapshot was included in update
    expect(mockAssessmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          prSnapshot: expect.objectContaining({
            url: prUrl,
            provider: "github",
          }),
        }),
      })
    );
  });

  it("should finalize even if PR cleanup fails", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");
    const prUrl = "https://github.com/owner/repo/pull/123";

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl,
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });
    mockCleanupPrAfterAssessment.mockResolvedValue({
      success: false,
      action: "error",
      message: "GitHub API error: 403 Forbidden",
      prSnapshot: {
        url: prUrl,
        provider: "github",
        fetchedAt: "2024-01-01T12:00:00Z",
        fetchError: "Failed to close",
      },
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl,
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    // Finalization should succeed even if cleanup failed
    expect(data.success).toBe(true);
    expect(data.assessment.status).toBe(AssessmentStatus.COMPLETED);
    expect(data.prCleanup.success).toBe(false);
    expect(data.prCleanup.action).toBe("error");
  });

  it("should finalize even if PR cleanup throws", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");
    const prUrl = "https://github.com/owner/repo/pull/123";

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl,
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });
    mockCleanupPrAfterAssessment.mockRejectedValue(new Error("Network error"));
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl,
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    // Finalization should succeed even if cleanup threw
    expect(data.success).toBe(true);
    expect(data.assessment.status).toBe(AssessmentStatus.COMPLETED);
    // prCleanup will be null since the exception was caught
    expect(data.prCleanup).toBeNull();
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to finalize assessment");
  });

  it("should not finalize if already completed", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.COMPLETED, // Already completed
      startedAt: new Date(),
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain("COMPLETED");
  });

  it("should trigger video assessment when recording exists", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");
    const recordingUrl = "https://storage.example.com/recording.webm";

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl: null,
      scenario: { taskDescription: "Complete the todo list feature" },
      recordings: [{ storageUrl: recordingUrl }],
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl: null,
    });
    mockTriggerVideoAssessment.mockResolvedValue({
      success: true,
      videoAssessmentId: "video-assessment-123",
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.videoAssessment).toEqual({
      triggered: true,
      videoAssessmentId: "video-assessment-123",
      hasRecording: true,
    });

    // Verify video assessment was triggered with correct parameters
    expect(mockTriggerVideoAssessment).toHaveBeenCalledWith({
      assessmentId: "test-id",
      candidateId: "user-123",
      videoUrl: recordingUrl,
      taskDescription: "Complete the todo list feature",
    });
  });

  it("should finalize even if video assessment trigger fails", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");
    const recordingUrl = "https://storage.example.com/recording.webm";

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl: null,
      scenario: { taskDescription: "Test task" },
      recordings: [{ storageUrl: recordingUrl }],
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl: null,
    });
    mockTriggerVideoAssessment.mockResolvedValue({
      success: false,
      videoAssessmentId: null,
      error: "Failed to create video assessment",
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    // Finalization should succeed even if video assessment fails
    expect(data.success).toBe(true);
    expect(data.assessment.status).toBe(AssessmentStatus.COMPLETED);
    // Video assessment result should still be included
    expect(data.videoAssessment.triggered).toBe(true);
    expect(data.videoAssessment.hasRecording).toBe(true);
  });

  it("should finalize even if video assessment trigger throws", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");
    const recordingUrl = "https://storage.example.com/recording.webm";

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl: null,
      scenario: { taskDescription: "Test task" },
      recordings: [{ storageUrl: recordingUrl }],
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl: null,
    });
    mockTriggerVideoAssessment.mockRejectedValue(new Error("Network error"));

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    // Finalization should succeed even if video assessment throws
    expect(data.success).toBe(true);
    expect(data.assessment.status).toBe(AssessmentStatus.COMPLETED);
  });

  it("should trigger profile photo generation on finalization", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl: null,
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl: null,
    });
    mockGenerateProfilePhoto.mockResolvedValue({
      success: true,
      imageUrl: "https://storage.example.com/avatars/candidates/user-123.jpg",
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.profilePhoto).toEqual({
      generated: true,
      imageUrl: "https://storage.example.com/avatars/candidates/user-123.jpg",
    });

    // Verify profile photo was triggered with correct parameters
    expect(mockGenerateProfilePhoto).toHaveBeenCalledWith({
      assessmentId: "test-id",
      userId: "user-123",
    });
  });

  it("should finalize even if profile photo generation fails", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl: null,
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl: null,
    });
    mockGenerateProfilePhoto.mockResolvedValue({
      success: false,
      imageUrl: null,
      error: "Webcam profile snapshot not found",
    });

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    // Finalization should succeed even if profile photo fails
    expect(data.success).toBe(true);
    expect(data.assessment.status).toBe(AssessmentStatus.COMPLETED);
    expect(data.profilePhoto).toEqual({
      generated: false,
      imageUrl: null,
    });
  });

  it("should finalize even if profile photo generation throws", async () => {
    const startedAt = new Date("2024-01-01T10:00:00Z");

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      userId: "user-123",
      status: AssessmentStatus.WORKING,
      startedAt,
      prUrl: null,
      scenario: { taskDescription: "Test task" },
      recordings: [],
    });
    mockAssessmentUpdate.mockResolvedValue({
      id: "test-id",
      status: AssessmentStatus.COMPLETED,
      startedAt,
      completedAt: new Date(),
      prUrl: null,
    });
    mockGenerateProfilePhoto.mockRejectedValue(new Error("Network error"));

    const request = new Request("http://localhost/api/assessment/finalize", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    // Finalization should succeed even if profile photo throws
    expect(data.success).toBe(true);
    expect(data.assessment.status).toBe(AssessmentStatus.COMPLETED);
  });
});
