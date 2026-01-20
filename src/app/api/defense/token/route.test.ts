import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
const mockAssessmentUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
      update: (...args: unknown[]) => mockAssessmentUpdate(...args),
    },
  },
}));

// Mock @/lib/ai (gemini + conversation-memory)
const mockGenerateEphemeralToken = vi.fn();
const mockBuildCoworkerMemory = vi.fn();
const mockFormatMemoryForPrompt = vi.fn();
vi.mock("@/lib/ai", () => ({
  generateEphemeralToken: (...args: unknown[]) =>
    mockGenerateEphemeralToken(...args),
  buildCoworkerMemory: (...args: unknown[]) => mockBuildCoworkerMemory(...args),
  formatMemoryForPrompt: (...args: unknown[]) =>
    mockFormatMemoryForPrompt(...args),
}));

// Mock github module for CI status (now in @/lib/external)
const mockFetchPrCiStatus = vi.fn();
const mockFormatCiStatusForPrompt = vi.fn();
vi.mock("@/lib/external", () => ({
  fetchPrCiStatus: (...args: unknown[]) => mockFetchPrCiStatus(...args),
  formatCiStatusForPrompt: (...args: unknown[]) =>
    mockFormatCiStatusForPrompt(...args),
}));

import { POST } from "./route";

describe("POST /api/defense/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildCoworkerMemory.mockResolvedValue({
      summary: null,
      recentMessages: [],
      totalMessageCount: 0,
      hasPriorConversations: false,
    });
    mockFormatMemoryForPrompt.mockReturnValue("");
    // Mock CI status functions
    mockFetchPrCiStatus.mockResolvedValue({
      prUrl: "https://github.com/owner/repo/pull/123",
      fetchedAt: new Date().toISOString(),
      overallStatus: "success",
      checksCount: 1,
      checksCompleted: 1,
      checksPassed: 1,
      checksFailed: 0,
      checks: [],
    });
    mockFormatCiStatusForPrompt.mockReturnValue("CI Status: SUCCESS");
    mockAssessmentUpdate.mockResolvedValue({});
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/defense/token", {
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

    const request = new Request("http://localhost/api/defense/token", {
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

    const request = new Request("http://localhost/api/defense/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 400 when no PR URL exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      prUrl: null, // No PR submitted yet
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build something",
        techStack: ["TypeScript"],
        repoUrl: "https://github.com/test/repo",
        coworkers: [],
      },
      user: { name: "Test User", email: "test@example.com" },
      conversations: [],
      hrAssessment: null,
      recordings: [],
    });

    const request = new Request("http://localhost/api/defense/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("No PR URL found. Please submit your PR first.");
  });

  it("should return token with manager info when valid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      prUrl: "https://github.com/test/repo/pull/1",
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
      user: { name: "Test User", email: "test@example.com" },
      conversations: [],
      hrAssessment: null,
      recordings: [],
    });
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/defense/token", {
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
    expect(json.data.prUrl).toBe("https://github.com/test/repo/pull/1");
  });

  it("should use default manager when no manager coworker found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      prUrl: "https://github.com/test/repo/pull/1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build a notification system",
        techStack: ["TypeScript", "React"],
        repoUrl: "https://github.com/test/repo",
        coworkers: [], // No manager
      },
      user: { name: "Test User", email: "test@example.com" },
      conversations: [],
      hrAssessment: null,
      recordings: [],
    });
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/defense/token", {
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

  it("should include defense-specific instructions in system prompt", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      prUrl: "https://github.com/test/repo/pull/1",
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
      user: { name: "Test User", email: "test@example.com" },
      conversations: [],
      hrAssessment: null,
      recordings: [],
    });
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/defense/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify the system prompt includes defense-specific instructions
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("reviewing"),
      })
    );
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("probe deeper"),
      })
    );
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining(
          "https://github.com/test/repo/pull/1"
        ),
      })
    );
  });

  it("should include conversation history in context", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", name: "Test User" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "test-id",
      prUrl: "https://github.com/test/repo/pull/1",
      scenario: {
        companyName: "Test Corp",
        taskDescription: "Build something",
        techStack: ["TypeScript"],
        repoUrl: "https://github.com/test/repo",
        coworkers: [
          { id: "manager-id", name: "Alex Chen", role: "Engineering Manager" },
        ],
      },
      user: { name: "Test User", email: "test@example.com" },
      conversations: [
        {
          type: "kickoff",
          coworkerId: "manager-id",
          transcript: [
            { role: "user", text: "Hello", timestamp: "2024-01-01" },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      hrAssessment: null,
      recordings: [],
    });
    mockBuildCoworkerMemory.mockResolvedValue({
      summary: "Discussed task requirements",
      recentMessages: [],
      totalMessageCount: 1,
      hasPriorConversations: true,
    });
    mockFormatMemoryForPrompt.mockReturnValue(
      "## Prior Conversation\nDiscussed task requirements"
    );
    mockGenerateEphemeralToken.mockResolvedValue("ephemeral-token-123");

    const request = new Request("http://localhost/api/defense/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockBuildCoworkerMemory).toHaveBeenCalled();
    expect(mockFormatMemoryForPrompt).toHaveBeenCalled();
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/defense/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to initialize defense call");
  });
});
