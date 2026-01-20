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
const mockConversationFindMany = vi.fn();
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
      findMany: (...args: unknown[]) => mockConversationFindMany(...args),
      create: (...args: unknown[]) => mockConversationCreate(...args),
      update: (...args: unknown[]) => mockConversationUpdate(...args),
    },
  },
}));

// Mock @/lib/ai (gemini + conversation-memory)
const mockGenerateContent = vi.fn();
vi.mock("@/lib/ai", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  },
  buildCoworkerMemory: vi.fn().mockResolvedValue({
    hasPriorConversations: false,
    summary: null,
    recentMessages: [],
    totalMessageCount: 0,
  }),
  formatMemoryForPrompt: vi.fn().mockReturnValue(""),
  buildCrossCoworkerContext: vi.fn().mockReturnValue(""),
  parseCoworkerKnowledge: vi.fn().mockReturnValue([]),
}));

import { POST, GET } from "./route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        // missing coworkerId and message
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

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("should return 404 when coworker not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["typescript", "react"],
      },
    });
    mockCoworkerFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("should send message to Gemini and return response", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["typescript", "react"],
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-1",
      name: "Jordan Rivera",
      role: "Senior Engineer",
      personaStyle: "Technical and helpful",
      knowledge: [],
    });
    // Mock findMany to return empty array (no prior conversations)
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    mockGenerateContent.mockResolvedValue({
      text: "Hi there! How can I help you?",
    });

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.response).toBe("Hi there! How can I help you?");
    expect(json.data.timestamp).toBeDefined();
  });

  it("should include conversation history in Gemini request", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["typescript", "react"],
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-1",
      name: "Jordan Rivera",
      role: "Senior Engineer",
      personaStyle: "Technical and helpful",
      knowledge: [],
    });
    const existingHistory = [
      {
        role: "user",
        text: "Previous message",
        timestamp: "2025-01-01T00:00:00Z",
      },
      {
        role: "model",
        text: "Previous response",
        timestamp: "2025-01-01T00:00:01Z",
      },
    ];
    // Mock findMany to return existing text conversation
    mockConversationFindMany.mockResolvedValue([
      {
        id: "conv-1",
        coworkerId: "coworker-1",
        type: "text",
        transcript: existingHistory,
        createdAt: new Date(),
        updatedAt: new Date(),
        coworker: { id: "coworker-1", name: "Jordan Rivera" },
      },
    ]);
    mockConversationUpdate.mockResolvedValue({});
    mockGenerateContent.mockResolvedValue({
      text: "Follow-up response",
    });

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Follow-up question",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify Gemini was called with contents including history
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3-flash-preview",
        contents: expect.arrayContaining([
          // System prompt
          expect.objectContaining({
            role: "user",
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining("SYSTEM INSTRUCTIONS"),
              }),
            ]),
          }),
          // History messages
          expect.objectContaining({
            role: "user",
            parts: expect.arrayContaining([
              expect.objectContaining({ text: "Previous message" }),
            ]),
          }),
          expect.objectContaining({
            role: "model",
            parts: expect.arrayContaining([
              expect.objectContaining({ text: "Previous response" }),
            ]),
          }),
          // New message
          expect.objectContaining({
            role: "user",
            parts: expect.arrayContaining([
              expect.objectContaining({ text: "Follow-up question" }),
            ]),
          }),
        ]),
      })
    );
  });

  it("should persist messages to conversation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["typescript", "react"],
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-1",
      name: "Jordan Rivera",
      role: "Senior Engineer",
      personaStyle: "Technical and helpful",
      knowledge: [],
    });
    // Mock findMany to return empty (no prior conversations)
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    mockGenerateContent.mockResolvedValue({
      text: "Response text",
    });

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    await POST(request);

    // Verify conversation was created with messages
    expect(mockConversationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        type: "text",
        transcript: expect.arrayContaining([
          expect.objectContaining({ role: "user", text: "Hello" }),
          expect.objectContaining({ role: "model", text: "Response text" }),
        ]),
      }),
    });
  });
});

describe("GET /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/chat?assessmentId=test-id&coworkerId=coworker-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId or coworkerId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });

    const request = new Request(
      "http://localhost/api/chat?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return chat history for valid request", async () => {
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
        { role: "model", text: "Hi there!", timestamp: "2025-01-01T00:00:01Z" },
      ],
    });

    const request = new Request(
      "http://localhost/api/chat?assessmentId=assessment-1&coworkerId=coworker-1"
    );

    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.messages).toHaveLength(2);
    expect(json.data.messages[0].text).toBe("Hello");
    expect(json.data.messages[1].text).toBe("Hi there!");
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
      "http://localhost/api/chat?assessmentId=assessment-1&coworkerId=coworker-1"
    );

    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.messages).toEqual([]);
  });
});
