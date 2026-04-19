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

// Mock @/lib/ai/gemini
const mockGenerateEphemeralToken = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  generateEphemeralToken: (...args: unknown[]) =>
    mockGenerateEphemeralToken(...args),
}));

// Mock @/lib/ai/conversation-memory
const mockFormatMemoryForPrompt = vi.fn();
const mockFormatConversationTimeline = vi.fn().mockReturnValue("");
const mockFormatConversationsForSummary = vi
  .fn()
  .mockReturnValue("Summary of prior conversations.");
vi.mock("@/lib/ai/conversation-memory", () => ({
  buildCoworkerMemory: vi.fn().mockResolvedValue({
    hasPriorConversations: false,
    summary: null,
    recentMessages: [],
    totalMessageCount: 0,
  }),
  formatMemoryForPrompt: (...args: unknown[]) =>
    mockFormatMemoryForPrompt(...args),
  formatConversationTimeline: (...args: unknown[]) =>
    mockFormatConversationTimeline(...args),
  formatConversationsForSummary: (...args: unknown[]) =>
    mockFormatConversationsForSummary(...args),
  buildCrossCoworkerContext: vi.fn().mockReturnValue(""),
}));

// Mock @/lib/analysis
vi.mock("@/lib/analysis", () => ({
  logAICall: vi.fn().mockResolvedValue({
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock @/lib/ai
vi.mock("@/lib/ai", () => ({
  parseCoworkerKnowledge: vi.fn().mockReturnValue([]),
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
    // Mock formatConversationTimeline to return prior conversation context
    mockFormatConversationTimeline.mockReturnValue(
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

  it("should include Spanish instruction for Spanish scenario", async () => {
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
        language: "es", // Spanish scenario
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-id",
      name: "María García",
      role: "Senior Engineer",
      personaStyle: "Technical and detail-oriented",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([]);
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

    // Verify Spanish instruction is included
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("Respond in neutral Latin American Spanish"),
        language: "es", // Verify language parameter is passed
      })
    );
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("Use \"tú\" form"),
        language: "es",
      })
    );
  });

  it("should not include Spanish instruction for English scenario", async () => {
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
        language: "en", // English scenario
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

    // Verify Spanish instruction is NOT included
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.not.stringContaining("Respond in neutral Latin American Spanish"),
        language: "en", // Verify English language is passed
      })
    );
  });

  it("should pass language code 'es' for Spanish voice sessions", async () => {
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
        language: "es", // Spanish scenario
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-id",
      name: "María García",
      role: "Senior Engineer",
      personaStyle: "Technical",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([]);
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

    // Verify language code "es" is passed for Spanish scenario
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "es",
      })
    );
  });

  it("should use defense phase prompt when isPostSubmission=true with a manager", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
      repoUrl: "https://github.com/test/repo",
      codeReview: { summary: "Good structure, missing edge-case handling." },
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
      name: "Matías Valenzuela",
      role: "Engineering Manager",
      personaStyle: "Direct and curious",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([]);
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        isPostSubmission: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data.isDefenseCall).toBe(true);

    // The defense prompt opens with "Work Review Call" section
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("Work Review Call"),
      })
    );
    // And threads through the code review summary
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("missing edge-case handling"),
      })
    );
  });

  it("should NOT use defense phase when isPostSubmission=true but coworker is not a manager", async () => {
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
      user: { name: "Test User", email: "test@example.com" },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-id",
      name: "Elena Petrova",
      role: "Staff Engineer",
      personaStyle: "Thoughtful",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([]);
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/call/token", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "test-id",
        coworkerId: "coworker-id",
        isPostSubmission: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.data.isDefenseCall).toBe(false);
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.not.stringContaining("Work Review Call"),
      })
    );
  });

  it("should pass language code 'en' for English voice sessions", async () => {
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
        language: "en", // English scenario
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-id",
      name: "John Smith",
      role: "Senior Engineer",
      personaStyle: "Technical",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([]);
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

    // Verify language code "en" is passed for English scenario
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "en",
      })
    );
  });
});
