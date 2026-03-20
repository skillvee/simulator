import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockCoworkerFindUnique = vi.fn();
const mockCoworkerUpdate = vi.fn();
const mockCoworkerDelete = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    coworker: {
      findUnique: (...args: unknown[]) => mockCoworkerFindUnique(...args),
      update: (...args: unknown[]) => mockCoworkerUpdate(...args),
      delete: (...args: unknown[]) => mockCoworkerDelete(...args),
    },
  },
}));

// Import after mocks
import { GET, PUT, DELETE } from "./route";

const createContext = (id: string, coworkerId: string) => ({
  params: Promise.resolve({ id, coworkerId }),
});

describe("GET /api/admin/scenarios/[id]/coworkers/[coworkerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1"
    );
    const response = await GET(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1"
    );
    const response = await GET(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns 404 if coworker not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockCoworkerFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/non-existent"
    );
    const response = await GET(
      request,
      createContext("scenario-1", "non-existent")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Coworker not found");
  });

  it("returns 404 if coworker belongs to different scenario", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockCoworkerFindUnique.mockResolvedValue({
      id: "coworker-1",
      scenarioId: "scenario-2", // Different scenario
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1"
    );
    const response = await GET(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Coworker not found in this scenario");
  });

  it("returns coworker for admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const mockCoworker = {
      id: "coworker-1",
      scenarioId: "scenario-1",
      name: "Alex Chen",
      role: "Engineering Manager",
      personaStyle: "professional and supportive",
      knowledge: { expertise: ["team structure", "processes"] },
    };
    mockCoworkerFindUnique.mockResolvedValue(mockCoworker);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1"
    );
    const response = await GET(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.coworker.name).toBe("Alex Chen");
    expect(data.data.coworker.knowledge).toEqual({
      expertise: ["team structure", "processes"],
    });
  });
});

describe("PUT /api/admin/scenarios/[id]/coworkers/[coworkerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PUT(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PUT(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns 404 if coworker not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockCoworkerFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/non-existent",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PUT(
      request,
      createContext("scenario-1", "non-existent")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Coworker not found");
  });

  it("updates coworker with valid data", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockCoworkerFindUnique.mockResolvedValue({
      id: "coworker-1",
      scenarioId: "scenario-1",
    });

    const updatedCoworker = {
      id: "coworker-1",
      scenarioId: "scenario-1",
      name: "Alex Chen Updated",
      role: "Director of Engineering",
      personaStyle: "executive and strategic",
      knowledge: { expertise: ["leadership", "strategy"] },
    };
    mockCoworkerUpdate.mockResolvedValue(updatedCoworker);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alex Chen Updated",
          role: "Director of Engineering",
          personaStyle: "executive and strategic",
          knowledge: { expertise: ["leadership", "strategy"] },
        }),
      }
    );

    const response = await PUT(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.coworker.name).toBe("Alex Chen Updated");
    expect(data.data.coworker.role).toBe("Director of Engineering");
  });

  it("only updates provided fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockCoworkerFindUnique.mockResolvedValue({
      id: "coworker-1",
      scenarioId: "scenario-1",
    });
    mockCoworkerUpdate.mockResolvedValue({
      id: "coworker-1",
      name: "Updated Name Only",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name Only",
        }),
      }
    );

    await PUT(request, createContext("scenario-1", "coworker-1"));

    expect(mockCoworkerUpdate).toHaveBeenCalledWith({
      where: { id: "coworker-1" },
      data: { name: "Updated Name Only" },
    });
  });
});

describe("DELETE /api/admin/scenarios/[id]/coworkers/[coworkerId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns 404 if coworker not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockCoworkerFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/non-existent",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(
      request,
      createContext("scenario-1", "non-existent")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Coworker not found");
  });

  it("deletes coworker successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockCoworkerFindUnique.mockResolvedValue({
      id: "coworker-1",
      scenarioId: "scenario-1",
      name: "Alex Chen",
    });
    mockCoworkerDelete.mockResolvedValue({ id: "coworker-1" });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers/coworker-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(
      request,
      createContext("scenario-1", "coworker-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.message).toBe("Coworker deleted");
    expect(mockCoworkerDelete).toHaveBeenCalledWith({
      where: { id: "coworker-1" },
    });
  });
});
