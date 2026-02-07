import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CoworkerBuilderData } from "./scenario-builder";

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
import { generateCoworkers, type GenerateCoworkersInput } from "./coworker-generator";

describe("generateCoworkers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInput: GenerateCoworkersInput = {
    roleName: "Senior Backend Engineer",
    seniorityLevel: "senior",
    companyName: "TechFlow Inc.",
    companyDescription: "AI-powered workflow automation platform",
    techStack: ["TypeScript", "Node.js", "PostgreSQL", "Redis"],
    taskDescription: "Build a new API endpoint for real-time notifications",
    keyResponsibilities: [
      "Design and implement scalable backend services",
      "Optimize database queries",
      "Mentor junior engineers",
    ],
  };

  const mockCoworkers: CoworkerBuilderData[] = [
    {
      name: "Jordan Kim",
      role: "Engineering Manager",
      personaStyle:
        "Warm and supportive but busy. Gives high-level guidance and encourages autonomy. Responds with voice memos on Slack. Trusts the team to figure out details.",
      knowledge: [
        {
          topic: "code_review_expectations",
          triggerKeywords: ["code review", "pr", "pull request", "merge"],
          response:
            "We do async code reviews. Tag me when ready. I look for tests, clear commit messages, and that it solves the actual user problem.",
          isCritical: true,
        },
        {
          topic: "task_context",
          triggerKeywords: ["why", "context", "background", "priority"],
          response:
            "This feature is for enterprise customers. Timeline matters but don't cut corners on testing.",
          isCritical: true,
        },
      ],
    },
    {
      name: "Aisha Patel",
      role: "Senior Full-Stack Engineer",
      personaStyle:
        "Direct and technical. Prefers bullet points. Responds quickly but briefly. Uses emoji reactions. Won't hand-hold but will unblock you if stuck.",
      knowledge: [
        {
          topic: "api_architecture",
          triggerKeywords: ["api", "endpoint", "rest", "graphql"],
          response:
            "We're migrating to GraphQL but payments still uses REST for PCI compliance. Don't touch /api/payments/*.",
          isCritical: true,
        },
        {
          topic: "local_dev_setup",
          triggerKeywords: ["setup", "local", "dev environment", "run locally"],
          response:
            "Run pnpm dev for frontend, pnpm server for API. DB is dockerized, docker-compose up.",
          isCritical: true,
        },
        {
          topic: "testing_setup",
          triggerKeywords: ["test", "testing", "unit test", "e2e"],
          response:
            "We use Jest for unit tests, Playwright for E2E. Run pnpm test before committing.",
          isCritical: false,
        },
      ],
    },
  ];

  it("successfully generates coworkers with valid input", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockCoworkers),
    });

    const result = await generateCoworkers(mockInput);

    expect(result.coworkers).toHaveLength(2);
    expect(result.coworkers[0].name).toBe("Jordan Kim");
    expect(result.coworkers[0].role).toBe("Engineering Manager");
    expect(result.coworkers[1].name).toBe("Aisha Patel");
    expect(result._meta.promptVersion).toBe("1.0");
    expect(result._meta.generatedAt).toBeDefined();
  });

  it("handles markdown fences in response", async () => {
    const wrappedResponse = "```json\n" + JSON.stringify(mockCoworkers) + "\n```";
    mockGenerateContent.mockResolvedValue({
      text: wrappedResponse,
    });

    const result = await generateCoworkers(mockInput);

    expect(result.coworkers).toHaveLength(2);
    expect(result.coworkers[0].name).toBe("Jordan Kim");
  });

  it("handles plain backtick fences in response", async () => {
    const wrappedResponse = "```\n" + JSON.stringify(mockCoworkers) + "\n```";
    mockGenerateContent.mockResolvedValue({
      text: wrappedResponse,
    });

    const result = await generateCoworkers(mockInput);

    expect(result.coworkers).toHaveLength(2);
  });

  it("throws error if response is empty", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "",
    });

    await expect(generateCoworkers(mockInput)).rejects.toThrow(
      "Empty response from Gemini"
    );
  });

  it("throws error if response is not valid JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "This is not JSON",
    });

    await expect(generateCoworkers(mockInput)).rejects.toThrow(
      "Failed to parse JSON response"
    );
  });

  it("throws error if response is not an array", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ name: "Not an array" }),
    });

    await expect(generateCoworkers(mockInput)).rejects.toThrow(
      "Response is not an array"
    );
  });

  it("throws error if coworker data is invalid", async () => {
    const invalidCoworkers = [
      {
        name: "Jordan Kim",
        // Missing role
        personaStyle: "Friendly",
        knowledge: [],
      },
    ];

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(invalidCoworkers),
    });

    await expect(generateCoworkers(mockInput)).rejects.toThrow(
      "Invalid coworker at index 0"
    );
  });

  it("throws error if less than 2 coworkers", async () => {
    const singleCoworker = [mockCoworkers[0]];

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(singleCoworker),
    });

    await expect(generateCoworkers(mockInput)).rejects.toThrow(
      "Expected 2-3 coworkers, got 1"
    );
  });

  it("throws error if more than 3 coworkers", async () => {
    const tooManyCoworkers = [
      ...mockCoworkers,
      mockCoworkers[0],
      mockCoworkers[1],
    ];

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(tooManyCoworkers),
    });

    await expect(generateCoworkers(mockInput)).rejects.toThrow(
      "Expected 2-3 coworkers, got 4"
    );
  });

  it("throws error if no Engineering Manager", async () => {
    const noManager = [
      {
        name: "Alice Johnson",
        role: "Senior Developer",
        personaStyle: "Technical and detailed",
        knowledge: [
          {
            topic: "architecture",
            triggerKeywords: ["arch", "design"],
            response: "We use microservices",
            isCritical: true,
          },
          {
            topic: "deployment",
            triggerKeywords: ["deploy", "ci"],
            response: "We use GitHub Actions",
            isCritical: true,
          },
        ],
      },
      {
        name: "Bob Smith",
        role: "Product Manager",
        personaStyle: "User-focused",
        knowledge: [
          {
            topic: "requirements",
            triggerKeywords: ["requirements", "specs"],
            response: "Check the PRD",
            isCritical: true,
          },
          {
            topic: "timeline",
            triggerKeywords: ["deadline", "timeline"],
            response: "We need this by end of month",
            isCritical: true,
          },
        ],
      },
    ];

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(noManager),
    });

    await expect(generateCoworkers(mockInput)).rejects.toThrow(
      "Generated coworkers must include an Engineering Manager"
    );
  });

  it("throws error if coworker has less than 2 critical knowledge items", async () => {
    const insufficientCritical = [
      {
        name: "Jordan Kim",
        role: "Engineering Manager",
        personaStyle: "Supportive",
        knowledge: [
          {
            topic: "code_review",
            triggerKeywords: ["pr", "review"],
            response: "Tag me when ready",
            isCritical: true,
          },
          {
            topic: "other_info",
            triggerKeywords: ["other"],
            response: "Some info",
            isCritical: false,
          },
        ],
      },
      {
        name: "Aisha Patel",
        role: "Senior Engineer",
        personaStyle: "Direct",
        knowledge: [
          {
            topic: "api",
            triggerKeywords: ["api"],
            response: "Use GraphQL",
            isCritical: true,
          },
          {
            topic: "testing",
            triggerKeywords: ["test"],
            response: "Use Jest",
            isCritical: true,
          },
        ],
      },
    ];

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(insufficientCritical),
    });

    await expect(generateCoworkers(mockInput)).rejects.toThrow(
      'Coworker "Jordan Kim" has only 1 critical knowledge items, need at least 2'
    );
  });

  it("accepts exactly 3 coworkers", async () => {
    const threeCoworkers = [
      ...mockCoworkers,
      {
        name: "Carlos Martinez",
        role: "DevOps Engineer",
        personaStyle: "Practical and solution-oriented",
        knowledge: [
          {
            topic: "deployment",
            triggerKeywords: ["deploy", "ci", "cd"],
            response: "We use GitHub Actions for CI/CD. Check .github/workflows/",
            isCritical: true,
          },
          {
            topic: "infrastructure",
            triggerKeywords: ["infra", "aws", "cloud"],
            response: "Everything runs on AWS. Staging is in us-east-1, prod is us-west-2.",
            isCritical: true,
          },
        ],
      },
    ];

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(threeCoworkers),
    });

    const result = await generateCoworkers(mockInput);

    expect(result.coworkers).toHaveLength(3);
    expect(result.coworkers[2].name).toBe("Carlos Martinez");
  });
});
