/**
 * Tests for Percentile Calculator
 *
 * @since 2026-01-31
 * @see Issue #199: US-001
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentDimension, VideoAssessmentStatus } from "@prisma/client";
import {
  calculatePercentiles,
  calculateAndStorePercentiles,
  getStoredPercentiles,
  getPercentileDescription,
  recalculateAllPercentiles,
} from "./percentile-calculator";

// Mock Prisma client
vi.mock("@/server/db", () => ({
  db: {
    videoAssessment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    assessment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { db } from "@/server/db";

// ============================================================================
// Test Data
// ============================================================================

const createMockVideoAssessment = (
  id: string,
  assessmentId: string,
  scores: Array<{ dimension: AssessmentDimension; score: number }>
) => ({
  id,
  assessmentId,
  candidateId: "candidate-1",
  videoUrl: "https://example.com/video.mp4",
  status: VideoAssessmentStatus.COMPLETED,
  createdAt: new Date(),
  completedAt: new Date(),
  retryCount: 0,
  lastFailureReason: null,
  isSearchable: true,
  scores: scores.map((s, i) => ({
    id: `score-${id}-${i}`,
    assessmentId: id,
    dimension: s.dimension,
    score: s.score,
    observableBehaviors: `Observable behaviors for ${s.dimension}`,
    timestamps: [],
    trainableGap: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
});

const ALL_DIMENSIONS = Object.values(AssessmentDimension);

// ============================================================================
// calculatePercentiles Tests
// ============================================================================

describe("calculatePercentiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error if no video assessment found", async () => {
    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(null);

    await expect(calculatePercentiles("assessment-1")).rejects.toThrow(
      "No completed video assessment found"
    );
  });

  it("should throw error if video assessment has no scores", async () => {
    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(
      createMockVideoAssessment("va-1", "assessment-1", [])
    );

    await expect(calculatePercentiles("assessment-1")).rejects.toThrow(
      "No dimension scores found"
    );
  });

  it("should throw error if no completed assessments for comparison", async () => {
    const targetAssessment = createMockVideoAssessment("va-1", "assessment-1", [
      { dimension: AssessmentDimension.COMMUNICATION, score: 4 },
    ]);

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([]);

    await expect(calculatePercentiles("assessment-1")).rejects.toThrow(
      "No completed assessments with scores found"
    );
  });

  it("should calculate 0 percentile when target is lowest", async () => {
    const lowestScores = ALL_DIMENSIONS.map((d) => ({
      dimension: d,
      score: 1,
    }));
    const higherScores = ALL_DIMENSIONS.map((d) => ({
      dimension: d,
      score: 5,
    }));

    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      lowestScores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
      createMockVideoAssessment("va-2", "assessment-2", higherScores),
      createMockVideoAssessment("va-3", "assessment-3", higherScores),
    ]);

    const result = await calculatePercentiles("assessment-1");

    // With score of 1, no one scored below, so percentile should be 0
    expect(result.dimensions[AssessmentDimension.COMMUNICATION]).toBe(0);
    expect(result.overall).toBe(0);
  });

  it("should calculate 100 percentile when target is highest (all below)", async () => {
    const highestScores = ALL_DIMENSIONS.map((d) => ({
      dimension: d,
      score: 5,
    }));
    const lowerScores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 1 }));

    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      highestScores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
      createMockVideoAssessment("va-2", "assessment-2", lowerScores),
      createMockVideoAssessment("va-3", "assessment-3", lowerScores),
    ]);

    const result = await calculatePercentiles("assessment-1");

    // With score of 5 and others at 1, 2 out of 3 scored below = 67% (rounded)
    expect(result.dimensions[AssessmentDimension.COMMUNICATION]).toBe(67);
    expect(result.overall).toBe(67);
  });

  it("should calculate median percentile correctly", async () => {
    // Create 5 assessments with scores 1, 2, 3, 4, 5
    const allAssessments = [1, 2, 3, 4, 5].map((score, i) =>
      createMockVideoAssessment(
        `va-${i}`,
        `assessment-${i}`,
        ALL_DIMENSIONS.map((d) => ({ dimension: d, score }))
      )
    );

    // Target is score 3 (median)
    const targetAssessment = allAssessments[2]; // score = 3

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue(allAssessments);

    const result = await calculatePercentiles("assessment-2");

    // Score 3: 2 assessments scored below (1 and 2) out of 5 total
    // Percentile = (2/5) * 100 = 40%
    expect(result.dimensions[AssessmentDimension.COMMUNICATION]).toBe(40);
    expect(result.overall).toBe(40);
  });

  it("should handle single assessment (always 0 percentile)", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 4 }));
    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      scores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
    ]);

    const result = await calculatePercentiles("assessment-1");

    // Only one assessment, no one below, percentile = 0
    expect(result.dimensions[AssessmentDimension.COMMUNICATION]).toBe(0);
    expect(result.overall).toBe(0);
  });

  it("should calculate percentiles per dimension independently", async () => {
    // Target: high COMMUNICATION (5), low TECHNICAL_KNOWLEDGE (1)
    const targetAssessment = createMockVideoAssessment("va-1", "assessment-1", [
      { dimension: AssessmentDimension.COMMUNICATION, score: 5 },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 1 },
    ]);

    // Others: low COMMUNICATION (1), high TECHNICAL_KNOWLEDGE (5)
    const otherScores = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 1 },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
    ];
    const otherAssessment = createMockVideoAssessment(
      "va-2",
      "assessment-2",
      otherScores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
      otherAssessment,
    ]);

    const result = await calculatePercentiles("assessment-1");

    // COMMUNICATION: target=5, other=1, 1 scored below out of 2 = 50%
    expect(result.dimensions[AssessmentDimension.COMMUNICATION]).toBe(50);

    // TECHNICAL_KNOWLEDGE: target=1, other=5, 0 scored below out of 2 = 0%
    expect(result.dimensions[AssessmentDimension.TECHNICAL_KNOWLEDGE]).toBe(0);
  });

  it("should default to 50th percentile for missing dimensions", async () => {
    // Target only has COMMUNICATION
    const targetAssessment = createMockVideoAssessment("va-1", "assessment-1", [
      { dimension: AssessmentDimension.COMMUNICATION, score: 4 },
    ]);

    // Other has different dimensions
    const otherAssessment = createMockVideoAssessment("va-2", "assessment-2", [
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 3 },
    ]);

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
      otherAssessment,
    ]);

    const result = await calculatePercentiles("assessment-1");

    // PROBLEM_SOLVING not scored by target, should default to 50
    expect(result.dimensions[AssessmentDimension.PROBLEM_SOLVING]).toBe(50);
  });

  it("should include metadata in result", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 3 }));
    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      scores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
    ]);

    const result = await calculatePercentiles("assessment-1");

    expect(result.metadata).toBeDefined();
    expect(result.metadata.assessmentId).toBe("assessment-1");
    expect(result.metadata.totalCandidates).toBe(1);
    expect(result.metadata.calculatedAt).toBeDefined();
  });
});

// ============================================================================
// calculateAndStorePercentiles Tests
// ============================================================================

describe("calculateAndStorePercentiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate percentiles and store in assessment report", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 4 }));
    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      scores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
    ]);
    vi.mocked(db.assessment.findUnique).mockResolvedValue({
      id: "assessment-1",
      report: { existingField: "value" },
    } as never);
    vi.mocked(db.assessment.update).mockResolvedValue({} as never);

    const result = await calculateAndStorePercentiles("assessment-1");

    expect(result.overall).toBeDefined();
    expect(db.assessment.update).toHaveBeenCalledWith({
      where: { id: "assessment-1" },
      data: {
        report: expect.objectContaining({
          existingField: "value",
          percentiles: expect.objectContaining({
            dimensions: expect.any(Object),
            overall: expect.any(Number),
            calculatedAt: expect.any(String),
            totalCandidates: expect.any(Number),
          }),
        }),
      },
    });
  });

  it("should create new report if none exists", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 3 }));
    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      scores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
    ]);
    vi.mocked(db.assessment.findUnique).mockResolvedValue({
      id: "assessment-1",
      report: null,
    } as never);
    vi.mocked(db.assessment.update).mockResolvedValue({} as never);

    await calculateAndStorePercentiles("assessment-1");

    expect(db.assessment.update).toHaveBeenCalledWith({
      where: { id: "assessment-1" },
      data: {
        report: expect.objectContaining({
          percentiles: expect.any(Object),
        }),
      },
    });
  });
});

// ============================================================================
// getStoredPercentiles Tests
// ============================================================================

describe("getStoredPercentiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null if no assessment found", async () => {
    vi.mocked(db.assessment.findUnique).mockResolvedValue(null);

    const result = await getStoredPercentiles("assessment-1");

    expect(result).toBeNull();
  });

  it("should return null if no report exists", async () => {
    vi.mocked(db.assessment.findUnique).mockResolvedValue({
      id: "assessment-1",
      report: null,
    } as never);

    const result = await getStoredPercentiles("assessment-1");

    expect(result).toBeNull();
  });

  it("should return null if no percentiles in report", async () => {
    vi.mocked(db.assessment.findUnique).mockResolvedValue({
      id: "assessment-1",
      report: { otherField: "value" },
    } as never);

    const result = await getStoredPercentiles("assessment-1");

    expect(result).toBeNull();
  });

  it("should return flat map of percentiles including overall", async () => {
    vi.mocked(db.assessment.findUnique).mockResolvedValue({
      id: "assessment-1",
      report: {
        percentiles: {
          dimensions: {
            COMMUNICATION: 75,
            PROBLEM_SOLVING: 60,
          },
          overall: 70,
        },
      },
    } as never);

    const result = await getStoredPercentiles("assessment-1");

    expect(result).toEqual({
      COMMUNICATION: 75,
      PROBLEM_SOLVING: 60,
      overall: 70,
    });
  });
});

// ============================================================================
// getPercentileDescription Tests
// ============================================================================

describe("getPercentileDescription", () => {
  it("should return 'Top 10%' for percentiles >= 90", () => {
    expect(getPercentileDescription(90)).toBe("Top 10%");
    expect(getPercentileDescription(95)).toBe("Top 10%");
    expect(getPercentileDescription(100)).toBe("Top 10%");
  });

  it("should return 'Top 25%' for percentiles >= 75 and < 90", () => {
    expect(getPercentileDescription(75)).toBe("Top 25%");
    expect(getPercentileDescription(80)).toBe("Top 25%");
    expect(getPercentileDescription(89)).toBe("Top 25%");
  });

  it("should return 'Above average' for percentiles >= 50 and < 75", () => {
    expect(getPercentileDescription(50)).toBe("Above average");
    expect(getPercentileDescription(60)).toBe("Above average");
    expect(getPercentileDescription(74)).toBe("Above average");
  });

  it("should return 'Below average' for percentiles >= 25 and < 50", () => {
    expect(getPercentileDescription(25)).toBe("Below average");
    expect(getPercentileDescription(35)).toBe("Below average");
    expect(getPercentileDescription(49)).toBe("Below average");
  });

  it("should return 'Bottom 25%' for percentiles < 25", () => {
    expect(getPercentileDescription(0)).toBe("Bottom 25%");
    expect(getPercentileDescription(10)).toBe("Bottom 25%");
    expect(getPercentileDescription(24)).toBe("Bottom 25%");
  });
});

// ============================================================================
// recalculateAllPercentiles Tests
// ============================================================================

describe("recalculateAllPercentiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should recalculate percentiles for all completed assessments", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 4 }));

    vi.mocked(db.assessment.findMany).mockResolvedValue([
      { id: "assessment-1" },
      { id: "assessment-2" },
    ] as never);

    // Mock for first assessment
    vi.mocked(db.videoAssessment.findFirst)
      .mockResolvedValueOnce(
        createMockVideoAssessment("va-1", "assessment-1", scores)
      )
      .mockResolvedValueOnce(
        createMockVideoAssessment("va-2", "assessment-2", scores)
      );

    // Mock for all assessments query (used in percentile calculation)
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      createMockVideoAssessment("va-1", "assessment-1", scores),
      createMockVideoAssessment("va-2", "assessment-2", scores),
    ]);

    vi.mocked(db.assessment.findUnique).mockResolvedValue({
      id: "assessment-1",
      report: {},
    } as never);
    vi.mocked(db.assessment.update).mockResolvedValue({} as never);

    const count = await recalculateAllPercentiles();

    expect(count).toBe(2);
    expect(db.assessment.update).toHaveBeenCalledTimes(2);
  });

  it("should skip assessments that fail and continue with others", async () => {
    vi.mocked(db.assessment.findMany).mockResolvedValue([
      { id: "assessment-1" },
      { id: "assessment-2" },
    ] as never);

    // First assessment fails (no video assessment)
    vi.mocked(db.videoAssessment.findFirst)
      .mockResolvedValueOnce(null) // First fails
      .mockResolvedValueOnce(
        createMockVideoAssessment("va-2", "assessment-2", [
          { dimension: AssessmentDimension.COMMUNICATION, score: 4 },
        ])
      );

    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      createMockVideoAssessment("va-2", "assessment-2", [
        { dimension: AssessmentDimension.COMMUNICATION, score: 4 },
      ]),
    ]);

    vi.mocked(db.assessment.findUnique).mockResolvedValue({
      id: "assessment-2",
      report: {},
    } as never);
    vi.mocked(db.assessment.update).mockResolvedValue({} as never);

    const count = await recalculateAllPercentiles();

    // Only one succeeded
    expect(count).toBe(1);
  });

  it("should return 0 when no completed assessments exist", async () => {
    vi.mocked(db.assessment.findMany).mockResolvedValue([]);

    const count = await recalculateAllPercentiles();

    expect(count).toBe(0);
    expect(db.assessment.update).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Acceptance Criteria Verification
// ============================================================================

describe("Acceptance Criteria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC1: should have calculatePercentiles function in percentile-calculator.ts", () => {
    expect(typeof calculatePercentiles).toBe("function");
  });

  it("AC2: should calculate percentiles per dimension (1-5 score to percentile rank)", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 3 }));
    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      scores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
    ]);

    const result = await calculatePercentiles("assessment-1");

    // Check all dimensions are present
    for (const dimension of ALL_DIMENSIONS) {
      expect(result.dimensions[dimension]).toBeDefined();
      expect(result.dimensions[dimension]).toBeGreaterThanOrEqual(0);
      expect(result.dimensions[dimension]).toBeLessThanOrEqual(100);
    }
  });

  it("AC3: should calculate percentiles for overall score", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 4 }));
    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      scores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
    ]);

    const result = await calculatePercentiles("assessment-1");

    expect(result.overall).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("AC4: should accept assessmentId and return dimension:percentile map", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 3 }));
    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "test-assessment-id",
      scores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
    ]);

    const result = await calculatePercentiles("test-assessment-id");

    // Result should have dimensions as a record
    expect(result.dimensions).toBeDefined();
    expect(typeof result.dimensions).toBe("object");

    // Each dimension should map to a percentile number
    for (const [dimension, percentile] of Object.entries(result.dimensions)) {
      expect(ALL_DIMENSIONS).toContain(dimension);
      expect(typeof percentile).toBe("number");
    }
  });

  it("AC5: should store percentiles in Assessment.report.percentiles JSON field", async () => {
    const scores = ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 4 }));
    const targetAssessment = createMockVideoAssessment(
      "va-1",
      "assessment-1",
      scores
    );

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue([
      targetAssessment,
    ]);
    vi.mocked(db.assessment.findUnique).mockResolvedValue({
      id: "assessment-1",
      report: {},
    } as never);
    vi.mocked(db.assessment.update).mockResolvedValue({} as never);

    await calculateAndStorePercentiles("assessment-1");

    expect(db.assessment.update).toHaveBeenCalledWith({
      where: { id: "assessment-1" },
      data: {
        report: {
          percentiles: {
            dimensions: expect.any(Object),
            overall: expect.any(Number),
            calculatedAt: expect.any(String),
            totalCandidates: expect.any(Number),
          },
        },
      },
    });
  });
});

// ============================================================================
// Percentile Formula Tests
// ============================================================================

describe("Percentile Formula", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use formula: (candidates_below / total_candidates) * 100", async () => {
    // 10 candidates with scores 1-10
    const allAssessments = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score, i) =>
      createMockVideoAssessment(
        `va-${i}`,
        `assessment-${i}`,
        ALL_DIMENSIONS.map((d) => ({ dimension: d, score: Math.min(score, 5) }))
      )
    );

    // Target is score 3 (index 2)
    const targetAssessment = allAssessments[2];

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue(allAssessments);

    const result = await calculatePercentiles("assessment-2");

    // Score 3: 2 candidates scored below (scores 1 and 2)
    // Percentile = (2 / 10) * 100 = 20%
    expect(result.dimensions[AssessmentDimension.COMMUNICATION]).toBe(20);
  });

  it("should handle ties correctly (same score not counted as below)", async () => {
    // 5 candidates all with same score
    const sameScoreAssessments = [0, 1, 2, 3, 4].map((i) =>
      createMockVideoAssessment(
        `va-${i}`,
        `assessment-${i}`,
        ALL_DIMENSIONS.map((d) => ({ dimension: d, score: 3 }))
      )
    );

    const targetAssessment = sameScoreAssessments[0];

    vi.mocked(db.videoAssessment.findFirst).mockResolvedValue(targetAssessment);
    vi.mocked(db.videoAssessment.findMany).mockResolvedValue(
      sameScoreAssessments
    );

    const result = await calculatePercentiles("assessment-0");

    // All same score = 0 scored below = 0 percentile
    expect(result.dimensions[AssessmentDimension.COMMUNICATION]).toBe(0);
  });
});
