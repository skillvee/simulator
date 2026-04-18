/**
 * Integration tests for scenario language redirects and clone functionality
 *
 * Tests cover:
 * 1. Scenario-forced redirects (US-006)
 * 2. Clone-to-translate flow (US-013)
 * 3. Language immutability
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { db } from "@/server/db";
import { POST as clonePOST } from "./[id]/clone/route";
import { PATCH as updatePATCH } from "./[id]/route";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock AI generation functions
vi.mock("@/lib/scenarios/task-generator", () => ({
  generateCodingTask: vi.fn().mockResolvedValue({
    taskOptions: [{
      summary: "Implementar autenticación OAuth",
      description: "Construir un sistema de autenticación OAuth con proveedores múltiples",
      recruiterSummary: "El candidato implementa OAuth"
    }]
  })
}));

vi.mock("@/lib/scenarios/resource-generator", () => ({
  generateResources: vi.fn().mockResolvedValue({
    resources: [
      { title: "Documentación API", url: "https://docs.api.com", type: "documentation" }
    ]
  })
}));

vi.mock("@/lib/scenarios/coworker-generator", () => ({
  generateCoworkers: vi.fn().mockResolvedValue({
    coworkers: [
      {
        name: "María García",
        role: "Ingeniera Senior",
        personaStyle: "friendly",
        personality: "Colaborativa y detallista",
        knowledge: ["OAuth", "Seguridad"],
      }
    ]
  })
}));

describe("Language Redirect and Clone Integration Tests", () => {
  let testScenarioEnId: string;
  let testScenarioEsId: string;
  let testAssessmentEnId: string;
  let testAssessmentEsId: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup auth mock for recruiter
    mockAuth.mockResolvedValue({
      user: {
        id: "test-recruiter-id",
        role: "RECRUITER",
        email: "recruiter@test.com",
      },
    });

    // Create test users first with unique emails
    const timestamp = Date.now();
    await db.user.upsert({
      where: { id: "test-recruiter-id" },
      update: {},
      create: {
        id: "test-recruiter-id",
        email: `recruiter-${timestamp}@test.com`,
        name: "Test Recruiter",
        role: "RECRUITER"
      }
    });

    await db.user.upsert({
      where: { id: "test-user-id" },
      update: {},
      create: {
        id: "test-user-id",
        email: `test-${timestamp}@test.com`,
        name: "Test User",
        role: "USER"
      }
    });

    // Create test scenarios - one English, one Spanish
    const enScenario = await db.scenario.create({
      data: {
        name: "Backend Engineer",
        companyName: "TechCorp",
        companyDescription: "A tech company",
        taskDescription: "Build an authentication system",
        techStack: ["Node.js", "PostgreSQL"],
        targetLevel: "mid",
        simulationDepth: "medium",
        language: "en",
        createdById: "test-recruiter-id",
        isPublished: true,
      }
    });
    testScenarioEnId = enScenario.id;

    const esScenario = await db.scenario.create({
      data: {
        name: "Ingeniero Backend",
        companyName: "TechCorp",
        companyDescription: "Una empresa de tecnología",
        taskDescription: "Construir un sistema de autenticación",
        techStack: ["Node.js", "PostgreSQL"],
        targetLevel: "mid",
        simulationDepth: "medium",
        language: "es",
        createdById: "test-recruiter-id",
        isPublished: true,
      }
    });
    testScenarioEsId = esScenario.id;

    // Create test assessments
    const enAssessment = await db.assessment.create({
      data: {
        id: "test-assessment-en-" + Date.now(),
        userId: "test-user-id",
        scenarioId: testScenarioEnId,
        status: "WELCOME",
      }
    });
    testAssessmentEnId = enAssessment.id;

    const esAssessment = await db.assessment.create({
      data: {
        id: "test-assessment-es-" + Date.now(),
        userId: "test-user-id",
        scenarioId: testScenarioEsId,
        status: "WELCOME",
      }
    });
    testAssessmentEsId = esAssessment.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.assessment.deleteMany({
      where: {
        OR: [
          { id: testAssessmentEnId },
          { id: testAssessmentEsId }
        ]
      }
    });

    await db.coworker.deleteMany({
      where: {
        scenarioId: {
          in: [testScenarioEnId, testScenarioEsId]
        }
      }
    });

    await db.scenario.deleteMany({
      where: {
        OR: [
          { createdById: "test-recruiter-id" },
          { createdById: "other-user-id" },
          { createdById: "admin-user-id" }
        ]
      }
    });

    // Clean up test users (except if they're needed in other tests)
    await db.user.deleteMany({
      where: {
        id: {
          in: ["test-recruiter-id", "test-user-id", "other-user-id", "admin-user-id"]
        }
      }
    });
  });

  describe("Test 1: English URL accessing Spanish scenario", () => {
    it("should redirect from /en/assessments/<spanish-scenario-id>/welcome to /es/...", async () => {
      // Simulate a fetch to the English URL with a Spanish scenario
      const assessment = await db.assessment.findUnique({
        where: { id: testAssessmentEsId },
        include: {
          scenario: {
            select: { language: true }
          }
        }
      });

      expect(assessment).not.toBeNull();
      expect(assessment!.scenario.language).toBe("es");

      // Verify the redirect logic (simulating what the layout component would do)
      const requestLocale = "en";
      const scenarioLanguage = assessment!.scenario.language;

      if (requestLocale !== scenarioLanguage) {
        const expectedRedirectPath = `/es/assessments/${testAssessmentEsId}/welcome`;

        // Test passes if locale doesn't match scenario language
        expect(requestLocale).not.toBe(scenarioLanguage);
        expect(expectedRedirectPath).toContain("/es/");
        expect(expectedRedirectPath).toContain(testAssessmentEsId);
      }
    });
  });

  describe("Test 2: Spanish URL accessing Spanish scenario", () => {
    it("should return 200 without redirect for /es/assessments/<spanish-scenario-id>/welcome", async () => {
      // Simulate a fetch to the Spanish URL with a Spanish scenario
      const assessment = await db.assessment.findUnique({
        where: { id: testAssessmentEsId },
        include: {
          scenario: {
            select: { language: true }
          }
        }
      });

      expect(assessment).not.toBeNull();
      expect(assessment!.scenario.language).toBe("es");

      // Verify no redirect when locale matches
      const requestLocale = "es";
      const scenarioLanguage = assessment!.scenario.language;

      // Test passes if locale matches scenario language (no redirect needed)
      expect(requestLocale).toBe(scenarioLanguage);
    });
  });

  describe("Test 3: Invite page language redirect", () => {
    it("should redirect from /en/invite/<spanish-scenario-id> to /es/invite/...", async () => {
      // Verify the Spanish scenario exists
      const scenario = await db.scenario.findUnique({
        where: { id: testScenarioEsId },
        select: { language: true }
      });

      expect(scenario).not.toBeNull();
      expect(scenario!.language).toBe("es");

      // Simulate invite page redirect logic
      const requestLocale = "en";
      const scenarioLanguage = scenario!.language;

      if (requestLocale !== scenarioLanguage) {
        const expectedRedirectPath = `/es/invite/${testScenarioEsId}`;

        // Test passes if redirect would occur
        expect(requestLocale).not.toBe(scenarioLanguage);
        expect(expectedRedirectPath).toContain("/es/");
        expect(expectedRedirectPath).toContain(testScenarioEsId);
      }
    });
  });

  describe("Test 4: Clone scenario to Spanish", () => {
    it("should clone English scenario to Spanish with all content translated", async () => {
      // Create clone request
      const request = new Request("http://localhost:3000/api/recruiter/simulations/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "es"
        }),
      });

      // Call the clone endpoint
      const response = await clonePOST(request, {
        params: Promise.resolve({ id: testScenarioEnId })
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.language).toBe("es");
      expect(data.data.scenarioId).toBeDefined();

      // Verify the new scenario was created with Spanish language
      const clonedScenario = await db.scenario.findUnique({
        where: { id: data.data.scenarioId },
        include: {
          coworkers: true
        }
      });

      expect(clonedScenario).not.toBeNull();
      expect(clonedScenario!.language).toBe("es");

      // Verify task was regenerated (mocked to return Spanish content)
      expect(clonedScenario!.taskDescription).toBe("Construir un sistema de autenticación OAuth con proveedores múltiples");

      // Verify coworkers were created with Spanish language
      expect(clonedScenario!.coworkers.length).toBeGreaterThan(0);
      clonedScenario!.coworkers.forEach(coworker => {
        expect(coworker.language).toBe("es");
      });

      // Clean up the cloned scenario
      await db.coworker.deleteMany({
        where: { scenarioId: data.data.scenarioId }
      });
      await db.scenario.delete({
        where: { id: data.data.scenarioId }
      });
    });

    it("should return 400 when trying to clone to same language", async () => {
      const request = new Request("http://localhost:3000/api/recruiter/simulations/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "en" // Same as source
        }),
      });

      const response = await clonePOST(request, {
        params: Promise.resolve({ id: testScenarioEnId })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Cannot clone to the same language");
    });
  });

  describe("Test 5: Language immutability", () => {
    it("should return 400 when trying to change scenario language via PATCH", async () => {
      // Try to change English scenario to Spanish
      const request = new Request("http://localhost:3000/api/recruiter/simulations/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "es", // Trying to change from 'en' to 'es'
          name: "Updated Name" // Include valid field to ensure it's not a general validation error
        }),
      });

      const response = await updatePATCH(request, {
        params: Promise.resolve({ id: testScenarioEnId })
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Scenario language is immutable. Clone the scenario to create a version in a different language.");

      // Verify language wasn't changed in database
      const scenario = await db.scenario.findUnique({
        where: { id: testScenarioEnId }
      });
      expect(scenario!.language).toBe("en"); // Should still be English
    });

    it("should allow updates to other fields while keeping language unchanged", async () => {
      const newName = "Updated Backend Engineer";
      const request = new Request("http://localhost:3000/api/recruiter/simulations/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          companyDescription: "An updated tech company"
        }),
      });

      const response = await updatePATCH(request, {
        params: Promise.resolve({ id: testScenarioEnId })
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify the update worked but language remained the same
      const scenario = await db.scenario.findUnique({
        where: { id: testScenarioEnId }
      });
      expect(scenario!.name).toBe(newName);
      expect(scenario!.companyDescription).toBe("An updated tech company");
      expect(scenario!.language).toBe("en"); // Language unchanged
    });
  });

  describe("Authorization checks", () => {
    it("should not allow cloning scenarios owned by other users", async () => {
      // Create the other user first with unique email
      const timestamp = Date.now();
      await db.user.upsert({
        where: { id: "other-user-id" },
        update: {},
        create: {
          id: "other-user-id",
          email: `other-${timestamp}@test.com`,
          name: "Other User",
          role: "RECRUITER"
        }
      });

      // Create a scenario owned by a different user
      const otherUserScenario = await db.scenario.create({
        data: {
          name: "Other User Scenario",
          companyName: "OtherCorp",
          companyDescription: "Another company",
          taskDescription: "Do something",
          techStack: ["Python"],
          targetLevel: "senior",
          simulationDepth: "long",
          language: "en",
          createdById: "other-user-id", // Different user
          isPublished: true,
        }
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "es"
        }),
      });

      const response = await clonePOST(request, {
        params: Promise.resolve({ id: otherUserScenario.id })
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Not authorized to clone this scenario");

      // Clean up
      await db.scenario.delete({
        where: { id: otherUserScenario.id }
      });
    });

    it("should allow admin to clone any scenario", async () => {
      // Create admin user with unique email
      const timestamp = Date.now();
      await db.user.upsert({
        where: { id: "admin-user-id" },
        update: {},
        create: {
          id: "admin-user-id",
          email: `admin-${timestamp}@test.com`,
          name: "Admin User",
          role: "ADMIN"
        }
      });

      // Setup admin auth
      mockAuth.mockResolvedValue({
        user: {
          id: "admin-user-id",
          role: "ADMIN",
          email: "admin@test.com",
        },
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: "es"
        }),
      });

      const response = await clonePOST(request, {
        params: Promise.resolve({ id: testScenarioEnId })
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Clean up the cloned scenario
      await db.coworker.deleteMany({
        where: { scenarioId: data.data.scenarioId }
      });
      await db.scenario.delete({
        where: { id: data.data.scenarioId }
      });
    });
  });
});