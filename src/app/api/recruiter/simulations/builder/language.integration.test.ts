/**
 * Integration tests for language threading in builder route
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";

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

describe("/api/recruiter/simulations/builder - Language Support", () => {
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

  describe("POST - Spanish language conversation", () => {
    it("should conduct conversation in Spanish when language is 'es'", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "¡Perfecto! Veo que quieres crear un escenario de evaluación para un ingeniero backend. Empecemos con la información básica. ¿Cómo se llama la empresa ficticia para este escenario?",
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Quiero crear un escenario para un ingeniero backend senior",
          history: [],
          scenarioData: {},
          language: "es",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify Spanish language instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const systemInstructions = callArgs.contents[0].parts[0].text;
      expect(systemInstructions).toContain("Latin American Spanish");
      expect(systemInstructions).toContain("tú (not usted)");

      // Verify Spanish response
      expect(data.data.response).toContain("escenario");
      expect(data.data.response).toContain("ingeniero backend");
    });
  });

  describe("POST - English language conversation", () => {
    it("should conduct conversation in English when language is 'en'", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "Perfect! I see you want to create an assessment scenario for a backend engineer. Let's start with the basics. What's the name of the fictional company for this scenario?",
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "I want to create a scenario for a senior backend engineer",
          history: [],
          scenarioData: {},
          language: "en",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify no Spanish language instruction was included
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const systemInstructions = callArgs.contents[0].parts[0].text;
      expect(systemInstructions).not.toContain("Spanish");

      // Verify English response
      expect(data.data.response).toContain("scenario");
      expect(data.data.response).toContain("backend engineer");
    });
  });

  describe("POST - Default language handling", () => {
    it("should default to English when no language is specified", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "Great! Let's create a scenario. What company should we use?",
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "I want to create a scenario",
          history: [],
          scenarioData: {},
          // No language specified
        }),
      });

      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(200);

      // Verify English was used (no Spanish instruction)
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const systemInstructions = callArgs.contents[0].parts[0].text;
      expect(systemInstructions).not.toContain("Spanish");
    });
  });

  describe("GET - Initial greeting", () => {
    it("should use English for initial greeting (default)", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "Hello! I'm here to help you create a new assessment scenario. What kind of scenario would you like to build?",
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify no Spanish language instruction was included in the initial greeting
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const systemInstructions = callArgs.contents[0].parts[0].text;
      expect(systemInstructions).not.toContain("Spanish");

      // Verify English greeting
      expect(data.data.response).toContain("Hello");
    });
  });

  describe("Conversation with history", () => {
    it("should maintain language consistency throughout conversation", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "Excelente nombre para la empresa. Ahora, ¿cuál sería la descripción de PagosRápidos? Describe en 2-3 oraciones qué hace la empresa y su cultura.",
      });

      const request = new Request("http://localhost:3000/api/recruiter/simulations/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "La empresa se llama PagosRápidos",
          history: [
            {
              role: "user",
              text: "Quiero crear un escenario para un ingeniero backend",
              timestamp: "2024-01-01T00:00:00Z",
            },
            {
              role: "model",
              text: "¡Perfecto! Veo que quieres crear un escenario de evaluación. ¿Cómo se llama la empresa?",
              timestamp: "2024-01-01T00:00:01Z",
            },
          ],
          scenarioData: {
            companyName: "PagosRápidos",
          },
          language: "es",
        }),
      });

      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(200);

      // Verify Spanish is maintained
      const callArgs = mockGenerateContent.mock.calls[0][0];
      const systemInstructions = callArgs.contents[0].parts[0].text;
      expect(systemInstructions).toContain("Latin American Spanish");

      // Verify conversation history is preserved
      expect(callArgs.contents).toHaveLength(5); // System + ack + 2 history + user message
      expect(callArgs.contents[2].parts[0].text).toContain("Quiero crear un escenario");
    });
  });
});