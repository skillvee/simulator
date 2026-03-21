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

// Mock @/lib/ai/gemini
const mockGenerateContentStream = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContentStream: (...args: unknown[]) => mockGenerateContentStream(...args),
    },
  },
}));

// Mock @/lib/ai/conversation-memory
vi.mock("@/lib/ai/conversation-memory", () => ({
  buildCoworkerMemory: vi.fn().mockResolvedValue({
    hasPriorConversations: false,
    summary: null,
    recentMessages: [],
    totalMessageCount: 0,
  }),
  formatMemoryForPrompt: vi.fn().mockReturnValue(""),
  buildCrossCoworkerContext: vi.fn().mockReturnValue(""),
}));

// Mock @/lib/ai
vi.mock("@/lib/ai", () => ({
  parseCoworkerKnowledge: vi.fn().mockReturnValue([]),
}));

// Spy on buildChatPrompt to verify context passed
const mockBuildChatPrompt = vi.fn().mockReturnValue("mock system prompt");
vi.mock("@/prompts", () => ({
  buildChatPrompt: (...args: unknown[]) => mockBuildChatPrompt(...args),
  buildCallNudgeInstruction: vi.fn().mockReturnValue(""),
  buildPRAcknowledgmentContext: vi.fn().mockReturnValue(""),
  INVALID_PR_PROMPT: "invalid pr prompt",
  DUPLICATE_PR_PROMPT: "duplicate pr prompt",
}));

import { POST, GET } from "./route";
import { AssessmentStatus } from "@prisma/client";

// Helper: create an async iterable that yields chunks for generateContentStream
function createMockStream(texts: string[]) {
  return (async function* () {
    for (const text of texts) {
      yield { text };
    }
  })();
}

// Helper: read an SSE stream response and parse the events
async function readSSEResponse(response: Response): Promise<Array<{ type: string; [key: string]: unknown }>> {
  const text = await response.text();
  const events: Array<{ type: string; [key: string]: unknown }> = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      events.push(JSON.parse(line.slice(6)));
    }
  }
  return events;
}

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
      status: AssessmentStatus.WORKING,
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

  it("should send message to Gemini and return streamed response", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      scenarioId: "scenario-1",
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
    mockGenerateContentStream.mockResolvedValue(
      createMockStream(["Hi there!", " How can I help you?"])
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readSSEResponse(response);
    const chunks = events.filter((e) => e.type === "chunk");
    const done = events.find((e) => e.type === "done");

    expect(chunks.length).toBe(2);
    expect(chunks[0].text).toBe("Hi there!");
    expect(chunks[1].text).toBe(" How can I help you?");
    expect(done).toBeDefined();
    expect(done!.timestamp).toBeDefined();
  });

  it("should include conversation history in Gemini request", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      scenarioId: "scenario-1",
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
    mockGenerateContentStream.mockResolvedValue(
      createMockStream(["Follow-up response"])
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Follow-up question",
      }),
    });

    const response = await POST(request);
    // Consume the stream so the mock calls complete
    await readSSEResponse(response);
    expect(response.status).toBe(200);

    // Verify Gemini was called with contents including history
    expect(mockGenerateContentStream).toHaveBeenCalledWith(
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

  it("should handle Gemini returning empty text gracefully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      scenarioId: "scenario-1",
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
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    // Gemini yields chunks with empty/null text
    mockGenerateContentStream.mockResolvedValue(
      (async function* () {
        yield { text: "" };
        yield { text: null };
        yield { text: undefined };
      })()
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const events = await readSSEResponse(response);
    const chunks = events.filter((e) => e.type === "chunk");
    const done = events.find((e) => e.type === "done");

    // Should send a fallback message when no text was generated
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.some((c) => (c.text as string).includes("couldn't generate"))).toBe(true);
    expect(done).toBeDefined();
  });

  it("should handle Gemini throwing an error without leaking details", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      scenarioId: "scenario-1",
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
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    // Gemini throws an API error
    mockGenerateContentStream.mockResolvedValue(
      (async function* () {
        throw new Error("RATE_LIMIT_EXCEEDED: quota exhausted for model gemini-3-flash");
      })()
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const events = await readSSEResponse(response);
    const allText = events
      .filter((e) => e.type === "chunk")
      .map((e) => e.text)
      .join("");

    // Should not leak internal error details to client
    expect(allText).not.toContain("RATE_LIMIT_EXCEEDED");
    expect(allText).not.toContain("quota exhausted");
    // Stream should still complete with done event
    expect(events.find((e) => e.type === "done")).toBeDefined();
    // Conversation should still be saved with fallback text
    expect(mockConversationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transcript: expect.arrayContaining([
          expect.objectContaining({
            role: "model",
            text: expect.stringContaining("couldn't respond"),
          }),
        ]),
      }),
    });
  });

  it("should reject chat when assessment is in COMPLETED status", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.COMPLETED,
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["typescript", "react"],
      },
    });
    mockConversationFindMany.mockResolvedValue([]);

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("COMPLETED");
    // Should not call Gemini
    expect(mockGenerateContentStream).not.toHaveBeenCalled();
  });

  it("should handle DB write failure after Gemini succeeds gracefully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      scenarioId: "scenario-1",
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
    mockConversationFindMany.mockResolvedValue([]);
    // DB create rejects
    mockConversationCreate.mockRejectedValue(new Error("DB connection lost"));
    mockGenerateContentStream.mockResolvedValue(
      createMockStream(["Response text"])
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const events = await readSSEResponse(response);
    const chunks = events.filter((e) => e.type === "chunk");
    const done = events.find((e) => e.type === "done");

    // Stream should still complete with the AI response
    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe("Response text");
    expect(done).toBeDefined();
  });

  it("should wrap taskDescription with grounding instructions for manager coworkers", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      scenarioId: "scenario-1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["typescript", "react"],
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-1",
      name: "Alex Chen",
      role: "Engineering Manager",
      personaStyle: "Supportive",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    mockGenerateContentStream.mockResolvedValue(
      createMockStream(["Hello!"])
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    await readSSEResponse(response);

    // Verify buildChatPrompt was called with gated task description
    const context = mockBuildChatPrompt.mock.calls[0][1];
    expect(context.taskDescription).toContain("Your Background Knowledge (NOT shared with the candidate)");
    expect(context.taskDescription).toContain("Build a feature");
    expect(context.taskDescription).toContain("do NOT assume the candidate has read or understood any of it");
  });

  it("should pass undefined taskDescription for non-manager coworkers", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      scenarioId: "scenario-1",
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
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    mockGenerateContentStream.mockResolvedValue(
      createMockStream(["Hello!"])
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    await readSSEResponse(response);

    // Verify buildChatPrompt was called with undefined task description
    const context = mockBuildChatPrompt.mock.calls[0][1];
    expect(context.taskDescription).toBeUndefined();
  });

  it("should persist messages to conversation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      scenarioId: "scenario-1",
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
    mockGenerateContentStream.mockResolvedValue(
      createMockStream(["Response text"])
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hello",
      }),
    });

    const response = await POST(request);
    // Consume the stream so DB save completes
    await readSSEResponse(response);

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
