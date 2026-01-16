import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockScenarioFindUnique = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findUnique: (...args: unknown[]) => mockScenarioFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    GITHUB_TOKEN: "mock-github-token",
  },
}));

// Mock global fetch
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

// Import after mocks
import { GET } from "./route";

const createContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("GET /api/admin/scenarios/[id]/verify-repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/scenarios/scenario-1/verify-repo");
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request("http://localhost/api/admin/scenarios/scenario-1/verify-repo");
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

    const request = new Request("http://localhost/api/admin/scenarios/non-existent/verify-repo");
    const response = await GET(request, createContext("non-existent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Scenario not found");
  });

  it("returns success for accessible public GitHub repo", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockScenarioFindUnique.mockResolvedValue({
      id: "scenario-1",
      name: "Test Scenario",
      repoUrl: "https://github.com/skillvee/flowboard-task",
    });

    // Mock successful GitHub API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        full_name: "skillvee/flowboard-task",
        private: false,
        default_branch: "main",
        description: "FlowBoard task for Skillvee assessments",
      }),
    });

    const request = new Request("http://localhost/api/admin/scenarios/scenario-1/verify-repo");
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessible).toBe(true);
    expect(data.repoInfo.fullName).toBe("skillvee/flowboard-task");
    expect(data.repoInfo.isPrivate).toBe(false);
  });

  it("returns failure for inaccessible repo", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockScenarioFindUnique.mockResolvedValue({
      id: "scenario-1",
      name: "Test Scenario",
      repoUrl: "https://github.com/nonexistent/repo",
    });

    // Mock GitHub API 404 response
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const request = new Request("http://localhost/api/admin/scenarios/scenario-1/verify-repo");
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessible).toBe(false);
    expect(data.error).toContain("404");
  });

  it("handles non-GitHub URLs gracefully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockScenarioFindUnique.mockResolvedValue({
      id: "scenario-1",
      name: "Test Scenario",
      repoUrl: "https://gitlab.com/owner/repo",
    });

    const request = new Request("http://localhost/api/admin/scenarios/scenario-1/verify-repo");
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessible).toBe(false);
    expect(data.error).toContain("GitHub");
  });

  it("checks for README.md existence", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockScenarioFindUnique.mockResolvedValue({
      id: "scenario-1",
      name: "Test Scenario",
      repoUrl: "https://github.com/skillvee/flowboard-task",
    });

    // Mock successful repo response and README check
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          full_name: "skillvee/flowboard-task",
          private: false,
          default_branch: "main",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: "README.md",
          type: "file",
        }),
      });

    const request = new Request("http://localhost/api/admin/scenarios/scenario-1/verify-repo");
    const response = await GET(request, createContext("scenario-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessible).toBe(true);
    expect(data.hasReadme).toBe(true);
  });
});
