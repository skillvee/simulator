/**
 * Integration test for POST /api/recruiter/simulations/[id]/clone
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { db } from "@/server/db";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    coworker: {
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/scenarios/task-generator", () => ({
  generateCodingTask: vi.fn().mockResolvedValue({
    taskOptions: [{
      title: "Implementar función de búsqueda",
      description: "Implementar una función de búsqueda en español",
      difficulty: "medium",
    }],
    _debug: { promptText: "", responseText: "", attempts: 1 },
  }),
}));

vi.mock("@/lib/scenarios/resource-generator", () => ({
  generateResources: vi.fn().mockResolvedValue({
    resources: [
      {
        type: "document",
        label: "Documentación API",
        url: "https://api.example.com/docs",
        instructions: "Consulta la documentación en español",
      },
    ],
    _debug: { promptText: "", responseText: "", attempts: 1 },
  }),
}));

vi.mock("@/lib/scenarios/coworker-generator", () => ({
  generateCoworkers: vi.fn().mockResolvedValue({
    coworkers: [
      {
        name: "María García",
        role: "Gerente de Ingeniería",
        personaStyle: "Profesional y amigable",
        personality: {
          warmth: "welcoming",
          helpfulness: "generous",
          verbosity: "moderate",
          opinionStrength: "neutral",
          mood: "neutral",
          relationshipDynamic: "mentoring",
          petPeeves: ["Código sin pruebas"],
        },
        knowledge: [
          {
            topic: "arquitectura",
            triggerKeywords: ["arquitectura", "diseño"],
            response: "Nuestra arquitectura usa microservicios",
            isCritical: true,
          },
        ],
      },
      {
        name: "Carlos Rodriguez",
        role: "Desarrollador Senior",
        personaStyle: "Técnico y detallista",
        personality: null,
        knowledge: [],
      },
    ],
    _meta: {
      promptVersion: "2.0",
      generatedAt: new Date().toISOString(),
    },
    _debug: { promptText: "", responseText: "", attempts: 1 },
  }),
}));

describe("POST /api/recruiter/simulations/[id]/clone", () => {
  const mockUser = {
    id: "recruiter123",
    email: "recruiter@test.com",
    name: "Test Recruiter",
    role: "RECRUITER",
  };

  const mockScenario = {
    id: "scenario123",
    name: "Frontend Developer",
    companyName: "Tech Company",
    companyDescription: "A leading tech company",
    taskDescription: "Build a search feature",
    repoUrl: "https://github.com/test/repo",
    techStack: ["React", "TypeScript", "Node.js"],
    targetLevel: "mid",
    simulationDepth: "medium",
    archetypeId: null,
    resources: [],
    isPublished: true,
    isChallenge: false,
    language: "en",
    createdById: "recruiter123",
    createdAt: new Date(),
    updatedAt: new Date(),
    challengeTagline: null,
    repoSpec: null,
    coworkers: [],
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully clone a scenario to Spanish", async () => {
    // Setup mocks
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as never);
    vi.mocked(db.scenario.findUnique).mockResolvedValue(mockScenario);
    vi.mocked(db.scenario.create).mockResolvedValue({
      ...mockScenario,
      id: "cloned-scenario-123",
      language: "es",
      taskDescription: "Implementar una función de búsqueda en español",
    });

    // Create request
    const request = new Request("http://localhost:3000/api/recruiter/simulations/scenario123/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "es" }),
    });

    const context = {
      params: Promise.resolve({ id: "scenario123" }),
    };

    // Execute
    const response = await POST(request, context);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(201);
    expect(data.data).toMatchObject({
      scenarioId: "cloned-scenario-123",
      language: "es",
      message: "Scenario cloned to es successfully",
    });

    // Verify scenario creation
    expect(db.scenario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        language: "es",
        taskDescription: "Implementar una función de búsqueda en español",
        createdById: "recruiter123",
      }),
    });

    // Verify coworkers creation
    expect(db.coworker.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          scenarioId: "cloned-scenario-123",
          name: "María García",
          role: "Gerente de Ingeniería",
        }),
        expect.objectContaining({
          scenarioId: "cloned-scenario-123",
          name: "Carlos Rodriguez",
          role: "Desarrollador Senior",
        }),
      ]),
    });
  });

  it("should reject cloning to the same language", async () => {
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as never);
    vi.mocked(db.scenario.findUnique).mockResolvedValue(mockScenario);

    const request = new Request("http://localhost:3000/api/recruiter/simulations/scenario123/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en" }), // Same as source
    });

    const context = {
      params: Promise.resolve({ id: "scenario123" }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Cannot clone to the same language");
  });

  it("should reject unauthorized users", async () => {
    vi.mocked(auth).mockResolvedValue({ user: null } as never);

    const request = new Request("http://localhost:3000/api/recruiter/simulations/scenario123/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "es" }),
    });

    const context = {
      params: Promise.resolve({ id: "scenario123" }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Unauthorized");
  });

  it("should reject non-recruiter users", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { ...mockUser, role: "USER" },
    } as never);

    const request = new Request("http://localhost:3000/api/recruiter/simulations/scenario123/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "es" }),
    });

    const context = {
      params: Promise.resolve({ id: "scenario123" }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Recruiter access required");
  });

  it("should reject cloning scenarios not owned by the user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as never);
    vi.mocked(db.scenario.findUnique).mockResolvedValue({
      ...mockScenario,
      createdById: "other-user-id", // Different owner
    });

    const request = new Request("http://localhost:3000/api/recruiter/simulations/scenario123/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "es" }),
    });

    const context = {
      params: Promise.resolve({ id: "scenario123" }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Not authorized to clone this scenario");
  });

  it("should allow admin to clone any scenario", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { ...mockUser, role: "ADMIN" },
    } as never);
    vi.mocked(db.scenario.findUnique).mockResolvedValue({
      ...mockScenario,
      createdById: "other-user-id", // Different owner
    });
    vi.mocked(db.scenario.create).mockResolvedValue({
      ...mockScenario,
      id: "cloned-scenario-123",
      language: "es",
      createdById: "recruiter123",
    });

    const request = new Request("http://localhost:3000/api/recruiter/simulations/scenario123/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "es" }),
    });

    const context = {
      params: Promise.resolve({ id: "scenario123" }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(201); // Admin can clone any scenario
  });

  it("should reject invalid language codes", async () => {
    vi.mocked(auth).mockResolvedValue({ user: mockUser } as never);

    const request = new Request("http://localhost:3000/api/recruiter/simulations/scenario123/clone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "invalid-lang" }),
    });

    const context = {
      params: Promise.resolve({ id: "scenario123" }),
    };

    const response = await POST(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details?.[0]?.message).toContain("Invalid language code");
  });
});