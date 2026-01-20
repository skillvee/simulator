import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockScenarioFindUnique = vi.fn();
const mockCoworkerFindMany = vi.fn();
const mockCoworkerCreate = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findUnique: (...args: unknown[]) => mockScenarioFindUnique(...args),
    },
    coworker: {
      findMany: (...args: unknown[]) => mockCoworkerFindMany(...args),
      create: (...args: unknown[]) => mockCoworkerCreate(...args),
    },
  },
}));

// Import after mocks
import { GET, POST } from "./route";

const createContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("GET /api/admin/scenarios/[id]/coworkers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers"
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
      "http://localhost/api/admin/scenarios/scenario-1/coworkers"
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
    mockScenarioFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/non-existent/coworkers"
    );
    const response = await GET(request, createContext("non-existent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Scenario not found");
  });

  it("returns coworkers for scenario", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockScenarioFindUnique.mockResolvedValue({ id: "scenario-1" });

    const mockCoworkers = [
      {
        id: "coworker-1",
        scenarioId: "scenario-1",
        name: "Alex Chen",
        role: "Engineering Manager",
        personaStyle: "professional",
        knowledge: { expertise: ["team structure"] },
      },
      {
        id: "coworker-2",
        scenarioId: "scenario-1",
        name: "Jordan Rivera",
        role: "Senior Engineer",
        personaStyle: "technical",
        knowledge: { expertise: ["auth", "database"] },
      },
    ];
    mockCoworkerFindMany.mockResolvedValue(mockCoworkers);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers"
    );
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coworkers).toHaveLength(2);
    expect(data.coworkers[0].name).toBe("Alex Chen");
    expect(mockCoworkerFindMany).toHaveBeenCalledWith({
      where: { scenarioId: "scenario-1" },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("POST /api/admin/scenarios/[id]/coworkers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Coworker" }),
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
      "http://localhost/api/admin/scenarios/scenario-1/coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Coworker" }),
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
      "http://localhost/api/admin/scenarios/non-existent/coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Coworker",
          role: "Developer",
          personaStyle: "casual",
          knowledge: {},
        }),
      }
    );

    const response = await POST(request, createContext("non-existent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Scenario not found");
  });

  it("creates a new coworker with valid data", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockScenarioFindUnique.mockResolvedValue({ id: "scenario-1" });

    const newCoworker = {
      id: "coworker-new",
      scenarioId: "scenario-1",
      name: "Sam Patel",
      role: "Product Manager",
      personaStyle: "friendly and casual",
      knowledge: { expertise: ["requirements", "user research"] },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCoworkerCreate.mockResolvedValue(newCoworker);

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Sam Patel",
          role: "Product Manager",
          personaStyle: "friendly and casual",
          knowledge: { expertise: ["requirements", "user research"] },
        }),
      }
    );

    const response = await POST(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.coworker.name).toBe("Sam Patel");
    expect(data.coworker.role).toBe("Product Manager");
    expect(mockCoworkerCreate).toHaveBeenCalledWith({
      data: {
        scenarioId: "scenario-1",
        name: "Sam Patel",
        role: "Product Manager",
        personaStyle: "friendly and casual",
        knowledge: { expertise: ["requirements", "user research"] },
        avatarUrl: undefined,
        voiceName: null,
      },
    });
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockScenarioFindUnique.mockResolvedValue({ id: "scenario-1" });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Incomplete Coworker",
          // Missing role, personaStyle
        }),
      }
    );

    const response = await POST(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Missing required fields: name, role, personaStyle"
    );
  });

  it("defaults knowledge to empty object when not provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockScenarioFindUnique.mockResolvedValue({ id: "scenario-1" });
    mockCoworkerCreate.mockResolvedValue({
      id: "coworker-new",
      scenarioId: "scenario-1",
      name: "Basic Coworker",
      role: "Developer",
      personaStyle: "casual",
      knowledge: {},
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/scenario-1/coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Basic Coworker",
          role: "Developer",
          personaStyle: "casual",
        }),
      }
    );

    await POST(request, createContext("scenario-1"));

    expect(mockCoworkerCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        knowledge: {},
      }),
    });
  });
});
