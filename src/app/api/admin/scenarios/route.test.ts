import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// Import after mocks
import { GET, POST } from "./route";

describe("GET /api/admin/scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns all scenarios for admin users", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const mockScenarios = [
      {
        id: "scenario-1",
        name: "Scenario 1",
        companyName: "Company A",
        companyDescription: "Description A",
        taskDescription: "Task A",
        repoUrl: "https://github.com/test/repo",
        techStack: ["typescript", "react"],
        isPublished: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        _count: { coworkers: 3, assessments: 5 },
      },
    ];

    mockFindMany.mockResolvedValue(mockScenarios);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.scenarios).toHaveLength(1);
    expect(json.data.scenarios[0].name).toBe("Scenario 1");
    expect(mockFindMany).toHaveBeenCalledWith({
      include: {
        _count: {
          select: { coworkers: true, assessments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns empty array when no scenarios exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockFindMany.mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.scenarios).toEqual([]);
  });
});

describe("POST /api/admin/scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Scenario" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request("http://localhost/api/admin/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Scenario" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("creates a new scenario with valid data", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const newScenario = {
      id: "scenario-new",
      name: "Test Scenario",
      companyName: "Test Company",
      companyDescription: "A test company description",
      taskDescription: "Build a feature",
      repoUrl: "https://github.com/test/repo",
      techStack: ["typescript", "react"],
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreate.mockResolvedValue(newScenario);

    const request = new Request("http://localhost/api/admin/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Scenario",
        companyName: "Test Company",
        companyDescription: "A test company description",
        taskDescription: "Build a feature",
        repoUrl: "https://github.com/test/repo",
        techStack: ["typescript", "react"],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.scenario.name).toBe("Test Scenario");
    expect(json.data.scenario.companyName).toBe("Test Company");
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const request = new Request("http://localhost/api/admin/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Scenario",
        // Missing other required fields
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("creates scenario with isPublished defaulting to false", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockCreate.mockResolvedValue({
      id: "scenario-new",
      name: "Test Scenario",
      companyName: "Test Company",
      companyDescription: "Description",
      taskDescription: "Task",
      repoUrl: "https://github.com/test/repo",
      techStack: ["typescript"],
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new Request("http://localhost/api/admin/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Scenario",
        companyName: "Test Company",
        companyDescription: "Description",
        taskDescription: "Task",
        repoUrl: "https://github.com/test/repo",
        techStack: ["typescript"],
      }),
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isPublished: false,
      }),
    });
  });

  it("validates techStack is an array", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const request = new Request("http://localhost/api/admin/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Scenario",
        companyName: "Test Company",
        companyDescription: "Description",
        taskDescription: "Task",
        repoUrl: "https://github.com/test/repo",
        techStack: "not-an-array",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("techStack must be an array");
  });
});
