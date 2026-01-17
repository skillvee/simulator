/**
 * Tests for Archetype Weight Configurations
 *
 * @since 2026-01-16
 * @see Issue #65: US-009
 */

import { describe, it, expect } from "vitest";
import { AssessmentDimension } from "@prisma/client";
import {
  WEIGHT_MULTIPLIERS,
  ARCHETYPE_CONFIGS,
  calculateFitScore,
  calculateFitScoresForMultipleArchetypes,
  getWeightForDimension,
  getWeightLevelForDimension,
  getArchetypeDisplayName,
  getAllArchetypes,
  type RoleArchetype,
  type DimensionScoreInput,
} from "./archetype-weights";

// ============================================================================
// Weight Multiplier Tests
// ============================================================================

describe("WEIGHT_MULTIPLIERS", () => {
  it("should have correct values for each level", () => {
    expect(WEIGHT_MULTIPLIERS.VERY_HIGH).toBe(1.5);
    expect(WEIGHT_MULTIPLIERS.HIGH).toBe(1.25);
    expect(WEIGHT_MULTIPLIERS.MEDIUM).toBe(1.0);
  });
});

// ============================================================================
// Archetype Configuration Tests
// ============================================================================

describe("ARCHETYPE_CONFIGS", () => {
  it("should have configurations for all 8 archetypes", () => {
    const archetypes = Object.keys(ARCHETYPE_CONFIGS);
    expect(archetypes).toHaveLength(8);
    expect(archetypes).toContain("SENIOR_FRONTEND_ENGINEER");
    expect(archetypes).toContain("SENIOR_BACKEND_ENGINEER");
    expect(archetypes).toContain("FULLSTACK_ENGINEER");
    expect(archetypes).toContain("ENGINEERING_MANAGER");
    expect(archetypes).toContain("TECH_LEAD");
    expect(archetypes).toContain("DEVOPS_ENGINEER");
    expect(archetypes).toContain("DATA_ENGINEER");
    expect(archetypes).toContain("GENERAL_SOFTWARE_ENGINEER");
  });

  it("should have all 8 dimensions defined for each archetype", () => {
    const allDimensions = Object.values(AssessmentDimension);
    expect(allDimensions).toHaveLength(8);

    for (const archetype of Object.keys(ARCHETYPE_CONFIGS) as RoleArchetype[]) {
      const weights = ARCHETYPE_CONFIGS[archetype];
      const configuredDimensions = Object.keys(weights);
      expect(configuredDimensions).toHaveLength(8);

      for (const dimension of allDimensions) {
        expect(weights[dimension]).toBeDefined();
        expect(["VERY_HIGH", "HIGH", "MEDIUM"]).toContain(weights[dimension]);
      }
    }
  });

  it("should have valid weight levels only", () => {
    const validLevels = ["VERY_HIGH", "HIGH", "MEDIUM"];

    for (const archetype of Object.keys(ARCHETYPE_CONFIGS) as RoleArchetype[]) {
      const weights = ARCHETYPE_CONFIGS[archetype];
      for (const dimension of Object.values(AssessmentDimension)) {
        expect(validLevels).toContain(weights[dimension]);
      }
    }
  });

  describe("SENIOR_FRONTEND_ENGINEER", () => {
    const weights = ARCHETYPE_CONFIGS.SENIOR_FRONTEND_ENGINEER;

    it("should prioritize communication, creativity, and technical knowledge", () => {
      expect(weights[AssessmentDimension.COMMUNICATION]).toBe("VERY_HIGH");
      expect(weights[AssessmentDimension.CREATIVITY]).toBe("VERY_HIGH");
      expect(weights[AssessmentDimension.TECHNICAL_KNOWLEDGE]).toBe("VERY_HIGH");
    });

    it("should have high weight for problem solving and collaboration", () => {
      expect(weights[AssessmentDimension.PROBLEM_SOLVING]).toBe("HIGH");
      expect(weights[AssessmentDimension.COLLABORATION]).toBe("HIGH");
    });
  });

  describe("ENGINEERING_MANAGER", () => {
    const weights = ARCHETYPE_CONFIGS.ENGINEERING_MANAGER;

    it("should prioritize communication, leadership, and collaboration", () => {
      expect(weights[AssessmentDimension.COMMUNICATION]).toBe("VERY_HIGH");
      expect(weights[AssessmentDimension.LEADERSHIP]).toBe("VERY_HIGH");
      expect(weights[AssessmentDimension.COLLABORATION]).toBe("VERY_HIGH");
    });

    it("should have medium weight for technical knowledge", () => {
      expect(weights[AssessmentDimension.TECHNICAL_KNOWLEDGE]).toBe("MEDIUM");
    });
  });
});

