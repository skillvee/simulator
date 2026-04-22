/**
 * Integration tests for language threading in generate-task route
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Gemini
const mockGenerateContent = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  },
}));

describe("POST /api/recruiter/simulations/generate-task - Language Support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "test-user-id",
        role: "RECRUITER",
        email: "recruiter@test.com",
      },
    });
  });

  describe("Spanish language generation", () => {
    it("should generate task options in Spanish when language is 'es'", async () => {
      const spanishResponse = {
        taskOptions: [
          {
            summary: "Construir un manejador de webhooks de transacciones con lógica de reintentos",
            recruiterSummary: "El candidato investiga una tasa de pérdida del 5% en eventos webhook del procesador de pagos, diseña lógica de reintentos con verificaciones de idempotencia, y colabora con DevOps y stakeholders de producto.",
            description: "El procesador de pagos envía webhooks POST cuando las transacciones se completan, fallan o son reembolsadas. Actualmente, aproximadamente el 5% de estos eventos se están perdiendo, lo que lleva a escalaciones de soporte de comerciantes que ven estados de transacción inconsistentes."
          },
          {
            summary: "Añadir notificaciones en tiempo real para fallos de pago",
            recruiterSummary: "El candidato construye un sistema de notificaciones por email y en la aplicación para pagos fallidos, coordinando con producto sobre disparadores de eventos y DevOps sobre restricciones del servicio de email.",
            description: "Los clientes empresariales actualmente no tienen forma de saber sobre fallos de pago hasta que revisan manualmente el panel. Varias cuentas grandes han escalado esto como un bloqueador."
          }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(spanishResponse),
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: "Ingeniero Backend Senior",
          seniorityLevel: "senior",
          techStack: ["Node.js", "TypeScript", "PostgreSQL"],
          keyResponsibilities: ["Diseñar APIs", "Implementar webhooks", "Optimizar rendimiento"],
          domainContext: "fintech startup procesando pagos",
          companyName: "PagosRápidos",
          language: "es",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify Spanish language instruction was included in the prompt
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).toContain("Latin American Spanish");
      expect(callArgs.contents[0].parts[0].text).toContain("tú (not usted)");

      // Verify Spanish task was returned
      expect(data.data.taskOptions[0].summary).toContain("manejador");
      expect(data.data.taskOptions[0].description).toContain("procesador de pagos");
    });
  });

  describe("English language generation", () => {
    it("should generate task options in English when language is 'en'", async () => {
      const englishResponse = {
        taskOptions: [
          {
            summary: "Build a transaction webhook handler with retry logic",
            recruiterSummary: "The candidate investigates a 5% webhook event drop rate from the payment processor, designs retry logic with idempotency checks, and collaborates with DevOps and product stakeholders.",
            description: "The payment processor sends POST webhooks when transactions complete, fail, or are refunded. Currently about 5% of these events are being dropped, leading to support escalations from merchants who see inconsistent transaction states."
          },
          {
            summary: "Add real-time notifications for payment failures",
            recruiterSummary: "The candidate builds an email and in-app notification system for failed payments, coordinating with product on event triggers and DevOps on email service constraints.",
            description: "Enterprise customers currently have no way to know about payment failures until they manually check the dashboard. Several large accounts have escalated this as a blocker."
          }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(englishResponse),
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: "Senior Backend Engineer",
          seniorityLevel: "senior",
          techStack: ["Node.js", "TypeScript", "PostgreSQL"],
          keyResponsibilities: ["Design APIs", "Implement webhooks", "Optimize performance"],
          domainContext: "fintech startup processing payments",
          companyName: "FastPay",
          language: "en",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify no Spanish language instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).not.toContain("Spanish");

      // Verify English task was returned
      expect(data.data.taskOptions[0].summary).toContain("handler");
      expect(data.data.taskOptions[0].description).toContain("payment processor");
    });
  });

  describe("Default language handling", () => {
    it("should default to English when no language is specified", async () => {
      const englishResponse = {
        taskOptions: [
          {
            summary: "Build a transaction webhook handler",
            recruiterSummary: "The candidate investigates webhook issues.",
            description: "The payment processor sends webhooks."
          },
          {
            summary: "Implement payment retry logic",
            recruiterSummary: "The candidate builds retry mechanisms.",
            description: "Payment failures need automatic retries."
          }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(englishResponse),
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: "Senior Backend Engineer",
          seniorityLevel: "senior",
          techStack: ["Node.js"],
          keyResponsibilities: ["Design APIs"],
          domainContext: "fintech",
          companyName: "FastPay",
          // No language specified
        }),
      });

      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(200);

      // Verify English was used (no Spanish instruction)
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.contents[0].parts[0].text).not.toContain("Spanish");
    });
  });

  describe("Invalid language handling", () => {
    it("should reject unsupported language codes", async () => {
      const request = new Request("http://localhost:3000/api/recruiter/simulations/generate-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleName: "Senior Backend Engineer",
          seniorityLevel: "senior",
          techStack: ["Node.js"],
          keyResponsibilities: ["Design APIs"],
          domainContext: "fintech",
          companyName: "FastPay",
          language: "fr", // Unsupported language
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid language code");
    });
  });
});