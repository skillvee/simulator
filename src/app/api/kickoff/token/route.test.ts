import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
  },
}));

// Mock gemini - must match exact import path in route.ts
const mockGenerateEphemeralToken = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  generateEphemeralToken: (...args: unknown[]) =>
    mockGenerateEphemeralToken(...args),
}));

import { POST } from "./route";

describe("POST /api/kickoff/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/kickoff/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
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

    const request = new Request("http://localhost/api/kickoff/token", {
      method: "POST",
      body: JSON.stringify({}),
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

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/kickoff/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return token with manager info when valid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a notification system",
        techStack: ["TypeScript", "React"],
        repoUrl: "https://github.com/test/repo",
        coworkers: [
          {
            id: "manager-id",
            name: "Alex Chen",
            role: "Engineering Manager",
          },
        ],
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/kickoff/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.token).toBe("ephemeral-token-123");
    expect(json.data.managerName).toBe("Alex Chen");
    expect(json.data.managerRole).toBe("Engineering Manager");
    expect(json.data.managerId).toBe("manager-id");
  });

  it("should use default manager when no manager coworker found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a notification system",
        techStack: ["TypeScript", "React"],
        repoUrl: "https://github.com/test/repo",
        coworkers: [], // No manager
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/kickoff/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.token).toBe("ephemeral-token-123");
    expect(json.data.managerName).toBe("Alex Chen"); // Default
    expect(json.data.managerRole).toBe("Engineering Manager"); // Default
  });

  it("should include vague briefing instructions in system prompt", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      scenarioId: "scenario-id",
      scenario: {
        companyName: "TechFlow",
        taskDescription: "Implement a real-time notification system",
        techStack: ["TypeScript", "React", "WebSocket"],
        repoUrl: "https://github.com/techflow/repo",
        coworkers: [
          {
            id: "manager-id",
            name: "Alex Chen",
            role: "Engineering Manager",
          },
        ],
      },
      user: {
        name: "Test User",
        email: "test@example.com",
      },
    });
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/kickoff/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify the system prompt includes vague briefing instructions
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("Be Intentionally Vague"),
      })
    );
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining(
          "Only give details IF they ask"
        ),
      })
    );
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/kickoff/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to initialize kickoff call");
  });
});