// ============================================================================
// calculateFitScore Tests
// ============================================================================

describe("calculateFitScore", () => {
  it("should calculate fit score for perfect scores (all 5s)", () => {
    const perfectScores: DimensionScoreInput[] = Object.values(AssessmentDimension).map(
      (dimension) => ({
        dimension,
        score: 5,
      })
    );

    const result = calculateFitScore(perfectScores, "GENERAL_SOFTWARE_ENGINEER");

    // Perfect scores should give 100%
    expect(result.fitScore).toBe(100);
    expect(result.archetype).toBe("GENERAL_SOFTWARE_ENGINEER");
    expect(result.breakdown).toHaveLength(8);
  });

  it("should calculate fit score for minimum scores (all 1s)", () => {
    const minScores: DimensionScoreInput[] = Object.values(AssessmentDimension).map(
      (dimension) => ({
        dimension,
        score: 1,
      })
    );

    const result = calculateFitScore(minScores, "GENERAL_SOFTWARE_ENGINEER");

    // Minimum scores should give 20% (1/5)
    expect(result.fitScore).toBe(20);
  });

  it("should calculate fit score for average scores (all 3s)", () => {
    const avgScores: DimensionScoreInput[] = Object.values(AssessmentDimension).map(
      (dimension) => ({
        dimension,
        score: 3,
      })
    );

    const result = calculateFitScore(avgScores, "GENERAL_SOFTWARE_ENGINEER");

    // Average scores should give 60% (3/5)
    expect(result.fitScore).toBe(60);
  });

  it("should apply different weights correctly", () => {
    // Test with ENGINEERING_MANAGER archetype where:
    // - Communication, Leadership, Collaboration are VERY_HIGH (1.5x)
    // - Problem Solving, Time Management, Adaptability are HIGH (1.25x)
    // - Technical Knowledge, Creativity are MEDIUM (1.0x)
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 5 },
      { dimension: AssessmentDimension.LEADERSHIP, score: 5 },
      { dimension: AssessmentDimension.COLLABORATION, score: 5 },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 1 },
      { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 1 },
      { dimension: AssessmentDimension.ADAPTABILITY, score: 1 },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 1 },
      { dimension: AssessmentDimension.CREATIVITY, score: 1 },
    ];

    const result = calculateFitScore(scores, "ENGINEERING_MANAGER");

    // Calculate expected:
    // VERY_HIGH dimensions (3): 5 * 1.5 = 7.5 each = 22.5 total
    // HIGH dimensions (3): 1 * 1.25 = 1.25 each = 3.75 total
    // MEDIUM dimensions (2): 1 * 1.0 = 1 each = 2 total
    // Weighted sum = 22.5 + 3.75 + 2 = 28.25
    //
    // Max possible:
    // VERY_HIGH: 5 * 1.5 * 3 = 22.5
    // HIGH: 5 * 1.25 * 3 = 18.75
    // MEDIUM: 5 * 1.0 * 2 = 10
    // Max = 51.25
    //
    // Fit score = (28.25 / 51.25) * 100 = 55.12...

    expect(result.fitScore).toBeCloseTo(55.1, 0);
    expect(result.weightedSum).toBeCloseTo(28.25, 1);
    expect(result.maxPossible).toBeCloseTo(51.25, 1);
  });

  it("should return breakdown for each dimension", () => {
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 4 },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
    ];

    const result = calculateFitScore(scores, "GENERAL_SOFTWARE_ENGINEER");

    expect(result.breakdown).toHaveLength(8); // All dimensions in breakdown

    const commBreakdown = result.breakdown.find(
      (b) => b.dimension === AssessmentDimension.COMMUNICATION
    );
    expect(commBreakdown).toBeDefined();
    expect(commBreakdown!.rawScore).toBe(4);
    expect(commBreakdown!.weight).toBe(1.25); // HIGH for GENERAL_SOFTWARE_ENGINEER
    expect(commBreakdown!.weightedScore).toBe(5);

    const techBreakdown = result.breakdown.find(
      (b) => b.dimension === AssessmentDimension.TECHNICAL_KNOWLEDGE
    );
    expect(techBreakdown).toBeDefined();
    expect(techBreakdown!.rawScore).toBe(3);
    expect(techBreakdown!.weight).toBe(1.5); // VERY_HIGH for GENERAL_SOFTWARE_ENGINEER
    expect(techBreakdown!.weightedScore).toBe(4.5);
  });

  it("should handle missing dimensions by using 0 score", () => {
    // Only provide one dimension
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 5 },
    ];

    const result = calculateFitScore(scores, "GENERAL_SOFTWARE_ENGINEER");

    // Should still calculate against max possible for all dimensions
    expect(result.breakdown).toHaveLength(8);

    const missingBreakdown = result.breakdown.find(
      (b) => b.dimension === AssessmentDimension.LEADERSHIP
    );
    expect(missingBreakdown).toBeDefined();
    expect(missingBreakdown!.rawScore).toBe(0);
    expect(missingBreakdown!.weightedScore).toBe(0);
  });

  it("should handle empty dimension scores", () => {
    const result = calculateFitScore([], "GENERAL_SOFTWARE_ENGINEER");

    expect(result.fitScore).toBe(0);
    expect(result.weightedSum).toBe(0);
    expect(result.maxPossible).toBeGreaterThan(0);
  });

  it("should normalize to 0-100 scale", () => {
    const scores: DimensionScoreInput[] = Object.values(AssessmentDimension).map(
      (dimension) => ({
        dimension,
        score: 3.5, // Non-integer score
      })
    );

    const result = calculateFitScore(scores, "GENERAL_SOFTWARE_ENGINEER");

    expect(result.fitScore).toBeGreaterThanOrEqual(0);
    expect(result.fitScore).toBeLessThanOrEqual(100);
    expect(result.fitScore).toBe(70); // 3.5/5 = 70%
  });

  it("should round fit score to one decimal place", () => {
    // Create scores that would give a non-round percentage
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 3 },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4 },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 },
    ];

    const result = calculateFitScore(scores, "ENGINEERING_MANAGER");

    // Check that fit score has at most 1 decimal place
    const decimalPlaces = (result.fitScore.toString().split(".")[1] || "").length;
    expect(decimalPlaces).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// calculateFitScoresForMultipleArchetypes Tests
