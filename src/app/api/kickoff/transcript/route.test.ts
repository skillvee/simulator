import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockConversationFindFirst = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    conversation: {
      findFirst: (...args: unknown[]) => mockConversationFindFirst(...args),
      create: (...args: unknown[]) => mockConversationCreate(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
    },
  },
}));

import { POST, GET } from "./route";

describe("POST /api/kickoff/transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id", transcript: [] }),
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

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "POST",
      body: JSON.stringify({ transcript: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Assessment ID is required");
  });

  it("should return 400 when transcript is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Transcript array is required");
  });

  it("should return 400 when transcript is not an array", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id", transcript: "not an array" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Transcript array is required");
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id", transcript: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should create new conversation when none exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "test-id" });
    mockConversationFindFirst.mockResolvedValue(null);
    mockConversationCreate.mockResolvedValue({
      id: "conv-id",
    });

    const transcript = [
      { role: "user", text: "Hi", timestamp: "2024-01-01T00:00:00Z" },
      { role: "model", text: "Hello!", timestamp: "2024-01-01T00:00:01Z" },
    ];

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        managerId: "manager-id",
        transcript,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBe("conv-id");
    expect(data.messageCount).toBe(2);

    expect(mockConversationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assessmentId: "test-id",
        coworkerId: "manager-id",
        type: "kickoff",
        transcript: expect.any(Array),
      }),
    });
  });

  it("should append to existing conversation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "test-id" });
    mockConversationFindFirst.mockResolvedValue({
      id: "existing-conv-id",
      transcript: [
        { role: "user", text: "Previous message", timestamp: "2024-01-01T00:00:00Z" },
      ],
    });
    mockConversationUpdate.mockResolvedValue({
      id: "existing-conv-id",
    });

    const newTranscript = [
      { role: "model", text: "New response", timestamp: "2024-01-01T00:00:02Z" },
    ];

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        transcript: newTranscript,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBe("existing-conv-id");
    expect(data.messageCount).toBe(2); // 1 existing + 1 new

    expect(mockConversationUpdate).toHaveBeenCalledWith({
      where: { id: "existing-conv-id" },
      data: expect.objectContaining({
        transcript: expect.arrayContaining([
          expect.objectContaining({ text: "Previous message" }),
          expect.objectContaining({ text: "New response" }),
        ]),
      }),
    });
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id", transcript: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to save transcript");
  });
});

describe("GET /api/kickoff/transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/kickoff/transcript?assessmentId=test-id",
      { method: "GET" }
    );

    const response = await GET(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request("http://localhost/api/kickoff/transcript", {
      method: "GET",
    });

    const response = await GET(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Assessment ID is required");
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/kickoff/transcript?assessmentId=test-id",
      { method: "GET" }
    );

    const response = await GET(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return empty transcript when no conversation exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "test-id" });
    mockConversationFindFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/kickoff/transcript?assessmentId=test-id",
      { method: "GET" }
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.transcript).toEqual([]);
    expect(data.messageCount).toBe(0);
  });

  it("should return transcript when conversation exists", async () => {
    const transcript = [
      { role: "user", text: "Hi", timestamp: "2024-01-01T00:00:00Z" },
      { role: "model", text: "Hello!", timestamp: "2024-01-01T00:00:01Z" },
    ];

    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "test-id" });
    mockConversationFindFirst.mockResolvedValue({
      id: "conv-id",
      transcript,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    });

    const request = new Request(
      "http://localhost/api/kickoff/transcript?assessmentId=test-id",
      { method: "GET" }
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBe("conv-id");
    expect(data.transcript).toEqual(transcript);
    expect(data.messageCount).toBe(2);
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const request = new Request(
      "http://localhost/api/kickoff/transcript?assessmentId=test-id",
      { method: "GET" }
    );

    const response = await GET(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to retrieve transcript");
  });
});
