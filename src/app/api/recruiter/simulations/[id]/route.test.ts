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
import { GET, PATCH, DELETE } from "./route";

const createContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("PATCH /api/recruiter/simulations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PATCH(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not recruiter or admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PATCH(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Recruiter access required");
  });

  it("returns 404 if scenario not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", email: "recruiter@test.com", role: "RECRUITER" },
    });
    mockFindUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/non-existent",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PATCH(request, createContext("non-existent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Simulation not found");
  });

  it("returns 403 if recruiter tries to update simulation not owned by them", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", email: "recruiter@test.com", role: "RECRUITER" },
    });
    mockFindUnique.mockResolvedValue({
      language: "en",
      createdById: "another-recruiter",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      }
    );

    const response = await PATCH(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Not authorized");
  });

  it("returns 400 if attempting to change language", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", email: "recruiter@test.com", role: "RECRUITER" },
    });
    mockFindUnique.mockResolvedValue({
      language: "en",
      createdById: "recruiter-123",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "es", name: "Updated Name" }),
      }
    );

    const response = await PATCH(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Scenario language is immutable. Clone the scenario to create a version in a different language.");
  });

  it("allows updates to other fields when language is not changed", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", email: "recruiter@test.com", role: "RECRUITER" },
    });
    mockFindUnique.mockResolvedValue({
      language: "en",
      createdById: "recruiter-123",
    });
    mockUpdate.mockResolvedValue({
      id: "scenario-1",
      name: "Updated Scenario",
      companyName: "Updated Company",
      language: "en",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Scenario",
          companyName: "Updated Company",
        }),
      }
    );

    const response = await PATCH(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.scenario.name).toBe("Updated Scenario");
    expect(data.data.scenario.companyName).toBe("Updated Company");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "scenario-1" },
      data: { name: "Updated Scenario", companyName: "Updated Company" },
    });
  });

  it("ignores language field if provided with same value", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", email: "recruiter@test.com", role: "RECRUITER" },
    });
    mockFindUnique.mockResolvedValue({
      language: "en",
      createdById: "recruiter-123",
    });
    mockUpdate.mockResolvedValue({
      id: "scenario-1",
      name: "Updated Scenario",
      language: "en",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "en", // Same as existing
          name: "Updated Scenario",
        }),
      }
    );

    const response = await PATCH(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.scenario.name).toBe("Updated Scenario");
    // Language should not be in the update data
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "scenario-1" },
      data: { name: "Updated Scenario" },
    });
  });

  it("allows admin to update any simulation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockFindUnique.mockResolvedValue({
      language: "en",
      createdById: "another-user",
    });
    mockUpdate.mockResolvedValue({
      id: "scenario-1",
      name: "Admin Updated",
      language: "en",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Admin Updated",
        }),
      }
    );

    const response = await PATCH(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.scenario.name).toBe("Admin Updated");
  });

  it("rejects language change even for admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockFindUnique.mockResolvedValue({
      language: "en",
      createdById: "another-user",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "es",
        }),
      }
    );

    const response = await PATCH(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Scenario language is immutable. Clone the scenario to create a version in a different language.");
  });
});

describe("GET /api/recruiter/simulations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1"
    );
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns scenario repoUrl for recruiter who owns it", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", email: "recruiter@test.com", role: "RECRUITER" },
    });
    mockFindUnique.mockResolvedValue({
      id: "scenario-1",
      repoUrl: "https://github.com/test/repo",
      createdById: "recruiter-123",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1"
    );
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.repoUrl).toBe("https://github.com/test/repo");
  });

  it("returns scenario repoUrl for admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockFindUnique.mockResolvedValue({
      id: "scenario-1",
      repoUrl: "https://github.com/test/repo",
      createdById: "another-user",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1"
    );
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.repoUrl).toBe("https://github.com/test/repo");
  });
});

describe("DELETE /api/recruiter/simulations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("deletes simulation for recruiter who owns it", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", email: "recruiter@test.com", role: "RECRUITER" },
    });
    mockFindUnique.mockResolvedValue({
      id: "scenario-1",
      createdById: "recruiter-123",
    });
    mockDelete.mockResolvedValue({ id: "scenario-1" });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.message).toBe("Simulation deleted");
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: "scenario-1" },
    });
  });

  it("allows admin to delete any simulation", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });
    mockFindUnique.mockResolvedValue({
      id: "scenario-1",
      createdById: "another-user",
    });
    mockDelete.mockResolvedValue({ id: "scenario-1" });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/scenario-1",
      {
        method: "DELETE",
      }
    );

    const response = await DELETE(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.message).toBe("Simulation deleted");
  });
});