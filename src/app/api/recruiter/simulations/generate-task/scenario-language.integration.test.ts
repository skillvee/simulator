/**
 * Integration tests for scenario language persistence with task generation
 *
 * Tests the complete flow:
 * 1. Generate task with language
 * 2. Create scenario with language
 * 3. Verify language is persisted in database
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST as generateTaskPOST } from "./route";
import { POST as createScenarioPOST } from "../route";
import { db } from "@/server/db";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Gemini for task generation
const mockGenerateContent = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  },
}));

// Test data
const baseScenarioData = {
  name: "Test Scenario",
  companyName: "TestCo",
  companyDescription: "A test company",
  taskDescription: "Build a feature",
  techStack: ["Node.js", "TypeScript"],
  targetLevel: "mid" as const,
  archetypeId: "test-archetype",
  simulationDepth: "medium" as const,
};

describe("Scenario Language Persistence Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "test-recruiter-id",
        role: "RECRUITER",
        email: "recruiter@test.com",
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.scenario.deleteMany({
      where: { createdById: "test-recruiter-id" }
    });
  });

  describe("Spanish scenario with Spanish task", () => {
    it("should generate Spanish task and persist language='es' in scenario", async () => {
      // Step 1: Generate Spanish task
      const spanishTaskResponse = {
        taskOptions: [
          {
            summary: "Construir un manejador de webhooks con lógica de reintentos",
            recruiterSummary: "El candidato investiga problemas de webhooks y diseña soluciones robustas.",
            description: "El procesador de pagos envía webhooks POST cuando las transacciones se completan. Los identificadores como 'paymentWebhookHandler' y campos JSON como 'transactionId' permanecen en inglés."
          },
          {
            summary: "Implementar notificaciones en tiempo real",
            recruiterSummary: "El candidato crea sistema de notificaciones.",
            description: "Los clientes necesitan alertas inmediatas. La función 'notificationService' y el endpoint '/api/notifications' mantienen nombres en inglés."
          }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(spanishTaskResponse),
      });

      const generateRequest = new Request("http://localhost:3000/api/recruiter/simulations/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: "Ingeniero Backend",
          seniorityLevel: "mid",
          techStack: ["Node.js", "PostgreSQL"],
          keyResponsibilities: ["Diseñar APIs", "Manejar webhooks"],
          domainContext: "fintech procesando pagos",
          companyName: "PagosRápidos",
          language: "es",
        }),
      });

      const generateResponse = await generateTaskPOST(generateRequest);
      const generateData = await generateResponse.json();

      expect(generateResponse.status).toBe(200);
      expect(generateData.success).toBe(true);

      // Verify Spanish content with English code identifiers
      const task = generateData.data.taskOptions[0];
      expect(task.summary).toContain("manejador");
      expect(task.description).toContain("procesador de pagos");
      // Verify code identifiers remain in English
      expect(task.description).toContain("paymentWebhookHandler");
      expect(task.description).toContain("transactionId");

      // Verify Spanish instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).toContain("Latin American Spanish");
      expect(callArgs.contents[0].parts[0].text).toContain("Keep code identifiers, API names, function names, database fields, and JSON keys in English");

      // Step 2: Create scenario with Spanish language
      const createRequest = new Request("http://localhost:3000/api/recruiter/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseScenarioData,
          taskDescription: task.description,
          companyName: "PagosRápidos",
          language: "es",
        }),
      });

      const createResponse = await createScenarioPOST(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);

      // Step 3: Verify language is persisted in database
      const savedScenario = await db.scenario.findUnique({
        where: { id: createData.data.scenario.id },
      });

      expect(savedScenario).not.toBeNull();
      expect(savedScenario!.language).toBe("es");
      expect(savedScenario!.taskDescription).toContain("procesador de pagos");
      expect(savedScenario!.taskDescription).toContain("paymentWebhookHandler");
    });
  });

  describe("English scenario with English task", () => {
    it("should generate English task and persist language='en' in scenario", async () => {
      // Step 1: Generate English task
      const englishTaskResponse = {
        taskOptions: [
          {
            summary: "Build a webhook handler with retry logic",
            recruiterSummary: "The candidate investigates webhook issues and designs robust solutions.",
            description: "The payment processor sends POST webhooks when transactions complete. The handler needs retry logic and idempotency checks."
          },
          {
            summary: "Implement real-time notifications",
            recruiterSummary: "The candidate builds notification system.",
            description: "Customers need immediate alerts. The notification service handles email and in-app messages."
          }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(englishTaskResponse),
      });

      const generateRequest = new Request("http://localhost:3000/api/recruiter/simulations/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: "Backend Engineer",
          seniorityLevel: "mid",
          techStack: ["Node.js", "PostgreSQL"],
          keyResponsibilities: ["Design APIs", "Handle webhooks"],
          domainContext: "fintech processing payments",
          companyName: "FastPay",
          language: "en",
        }),
      });

      const generateResponse = await generateTaskPOST(generateRequest);
      const generateData = await generateResponse.json();

      expect(generateResponse.status).toBe(200);
      expect(generateData.success).toBe(true);

      // Verify English content
      const task = generateData.data.taskOptions[0];
      expect(task.summary).toContain("handler");
      expect(task.description).toContain("payment processor");

      // Verify no Spanish instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).not.toContain("Spanish");

      // Step 2: Create scenario with English language
      const createRequest = new Request("http://localhost:3000/api/recruiter/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseScenarioData,
          taskDescription: task.description,
          companyName: "FastPay",
          language: "en",
        }),
      });

      const createResponse = await createScenarioPOST(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.success).toBe(true);

      // Step 3: Verify language is persisted in database
      const savedScenario = await db.scenario.findUnique({
        where: { id: createData.data.scenario.id },
      });

      expect(savedScenario).not.toBeNull();
      expect(savedScenario!.language).toBe("en");
      expect(savedScenario!.taskDescription).toContain("payment processor");
    });
  });

  describe("Default language handling", () => {
    it("should default to 'en' when no language specified", async () => {
      const createRequest = new Request("http://localhost:3000/api/recruiter/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseScenarioData,
          // No language field provided
        }),
      });

      const createResponse = await createScenarioPOST(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);

      // Verify default language in database
      const savedScenario = await db.scenario.findUnique({
        where: { id: createData.data.scenario.id },
      });

      expect(savedScenario).not.toBeNull();
      expect(savedScenario!.language).toBe("en");
    });
  });
});