// ============================================================================

describe("calculateFitScoresForMultipleArchetypes", () => {
  it("should calculate fit scores for all archetypes by default", () => {
    const scores: DimensionScoreInput[] = Object.values(AssessmentDimension).map(
      (dimension) => ({
        dimension,
        score: 4,
      })
    );

    const results = calculateFitScoresForMultipleArchetypes(scores);

    expect(results).toHaveLength(8); // All archetypes
  });

  it("should calculate fit scores for specified archetypes only", () => {
    const scores: DimensionScoreInput[] = Object.values(AssessmentDimension).map(
      (dimension) => ({
        dimension,
        score: 4,
      })
    );

    const results = calculateFitScoresForMultipleArchetypes(scores, [
      "SENIOR_FRONTEND_ENGINEER",
      "ENGINEERING_MANAGER",
    ]);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.archetype)).toContain("SENIOR_FRONTEND_ENGINEER");
    expect(results.map((r) => r.archetype)).toContain("ENGINEERING_MANAGER");
  });

  it("should sort results by fit score descending", () => {
    // Create scores that favor communication/leadership over technical
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 5 },
      { dimension: AssessmentDimension.LEADERSHIP, score: 5 },
      { dimension: AssessmentDimension.COLLABORATION, score: 5 },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 2 },
      { dimension: AssessmentDimension.CREATIVITY, score: 2 },
      { dimension: AssessmentDimension.ADAPTABILITY, score: 3 },
      { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 3 },
    ];

    const results = calculateFitScoresForMultipleArchetypes(scores);

    // Results should be sorted descending
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].fitScore).toBeGreaterThanOrEqual(results[i + 1].fitScore);
    }

    // Engineering Manager should rank high due to communication/leadership/collaboration focus
    expect(results[0].archetype).toBe("ENGINEERING_MANAGER");
  });

  it("should return different scores for different archetypes", () => {
    // Create unbalanced scores
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5 },
      { dimension: AssessmentDimension.LEADERSHIP, score: 1 },
      { dimension: AssessmentDimension.COLLABORATION, score: 1 },
      { dimension: AssessmentDimension.COMMUNICATION, score: 2 },
      { dimension: AssessmentDimension.CREATIVITY, score: 3 },
      { dimension: AssessmentDimension.ADAPTABILITY, score: 4 },
      { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 4 },
    ];

    const results = calculateFitScoresForMultipleArchetypes(scores);
    const fitScores = results.map((r) => r.fitScore);

    // Not all should be the same score
    const uniqueScores = new Set(fitScores);
    expect(uniqueScores.size).toBeGreaterThan(1);
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("getWeightForDimension", () => {
  it("should return correct weight multiplier", () => {
    // ENGINEERING_MANAGER has VERY_HIGH (1.5) for Communication
    expect(getWeightForDimension("ENGINEERING_MANAGER", AssessmentDimension.COMMUNICATION)).toBe(
      1.5
    );

    // ENGINEERING_MANAGER has HIGH (1.25) for Problem Solving
    expect(getWeightForDimension("ENGINEERING_MANAGER", AssessmentDimension.PROBLEM_SOLVING)).toBe(
      1.25
    );

    // ENGINEERING_MANAGER has MEDIUM (1.0) for Technical Knowledge
    expect(
      getWeightForDimension("ENGINEERING_MANAGER", AssessmentDimension.TECHNICAL_KNOWLEDGE)
    ).toBe(1.0);
  });
});

