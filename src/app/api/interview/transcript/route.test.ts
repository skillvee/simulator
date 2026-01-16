import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockAssessmentUpdate = vi.fn();
const mockConversationFindFirst = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
      update: (...args: unknown[]) => mockAssessmentUpdate(...args),
    },
    conversation: {
      findFirst: (...args: unknown[]) => mockConversationFindFirst(...args),
      create: (...args: unknown[]) => mockConversationCreate(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
    },
  },
}));

import { POST, GET } from "./route";

describe("POST /api/interview/transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        transcript: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });

    const request = new Request("http://localhost/api/interview/transcript", {
      method: "POST",
      body: JSON.stringify({
        transcript: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        transcript: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("should create a new conversation when none exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockConversationFindFirst.mockResolvedValue(null);
    mockConversationCreate.mockResolvedValue({
      id: "conv-1",
    });
    mockAssessmentUpdate.mockResolvedValue({});

    const transcript = [
      { role: "user" as const, text: "Hello", timestamp: "2025-01-01T00:00:00Z" },
      { role: "model" as const, text: "Hi there", timestamp: "2025-01-01T00:00:01Z" },
    ];

    const request = new Request("http://localhost/api/interview/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        transcript,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockConversationCreate).toHaveBeenCalledWith({
      data: {
        assessmentId: "assessment-1",
        coworkerId: null,
        type: "voice",
        transcript,
      },
    });
  });

  it("should update existing conversation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockConversationFindFirst.mockResolvedValue({
      id: "existing-conv",
    });
    mockConversationUpdate.mockResolvedValue({});
    mockAssessmentUpdate.mockResolvedValue({});

    const transcript = [
      { role: "user" as const, text: "Hello", timestamp: "2025-01-01T00:00:00Z" },
    ];

    const request = new Request("http://localhost/api/interview/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        transcript,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockConversationUpdate).toHaveBeenCalledWith({
      where: { id: "existing-conv" },
      data: { transcript },
    });
  });
});

describe("GET /api/interview/transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/interview/transcript?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });

    const request = new Request("http://localhost/api/interview/transcript");

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return transcript for valid assessment", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockConversationFindFirst.mockResolvedValue({
      id: "conv-1",
      transcript: [
        { role: "user", text: "Hello", timestamp: "2025-01-01T00:00:00Z" },
      ],
    });

    const request = new Request(
      "http://localhost/api/interview/transcript?assessmentId=assessment-1"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transcript).toHaveLength(1);
    expect(data.transcript[0].text).toBe("Hello");
  });

  it("should return empty array when no conversation exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockConversationFindFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/interview/transcript?assessmentId=assessment-1"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transcript).toEqual([]);
  });
});
