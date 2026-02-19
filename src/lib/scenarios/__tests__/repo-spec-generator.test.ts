/**
 * Tests for RepoSpec generator
 *
 * Tests the internal validation logic (consistency checks) without
 * making actual AI calls. AI generation is mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Gemini before import
const mockGenerateContent = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  },
}));

import { generateRepoSpec } from "../repo-spec-generator";
import type { ScenarioMetadata } from "../repo-spec";

const sampleMetadata: ScenarioMetadata = {
  name: "Senior Backend Engineer at Meta",
  companyName: "Meta",
  companyDescription: "Social media and technology company",
  taskDescription: "Fix webhook reliability in the payments service",
  techStack: ["TypeScript", "Node.js", "Express", "PostgreSQL"],
  targetLevel: "senior",
  coworkers: [
    {
      name: "Sarah Kim",
      role: "Engineering Manager",
      personaStyle: "Warm and supportive",
      knowledge: [
        {
          topic: "code_review",
          triggerKeywords: ["pr", "review"],
          response: "Tag me for review",
          isCritical: true,
        },
        {
          topic: "task_context",
          triggerKeywords: ["why", "context"],
          response: "This is blocking enterprise customers",
          isCritical: true,
        },
      ],
    },
    {
      name: "Bob Martinez",
      role: "Senior Engineer",
      personaStyle: "Direct and technical",
      knowledge: [
        {
          topic: "webhook_system",
          triggerKeywords: ["webhook", "events"],
          response: "The processor has no retry logic",
          isCritical: true,
        },
        {
          topic: "api_architecture",
          triggerKeywords: ["api", "rest"],
          response: "We use Express with Prisma",
          isCritical: true,
        },
      ],
    },
  ],
};

const validSpecResponse = {
  projectName: "payment-gateway",
  projectDescription: "Internal payment processing service",
  scaffoldId: "express-ts",
  readmeContent:
    "# Payment Gateway\n\nInternal service for processing payments and delivering webhooks.\n\n## Setup\nnpm install && npm run dev",
  files: [
    {
      path: "src/services/webhook-processor.ts",
      content: "// TODO: fix retry logic",
      purpose: "stub",
      addedInCommit: 2,
    },
    {
      path: "src/types/index.ts",
      content: "export interface WebhookEvent {}",
      purpose: "working",
      addedInCommit: 0,
    },
    {
      path: "docs/architecture.md",
      content: "# Architecture\n\nKnown gap: webhook reliability",
      purpose: "doc",
      addedInCommit: 1,
    },
  ],
  commitHistory: [
    {
      message: "feat: initial project setup",
      authorName: "Sarah Kim",
      authorEmail: "sarah.kim@meta.com",
      daysAgo: 21,
    },
    {
      message: "docs: add architecture overview",
      authorName: "Bob Martinez",
      authorEmail: "bob.martinez@meta.com",
      daysAgo: 14,
    },
    {
      message: "wip: start webhook retry logic",
      authorName: "Bob Martinez",
      authorEmail: "bob.martinez@meta.com",
      daysAgo: 7,
    },
  ],
  issues: [
    {
      title: "Webhook events being dropped (~5%)",
      body: "Several merchants reported missing webhook events...",
      labels: ["bug"],
      state: "open",
      isMainTask: true,
      comments: [
        {
          authorName: "Bob Martinez",
          body: "I looked into this — see src/services/webhook-processor.ts",
        },
      ],
    },
    {
      title: "Add merchant onboarding API",
      body: "We need an API for merchant self-service onboarding flow...",
      labels: ["feature"],
      state: "closed",
      isMainTask: false,
      comments: [],
    },
  ],
  authors: [
    {
      name: "Sarah Kim",
      email: "sarah.kim@meta.com",
      role: "Engineering Manager",
    },
    {
      name: "Bob Martinez",
      email: "bob.martinez@meta.com",
      role: "Senior Engineer",
    },
  ],
};

describe("generateRepoSpec", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a valid spec from a well-formed AI response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(validSpecResponse),
    });

    const result = await generateRepoSpec(sampleMetadata);

    expect(result.spec.projectName).toBe("payment-gateway");
    expect(result.spec.files).toHaveLength(3);
    expect(result.spec.commitHistory).toHaveLength(3);
    expect(result.spec.issues).toHaveLength(2);
    expect(result._meta.promptVersion).toBe("1.0");
  });

  it("should handle JSON wrapped in markdown code fences", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "```json\n" + JSON.stringify(validSpecResponse) + "\n```",
    });

    const result = await generateRepoSpec(sampleMetadata);
    expect(result.spec.projectName).toBe("payment-gateway");
  });

  it("should reject spec with commit author not in authors list", async () => {
    const badSpec = {
      ...validSpecResponse,
      commitHistory: [
        {
          ...validSpecResponse.commitHistory[0],
          authorName: "Unknown Person",
        },
        ...validSpecResponse.commitHistory.slice(1),
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(badSpec),
    });

    await expect(generateRepoSpec(sampleMetadata)).rejects.toThrow(
      "not found in authors list"
    );
  });

  it("should reject spec with file referencing non-existent commit", async () => {
    const badSpec = {
      ...validSpecResponse,
      files: [
        {
          ...validSpecResponse.files[0],
          addedInCommit: 99, // No commit at index 99
        },
        ...validSpecResponse.files.slice(1),
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(badSpec),
    });

    await expect(generateRepoSpec(sampleMetadata)).rejects.toThrow(
      "references commit index"
    );
  });

  it("should reject spec with no main task issue", async () => {
    const badSpec = {
      ...validSpecResponse,
      issues: validSpecResponse.issues.map((i) => ({
        ...i,
        isMainTask: false,
      })),
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(badSpec),
    });

    await expect(generateRepoSpec(sampleMetadata)).rejects.toThrow(
      "Expected exactly 1 main task issue"
    );
  });

  it("should reject spec with closed main task issue", async () => {
    const badSpec = {
      ...validSpecResponse,
      issues: validSpecResponse.issues.map((i) =>
        i.isMainTask ? { ...i, state: "closed" } : i
      ),
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(badSpec),
    });

    await expect(generateRepoSpec(sampleMetadata)).rejects.toThrow(
      "Main task issue must be open"
    );
  });

  it("should retry on first failure", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: "not json" })
      .mockResolvedValueOnce({
        text: JSON.stringify(validSpecResponse),
      });

    const result = await generateRepoSpec(sampleMetadata);
    expect(result.spec.projectName).toBe("payment-gateway");
    expect(result._meta.attempts).toBe(2);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("should throw after all retry attempts fail", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not json at all" });

    await expect(generateRepoSpec(sampleMetadata)).rejects.toThrow(
      "Failed to parse JSON"
    );
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("should throw on empty response", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });

    await expect(generateRepoSpec(sampleMetadata)).rejects.toThrow(
      "Empty response"
    );
  });
});