describe("getWeightLevelForDimension", () => {
  it("should return correct weight level", () => {
    expect(
      getWeightLevelForDimension("SENIOR_FRONTEND_ENGINEER", AssessmentDimension.CREATIVITY)
    ).toBe("VERY_HIGH");

    expect(
      getWeightLevelForDimension("SENIOR_BACKEND_ENGINEER", AssessmentDimension.COLLABORATION)
    ).toBe("HIGH");

    expect(
      getWeightLevelForDimension("GENERAL_SOFTWARE_ENGINEER", AssessmentDimension.LEADERSHIP)
    ).toBe("MEDIUM");
  });
});

describe("getArchetypeDisplayName", () => {
  it("should return human-readable names for all archetypes", () => {
    expect(getArchetypeDisplayName("SENIOR_FRONTEND_ENGINEER")).toBe("Senior Frontend Engineer");
    expect(getArchetypeDisplayName("SENIOR_BACKEND_ENGINEER")).toBe("Senior Backend Engineer");
    expect(getArchetypeDisplayName("FULLSTACK_ENGINEER")).toBe("Fullstack Engineer");
    expect(getArchetypeDisplayName("ENGINEERING_MANAGER")).toBe("Engineering Manager");
    expect(getArchetypeDisplayName("TECH_LEAD")).toBe("Tech Lead");
    expect(getArchetypeDisplayName("DEVOPS_ENGINEER")).toBe("DevOps Engineer");
    expect(getArchetypeDisplayName("DATA_ENGINEER")).toBe("Data Engineer");
    expect(getArchetypeDisplayName("GENERAL_SOFTWARE_ENGINEER")).toBe("General Software Engineer");
  });
});

