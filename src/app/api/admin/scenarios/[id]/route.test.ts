import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

// Import after mocks
import { GET, PUT, DELETE } from "./route";

const createContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("GET /api/admin/scenarios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1"
    );
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1"
    );
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns 404 if scenario not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/non-existent"
    );
    const response = await GET(request, createContext("non-existent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Scenario not found");
  });

  it("returns scenario with coworkers for admin", async () => {
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
      isPublished: true,
      coworkers: [
        {
          id: "coworker-1",
          name: "Alex Chen",
          role: "Engineering Manager",
          personaStyle: "professional",
          knowledge: {},
        },
      ],
    };

    mockFindUnique.mockResolvedValue(mockScenario);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1"
    );
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.scenario.name).toBe("Test Scenario");
    expect(data.data.scenario.coworkers).toHaveLength(1);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "scenario-1" },
      include: { coworkers: true },
    });
  });
});

describe("PUT /api/admin/scenarios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PUT(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PUT(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns 404 if scenario not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/non-existent",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PUT(request, createContext("non-existent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Scenario not found");
  });

  it("updates scenario with valid data", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockFindUnique.mockResolvedValue({ id: "scenario-1" });
    mockUpdate.mockResolvedValue({
      id: "scenario-1",
      name: "Updated Scenario",
      companyName: "Test Company",
      companyDescription: "Description",
      taskDescription: "Task",
      repoUrl: "https://github.com/test/repo",
      techStack: ["typescript", "react"],
      isPublished: true,
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Scenario",
          techStack: ["typescript", "react"],
          isPublished: true,
        }),
      }
    );

    const response = await PUT(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.scenario.name).toBe("Updated Scenario");
    expect(data.data.scenario.isPublished).toBe(true);
  });

  it("only updates provided fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockFindUnique.mockResolvedValue({ id: "scenario-1" });
    mockUpdate.mockResolvedValue({
      id: "scenario-1",
      name: "Updated Name Only",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name Only",
        }),
      }
    );

    await PUT(request, createContext("scenario-1"));

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "scenario-1" },
      data: { name: "Updated Name Only" },
    });
  });

  it("validates techStack is array when provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockFindUnique.mockResolvedValue({ id: "scenario-1" });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          techStack: "not-an-array",
        }),
      }
    );

    const response = await PUT(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(data.details).toContainEqual(
      expect.objectContaining({ path: "techStack" })
    );
  });
});

describe("DELETE /api/admin/scenarios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns 404 if scenario not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/non-existent",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createContext("non-existent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Scenario not found");
  });

  it("deletes scenario successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockFindUnique.mockResolvedValue({
      id: "scenario-1",
      name: "Test Scenario",
    });
    mockDelete.mockResolvedValue({ id: "scenario-1" });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.message).toBe("Scenario deleted");
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: "scenario-1" },
    });
  });
});
