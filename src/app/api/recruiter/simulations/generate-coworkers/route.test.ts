import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GenerateCoworkersResponse } from "@/lib/scenarios/coworker-generator";
import type { CoworkerBuilderData } from "@/lib/scenarios/scenario-builder";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockGenerateCoworkers = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/scenarios/coworker-generator", () => ({
  generateCoworkers: (...args: unknown[]) => mockGenerateCoworkers(...args),
}));

// Import after mocks
import { POST } from "./route";

describe("POST /api/recruiter/simulations/generate-coworkers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCoworkers: CoworkerBuilderData[] = [
    {
      name: "Jordan Kim",
      role: "Engineering Manager",
      personaStyle: "Warm and supportive but busy.",
      knowledge: [
        {
          topic: "code_review_expectations",
          triggerKeywords: ["code review", "pr", "pull request"],
          response: "We do async code reviews. Tag me when ready.",
          isCritical: true,
        },
        {
          topic: "task_context",
          triggerKeywords: ["why", "context", "background"],
          response: "This feature is for enterprise customers.",
          isCritical: true,
        },
      ],
    },
    {
      name: "Aisha Patel",
      role: "Senior Full-Stack Engineer",
      personaStyle: "Direct and technical.",
      knowledge: [
        {
          topic: "api_architecture",
          triggerKeywords: ["api", "endpoint", "rest"],
          response: "We're migrating to GraphQL.",
          isCritical: true,
        },
        {
          topic: "local_dev_setup",
          triggerKeywords: ["setup", "local", "dev environment"],
          response: "Run pnpm dev for frontend.",
          isCritical: true,
        },
      ],
    },
  ];

  const mockResponse: GenerateCoworkersResponse = {
    coworkers: mockCoworkers,
    _meta: {
      promptVersion: "1.0",
      generatedAt: "2026-02-06T00:00:00.000Z",
    },
  };

  const validRequestBody = {
    roleName: "Senior Backend Engineer",
    seniorityLevel: "senior",
    companyName: "TechFlow Inc.",
    companyDescription: "AI-powered workflow automation platform",
    techStack: ["TypeScript", "Node.js", "PostgreSQL"],
    taskDescription: "Build a new API endpoint for real-time notifications",
    keyResponsibilities: [
      "Design and implement scalable backend services",
      "Optimize database queries",
    ],
  };

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
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
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
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

    mockGenerateCoworkers.mockResolvedValue(mockResponse);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coworkers).toHaveLength(2);
    expect(data._meta.promptVersion).toBe("1.0");
  });

  it("allows ADMIN role", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-123",
        email: "admin@test.com",
        role: "ADMIN",
      },
    });

    mockGenerateCoworkers.mockResolvedValue(mockResponse);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("returns 400 if roleName is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    const invalidBody = { ...validRequestBody };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (invalidBody as any).roleName;

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
    expect(data.details).toBeDefined();
  });

  it("returns 400 if seniorityLevel is invalid", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    const invalidBody = {
      ...validRequestBody,
      seniorityLevel: "executive",
    };

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 if techStack is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    const invalidBody = {
      ...validRequestBody,
      techStack: [],
    };

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 if keyResponsibilities is empty", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    const invalidBody = {
      ...validRequestBody,
      keyResponsibilities: [],
    };

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid request body");
  });

  it("successfully generates coworkers with valid input", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    mockGenerateCoworkers.mockResolvedValue(mockResponse);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coworkers).toHaveLength(2);
    expect(data.coworkers[0].name).toBe("Jordan Kim");
    expect(data.coworkers[0].role).toBe("Engineering Manager");
    expect(data.coworkers[1].name).toBe("Aisha Patel");
    expect(data._meta.promptVersion).toBe("1.0");
    expect(data._meta.generatedAt).toBeDefined();

    // Verify generateCoworkers was called with correct input
    expect(mockGenerateCoworkers).toHaveBeenCalledWith(validRequestBody);
  });

  it("returns 500 if generation fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    mockGenerateCoworkers.mockRejectedValue(
      new Error("Gemini API error")
    );

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-coworkers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Generation failed");
    expect(data.message).toBe("Gemini API error");
  });

  it("handles all seniority levels", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    mockGenerateCoworkers.mockResolvedValue(mockResponse);

    const seniorityLevels = ["junior", "mid", "senior", "staff", "principal"];

    for (const level of seniorityLevels) {
      const request = new Request(
        "http://localhost/api/recruiter/simulations/generate-coworkers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...validRequestBody,
            seniorityLevel: level,
          }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
    }
  });
});