describe("getAllArchetypes", () => {
  it("should return all 8 archetypes", () => {
    const archetypes = getAllArchetypes();

    expect(archetypes).toHaveLength(8);
    expect(archetypes).toContain("SENIOR_FRONTEND_ENGINEER");
    expect(archetypes).toContain("SENIOR_BACKEND_ENGINEER");
    expect(archetypes).toContain("FULLSTACK_ENGINEER");
    expect(archetypes).toContain("ENGINEERING_MANAGER");
    expect(archetypes).toContain("TECH_LEAD");
    expect(archetypes).toContain("DEVOPS_ENGINEER");
    expect(archetypes).toContain("DATA_ENGINEER");
    expect(archetypes).toContain("GENERAL_SOFTWARE_ENGINEER");
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle scores at boundary values (1 and 5)", () => {
    const boundaryScores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 1 },
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5 },
    ];

    const result = calculateFitScore(boundaryScores, "GENERAL_SOFTWARE_ENGINEER");

    expect(result.fitScore).toBeGreaterThanOrEqual(0);
    expect(result.fitScore).toBeLessThanOrEqual(100);
  });

  it("should handle duplicate dimension scores (use last one)", () => {
    // If same dimension appears twice, Map will keep the last value
    const duplicateScores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 1 },
      { dimension: AssessmentDimension.COMMUNICATION, score: 5 },
    ];

    const result = calculateFitScore(duplicateScores, "GENERAL_SOFTWARE_ENGINEER");

    const commBreakdown = result.breakdown.find(
      (b) => b.dimension === AssessmentDimension.COMMUNICATION
    );
    expect(commBreakdown!.rawScore).toBe(5); // Last value wins
  });

  it("should produce consistent results for same input", () => {
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 4 },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
    ];

    const result1 = calculateFitScore(scores, "GENERAL_SOFTWARE_ENGINEER");
    const result2 = calculateFitScore(scores, "GENERAL_SOFTWARE_ENGINEER");

    expect(result1.fitScore).toBe(result2.fitScore);
    expect(result1.weightedSum).toBe(result2.weightedSum);
    expect(result1.maxPossible).toBe(result2.maxPossible);
  });
});

// ============================================================================
// Acceptance Criteria Verification
// ============================================================================

