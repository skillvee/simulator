/**
 * Integration tests for language threading in generate-resources route
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

describe("POST /api/recruiter/simulations/generate-resources - Language Support", () => {
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
    it("should generate resources in Spanish when language is 'es'", async () => {
      const spanishResponse = [
        {
          type: "repository",
          label: "Repositorio de GitHub",
          content: "# API de Pagos\n\n## Descripción General\n\nEsta API maneja las transacciones de pago para nuestra plataforma. Utiliza Node.js con TypeScript y se conecta a PostgreSQL.\n\n## Estructura del Proyecto\n\n```\nsrc/\n├── handlers/      # Manejadores de webhooks\n├── middleware/    # Middleware de autenticación\n├── models/        # Modelos de base de datos\n└── utils/         # Utilidades\n```\n\n## Problemas Conocidos\n\n- **Pérdida de webhooks**: Aproximadamente el 5% de los eventos webhook se pierden debido a problemas de red\n- **Cargos duplicados**: Los reintentos sin idempotencia pueden causar cargos duplicados",
          instructions: "Usa este repositorio como referencia para el código existente.",
        },
        {
          type: "dashboard",
          label: "Panel de Métricas",
          content: "## Vista General del Sistema\n\n### Tasa de Éxito de Transacciones\n- Últimas 24 horas: 94.2%\n- Última semana: 95.8%\n- Último mes: 95.1%\n\n### Rendimiento de Webhooks\n- Eventos procesados: 12,453/día\n- Tasa de pérdida: 5.8%\n- Tiempo promedio de respuesta: 245ms",
          instructions: "Consulta estas métricas para entender el comportamiento actual del sistema.",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(spanishResponse),
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/generate-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "PagosRápidos",
          taskDescription: "Implementar un manejador de webhooks con lógica de reintentos",
          techStack: ["Node.js", "TypeScript", "PostgreSQL"],
          roleName: "Ingeniero Backend Senior",
          seniorityLevel: "senior",
          language: "es",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify Spanish language instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).toContain("Latin American Spanish");
      expect(callArgs.config.systemInstruction).toContain("tú (not usted)");

      // Verify Spanish resources were returned
      expect(data.data.resources[0].label).toContain("Repositorio");
      expect(data.data.resources[0].content).toContain("Descripción");
      expect(data.data.resources[1].label).toContain("Métricas");
    });
  });

  describe("English language generation", () => {
    it("should generate resources in English when language is 'en'", async () => {
      const englishResponse = [
        {
          type: "repository",
          label: "GitHub Repository",
          content: "# Payment API\n\n## Overview\n\nThis API handles payment transactions for our platform. It uses Node.js with TypeScript and connects to PostgreSQL.\n\n## Project Structure\n\n```\nsrc/\n├── handlers/      # Webhook handlers\n├── middleware/    # Authentication middleware\n├── models/        # Database models\n└── utils/         # Utilities\n```\n\n## Known Issues\n\n- **Webhook drops**: Approximately 5% of webhook events are dropped due to network issues\n- **Duplicate charges**: Retries without idempotency can cause duplicate charges",
          instructions: "Use this repository as a reference for existing code.",
        },
        {
          type: "dashboard",
          label: "Metrics Dashboard",
          content: "## System Overview\n\n### Transaction Success Rate\n- Last 24 hours: 94.2%\n- Last week: 95.8%\n- Last month: 95.1%\n\n### Webhook Performance\n- Events processed: 12,453/day\n- Drop rate: 5.8%\n- Average response time: 245ms",
          instructions: "Check these metrics to understand current system behavior.",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(englishResponse),
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/generate-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "FastPay",
          taskDescription: "Implement a webhook handler with retry logic",
          techStack: ["Node.js", "TypeScript", "PostgreSQL"],
          roleName: "Senior Backend Engineer",
          seniorityLevel: "senior",
          language: "en",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify no Spanish language instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).not.toContain("Spanish");

      // Verify English resources were returned
      expect(data.data.resources[0].label).toContain("Repository");
      expect(data.data.resources[0].content).toContain("Overview");
      expect(data.data.resources[1].label).toContain("Dashboard");
    });
  });

  describe("Default language handling", () => {
    it("should default to English when no language is specified", async () => {
      const englishResponse = [
        {
          type: "repository",
          label: "GitHub Repository",
          content: "# Payment API\n\nThis handles payments.",
          instructions: "Reference for code.",
        },
      ];

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(englishResponse),
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/generate-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "FastPay",
          taskDescription: "Implement webhooks",
          techStack: ["Node.js"],
          roleName: "Backend Engineer",
          seniorityLevel: "mid",
          // No language specified
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify English was used (no Spanish instruction)
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).not.toContain("Spanish");
    });
  });

  describe("Invalid language handling", () => {
    it("should reject unsupported language codes", async () => {
      const request = new Request("http://localhost:3000/api/recruiter/simulations/generate-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "FastPay",
          taskDescription: "Implement webhooks",
          techStack: ["Node.js"],
          roleName: "Backend Engineer",
          seniorityLevel: "mid",
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