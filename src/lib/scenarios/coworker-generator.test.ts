import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CoworkerBuilderData } from "./scenario-builder";
import type { SupportedLanguage } from "@/lib/core/language";

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
    expect(result._meta.promptVersion).toBe("2.1");
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
      "Expected at least 2 coworkers, got 1"
    );
  });

  it("trims to 3 coworkers if more than 3 are generated", async () => {
    const tooManyCoworkers = [
      ...mockCoworkers,
      mockCoworkers[0],
      mockCoworkers[1],
    ];

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(tooManyCoworkers),
    });

    const result = await generateCoworkers(mockInput);

    expect(result.coworkers).toHaveLength(3);
  });

  it("retries and patches first coworker if no Engineering Manager", async () => {
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

    const result = await generateCoworkers(mockInput);

    // Should have retried (3 calls = MAX_GENERATION_ATTEMPTS) and patched first coworker
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    expect(result.coworkers[0].role).toBe("Engineering Manager");
    expect(result.coworkers[0].name).toBe("Alice Johnson");
  });

  it("succeeds on retry when first attempt lacks Engineering Manager", async () => {
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

    // First call returns no manager, second call returns valid data
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify(noManager) })
      .mockResolvedValueOnce({ text: JSON.stringify(mockCoworkers) });

    const result = await generateCoworkers(mockInput);

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(result.coworkers[0].role).toBe("Engineering Manager");
    expect(result.coworkers[0].name).toBe("Jordan Kim");
  });

  it("auto-promotes non-critical knowledge items when coworker has less than 2 critical items", async () => {
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

    const result = await generateCoworkers(mockInput);
    // Implementation auto-promotes non-critical knowledge items to critical instead of throwing
    // Jordan Kim should have had a non-critical item promoted to critical
    const jordan = result.coworkers.find((c) => c.name === "Jordan Kim");
    expect(jordan).toBeDefined();
    const jordanCriticalCount = jordan!.knowledge.filter((k) => k.isCritical).length;
    expect(jordanCriticalCount).toBeGreaterThanOrEqual(2);
    // Only called once since auto-fix doesn't trigger retry
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
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

  it("should include language in prompt when provided", async () => {
    const spanishCoworkers: CoworkerBuilderData[] = [
      {
        name: "María García",
        role: "Engineering Manager",  // Keep role in English to pass validation
        personaStyle: "Cálida y solidaria pero ocupada. Da orientación de alto nivel.",
        knowledge: [
          {
            topic: "expectativas_revision_codigo",
            triggerKeywords: ["revisión de código", "pr", "pull request"],
            response: "Hacemos revisiones de código asíncronas. Etiquétame cuando esté listo.",
            isCritical: true,
          },
          {
            topic: "contexto_proyecto",
            triggerKeywords: ["contexto", "prioridad", "importante"],
            response: "Esta función es para nuestros clientes empresariales. Es prioritaria.",
            isCritical: true,
          },
        ],
      },
      {
        name: "Carlos Rodríguez",
        role: "Ingeniero Senior",
        personaStyle: "Directo y técnico. Prefiere puntos concretos.",
        knowledge: [
          {
            topic: "configuracion_local",
            triggerKeywords: ["configuración", "local", "desarrollo"],
            response: "Usa Docker para el entorno local. El README tiene todos los detalles.",
            isCritical: true,
          },
          {
            topic: "arquitectura_api",
            triggerKeywords: ["api", "endpoint", "backend"],
            response: "Estamos migrando a GraphQL pero pagos todavía usa REST por PCI.",
            isCritical: true,
          },
        ],
      },
    ];

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(spanishCoworkers),
    });

    const spanishInput: GenerateCoworkersInput = {
      ...mockInput,
      language: "es" as SupportedLanguage,
    };

    const result = await generateCoworkers(spanishInput);

    // Verify the prompt contains Spanish language instruction
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.arrayContaining([
          expect.objectContaining({
            parts: expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining("Language:** es"),
              }),
            ]),
          }),
        ]),
      })
    );

    // Verify the prompt includes language instructions section
    const callArgs = mockGenerateContent.mock.calls[0][0];
    const promptText = callArgs.contents[0].parts[0].text;
    expect(promptText).toContain("## Language Instructions");
    expect(promptText).toContain("Generate ALL persona bios (personaStyle) in the target language");
    expect(promptText).toContain("Generate ALL knowledge responses in the target language");

    // Verify the result contains Spanish content
    expect(result.coworkers).toHaveLength(2);
    expect(result.coworkers[0].personaStyle).toContain("orientación");
    expect(result.coworkers[0].knowledge[0].response).toContain("revisiones de código asíncronas");
  });
});