describe("Acceptance Criteria", () => {
  it("should define weight configurations for each archetype (AC1)", () => {
    const archetypes = getAllArchetypes();
    expect(archetypes.length).toBeGreaterThanOrEqual(1);

    for (const archetype of archetypes) {
      const config = ARCHETYPE_CONFIGS[archetype];
      expect(config).toBeDefined();
      expect(Object.keys(config)).toHaveLength(8); // All 8 dimensions
    }
  });

  it("should use correct weight multipliers: Very High (1.5x), High (1.25x), Medium (1.0x) (AC2)", () => {
    expect(WEIGHT_MULTIPLIERS.VERY_HIGH).toBe(1.5);
    expect(WEIGHT_MULTIPLIERS.HIGH).toBe(1.25);
    expect(WEIGHT_MULTIPLIERS.MEDIUM).toBe(1.0);
  });

  it("should calculate weighted fit score as sum of (dimension_score * weight) / max_possible (AC3)", () => {
    // Simple case: all scores = 4, all weights = 1.0 (MEDIUM)
    // But since different archetypes have different weights, let's verify formula:
    // For GENERAL_SOFTWARE_ENGINEER with all 4s:
    // - TECHNICAL_KNOWLEDGE, PROBLEM_SOLVING: VERY_HIGH (1.5)
    // - COMMUNICATION, COLLABORATION, TIME_MANAGEMENT, ADAPTABILITY: HIGH (1.25)
    // - LEADERSHIP, CREATIVITY: MEDIUM (1.0)

    const scores: DimensionScoreInput[] = Object.values(AssessmentDimension).map((d) => ({
      dimension: d,
      score: 4,
    }));

    const result = calculateFitScore(scores, "GENERAL_SOFTWARE_ENGINEER");

    // Weighted sum = 4 * (2*1.5 + 4*1.25 + 2*1.0) = 4 * (3 + 5 + 2) = 4 * 10 = 40
    // Max possible = 5 * (2*1.5 + 4*1.25 + 2*1.0) = 5 * 10 = 50
    // Fit score = 40/50 * 100 = 80%

    expect(result.fitScore).toBe(80);
    expect(result.weightedSum).toBe(40);
    expect(result.maxPossible).toBe(50);
  });

  it("should normalize fit score to 0-100 scale (AC4)", () => {
    // Test with various score combinations
    const testCases = [
      { scores: 1, expected: 20 }, // min
      { scores: 5, expected: 100 }, // max
      { scores: 3, expected: 60 }, // middle
    ];

    for (const tc of testCases) {
      const scores: DimensionScoreInput[] = Object.values(AssessmentDimension).map((d) => ({
        dimension: d,
        score: tc.scores,
      }));

      const result = calculateFitScore(scores, "GENERAL_SOFTWARE_ENGINEER");

      expect(result.fitScore).toBe(tc.expected);
      expect(result.fitScore).toBeGreaterThanOrEqual(0);
      expect(result.fitScore).toBeLessThanOrEqual(100);
    }
  });

  it("should apply weights dynamically at query time, never stored with assessment (AC5)", () => {
    // This test verifies the design: calculateFitScore is a pure function
    // that takes scores and an archetype, and returns a result.
    // The weights are not part of the DimensionScoreInput or any stored data.

    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.COMMUNICATION, score: 5 },
    ];

    // Same scores, different archetypes = different results
    const resultFrontend = calculateFitScore(scores, "SENIOR_FRONTEND_ENGINEER");
    const resultManager = calculateFitScore(scores, "ENGINEERING_MANAGER");

    // Both should use the same input scores but apply different weights
    expect(resultFrontend.breakdown[0]?.rawScore).toBe(5);
    expect(resultManager.breakdown[0]?.rawScore).toBe(5);

    // But the weighted calculation differs based on archetype
    // Both have COMMUNICATION as VERY_HIGH, so in this case they'd be the same
    // Let's check a dimension that differs
    const techScores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
    ];

    const techFrontend = calculateFitScore(techScores, "SENIOR_FRONTEND_ENGINEER");
    const techManager = calculateFitScore(techScores, "ENGINEERING_MANAGER");

    // Frontend: TECHNICAL_KNOWLEDGE is VERY_HIGH (1.5)
    // Manager: TECHNICAL_KNOWLEDGE is MEDIUM (1.0)
    // So same score but different weighted contribution

    const frontendTech = techFrontend.breakdown.find(
      (b) => b.dimension === AssessmentDimension.TECHNICAL_KNOWLEDGE
    );
    const managerTech = techManager.breakdown.find(
      (b) => b.dimension === AssessmentDimension.TECHNICAL_KNOWLEDGE
    );

    expect(frontendTech!.weightedScore).toBe(7.5); // 5 * 1.5
    expect(managerTech!.weightedScore).toBe(5); // 5 * 1.0

    // This demonstrates weights are applied at query time based on archetype,
    // not stored with the score data
  });
});
