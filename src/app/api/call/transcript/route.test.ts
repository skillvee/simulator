import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockCoworkerFindFirst = vi.fn();
const mockConversationFindFirst = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    coworker: {
      findFirst: (...args: unknown[]) => mockCoworkerFindFirst(...args),
    },
    conversation: {
      findFirst: (...args: unknown[]) => mockConversationFindFirst(...args),
      create: (...args: unknown[]) => mockConversationCreate(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
    },
  },
}));

import { POST, GET } from "./route";

describe("POST /api/call/transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/call/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        transcript: [],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid request body", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request("http://localhost/api/call/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        // missing coworkerId and transcript
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/call/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        transcript: [{ role: "user", text: "Hello", timestamp: "2024-01-01" }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 404 when coworker not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
    });
    mockCoworkerFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/call/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        transcript: [{ role: "user", text: "Hello", timestamp: "2024-01-01" }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Coworker not found");
  });

  it("should create new conversation when none exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-id",
    });
    mockConversationFindFirst.mockResolvedValue(null);
    mockConversationCreate.mockResolvedValue({
      id: "conv-1",
    });

    const transcript = [{ role: "user", text: "Hello", timestamp: "2024-01-01" }];
    const request = new Request("http://localhost/api/call/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        transcript,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockConversationCreate).toHaveBeenCalledWith({
      data: {
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        type: "voice",
        transcript,
      },
    });
  });

  it("should append to existing conversation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-id",
    });
    mockConversationFindFirst.mockResolvedValue({
      id: "conv-1",
      transcript: [{ role: "model", text: "Hey there", timestamp: "2024-01-01" }],
    });
    mockConversationUpdate.mockResolvedValue({
      id: "conv-1",
    });

    const newTranscript = [{ role: "user", text: "Hello", timestamp: "2024-01-02" }];
    const request = new Request("http://localhost/api/call/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        transcript: newTranscript,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockConversationUpdate).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: {
        transcript: [
          { role: "model", text: "Hey there", timestamp: "2024-01-01" },
          { role: "user", text: "Hello", timestamp: "2024-01-02" },
        ],
      },
    });
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/call/transcript", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        transcript: [{ role: "user", text: "Hello", timestamp: "2024-01-01" }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});

describe("GET /api/call/transcript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/call/transcript?assessmentId=test-id&coworkerId=coworker-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request(
      "http://localhost/api/call/transcript?coworkerId=coworker-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return 400 when coworkerId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request(
      "http://localhost/api/call/transcript?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/call/transcript?assessmentId=test-id&coworkerId=coworker-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("should return transcript when found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
    });
    mockConversationFindFirst.mockResolvedValue({
      id: "conv-1",
      transcript: [
        { role: "user", text: "Hello", timestamp: "2024-01-01" },
        { role: "model", text: "Hi there!", timestamp: "2024-01-01" },
      ],
    });

    const request = new Request(
      "http://localhost/api/call/transcript?assessmentId=test-id&coworkerId=coworker-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.transcript).toHaveLength(2);
  });

  it("should return empty transcript when no conversation exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
    });
    mockConversationFindFirst.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/call/transcript?assessmentId=test-id&coworkerId=coworker-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.transcript).toEqual([]);
  });
});
