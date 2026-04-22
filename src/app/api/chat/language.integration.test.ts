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
const mockConversationCreate = vi.fn();
const mockAssessmentApiCallCreate = vi.fn();
const mockAssessmentApiCallUpdate = vi.fn();
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
      create: (...args: unknown[]) => mockConversationCreate(...args),
    },
    assessmentApiCall: {
      create: (...args: unknown[]) => mockAssessmentApiCallCreate(...args),
      update: (...args: unknown[]) => mockAssessmentApiCallUpdate(...args),
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
  formatConversationTimeline: vi.fn().mockReturnValue(""),
  buildCrossCoworkerContext: vi.fn().mockReturnValue(""),
}));

// Mock @/lib/ai
vi.mock("@/lib/ai", () => ({
  parseCoworkerKnowledge: vi.fn().mockReturnValue([]),
}));

// Spy on buildAgentPrompt to verify context passed
const mockBuildAgentPrompt = vi.fn().mockReturnValue("mock system prompt");
vi.mock("@/prompts/build-agent-prompt", () => ({
  buildAgentPrompt: (...args: unknown[]) => mockBuildAgentPrompt(...args),
}));

import { POST } from "./route";
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

describe("POST /api/chat - Language Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: logAICall creates an API call record
    mockAssessmentApiCallCreate.mockResolvedValue({ id: "api-call-1" });
    mockAssessmentApiCallUpdate.mockResolvedValue({});
  });

  it("should pass Spanish scenario language to buildAgentPrompt", async () => {
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
        language: "es", // Spanish scenario
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
      createMockStream(["¡Hola! ¿En qué puedo ayudarte?"])
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hola",
      }),
    });

    const response = await POST(request);
    const events = await readSSEResponse(response);

    expect(response.status).toBe(200);

    // Verify buildAgentPrompt was called with Spanish language
    expect(mockBuildAgentPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "es",
      })
    );

    // Verify the response contains Spanish text
    const chunks = events.filter((e) => e.type === "chunk");
    const allText = chunks.map(c => c.text).join("");
    expect(allText).toContain("¡Hola!");
  });

  it("should pass English scenario language to buildAgentPrompt", async () => {
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
        language: "en", // English scenario
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
      createMockStream(["Hello! How can I help you?"])
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
    const events = await readSSEResponse(response);

    expect(response.status).toBe(200);

    // Verify buildAgentPrompt was called with English language
    expect(mockBuildAgentPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "en",
      })
    );

    // Verify the response contains English text
    const chunks = events.filter((e) => e.type === "chunk");
    const allText = chunks.map(c => c.text).join("");
    expect(allText).toContain("Hello!");
  });

  it("should default to English when scenario language is not set", async () => {
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
        // No language field - should default
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

    expect(response.status).toBe(200);

    // Verify buildAgentPrompt was called with English as default
    expect(mockBuildAgentPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "en",
      })
    );
  });

  it("should validate Spanish response contains common Spanish words", async () => {
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
        taskDescription: "Construir una función",
        techStack: ["typescript", "react"],
        language: "es",
      },
    });
    mockCoworkerFindFirst.mockResolvedValue({
      id: "coworker-1",
      name: "Jordan Rivera",
      role: "Engineering Manager",
      personaStyle: "Technical and helpful",
      knowledge: [],
    });
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });

    // Mock a typical Spanish response
    const spanishResponse = "¡Hola! Me alegro de conocerte. ¿Cómo estás? Estoy aquí para ayudarte con el proyecto. ¿Tienes alguna pregunta sobre la tarea?";
    mockGenerateContentStream.mockResolvedValue(
      createMockStream([spanishResponse])
    );

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        coworkerId: "coworker-1",
        message: "Hola, ¿cómo estás?",
      }),
    });

    const response = await POST(request);
    const events = await readSSEResponse(response);

    expect(response.status).toBe(200);

    const chunks = events.filter((e) => e.type === "chunk");
    const allText = chunks.map(c => c.text).join("");

    // Check for common Spanish words/phrases
    const commonSpanishIndicators = [
      "cómo", "qué", "está", "estás", "aquí", "para",
      "con", "el", "la", "de", "¿", "¡", "proyecto", "tarea"
    ];

    const containsSpanish = commonSpanishIndicators.some(word =>
      allText.toLowerCase().includes(word.toLowerCase())
    );

    expect(containsSpanish).toBe(true);
  });
});