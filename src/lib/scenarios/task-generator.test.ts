import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TaskOption } from "./task-generator";

// Mock Gemini before importing the module
const mockGenerateContent = vi.fn();

vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  },
}));

// Import after mocks
import { generateCodingTask, type GenerateCodingTaskInput } from "./task-generator";

describe("generateCodingTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInput: GenerateCodingTaskInput = {
    roleName: "Senior Backend Engineer",
    seniorityLevel: "senior",
    techStack: ["TypeScript", "Node.js", "PostgreSQL", "Redis"],
    keyResponsibilities: [
      "Design and implement scalable backend services",
      "Optimize database queries",
      "Mentor junior engineers",
    ],
    domainContext: "fintech startup",
    companyName: "PayFlow Inc.",
  };

  const mockTaskOptions: TaskOption[] = [
    {
      summary: "Build a transaction webhook handler with retry logic",
      description:
        "Hey! So we need to handle incoming webhooks from our payment processor. When a transaction completes, fails, or is refunded, we get a POST to our endpoint. Right now we're dropping about 5% of these — the team's been complaining. We need a reliable handler with proper retry logic, idempotency, and status tracking. Check with DevOps about our current infrastructure and ask the product team about which transaction states matter most.",
    },
    {
      summary: "Add real-time notifications for payment failures",
      description:
        "We've had a few enterprise customers complain that they don't know when payments fail until they check the dashboard manually. Not great. Can you add a notification system that alerts users in real-time when a payment fails? We're thinking email + in-app notifications, but talk to the product manager about exactly which events to notify on. The design team has some mockups for the in-app UI. Also check with the DevOps engineer about our email service setup.",
    },
    {
      summary: "Implement idempotency for payment API endpoints",
      description:
        "So we've got an issue where if a user's connection drops mid-payment, they sometimes retry and we charge them twice. Yikes. We need to add idempotency to the payment endpoints so duplicate requests get deduplicated. The backend is Node.js + Postgres. Talk to the senior engineer about how we're currently handling request IDs and whether we should use Redis or just database-level checks. This is blocking a big customer, so timeline matters.",
    },
  ];

  const mockValidResponse = {
    taskOptions: mockTaskOptions,
  };

  it("successfully generates tasks with valid input", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockValidResponse),
    });

    const result = await generateCodingTask(mockInput);

    expect(result.taskOptions).toHaveLength(3);
    expect(result.taskOptions[0].summary).toBe(
      "Build a transaction webhook handler with retry logic"
    );
    expect(result.taskOptions[0].description).toContain("webhook");
    expect(result._meta.promptVersion).toBe("1.0");
    expect(result._meta.generatedAt).toBeDefined();
  });

  it("handles markdown fences in response", async () => {
    const wrappedResponse = "```json\n" + JSON.stringify(mockValidResponse) + "\n```";
    mockGenerateContent.mockResolvedValue({
      text: wrappedResponse,
    });

    const result = await generateCodingTask(mockInput);

    expect(result.taskOptions).toHaveLength(3);
    expect(result.taskOptions[0].summary).toBe(
      "Build a transaction webhook handler with retry logic"
    );
  });

  it("handles plain backtick fences in response", async () => {
    const wrappedResponse = "```\n" + JSON.stringify(mockValidResponse) + "\n```";
    mockGenerateContent.mockResolvedValue({
      text: wrappedResponse,
    });

    const result = await generateCodingTask(mockInput);

    expect(result.taskOptions).toHaveLength(3);
  });

  it("accepts exactly 2 task options", async () => {
    const twoTasks = {
      taskOptions: [mockTaskOptions[0], mockTaskOptions[1]],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(twoTasks),
    });

    const result = await generateCodingTask(mockInput);

    expect(result.taskOptions).toHaveLength(2);
  });

  it("throws error if response is empty", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "",
    });

    await expect(generateCodingTask(mockInput)).rejects.toThrow(
      "Empty response from Gemini"
    );
  });

  it("throws error if response is not valid JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "This is not JSON",
    });

    await expect(generateCodingTask(mockInput)).rejects.toThrow(
      "Failed to parse JSON response"
    );
  });

  it("throws error if response is missing taskOptions", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ invalidField: "data" }),
    });

    await expect(generateCodingTask(mockInput)).rejects.toThrow(
      "Invalid task generation response"
    );
  });

  it("throws error if less than 2 task options", async () => {
    const singleTask = {
      taskOptions: [mockTaskOptions[0]],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(singleTask),
    });

    await expect(generateCodingTask(mockInput)).rejects.toThrow(
      "Invalid task generation response"
    );
  });

  it("throws error if more than 3 task options", async () => {
    const tooManyTasks = {
      taskOptions: [
        ...mockTaskOptions,
        {
          summary: "Extra task",
          description: "This is a fourth task that shouldn't be here.",
        },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(tooManyTasks),
    });

    await expect(generateCodingTask(mockInput)).rejects.toThrow(
      "Invalid task generation response"
    );
  });

  it("throws error if task option is missing required fields", async () => {
    const invalidTasks = {
      taskOptions: [
        {
          summary: "Valid task",
          description: "This is a valid task description that is long enough.",
        },
        {
          summary: "Invalid task",
          // Missing description
        },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(invalidTasks),
    });

    await expect(generateCodingTask(mockInput)).rejects.toThrow(
      "Invalid task generation response"
    );
  });

  it("throws error if task description is too short", async () => {
    const shortDescription = {
      taskOptions: [
        {
          summary: "Task with short description",
          description: "Too short",
        },
        mockTaskOptions[0],
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(shortDescription),
    });

    await expect(generateCodingTask(mockInput)).rejects.toThrow(
      "Task description too short"
    );
  });

  it("throws error if task summary is too long", async () => {
    const longSummary = {
      taskOptions: [
        {
          summary:
            "This is an extremely long summary that goes way beyond the reasonable one-line limit and should be rejected by validation",
          description:
            "This is a valid description that is long enough to pass validation checks and provides meaningful context.",
        },
        mockTaskOptions[0],
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(longSummary),
    });

    await expect(generateCodingTask(mockInput)).rejects.toThrow(
      "Task summary too long"
    );
  });

  it("generates tasks for junior developer with appropriate difficulty", async () => {
    const juniorInput: GenerateCodingTaskInput = {
      ...mockInput,
      roleName: "Junior Frontend Developer",
      seniorityLevel: "junior",
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockValidResponse),
    });

    const result = await generateCodingTask(juniorInput);

    expect(result.taskOptions).toHaveLength(3);
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it("generates tasks for staff engineer with appropriate difficulty", async () => {
    const staffInput: GenerateCodingTaskInput = {
      ...mockInput,
      roleName: "Staff Engineer",
      seniorityLevel: "staff",
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockValidResponse),
    });

    const result = await generateCodingTask(staffInput);

    expect(result.taskOptions).toHaveLength(3);
    expect(mockGenerateContent).toHaveBeenCalled();
  });
});
