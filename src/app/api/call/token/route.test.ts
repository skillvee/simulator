import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockCoworkerFindFirst = vi.fn();
const mockConversationFindMany = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    coworker: {
      findFirst: (...args: unknown[]) => mockCoworkerFindFirst(...args),
    },
    conversation: {
      findMany: (...args: unknown[]) => mockConversationFindMany(...args),
    },
  },
}));

// Mock gemini
const mockGenerateEphemeralToken = vi.fn();
vi.mock("@/lib/gemini", () => ({
  generateEphemeralToken: (...args: unknown[]) =>
    mockGenerateEphemeralToken(...args),
}));

// Mock conversation-memory (to avoid calling Gemini for summarization in tests)
const mockFormatMemoryForPrompt = vi.fn();
vi.mock("@/lib/conversation-memory", () => ({
  buildCoworkerMemory: vi.fn().mockResolvedValue({
    hasPriorConversations: false,
    summary: null,
    recentMessages: [],
    totalMessageCount: 0,
  }),
  formatMemoryForPrompt: (...args: unknown[]) =>
    mockFormatMemoryForPrompt(...args),
  buildCrossCoworkerContext: vi.fn().mockReturnValue(""),
}));

import { POST } from "./route";

describe("POST /api/call/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
      }),
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

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({ coworkerId: "coworker-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Validation failed");
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "assessmentId" }),
      ])
    );
  });

  it("should return 400 when coworkerId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Validation failed");
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "coworkerId" })])
    );
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
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
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["TypeScript", "React"],
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockCoworkerFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Coworker not found");
  });

  it("should return token when all inputs are valid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["TypeScript", "React"],
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-id",
      name: "Jordan Rivera",
      role: "Senior Engineer",
      personaStyle: "Technical and detail-oriented",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([]);
    mockFormatMemoryForPrompt.mockReturnValue("");
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.token).toBe("ephemeral-token-123");
    expect(json.data.coworkerName).toBe("Jordan Rivera");
    expect(json.data.coworkerRole).toBe("Senior Engineer");
  });

  it("should include prior conversation context in system prompt", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["TypeScript", "React"],
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-id",
      name: "Jordan Rivera",
      role: "Senior Engineer",
      personaStyle: "Technical and detail-oriented",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([
      {
        id: "conv-1",
        coworkerId: "coworker-id",
        type: "text",
        transcript: [
          {
            role: "user",
            text: "How does auth work?",
            timestamp: "2024-01-01",
          },
          {
            role: "model",
            text: "We use JWT tokens.",
            timestamp: "2024-01-01",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        coworker: { id: "coworker-id", name: "Jordan Rivera" },
      },
    ]);
    // Mock formatMemoryForPrompt to return prior conversation context
    mockFormatMemoryForPrompt.mockReturnValue(
      "\n## Prior Conversation History\nWe discussed auth."
    );
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify that generateEphemeralToken was called with system instruction containing prior history
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining(
          "Prior Conversation History"
        ),
      })
    );
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to initialize call");
  });
});
