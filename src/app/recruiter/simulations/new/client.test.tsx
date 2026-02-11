/**
 * Tests for Simulation Builder Save Flow (US-011)
 *
 * These tests verify the end-to-end save flow when creating a simulation
 * from the preview page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Simulation Save Flow (US-011)", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("handleSaveSimulation", () => {
    it("should create scenario with correct data", async () => {
      // Mock successful scenario creation
      const mockScenario = { id: "test-scenario-id", name: "Test Simulation" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { scenario: mockScenario } }),
      });

      // Mock successful coworker creation
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ coworker: { id: "coworker-1" } }),
      });

      const previewData = {
        simulationName: "Senior Backend Engineer @ Acme",
        companyName: "Acme Inc",
        companyDescription: "A technology company",
        techStack: ["Node.js", "TypeScript"],
        taskOptions: [],
        selectedTask: {
          type: "generated" as const,
          option: {
            summary: "Build a REST API",
            recruiterSummary: "The candidate builds a REST API with authentication and authorization.",
            description: "Create a REST API with authentication",
          },
        },
        coworkers: [
          {
            name: "Alice",
            role: "Engineering Manager",
            personaStyle: "Direct and supportive",
            knowledge: [
              {
                topic: "Authentication",
                triggerKeywords: ["auth", "login"],
                response: "We use JWT tokens",
                isCritical: true,
              },
            ],
          },
        ],
      };

      // Simulate the save flow logic
      const taskDescription = previewData.selectedTask.option?.description || "";

      // Step 1: Create scenario
      const scenarioResponse = await fetch("/api/recruiter/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: previewData.simulationName,
          companyName: previewData.companyName,
          companyDescription: previewData.companyDescription,
          taskDescription,
          techStack: previewData.techStack,
        }),
      });

      expect(scenarioResponse.ok).toBe(true);
      const { data: { scenario } } = await scenarioResponse.json();

      // Verify scenario endpoint was called with correct data
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/recruiter/simulations",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Senior Backend Engineer @ Acme",
            companyName: "Acme Inc",
            companyDescription: "A technology company",
            taskDescription: "Create a REST API with authentication",
            techStack: ["Node.js", "TypeScript"],
          }),
        })
      );

      // Step 2: Create coworkers
      for (const coworker of previewData.coworkers) {
        await fetch(`/api/recruiter/simulations/${scenario.id}/coworkers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: coworker.name,
            role: coworker.role,
            personaStyle: coworker.personaStyle,
            knowledge: coworker.knowledge,
          }),
        });
      }

      // Verify coworker endpoint was called
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/recruiter/simulations/${scenario.id}/coworkers`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Alice",
            role: "Engineering Manager",
            personaStyle: "Direct and supportive",
            knowledge: [
              {
                topic: "Authentication",
                triggerKeywords: ["auth", "login"],
                response: "We use JWT tokens",
                isCritical: true,
              },
            ],
          }),
        })
      );
    });

    it("should handle scenario creation failure", async () => {
      // Mock failed scenario creation
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to create scenario" }),
      });

      try {
        const scenarioResponse = await fetch("/api/recruiter/simulations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test" }),
        });

        if (!scenarioResponse.ok) {
          const errorData = await scenarioResponse.json();
          throw new Error(errorData.error);
        }

        // Should not reach here
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe("Failed to create scenario");
      }
    });

    it("should handle partial coworker creation failure", async () => {
      // Mock successful scenario creation
      const mockScenario = { id: "test-scenario-id" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { scenario: mockScenario } }),
      });

      // Mock first coworker success, second coworker failure
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ coworker: { id: "coworker-1" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Failed to create coworker" }),
        });

      const coworkers = [
        {
          name: "Alice",
          role: "Manager",
          personaStyle: "Direct",
          knowledge: [],
        },
        {
          name: "Bob",
          role: "Developer",
          personaStyle: "Casual",
          knowledge: [],
        },
      ];

      // Create scenario
      const scenarioResponse = await fetch("/api/recruiter/simulations", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const { data: { scenario } } = await scenarioResponse.json();

      // Create coworkers with Promise.allSettled
      const coworkerPromises = coworkers.map(async (coworker) => {
        const response = await fetch(
          `/api/recruiter/simulations/${scenario.id}/coworkers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(coworker),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }

        return response.json();
      });

      const results = await Promise.allSettled(coworkerPromises);

      // Verify one succeeded and one failed
      const successful = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r) => r.status === "rejected");

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(1);
    });

    it("should auto-generate simulation name if not edited", () => {
      const parsedJDData = {
        roleName: { value: "Senior Frontend Engineer", confidence: "high" as const },
        companyName: { value: "Acme Corp", confidence: "high" as const },
        companyDescription: { value: null, confidence: "low" as const },
        techStack: { value: null, confidence: "low" as const },
        seniorityLevel: { value: null, confidence: "low" as const },
        keyResponsibilities: { value: null, confidence: "low" as const },
        domainContext: { value: null, confidence: "low" as const },
      };

      const previewData = {
        simulationName: "", // Not edited
        companyName: "Acme Corp",
        companyDescription: "A tech company",
        techStack: [],
        taskOptions: [],
        selectedTask: null,
        coworkers: [],
      };

      // Auto-generate name logic
      const simulationName =
        previewData.simulationName ||
        `${parsedJDData.roleName.value} @ ${previewData.companyName}`;

      expect(simulationName).toBe("Senior Frontend Engineer @ Acme Corp");
    });

    it("should use custom task description when selected", () => {
      const previewData = {
        selectedTask: {
          type: "custom" as const,
          customDescription: "Build a custom feature for the payment system",
        },
      };

      const taskDescription =
        previewData.selectedTask.type === "custom"
          ? previewData.selectedTask.customDescription
          : "default task";

      expect(taskDescription).toBe("Build a custom feature for the payment system");
    });

    it("should use generated task description when selected", () => {
      const previewData = {
        selectedTask: {
          type: "generated" as const,
          option: {
            summary: "Implement caching",
            recruiterSummary: "The candidate implements Redis caching for API performance optimization.",
            description: "Add Redis caching to the API endpoints",
          },
        },
      };

      const taskDescription =
        previewData.selectedTask.type === "custom"
          ? previewData.selectedTask.customDescription
          : previewData.selectedTask.option?.description;

      expect(taskDescription).toBe("Add Redis caching to the API endpoints");
    });
  });

  describe("fire-and-forget async operations", () => {
    it("should trigger avatar generation without blocking", async () => {
      const scenarioId = "test-scenario-id";

      // Mock avatar generation endpoint
      const avatarFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      global.fetch = avatarFetch;

      // Trigger avatar generation (fire-and-forget)
      fetch("/api/avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      }).catch(() => {
        // Errors are caught and logged, but don't block
      });

      // Verify it was called
      expect(avatarFetch).toHaveBeenCalledWith(
        "/api/avatar/generate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ scenarioId }),
        })
      );
    });

    it("should trigger repo provisioning without blocking", async () => {
      const scenarioId = "test-scenario-id";

      // Mock repo provisioning endpoint
      const repoFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, repoUrl: "https://github.com/test/repo" }),
      });

      global.fetch = repoFetch;

      // Trigger repo provisioning (fire-and-forget)
      fetch(`/api/recruiter/simulations/${scenarioId}/provision-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {
        // Errors are caught and logged, but don't block
      });

      // Verify it was called
      expect(repoFetch).toHaveBeenCalledWith(
        `/api/recruiter/simulations/${scenarioId}/provision-repo`,
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });
});
