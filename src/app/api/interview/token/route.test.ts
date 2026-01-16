import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock db
const mockAssessmentFindFirst = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
  },
}));

// Mock gemini
const mockGenerateEphemeralToken = vi.fn();
vi.mock("@/lib/gemini", () => ({
  generateEphemeralToken: (...args: unknown[]) => mockGenerateEphemeralToken(...args),
  HR_PERSONA_SYSTEM_PROMPT: "Mock HR prompt",
}));

import { POST } from "./route";

describe("POST /api/interview/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 when assessmentId is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });

    const request = new Request("http://localhost/api/interview/token", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Assessment ID is required");
  });

  it("should return 404 when assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "nonexistent" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return token for valid assessment", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      cvUrl: null,
      scenario: {
        name: "Test Scenario",
        companyName: "Test Company",
        companyDescription: "A test company",
      },
      user: {
        name: "John Doe",
        email: "john@example.com",
      },
    });
    mockGenerateEphemeralToken.mockResolvedValue("mock-token-123");

    const request = new Request("http://localhost/api/interview/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe("mock-token-123");
    expect(data.assessmentId).toBe("assessment-1");
    expect(data.scenarioName).toBe("Test Scenario");
    expect(data.companyName).toBe("Test Company");
  });

  it("should include CV context when CV is present", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      cvUrl: "https://storage.example.com/cv.pdf",
      scenario: {
        name: "Test Scenario",
        companyName: "Test Company",
        companyDescription: "A test company",
      },
      user: {
        name: "John Doe",
        email: "john@example.com",
      },
    });
    mockGenerateEphemeralToken.mockResolvedValue("mock-token-456");

    const request = new Request("http://localhost/api/interview/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    // Verify generateEphemeralToken was called with system instruction containing CV info
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("John Doe"),
      })
    );
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("john@example.com"),
      })
    );
  });

  it("should return 500 on internal error", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/interview/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
