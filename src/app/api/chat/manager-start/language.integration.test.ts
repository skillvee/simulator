import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockConversationFindFirst = vi.fn();
const mockConversationFindMany = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();
const mockAssessmentUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
      update: (...args: unknown[]) => mockAssessmentUpdate(...args),
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
const mockGenerateContent = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
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

// Spy on buildAgentPrompt to verify context passed
const mockBuildAgentPrompt = vi.fn().mockReturnValue("mock system prompt");
vi.mock("@/prompts/build-agent-prompt", () => ({
  buildAgentPrompt: (...args: unknown[]) => mockBuildAgentPrompt(...args),
}));

import { POST } from "../manager-start/route";
import { AssessmentStatus } from "@prisma/client";

describe("POST /api/chat/manager-start - Language Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass Spanish scenario language to buildAgentPrompt", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WELCOME,
      scenarioId: "scenario-1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Construir una función de búsqueda",
        techStack: ["typescript", "react"],
        language: "es", // Spanish scenario
        coworkers: [
          {
            id: "manager-1",
            name: "Alex Chen",
            role: "Engineering Manager",
            personaStyle: "Supportive",
            personality: {},
            knowledge: [],
            avatarUrl: null,
          },
        ],
      },
    });
    mockConversationFindFirst.mockResolvedValue(null);
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    mockAssessmentUpdate.mockResolvedValue({});

    // Mock Spanish greeting response
    mockGenerateContent.mockResolvedValue({
      text: "¡Hola! ¡Bienvenido al equipo! Soy Alex, tu manager de ingeniería. ¿Cómo estás? ¿Tienes todo configurado correctamente?",
    });

    const request = new Request("http://localhost/api/chat/manager-start", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify buildAgentPrompt was called with Spanish language
    expect(mockBuildAgentPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "es",
      })
    );

    // Verify the greeting is in Spanish
    expect(json.data.greeting).toContain("¡Hola!");
    expect(json.data.greeting).toContain("Bienvenido");
  });

  it("should pass English scenario language to buildAgentPrompt", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WELCOME,
      scenarioId: "scenario-1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a search feature",
        techStack: ["typescript", "react"],
        language: "en", // English scenario
        coworkers: [
          {
            id: "manager-1",
            name: "Alex Chen",
            role: "Engineering Manager",
            personaStyle: "Supportive",
            personality: {},
            knowledge: [],
            avatarUrl: null,
          },
        ],
      },
    });
    mockConversationFindFirst.mockResolvedValue(null);
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    mockAssessmentUpdate.mockResolvedValue({});

    // Mock English greeting response
    mockGenerateContent.mockResolvedValue({
      text: "Hey! Welcome to the team! I'm Alex, your engineering manager. How's it going? Got everything set up okay?",
    });

    const request = new Request("http://localhost/api/chat/manager-start", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify buildAgentPrompt was called with English language
    expect(mockBuildAgentPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "en",
      })
    );

    // Verify the greeting is in English
    expect(json.data.greeting).toContain("Welcome");
    expect(json.data.greeting).toContain("How's it going");
  });

  it("should default to English when scenario language is not set", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WELCOME,
      scenarioId: "scenario-1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a feature",
        techStack: ["typescript", "react"],
        // No language field - should default
        coworkers: [
          {
            id: "manager-1",
            name: "Alex Chen",
            role: "Engineering Manager",
            personaStyle: "Supportive",
            personality: {},
            knowledge: [],
            avatarUrl: null,
          },
        ],
      },
    });
    mockConversationFindFirst.mockResolvedValue(null);
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    mockAssessmentUpdate.mockResolvedValue({});

    mockGenerateContent.mockResolvedValue({
      text: "Hey! Welcome!",
    });

    const request = new Request("http://localhost/api/chat/manager-start", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
      }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(200);

    // Verify buildAgentPrompt was called with English as default
    expect(mockBuildAgentPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "en",
      })
    );
  });

  it("should validate Spanish manager greeting contains Spanish phrases", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      status: AssessmentStatus.WELCOME,
      scenarioId: "scenario-1",
      scenario: {
        companyName: "Tech Innovadores",
        taskDescription: "Desarrollar un sistema de autenticación",
        techStack: ["typescript", "react"],
        language: "es",
        coworkers: [
          {
            id: "manager-1",
            name: "Carlos García",
            role: "Engineering Manager",
            personaStyle: "Supportive",
            personality: {},
            knowledge: [],
            avatarUrl: null,
          },
        ],
      },
    });
    mockConversationFindFirst.mockResolvedValue(null);
    mockConversationFindMany.mockResolvedValue([]);
    mockConversationCreate.mockResolvedValue({ id: "conv-1" });
    mockAssessmentUpdate.mockResolvedValue({});

    // Mock a typical Spanish manager greeting
    const spanishGreeting = "¡Hola! ¡Qué bueno tenerte en el equipo! Soy Carlos, tu gerente de ingeniería. Espero que te sientas cómodo. ¿Ya pudiste configurar tu entorno de desarrollo? Si necesitas ayuda con algo, no dudes en preguntarme.";
    mockGenerateContent.mockResolvedValue({
      text: spanishGreeting,
    });

    const request = new Request("http://localhost/api/chat/manager-start", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    const greeting = json.data.greeting;

    // Check for common Spanish manager greeting indicators
    const spanishPhrases = [
      "equipo", "gerente", "ingeniería", "desarrollo",
      "ayuda", "configurar", "necesitas", "qué", "cómodo"
    ];

    const containsSpanish = spanishPhrases.some(phrase =>
      greeting.toLowerCase().includes(phrase.toLowerCase())
    );

    expect(containsSpanish).toBe(true);
  });
});