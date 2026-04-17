import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockScenarioFindUnique = vi.fn();
const mockAssessmentFindFirst = vi.fn();
const mockAssessmentCreate = vi.fn();
const mockAssessmentUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findUnique: (...args: unknown[]) => mockScenarioFindUnique(...args),
    },
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
      create: (...args: unknown[]) => mockAssessmentCreate(...args),
      update: (...args: unknown[]) => mockAssessmentUpdate(...args),
    },
  },
}));

// Mock provisionAssessmentRepo (fire-and-forget, don't let it run)
vi.mock("@/lib/scenarios/repo-templates", () => ({
  provisionAssessmentRepo: vi.fn().mockResolvedValue(null),
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/assessment/create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/assessment/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest({ scenarioId: "s1" }));
    expect(response.status).toBe(401);
  });

  it("should return 400 when scenarioId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("should return 404 when scenario not found in DB", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockScenarioFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ scenarioId: "nonexistent" }));
    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.error).toBe("Scenario not found");
  });

  it("should return 400 when scenario is not published", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockScenarioFindUnique.mockResolvedValue({
      id: "s1",
      name: "Test Scenario",
      isPublished: false,
      repoUrl: null,
    });

    const response = await POST(makeRequest({ scenarioId: "s1" }));
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBe("Scenario is not available");
  });

  it("should return existing assessment if one already exists (idempotency)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockScenarioFindUnique.mockResolvedValue({
      id: "s1",
      name: "Test Scenario",
      isPublished: true,
      repoUrl: null,
    });
    const existingAssessment = {
      id: "existing-assessment",
      userId: "user-1",
      scenarioId: "s1",
      status: "WORKING",
    };
    mockAssessmentFindFirst.mockResolvedValue(existingAssessment);

    const response = await POST(makeRequest({ scenarioId: "s1" }));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.assessment.id).toBe("existing-assessment");
    expect(json.data.isExisting).toBe(true);
    // Should not have called create
    expect(mockAssessmentCreate).not.toHaveBeenCalled();
  });

  it("should create new assessment with status WORKING", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockScenarioFindUnique.mockResolvedValue({
      id: "s1",
      name: "Test Scenario",
      isPublished: true,
      repoUrl: null,
    });
    mockAssessmentFindFirst.mockResolvedValue(null);
    const newAssessment = {
      id: "new-assessment",
      userId: "user-1",
      scenarioId: "s1",
      status: "WELCOME",
      repoStatus: null,
    };
    mockAssessmentCreate.mockResolvedValue(newAssessment);

    const response = await POST(makeRequest({ scenarioId: "s1" }));
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.assessment.status).toBe("WELCOME");
    expect(json.data.isExisting).toBe(false);

    expect(mockAssessmentCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        scenarioId: "s1",
        status: "WELCOME",
        targetLevel: null,
        repoStatus: null,
      },
    });
  });

  it("should set repoStatus to 'pending' when scenario has a repoUrl", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockScenarioFindUnique.mockResolvedValue({
      id: "s1",
      name: "Test Scenario",
      isPublished: true,
      repoUrl: "https://github.com/org/template-repo",
    });
    mockAssessmentFindFirst.mockResolvedValue(null);
    mockAssessmentCreate.mockResolvedValue({
      id: "new-assessment",
      userId: "user-1",
      scenarioId: "s1",
      status: "WORKING",
      repoStatus: "pending",
    });

    const response = await POST(makeRequest({ scenarioId: "s1" }));
    expect(response.status).toBe(201);

    expect(mockAssessmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        repoStatus: "pending",
      }),
    });

    const json = await response.json();
    expect(json.data.assessment.repoStatus).toBe("pending");
  });

  it("should set repoStatus to null when scenario has no repoUrl", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockScenarioFindUnique.mockResolvedValue({
      id: "s1",
      name: "Test Scenario",
      isPublished: true,
      repoUrl: null,
    });
    mockAssessmentFindFirst.mockResolvedValue(null);
    mockAssessmentCreate.mockResolvedValue({
      id: "new-assessment",
      userId: "user-1",
      scenarioId: "s1",
      status: "WORKING",
      repoStatus: null,
    });

    const response = await POST(makeRequest({ scenarioId: "s1" }));
    expect(response.status).toBe(201);

    expect(mockAssessmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        repoStatus: null,
      }),
    });
  });

  it("should handle DB error gracefully (returns 500, no leaked details)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockScenarioFindUnique.mockRejectedValue(new Error("Connection refused"));

    const response = await POST(makeRequest({ scenarioId: "s1" }));
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.error).toBe("Failed to create assessment");
    // Ensure the actual error message is not leaked
    expect(JSON.stringify(json)).not.toContain("Connection refused");
  });
});
