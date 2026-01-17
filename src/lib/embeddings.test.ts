/**
 * Tests for Embeddings Service
 *
 * @since 2026-01-16
 * @see Issue #67: US-011
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentDimension, VideoAssessmentStatus } from "@prisma/client";

// Mock the gemini module
vi.mock("@/lib/gemini", () => ({
  gemini: {
    models: {
      embedContent: vi.fn(),
    },
  },
}));

// Mock the database
vi.mock("@/server/db", () => ({
  db: {
    videoAssessment: {
      findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

// Mock error-recovery
vi.mock("@/lib/error-recovery", () => ({
  withRetry: vi.fn((fn: () => unknown) => fn()),
}));

// Import after mocks
import { gemini } from "@/lib/gemini";
import { db } from "@/server/db";
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  generateEmbedding,
  generateEmbeddingWithRetry,
  formatDimensionScoresForEmbedding,
  createEmbeddingText,
  generateAndStoreEmbeddings,
  generateQueryEmbedding,
  buildQueryText,
  parsePostgresVector,
  hasEmbeddings,
  getEmbeddingMetadata,
} from "./embeddings";

// Cast mocks for type-safe access
const mockEmbedContent = gemini.models.embedContent as ReturnType<typeof vi.fn>;
const mockDbVideoAssessment = db.videoAssessment as { findUnique: ReturnType<typeof vi.fn> };
const mockExecuteRaw = db.$executeRaw as unknown as ReturnType<typeof vi.fn>;
const mockQueryRaw = db.$queryRaw as unknown as ReturnType<typeof vi.fn>;

// ============================================================================
// Constants Tests
// ============================================================================

describe("Embedding Constants", () => {
  it("should use text-embedding-004 model", () => {
    expect(EMBEDDING_MODEL).toBe("text-embedding-004");
  });

  it("should have 768 dimensions", () => {
    expect(EMBEDDING_DIMENSIONS).toBe(768);
  });
});

// ============================================================================
// Embedding Generation Tests
// ============================================================================

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call Gemini embedContent with correct parameters", async () => {
    const mockEmbedding = Array(768).fill(0.1);
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: mockEmbedding }],
    });

    const result = await generateEmbedding("Test text");

    expect(mockEmbedContent).toHaveBeenCalledWith({
      model: EMBEDDING_MODEL,
      contents: [{ parts: [{ text: "Test text" }] }],
    });
    expect(result).toEqual(mockEmbedding);
  });

  it("should throw error when no embedding returned", async () => {
    mockEmbedContent.mockResolvedValue({ embeddings: [] });

    await expect(generateEmbedding("Test text")).rejects.toThrow(
      "Failed to generate embedding: no embedding values returned"
    );
  });

  it("should throw error when embeddings is undefined", async () => {
    mockEmbedContent.mockResolvedValue({});

    await expect(generateEmbedding("Test text")).rejects.toThrow(
      "Failed to generate embedding: no embedding values returned"
    );
  });
});

describe("generateEmbeddingWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return embedding with retry logic", async () => {
    const mockEmbedding = Array(768).fill(0.2);
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: mockEmbedding }],
    });

    const result = await generateEmbeddingWithRetry("Test text");

    expect(result).toEqual(mockEmbedding);
  });
});

// ============================================================================
// Text Formatting Tests
// ============================================================================

describe("formatDimensionScoresForEmbedding", () => {
  it("should format dimension scores with labels", () => {
    const scores = [
      {
        dimension: AssessmentDimension.COMMUNICATION,
        observableBehaviors: "Excellent verbal communication",
      },
      {
        dimension: AssessmentDimension.PROBLEM_SOLVING,
        observableBehaviors: "Strong analytical skills",
      },
    ];

    const result = formatDimensionScoresForEmbedding(scores);

    expect(result).toContain("Communication Skills:");
    expect(result).toContain("Excellent verbal communication");
    expect(result).toContain("Problem Solving Ability:");
    expect(result).toContain("Strong analytical skills");
  });

  it("should separate dimensions with double newlines", () => {
    const scores = [
      {
        dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
        observableBehaviors: "Deep technical expertise",
      },
      {
        dimension: AssessmentDimension.COLLABORATION,
        observableBehaviors: "Works well with others",
      },
    ];

    const result = formatDimensionScoresForEmbedding(scores);

    expect(result).toContain("\n\n");
  });

  it("should handle all 8 dimensions", () => {
    const scores = Object.values(AssessmentDimension).map((dimension) => ({
      dimension,
      observableBehaviors: `Behavior for ${dimension}`,
    }));

    const result = formatDimensionScoresForEmbedding(scores);

    expect(result).toContain("Communication Skills:");
    expect(result).toContain("Problem Solving Ability:");
    expect(result).toContain("Technical Knowledge:");
    expect(result).toContain("Collaboration and Teamwork:");
    expect(result).toContain("Adaptability and Flexibility:");
    expect(result).toContain("Leadership Capabilities:");
    expect(result).toContain("Creativity and Innovation:");
    expect(result).toContain("Time Management Skills:");
  });

  it("should return empty string for empty input", () => {
    const result = formatDimensionScoresForEmbedding([]);
    expect(result).toBe("");
  });
});

describe("createEmbeddingText", () => {
  it("should combine behaviors and summary with headers", () => {
    const scores = [
      {
        dimension: AssessmentDimension.COMMUNICATION,
        observableBehaviors: "Clear communication",
      },
    ];
    const summary = "Strong candidate overall";

    const result = createEmbeddingText(scores, summary);

    expect(result).toContain("CANDIDATE ASSESSMENT PROFILE");
    expect(result).toContain("OBSERVABLE BEHAVIORS:");
    expect(result).toContain("Clear communication");
    expect(result).toContain("OVERALL SUMMARY:");
    expect(result).toContain("Strong candidate overall");
  });
});

// ============================================================================
// Query Embedding Tests
// ============================================================================

describe("buildQueryText", () => {
  it("should format skills and domains", () => {
    const result = buildQueryText(
      ["TypeScript", "React", "Node.js"],
      ["frontend", "backend"]
    );

    expect(result).toContain("Required skills and technologies: TypeScript, React, Node.js");
    expect(result).toContain("Experience domains: frontend, backend");
  });

  it("should include additional context when provided", () => {
    const result = buildQueryText(
      ["Python"],
      ["data"],
      "Must have ML experience"
    );

    expect(result).toContain("Additional requirements: Must have ML experience");
  });

  it("should handle empty skills array", () => {
    const result = buildQueryText([], ["backend"]);

    expect(result).not.toContain("Required skills");
    expect(result).toContain("Experience domains: backend");
  });

  it("should handle empty domains array", () => {
    const result = buildQueryText(["Java"], []);

    expect(result).toContain("Required skills and technologies: Java");
    expect(result).not.toContain("Experience domains");
  });

  it("should return default text for empty inputs", () => {
    const result = buildQueryText([], []);

    expect(result).toBe("General software engineering candidate");
  });
});

describe("generateQueryEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate embedding from skills and domains", async () => {
    const mockEmbedding = Array(768).fill(0.3);
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: mockEmbedding }],
    });

    const result = await generateQueryEmbedding(
      ["React", "TypeScript"],
      ["frontend"]
    );

    expect(result).toEqual(mockEmbedding);
    expect(mockEmbedContent).toHaveBeenCalled();
  });
});

// ============================================================================
// Storage Tests
// ============================================================================

describe("generateAndStoreEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error when assessment not found", async () => {
    mockDbVideoAssessment.findUnique.mockResolvedValue(null);

    const result = await generateAndStoreEmbeddings("nonexistent-id");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Video assessment not found");
  });

  it("should return error when assessment not completed", async () => {
    mockDbVideoAssessment.findUnique.mockResolvedValue({
      id: "test-id",
      status: VideoAssessmentStatus.PROCESSING,
      scores: [],
      summary: null,
    });

    const result = await generateAndStoreEmbeddings("test-id");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not completed");
  });

  it("should return error when no dimension scores", async () => {
    mockDbVideoAssessment.findUnique.mockResolvedValue({
      id: "test-id",
      status: VideoAssessmentStatus.COMPLETED,
      scores: [],
      summary: { overallSummary: "Good candidate" },
    });

    const result = await generateAndStoreEmbeddings("test-id");

    expect(result.success).toBe(false);
    expect(result.error).toContain("No dimension scores");
  });

  it("should return error when no summary available", async () => {
    mockDbVideoAssessment.findUnique.mockResolvedValue({
      id: "test-id",
      status: VideoAssessmentStatus.COMPLETED,
      scores: [
        {
          dimension: AssessmentDimension.COMMUNICATION,
          observableBehaviors: "Good",
        },
      ],
      summary: null,
    });

    const result = await generateAndStoreEmbeddings("test-id");

    expect(result.success).toBe(false);
    expect(result.error).toContain("No summary available");
  });

  it("should generate and store embedding successfully", async () => {
    const mockEmbedding = Array(768).fill(0.5);
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: mockEmbedding }],
    });

    mockDbVideoAssessment.findUnique.mockResolvedValue({
      id: "test-id",
      status: VideoAssessmentStatus.COMPLETED,
      scores: [
        {
          dimension: AssessmentDimension.COMMUNICATION,
          observableBehaviors: "Excellent communication",
        },
        {
          dimension: AssessmentDimension.PROBLEM_SOLVING,
          observableBehaviors: "Strong problem solver",
        },
      ],
      summary: {
        overallSummary: "Strong candidate with excellent skills",
      },
    });

    mockExecuteRaw.mockResolvedValue(1);

    const result = await generateAndStoreEmbeddings("test-id");

    expect(result.success).toBe(true);
    expect(mockEmbedContent).toHaveBeenCalled();
    expect(mockExecuteRaw).toHaveBeenCalled();
  });
});

// ============================================================================
// Vector Parsing Tests
// ============================================================================

describe("parsePostgresVector", () => {
  it("should parse bracket format", () => {
    const result = parsePostgresVector("[0.1,0.2,0.3]");
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("should parse parenthesis format", () => {
    const result = parsePostgresVector("(0.5,0.6,0.7)");
    expect(result).toEqual([0.5, 0.6, 0.7]);
  });

  it("should handle spaces in values", () => {
    const result = parsePostgresVector("[0.1, 0.2, 0.3]");
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("should handle negative values", () => {
    const result = parsePostgresVector("[-0.1,0.2,-0.3]");
    expect(result).toEqual([-0.1, 0.2, -0.3]);
  });
});

// ============================================================================
// Status Check Tests
// ============================================================================

describe("hasEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when embedding exists", async () => {
    mockExecuteRaw.mockResolvedValue(1);

    const result = await hasEmbeddings("test-id");

    expect(result).toBe(true);
    expect(mockExecuteRaw).toHaveBeenCalled();
  });

  it("should return false when no embedding exists", async () => {
    mockExecuteRaw.mockResolvedValue(0);

    const result = await hasEmbeddings("test-id");

    expect(result).toBe(false);
  });
});

describe("getEmbeddingMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return metadata when embedding exists", async () => {
    const createdAt = new Date();
    mockQueryRaw.mockResolvedValue([
      {
        id: "embedding-id",
        embeddingModel: "text-embedding-004",
        createdAt,
      },
    ]);

    const result = await getEmbeddingMetadata("test-id");

    expect(result).toEqual({
      id: "embedding-id",
      embeddingModel: "text-embedding-004",
      createdAt,
    });
  });

  it("should return null when no embedding exists", async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await getEmbeddingMetadata("test-id");

    expect(result).toBeNull();
  });
});
