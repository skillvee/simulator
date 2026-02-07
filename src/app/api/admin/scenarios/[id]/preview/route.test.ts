import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockScenarioFindUnique = vi.fn();
const mockAssessmentCreate = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findUnique: (...args: unknown[]) => mockScenarioFindUnique(...args),
    },
    assessment: {
      create: (...args: unknown[]) => mockAssessmentCreate(...args),
    },
  },
}));

// Import after mocks
import { POST } from "./route";

const createContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("POST /api/admin/scenarios/[id]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/preview",
      {
        method: "POST",
      }
    );
    const response = await POST(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/preview",
      {
        method: "POST",
      }
    );
    const response = await POST(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns 404 if scenario not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockScenarioFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/non-existent/preview",
      {
        method: "POST",
      }
    );
    const response = await POST(request, createContext("non-existent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Scenario not found");
  });

  it("creates a preview assessment for admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const mockScenario = {
      id: "scenario-1",
      name: "Test Scenario",
      companyName: "Test Company",
      companyDescription: "Description",
      taskDescription: "Task",
      repoUrl: "https://github.com/test/repo",
      techStack: ["typescript"],
      isPublished: false,
      coworkers: [
        {
          id: "coworker-1",
          name: "Alex Chen",
          role: "Engineering Manager",
        },
      ],
    };

    mockScenarioFindUnique.mockResolvedValue(mockScenario);
    mockAssessmentCreate.mockResolvedValue({
      id: "preview-assessment-123",
      userId: "admin-123",
      scenarioId: "scenario-1",
      status: "WORKING",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/preview",
      {
        method: "POST",
      }
    );
    const response = await POST(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(data.assessment.id).toBe("preview-assessment-123");
    expect(data.previewUrl).toContain("/assessments/preview-assessment-123");
    expect(mockAssessmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "admin-123",
        scenarioId: "scenario-1",
        status: "WORKING",
      }),
    });
  });

  it("allows preview for unpublished scenarios", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const mockScenario = {
      id: "scenario-1",
      name: "Draft Scenario",
      isPublished: false,
      coworkers: [],
    };

    mockScenarioFindUnique.mockResolvedValue(mockScenario);
    mockAssessmentCreate.mockResolvedValue({
      id: "preview-assessment-456",
      userId: "admin-123",
      scenarioId: "scenario-1",
      status: "WORKING",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/preview",
      {
        method: "POST",
      }
    );
    const response = await POST(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessment.id).toBe("preview-assessment-456");
  });

  it("allows skipping directly to coworker testing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const mockScenario = {
      id: "scenario-1",
      name: "Test Scenario",
      isPublished: false,
      coworkers: [{ id: "coworker-1", name: "Alex" }],
    };

    mockScenarioFindUnique.mockResolvedValue(mockScenario);
    mockAssessmentCreate.mockResolvedValue({
      id: "preview-assessment-789",
      userId: "admin-123",
      scenarioId: "scenario-1",
      status: "WORKING",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/preview",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipTo: "coworkers" }),
      }
    );
    const response = await POST(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    // skipTo is now unused, always goes to /work
    expect(data.previewUrl).toContain("/work");
  });
});
