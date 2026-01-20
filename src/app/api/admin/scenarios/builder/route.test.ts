import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/ai", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  },
}));

vi.mock("@/lib/scenarios", () => ({
  buildCompleteSystemPrompt: vi.fn(() => "Mock system prompt"),
  parseExtractionFromResponse: vi.fn(() => null),
  cleanResponseForDisplay: vi.fn((text: string) => text),
  applyExtraction: vi.fn((data) => data),
}));

// Import after mocks
import { GET, POST } from "./route";

describe("GET /api/admin/scenarios/builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns greeting for admin users", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockResolvedValue({
      text: "Hello! Welcome to the scenario builder.",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.greeting).toBe("Hello! Welcome to the scenario builder.");
    expect(data.timestamp).toBeDefined();
  });

  it("returns fallback greeting on Gemini error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockRejectedValue(new Error("Gemini API error"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.greeting).toContain("Hello!");
    expect(data.timestamp).toBeDefined();
  });
});

describe("POST /api/admin/scenarios/builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Admin access required");
  });

  it("returns 400 when message is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required field: message");
  });

  it("sends message to Gemini and returns response", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockResolvedValue({
      text: "Great! Let's call your company TechFlow.",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "The company is called TechFlow",
          history: [],
          scenarioData: {},
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe("Great! Let's call your company TechFlow.");
    expect(data.timestamp).toBeDefined();
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("includes history in Gemini request", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockResolvedValue({
      text: "Got it!",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "And the task is to build an API",
          history: [
            {
              role: "user",
              text: "Company is TechFlow",
              timestamp: new Date().toISOString(),
            },
            {
              role: "model",
              text: "Great!",
              timestamp: new Date().toISOString(),
            },
          ],
          scenarioData: { companyName: "TechFlow" },
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            parts: expect.arrayContaining([
              expect.objectContaining({ text: "Company is TechFlow" }),
            ]),
          }),
          expect.objectContaining({
            role: "model",
            parts: expect.arrayContaining([
              expect.objectContaining({ text: "Great!" }),
            ]),
          }),
        ]),
      })
    );
  });

  it("returns 500 on Gemini error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockRejectedValue(new Error("Gemini API error"));

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Hello",
          history: [],
          scenarioData: {},
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate response");
  });

  it("returns scenarioData in response", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockResolvedValue({
      text: "I've updated the scenario.",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Add a new coworker",
          history: [],
          scenarioData: { companyName: "TechFlow" },
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenarioData).toBeDefined();
    // Since applyExtraction is mocked to return the same data
    expect(data.scenarioData.companyName).toBe("TechFlow");
  });

  it("handles empty history gracefully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockResolvedValue({
      text: "Hello!",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Start",
          // Missing history
          scenarioData: {},
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("handles empty scenarioData gracefully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockResolvedValue({
      text: "Hello!",
    });

    const request = new Request(
      "http://localhost/api/admin/scenarios/builder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Start",
          history: [],
          // Missing scenarioData
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
