import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockHRAssessmentFindUnique = vi.fn();
const mockHRAssessmentUpsert = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    hRInterviewAssessment: {
      findUnique: (...args: unknown[]) => mockHRAssessmentFindUnique(...args),
      upsert: (...args: unknown[]) => mockHRAssessmentUpsert(...args),
    },
  },
}));

// Mock Gemini (now in @/lib/ai)
const mockGenerateContent = vi.fn();
vi.mock("@/lib/ai", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  },
}));

import { POST, GET } from "./route";

describe("POST /api/interview/assessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/assessment", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });

    const request = new Request("http://localhost/api/interview/assessment", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/assessment", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("should return 404 when HR interview not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      conversations: [], // No HR interview conversation
    });

    const request = new Request("http://localhost/api/interview/assessment", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("HR interview not found");
  });

  it("should return 400 when no transcript available", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      conversations: [
        {
          id: "conv-1",
          coworkerId: null,
          type: "voice",
          transcript: [], // Empty transcript
        },
      ],
    });

    const request = new Request("http://localhost/api/interview/assessment", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No transcript available for analysis");
  });

  it("should create HR assessment with valid transcript", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      conversations: [
        {
          id: "conv-1",
          coworkerId: null,
          type: "voice",
          transcript: [
            {
              role: "model",
              text: "Hello, welcome to the interview",
              timestamp: "2025-01-01T00:00:00Z",
            },
            {
              role: "user",
              text: "Thank you for having me",
              timestamp: "2025-01-01T00:00:05Z",
            },
          ],
        },
      ],
    });

    const mockAIResponse = {
      communicationScore: 4,
      communicationNotes: "Good communication skills",
      cvVerificationNotes: "CV claims appear consistent",
      cvConsistencyScore: 4,
      verifiedClaims: [
        {
          claim: "5 years experience",
          status: "verified",
          notes: "Discussed in detail",
        },
      ],
      professionalismScore: 5,
      technicalDepthScore: 3,
      cultureFitNotes: "Seems like a good fit",
      summary: "Strong candidate with good communication skills",
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockAIResponse),
    });

    mockHRAssessmentUpsert.mockResolvedValue({
      id: "hr-assess-1",
      assessmentId: "assessment-1",
      ...mockAIResponse,
      interviewStartedAt: null,
      interviewEndedAt: null,
      interviewDurationSeconds: null,
    });

    const request = new Request("http://localhost/api/interview/assessment", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.hrAssessment.communicationScore).toBe(4);
    expect(data.hrAssessment.professionalismScore).toBe(5);
  });

  it("should calculate interview duration from timestamps", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      conversations: [
        {
          id: "conv-1",
          coworkerId: null,
          type: "voice",
          transcript: [
            { role: "model", text: "Hello", timestamp: "2025-01-01T00:00:00Z" },
            { role: "user", text: "Hi", timestamp: "2025-01-01T00:00:05Z" },
          ],
        },
      ],
    });

    const mockAIResponse = {
      communicationScore: 4,
      communicationNotes: "Good",
      cvVerificationNotes: "OK",
      cvConsistencyScore: 4,
      verifiedClaims: [],
      professionalismScore: 4,
      technicalDepthScore: 4,
      cultureFitNotes: "Good fit",
      summary: "Good candidate",
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockAIResponse),
    });

    const startTime = "2025-01-01T00:00:00.000Z";
    const endTime = "2025-01-01T00:20:00.000Z"; // 20 minutes later

    mockHRAssessmentUpsert.mockImplementation((args) => ({
      id: "hr-assess-1",
      ...args.create,
    }));

    const request = new Request("http://localhost/api/interview/assessment", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        interviewStartedAt: startTime,
        interviewEndedAt: endTime,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify upsert was called with correct duration (20 minutes = 1200 seconds)
    expect(mockHRAssessmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          interviewDurationSeconds: 1200,
        }),
      })
    );
  });
});

describe("GET /api/interview/assessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/interview/assessment?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });

    const request = new Request("http://localhost/api/interview/assessment");

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/interview/assessment?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 404 when HR assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockHRAssessmentFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/interview/assessment?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("HR assessment not found");
  });

  it("should return HR assessment for valid assessment", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockHRAssessmentFindUnique.mockResolvedValue({
      id: "hr-assess-1",
      assessmentId: "assessment-1",
      communicationScore: 4,
      communicationNotes: "Good communication",
      cvVerificationNotes: "CV verified",
      cvConsistencyScore: 4,
      verifiedClaims: [],
      professionalismScore: 5,
      technicalDepthScore: 3,
      cultureFitNotes: "Good fit",
      interviewStartedAt: new Date("2025-01-01T00:00:00Z"),
      interviewEndedAt: new Date("2025-01-01T00:20:00Z"),
      interviewDurationSeconds: 1200,
    });

    const request = new Request(
      "http://localhost/api/interview/assessment?assessmentId=assessment-1"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hrAssessment.communicationScore).toBe(4);
    expect(data.hrAssessment.interviewDurationSeconds).toBe(1200);
  });
});
