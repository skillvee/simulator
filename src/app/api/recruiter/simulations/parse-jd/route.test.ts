import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParseJDResponse } from "@/types";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  },
}));

// Import after mocks
import { POST } from "./route";

describe("POST /api/recruiter/simulations/parse-jd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockParsedJD: ParseJDResponse = {
    roleName: { value: "Senior Frontend Engineer", confidence: "high" },
    companyName: { value: "Stripe", confidence: "high" },
    companyDescription: {
      value: "Financial infrastructure platform for internet businesses",
      confidence: "high",
    },
    techStack: {
      value: ["React", "TypeScript", "Node.js", "GraphQL"],
      confidence: "medium",
    },
    seniorityLevel: { value: "senior", confidence: "high" },
    keyResponsibilities: {
      value: [
        "Build payment UI components",
        "Optimize frontend performance",
        "Mentor junior engineers",
      ],
      confidence: "medium",
    },
    domainContext: {
      value: "Online payments and financial infrastructure",
      confidence: "high",
    },
    roleArchetype: { value: "frontend_engineer", confidence: "high" },
    language: { value: "en", confidence: "high" },
  };

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: "Senior React Engineer" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not recruiter or admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", email: "user@test.com", role: "USER" },
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: "Senior React Engineer" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Recruiter access required");
  });

  it("allows RECRUITER role", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockParsedJD),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior Frontend Engineer at Stripe",
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("allows ADMIN role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", email: "admin@test.com", role: "ADMIN" },
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockParsedJD),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior Frontend Engineer at Stripe",
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("returns 400 when jobDescription is missing", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 when jobDescription is empty string", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: "" }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("successfully parses job description and returns structured data", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockParsedJD),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription:
            "We're hiring a Senior Frontend Engineer at Stripe to build payment UI components...",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.roleName).toEqual({
      value: "Senior Frontend Engineer",
      confidence: "high",
    });
    expect(data.data.companyName).toEqual({ value: "Stripe", confidence: "high" });
    expect(data.data.seniorityLevel).toEqual({ value: "senior", confidence: "high" });
    expect(data.data.techStack.value).toContain("React");
    expect(data.data._meta).toBeDefined();
    expect(data.data._meta.promptVersion).toBe("1.2");
    expect(data.data._meta.parsedAt).toBeDefined();
  });

  it("handles JSON responses with markdown code fences", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    // Simulate Gemini returning JSON with markdown fences
    mockGenerateContent.mockResolvedValue({
      text: "```json\n" + JSON.stringify(mockParsedJD) + "\n```",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior Frontend Engineer at Stripe",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.roleName.value).toBe("Senior Frontend Engineer");
  });

  it("returns 500 when AI response is not valid JSON", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    mockGenerateContent.mockResolvedValue({
      text: "This is not valid JSON",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior Frontend Engineer",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(
      "Failed to parse job description - invalid JSON response"
    );
  });

  it("returns 500 when AI response is empty", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    mockGenerateContent.mockResolvedValue({
      text: "",
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior Frontend Engineer",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(
      "Failed to parse job description - empty response from AI"
    );
  });

  it("returns 500 when AI response is missing required fields", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    // Missing several required fields
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        roleName: { value: "Senior Engineer", confidence: "high" },
      }),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior Frontend Engineer",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Incomplete parsing result");
    expect(data.error).toContain("missing fields:");
  });

  it("handles Gemini API errors gracefully", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    mockGenerateContent.mockRejectedValue(new Error("Gemini API error"));

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior Frontend Engineer",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to parse job description");
  });

  it("handles very short job descriptions", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    const shortJDResponse: ParseJDResponse = {
      roleName: { value: "Senior React Engineer", confidence: "high" },
      companyName: { value: null, confidence: "low" },
      companyDescription: { value: null, confidence: "low" },
      techStack: { value: ["React"], confidence: "medium" },
      seniorityLevel: { value: "senior", confidence: "medium" },
      keyResponsibilities: { value: null, confidence: "low" },
      domainContext: { value: null, confidence: "low" },
      roleArchetype: { value: "frontend_engineer", confidence: "medium" },
      language: { value: "en", confidence: "low" },
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(shortJDResponse),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior React Engineer",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.roleName.value).toBe("Senior React Engineer");
    expect(data.data.companyName.value).toBeNull();
    expect(data.data.companyDescription.value).toBeNull();
  });

  it("includes all confidence levels in response", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockParsedJD),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Senior Frontend Engineer at Stripe",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.roleName.confidence).toBe("high");
    expect(data.data.companyName.confidence).toBe("high");
    expect(data.data.techStack.confidence).toBe("medium");
    expect(data.data.keyResponsibilities.confidence).toBe("medium");
  });

  it("detects English language in English job description", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockParsedJD),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "We are looking for a Senior Frontend Engineer to join our team at Stripe. You will build React components and optimize performance.",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.language).toEqual({ value: "en", confidence: "high" });
  });

  it("detects Spanish language in Spanish job description", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    const spanishJDResponse: ParseJDResponse = {
      ...mockParsedJD,
      roleName: { value: "Ingeniero Frontend Senior", confidence: "high" },
      language: { value: "es", confidence: "high" },
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(spanishJDResponse),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Buscamos un Ingeniero Frontend Senior para unirse a nuestro equipo. Responsabilidades: Desarrollar componentes en React, optimizar el rendimiento, mentorear a ingenieros junior.",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.language).toEqual({ value: "es", confidence: "high" });
  });

  it("falls back to English for unsupported language (French)", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    const frenchJDResponse: ParseJDResponse = {
      ...mockParsedJD,
      roleName: { value: "Ingénieur Frontend Senior", confidence: "high" },
      language: { value: "fr" as "en" | "es", confidence: "high" }, // AI returns French (unsupported)
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(frenchJDResponse),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Nous recherchons un Ingénieur Frontend Senior pour rejoindre notre équipe.",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should fall back to English since French is not supported
    expect(data.data.language).toEqual({ value: "en", confidence: "low" });
  });

  it("handles null language detection gracefully", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    const noLanguageResponse: ParseJDResponse = {
      ...mockParsedJD,
      language: { value: null, confidence: "low" },
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(noLanguageResponse),
    });

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: "Engineer",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should default to English when detection returns null
    expect(data.data.language).toEqual({ value: "en", confidence: "low" });
  });

  it("calls Gemini with correct model and prompt", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "recruiter-123",
        email: "recruiter@test.com",
        role: "RECRUITER",
      },
    });

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockParsedJD),
    });

    const jobDescription =
      "We're hiring a Senior Frontend Engineer at Stripe...";

    const request = new Request(
      "http://localhost/api/recruiter/simulations/parse-jd",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      }
    );

    await POST(request);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3-flash-preview",
        contents: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining(jobDescription),
              }),
            ]),
          }),
        ]),
      })
    );
  });
});
