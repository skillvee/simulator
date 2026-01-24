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

// Mock gemini - must match exact import path in route.ts
const mockGenerateEphemeralToken = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  generateEphemeralToken: (...args: unknown[]) =>
    mockGenerateEphemeralToken(...args),
}));

// Mock storage (now in @/lib/external)
vi.mock("@/lib/external", () => ({
  getSignedResumeUrl: vi.fn(),
}));

// Mock cv-parser (now in @/lib/candidate)
const mockFormatProfileForPrompt = vi.fn();
const mockProfileFromPrismaJson = vi.fn();
vi.mock("@/lib/candidate", () => ({
  formatProfileForPrompt: (...args: unknown[]) =>
    mockFormatProfileForPrompt(...args),
  profileFromPrismaJson: (...args: unknown[]) =>
    mockProfileFromPrismaJson(...args),
}));

import { POST } from "./route";

describe("POST /api/interview/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileFromPrismaJson.mockReturnValue(null);
    mockFormatProfileForPrompt.mockReturnValue("");
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
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.token).toBe("mock-token-123");
    expect(json.data.assessmentId).toBe("assessment-1");
    expect(json.data.scenarioName).toBe("Test Scenario");
    expect(json.data.companyName).toBe("Test Company");
  });

  it("should include parsed profile context when parsedProfile is present", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    const mockProfile = {
      name: "John Doe",
      summary: "Senior developer with 10 years experience",
      workExperience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      parsedAt: new Date().toISOString(),
      parseQuality: "high",
    };
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      cvUrl: "https://storage.example.com/cv.pdf",
      parsedProfile: mockProfile,
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
    mockProfileFromPrismaJson.mockReturnValue(mockProfile);
    mockFormatProfileForPrompt.mockReturnValue(
      "### Professional Summary\nSenior developer with 10 years experience"
    );
    mockGenerateEphemeralToken.mockResolvedValue("mock-token-456");

    const request = new Request("http://localhost/api/interview/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockFormatProfileForPrompt).toHaveBeenCalledWith(mockProfile);
    // Verify generateEphemeralToken was called with system instruction containing formatted profile
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining(
          "Senior developer with 10 years experience"
        ),
      })
    );
  });

  it("should fall back to basic info when parsedProfile is null but cvUrl exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
      cvUrl: "https://storage.example.com/cv.pdf",
      parsedProfile: null,
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
    mockProfileFromPrismaJson.mockReturnValue(null);
    mockGenerateEphemeralToken.mockResolvedValue("mock-token-456");

    const request = new Request("http://localhost/api/interview/token", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    // Verify generateEphemeralToken was called with fallback text
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining(
          "don't have their full CV parsed"
        ),
      })
    );
    expect(mockGenerateEphemeralToken).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("John Doe"),
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
