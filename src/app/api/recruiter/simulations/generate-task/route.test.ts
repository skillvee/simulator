import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GenerateCodingTaskResponse } from "@/lib/scenarios/task-generator";
import type { TaskOption } from "@/lib/scenarios/task-generator";

// Mock functions need to be defined before vi.mock
const mockAuth = vi.fn();
const mockGenerateCodingTask = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/scenarios/task-generator", () => ({
  generateCodingTask: (...args: unknown[]) => mockGenerateCodingTask(...args),
}));

// Import after mocks
import { POST } from "./route";

describe("POST /api/recruiter/simulations/generate-task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTaskOptions: TaskOption[] = [
    {
      summary: "Build a transaction webhook handler with retry logic",
      recruiterSummary:
        "The candidate investigates a 5% webhook event drop rate, designs retry logic with idempotency, and collaborates with DevOps and product stakeholders.",
      description:
        "Hey! So we need to handle incoming webhooks from our payment processor. When a transaction completes, fails, or is refunded, we get a POST to our endpoint. Right now we're dropping about 5% of these — the team's been complaining. We need a reliable handler with proper retry logic, idempotency, and status tracking. Check with DevOps about our current infrastructure and ask the product team about which transaction states matter most.",
    },
    {
      summary: "Add real-time notifications for payment failures",
      recruiterSummary:
        "The candidate builds an email and in-app notification system for failed payments, coordinating with product on event triggers and DevOps on email service constraints.",
      description:
        "We've had a few enterprise customers complain that they don't know when payments fail until they check the dashboard manually. Not great. Can you add a notification system that alerts users in real-time when a payment fails? We're thinking email + in-app notifications, but talk to the product manager about exactly which events to notify on. The design team has some mockups for the in-app UI.",
    },
  ];

  const mockResponse: GenerateCodingTaskResponse = {
    taskOptions: mockTaskOptions,
    _meta: {
      promptVersion: "1.1",
      generatedAt: "2026-02-06T00:00:00.000Z",
    },
  };

  const validRequestBody = {
    roleName: "Senior Backend Engineer",
    seniorityLevel: "senior",
    techStack: ["TypeScript", "Node.js", "PostgreSQL"],
    keyResponsibilities: [
      "Design and implement scalable backend services",
      "Optimize database queries",
    ],
    domainContext: "fintech startup",
    companyName: "PayFlow Inc.",
  };

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-task",
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
      "http://localhost/api/recruiter/simulations/generate-task",
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

    mockGenerateCodingTask.mockResolvedValue(mockResponse);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-task",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.taskOptions).toHaveLength(2);
    expect(data._meta.promptVersion).toBe("1.1");
  });

  it("allows ADMIN role", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "admin-123",
        email: "admin@test.com",
        role: "ADMIN",
      },
    });

    mockGenerateCodingTask.mockResolvedValue(mockResponse);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-task",
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
    delete (invalidBody as any).roleName;

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-task",
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
      "http://localhost/api/recruiter/simulations/generate-task",
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
      "http://localhost/api/recruiter/simulations/generate-task",
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
      "http://localhost/api/recruiter/simulations/generate-task",
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

  it("returns 400 if domainContext is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    const invalidBody = { ...validRequestBody };
    delete (invalidBody as any).domainContext;

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-task",
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

  it("returns 400 if companyName is missing", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    const invalidBody = { ...validRequestBody };
    delete (invalidBody as any).companyName;

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-task",
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

  it("successfully generates tasks with valid input", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    mockGenerateCodingTask.mockResolvedValue(mockResponse);

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-task",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.taskOptions).toHaveLength(2);
    expect(data.taskOptions[0].summary).toBe(
      "Build a transaction webhook handler with retry logic"
    );
    expect(data.taskOptions[0].description).toContain("webhook");
    expect(data._meta.promptVersion).toBe("1.1");
    expect(data._meta.generatedAt).toBeDefined();

    // Verify generateCodingTask was called with correct input
    expect(mockGenerateCodingTask).toHaveBeenCalledWith(validRequestBody);
  });

  it("returns 500 if generation fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    mockGenerateCodingTask.mockRejectedValue(new Error("Gemini API error"));

    const request = new Request(
      "http://localhost/api/recruiter/simulations/generate-task",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRequestBody),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Task generation failed");
    expect(data.details).toBe("Gemini API error");
  });

  it("handles all seniority levels", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "recruiter-123", role: "RECRUITER" },
    });

    mockGenerateCodingTask.mockResolvedValue(mockResponse);

    const seniorityLevels = ["junior", "mid", "senior", "staff", "principal"];

    for (const level of seniorityLevels) {
      const request = new Request(
        "http://localhost/api/recruiter/simulations/generate-task",
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
