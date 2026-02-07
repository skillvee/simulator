/**
 * Tests for repository provisioning API endpoint (US-007)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockSelectTemplate = vi.fn();
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
  selectTemplate: (...args: unknown[]) => mockSelectTemplate(...args),
  provisionRepo: (...args: unknown[]) => mockProvisionRepo(...args),
}));

// Import after mocks
import { POST } from "../route";

describe("POST /api/recruiter/simulations/[id]/provision-repo", () => {
  const mockScenarioId = "test-scenario-id";
  const mockRepoUrl = "https://github.com/skillvee/simulation-test-scenario-id";

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
        params: { id: mockScenarioId },
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
        params: { id: mockScenarioId },
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
        params: { id: mockScenarioId },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Scenario not found");
    });

    it("should return 403 if user is not the scenario owner", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });

      mockFindUnique.mockResolvedValue({
        id: mockScenarioId,
        createdById: "other-recruiter",
        techStack: ["react", "typescript"],
        repoUrl: null,
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
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
        id: mockScenarioId,
        createdById: "other-recruiter",
        techStack: ["react", "typescript"],
        repoUrl: null,
      });

      mockSelectTemplate.mockReturnValue({
        id: "nextjs-typescript",
        name: "Next.js + TypeScript Starter",
        repoTemplate: "skillvee/nextjs-typescript-starter",
        matchesTechStack: ["react", "typescript"],
        description: "Test template",
      });

      mockProvisionRepo.mockResolvedValue(mockRepoUrl);

      mockUpdate.mockResolvedValue({
        id: mockScenarioId,
        repoUrl: mockRepoUrl,
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
      });

      expect(response.status).toBe(200);
    });
  });

  describe("repository already provisioned", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });
    });

    it("should return existing repo URL if already provisioned", async () => {
      const existingRepoUrl = "https://github.com/skillvee/existing-repo";

      mockFindUnique.mockResolvedValue({
        id: mockScenarioId,
        createdById: "recruiter-1",
        techStack: ["react", "typescript"],
        repoUrl: existingRepoUrl,
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Repository already provisioned");
      expect(data.repoUrl).toBe(existingRepoUrl);

      // Should not call provision functions
      expect(mockProvisionRepo).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("successful provisioning", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });

      mockFindUnique.mockResolvedValue({
        id: mockScenarioId,
        createdById: "recruiter-1",
        techStack: ["react", "typescript", "nextjs"],
        repoUrl: null,
      });
    });

    it("should auto-select template based on tech stack", async () => {
      mockSelectTemplate.mockReturnValue({
        id: "nextjs-typescript",
        name: "Next.js + TypeScript Starter",
        repoTemplate: "skillvee/nextjs-typescript-starter",
        matchesTechStack: ["react", "typescript"],
        description: "Test template",
      });

      mockProvisionRepo.mockResolvedValue(mockRepoUrl);

      mockUpdate.mockResolvedValue({
        id: mockScenarioId,
        repoUrl: mockRepoUrl,
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.repoUrl).toBe(mockRepoUrl);
      expect(data.templateId).toBe("nextjs-typescript");

      expect(mockSelectTemplate).toHaveBeenCalledWith([
        "react",
        "typescript",
        "nextjs",
      ]);
      expect(mockProvisionRepo).toHaveBeenCalledWith(
        mockScenarioId,
        "nextjs-typescript"
      );
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: mockScenarioId },
        data: { repoUrl: mockRepoUrl },
      });
    });

    it("should use explicit templateId if provided", async () => {
      mockProvisionRepo.mockResolvedValue(mockRepoUrl);

      mockUpdate.mockResolvedValue({
        id: mockScenarioId,
        repoUrl: mockRepoUrl,
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ templateId: "python-fastapi" }),
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templateId).toBe("python-fastapi");

      // Should not call selectTemplate when explicit templateId provided
      expect(mockSelectTemplate).not.toHaveBeenCalled();
      expect(mockProvisionRepo).toHaveBeenCalledWith(
        mockScenarioId,
        "python-fastapi"
      );
    });
  });

  describe("provisioning failures", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });

      mockFindUnique.mockResolvedValue({
        id: mockScenarioId,
        createdById: "recruiter-1",
        techStack: ["react", "typescript"],
        repoUrl: null,
      });

      mockSelectTemplate.mockReturnValue({
        id: "nextjs-typescript",
        name: "Next.js + TypeScript Starter",
        repoTemplate: "skillvee/nextjs-typescript-starter",
        matchesTechStack: ["react", "typescript"],
        description: "Test template",
      });
    });

    it("should return 500 if GitHub API fails", async () => {
      mockProvisionRepo.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Repository provisioning failed");
      expect(data.details).toContain("GitHub API");

      // Should not update scenario if provisioning failed
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should return 500 if provision throws an error", async () => {
      mockProvisionRepo.mockRejectedValue(new Error("Network error"));

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Repository provisioning failed");
      expect(data.details).toBe("Network error");

      // Should not update scenario if provisioning failed
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("request body parsing", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "recruiter-1", role: "RECRUITER" },
      });

      mockFindUnique.mockResolvedValue({
        id: mockScenarioId,
        createdById: "recruiter-1",
        techStack: ["react"],
        repoUrl: null,
      });

      mockSelectTemplate.mockReturnValue({
        id: "nextjs-typescript",
        name: "Next.js + TypeScript Starter",
        repoTemplate: "skillvee/nextjs-typescript-starter",
        matchesTechStack: ["react"],
        description: "Test template",
      });

      mockProvisionRepo.mockResolvedValue(mockRepoUrl);
      mockUpdate.mockResolvedValue({
        id: mockScenarioId,
        repoUrl: mockRepoUrl,
      });
    });

    it("should handle malformed JSON body gracefully", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
      });

      // Should fall back to auto-selecting template
      expect(response.status).toBe(200);
      expect(mockSelectTemplate).toHaveBeenCalled();
    });

    it("should handle empty request body", async () => {
      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
      });

      const response = await POST(request, {
        params: { id: mockScenarioId },
      });

      // Should fall back to auto-selecting template
      expect(response.status).toBe(200);
      expect(mockSelectTemplate).toHaveBeenCalled();
    });
  });
});
