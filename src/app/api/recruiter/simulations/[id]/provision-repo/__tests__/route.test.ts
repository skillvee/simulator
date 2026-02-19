/**
 * Tests for repository provisioning API endpoint (US-007)
 *
 * The route now uses AI-generated repo specs instead of static templates.
 * provisionRepo(scenarioId, metadata) → { repoUrl, repoSpec }
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockProvisionRepo = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/server/db", () => ({
  db: {
    scenario: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock("@/lib/scenarios/repo-templates", () => ({
  provisionRepo: (...args: unknown[]) => mockProvisionRepo(...args),
  needsRepo: (techStack: string[]) => {
    if (!techStack || techStack.length === 0) return false;
    const engineering = [
      "react", "typescript", "nextjs", "node", "express", "api",
      "frontend", "backend", "fullstack",
    ];
    return techStack.some((t) =>
      engineering.some(
        (e) => t.toLowerCase().includes(e) || e.includes(t.toLowerCase())
      )
    );
  },
}));

// Import after mocks
import { POST } from "../route";

// Full scenario mock that matches the new DB query shape
const fullScenarioMock = {
  id: "test-scenario-id",
  name: "Senior Backend Engineer at Meta",
  companyName: "Meta",
  companyDescription: "Social media and technology company",
  taskDescription: "Fix webhook reliability in the payments service",
  techStack: ["react", "typescript", "nextjs"],
  targetLevel: "senior",
  repoUrl: null,
  createdById: "recruiter-1",
  coworkers: [
    {
      name: "Sarah Kim",
      role: "Engineering Manager",
      personaStyle: "Warm and supportive",
      knowledge: [
        {
          topic: "code_review",
          triggerKeywords: ["pr", "review"],
          response: "Tag me for review",
          isCritical: true,
        },
      ],
    },
  ],
};

describe("POST /api/recruiter/simulations/[id]/provision-repo", () => {
  const mockScenarioId = "test-scenario-id";
  const mockRepoUrl =
    "https://github.com/skillvee/simulation-test-scenario-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user is not a recruiter or admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: "USER" },
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Recruiter access required");
    });
  });

  describe("scenario validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });
    });

    it("should return 404 if scenario does not exist", async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Scenario not found");
    });

    it("should return 403 if user is not the scenario owner", async () => {
      mockFindUnique.mockResolvedValue({
        ...fullScenarioMock,
        createdById: "other-recruiter",
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not authorized to modify this scenario");
    });

    it("should allow admin to provision any scenario", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      });

      mockFindUnique.mockResolvedValue({
        ...fullScenarioMock,
        createdById: "other-recruiter",
      });

      mockProvisionRepo.mockResolvedValue({
        repoUrl: mockRepoUrl,
        repoSpec: { projectName: "test" },
      });

      mockUpdate.mockResolvedValue({
        id: mockScenarioId,
        repoUrl: mockRepoUrl,
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("repository already provisioned", () => {
    it("should return existing repo URL if already provisioned", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });

      const existingRepoUrl = "https://github.com/skillvee/existing-repo";
      mockFindUnique.mockResolvedValue({
        ...fullScenarioMock,
        repoUrl: existingRepoUrl,
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Repository already provisioned");
      expect(data.repoUrl).toBe(existingRepoUrl);
      expect(mockProvisionRepo).not.toHaveBeenCalled();
    });
  });

  describe("successful provisioning", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });

      mockFindUnique.mockResolvedValue(fullScenarioMock);
    });

    it("should provision repo with scenario metadata", async () => {
      mockProvisionRepo.mockResolvedValue({
        repoUrl: mockRepoUrl,
        repoSpec: { projectName: "payment-gateway" },
      });

      mockUpdate.mockResolvedValue({
        id: mockScenarioId,
        repoUrl: mockRepoUrl,
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.repoUrl).toBe(mockRepoUrl);

      // Verify provisionRepo was called with scenarioId and metadata
      expect(mockProvisionRepo).toHaveBeenCalledWith(
        mockScenarioId,
        expect.objectContaining({
          companyName: "Meta",
          taskDescription: "Fix webhook reliability in the payments service",
          techStack: ["react", "typescript", "nextjs"],
          targetLevel: "senior",
        })
      );

      // Verify scenario was updated with repo URL and cached spec
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockScenarioId },
        data: {
          repoUrl: mockRepoUrl,
          repoSpec: { projectName: "payment-gateway" },
        },
      });
    });
  });

  describe("provisioning failures", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });

      mockFindUnique.mockResolvedValue(fullScenarioMock);
    });

    it("should return 500 if provisioning returns null repoUrl", async () => {
      mockProvisionRepo.mockResolvedValue({ repoUrl: null });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Repository provisioning failed");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should return 500 if provision throws an error", async () => {
      mockProvisionRepo.mockRejectedValue(new Error("Network error"));

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Repository provisioning failed");
      expect(data.details).toBe("Network error");
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("non-engineering scenarios", () => {
    it("should skip provisioning for non-engineering tech stacks", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });

      mockFindUnique.mockResolvedValue({
        ...fullScenarioMock,
        techStack: ["sales", "crm"],
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: mockScenarioId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("non-engineering");
      expect(mockProvisionRepo).not.toHaveBeenCalled();
    });
  });
});
