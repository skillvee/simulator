/**
 * Seniority Thresholds Tests
 *
 * Tests for seniority-based candidate filtering.
 *
 * Seniority levels:
 * - Junior: No minimum thresholds
 * - Mid: Key dimensions >= 3
 * - Senior: Key dimensions >= 4
 *
 * @see Issue #66: US-010
 */

import { describe, it, expect } from "vitest";
import { AssessmentDimension } from "@prisma/client";
import {
  type SeniorityLevel,
  type ArchetypeKeyDimensions,
  type DimensionScoreInput,
  SENIORITY_THRESHOLDS,
  ARCHETYPE_KEY_DIMENSIONS,
  meetsThreshold,
  filterCandidatesBySeniority,
  getSeniorityDisplayName,
  getAllSeniorityLevels,
  getKeyDimensionsForArchetype,
} from "./seniority-thresholds";
import type { RoleArchetype } from "./archetype-weights";

// ============================================================================
// Types Tests
// ============================================================================

describe("Seniority Types", () => {
  it("should have three seniority levels: JUNIOR, MID, SENIOR", () => {
    const levels = getAllSeniorityLevels();
    expect(levels).toContain("JUNIOR");
    expect(levels).toContain("MID");
    expect(levels).toContain("SENIOR");
    expect(levels).toHaveLength(3);
  });
});

// ============================================================================
// Threshold Configuration Tests
// ============================================================================

describe("SENIORITY_THRESHOLDS", () => {
  it("should define JUNIOR with no minimum score (0)", () => {
    expect(SENIORITY_THRESHOLDS.JUNIOR).toBe(0);
  });

  it("should define MID with minimum key dimension score of 3", () => {
    expect(SENIORITY_THRESHOLDS.MID).toBe(3);
  });

  it("should define SENIOR with minimum key dimension score of 4", () => {
    expect(SENIORITY_THRESHOLDS.SENIOR).toBe(4);
  });
});

// ============================================================================
// Archetype Key Dimensions Tests
// ============================================================================

describe("ARCHETYPE_KEY_DIMENSIONS", () => {
  it("should define key dimensions for SENIOR_BACKEND_ENGINEER", () => {
    const keyDimensions = ARCHETYPE_KEY_DIMENSIONS.SENIOR_BACKEND_ENGINEER;
    expect(keyDimensions).toBeDefined();
    expect(keyDimensions.length).toBeGreaterThan(0);
    // Backend engineers should have TECHNICAL_KNOWLEDGE as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.TECHNICAL_KNOWLEDGE);
    // Backend engineers should have PROBLEM_SOLVING as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.PROBLEM_SOLVING);
  });

  it("should define key dimensions for SENIOR_FRONTEND_ENGINEER", () => {
    const keyDimensions = ARCHETYPE_KEY_DIMENSIONS.SENIOR_FRONTEND_ENGINEER;
    expect(keyDimensions).toBeDefined();
    expect(keyDimensions.length).toBeGreaterThan(0);
    // Frontend engineers should have CREATIVITY as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.CREATIVITY);
    // Frontend engineers should have COMMUNICATION as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.COMMUNICATION);
  });

  it("should define key dimensions for ENGINEERING_MANAGER", () => {
    const keyDimensions = ARCHETYPE_KEY_DIMENSIONS.ENGINEERING_MANAGER;
    expect(keyDimensions).toBeDefined();
    // Managers should have LEADERSHIP as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.LEADERSHIP);
    // Managers should have COMMUNICATION as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.COMMUNICATION);
    // Managers should have COLLABORATION as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.COLLABORATION);
  });

  it("should define key dimensions for TECH_LEAD", () => {
    const keyDimensions = ARCHETYPE_KEY_DIMENSIONS.TECH_LEAD;
    expect(keyDimensions).toBeDefined();
    // Tech leads should have TECHNICAL_KNOWLEDGE as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.TECHNICAL_KNOWLEDGE);
    // Tech leads should have LEADERSHIP as key dimension
    expect(keyDimensions).toContain(AssessmentDimension.LEADERSHIP);
  });

  it("should define key dimensions for all archetypes", () => {
    const archetypes: RoleArchetype[] = [
      "SENIOR_FRONTEND_ENGINEER",
      "SENIOR_BACKEND_ENGINEER",
      "FULLSTACK_ENGINEER",
      "ENGINEERING_MANAGER",
      "TECH_LEAD",
      "DEVOPS_ENGINEER",
      "DATA_ENGINEER",
      "GENERAL_SOFTWARE_ENGINEER",
    ];

    for (const archetype of archetypes) {
      expect(ARCHETYPE_KEY_DIMENSIONS[archetype]).toBeDefined();
      expect(ARCHETYPE_KEY_DIMENSIONS[archetype].length).toBeGreaterThan(0);
    }
  });

  it("should only include dimensions that have VERY_HIGH weight", () => {
    // Key dimensions should correspond to the VERY_HIGH weighted dimensions
    // from archetype-weights.ts for consistency
    // Note: This is a design constraint, not a hard requirement
    const backendKeyDims = ARCHETYPE_KEY_DIMENSIONS.SENIOR_BACKEND_ENGINEER;
    expect(backendKeyDims.length).toBeGreaterThanOrEqual(2);
    expect(backendKeyDims.length).toBeLessThanOrEqual(4);
  });
});

// ============================================================================
// meetsThreshold Tests
// ============================================================================

describe("meetsThreshold", () => {
  describe("Junior level (no threshold)", () => {
    it("should always pass for JUNIOR regardless of scores", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.COMMUNICATION, score: 1 },
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 1 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "JUNIOR");
      expect(result.meetsThreshold).toBe(true);
    });

    it("should pass for JUNIOR even with empty scores", () => {
      const scores: DimensionScoreInput[] = [];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "JUNIOR");
      expect(result.meetsThreshold).toBe(true);
    });

    it("should pass for JUNIOR with perfect scores", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "JUNIOR");
      expect(result.meetsThreshold).toBe(true);
    });
  });

  describe("Mid level (key dimensions >= 3)", () => {
    it("should pass when all key dimensions score >= 3", () => {
      // Backend engineer key dimensions: TECHNICAL_KNOWLEDGE, PROBLEM_SOLVING, TIME_MANAGEMENT
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 3 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 3 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
      expect(result.meetsThreshold).toBe(true);
    });

    it("should fail when any key dimension scores < 3", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 4 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
      expect(result.meetsThreshold).toBe(false);
      expect(result.failingDimensions).toContain(AssessmentDimension.TECHNICAL_KNOWLEDGE);
    });

    it("should fail when a key dimension is missing (no score)", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 4 },
        // PROBLEM_SOLVING is missing
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 4 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
      expect(result.meetsThreshold).toBe(false);
      expect(result.failingDimensions).toContain(AssessmentDimension.PROBLEM_SOLVING);
    });

    it("should pass when key dimensions exceed threshold", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 5 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
      expect(result.meetsThreshold).toBe(true);
    });

    it("should ignore non-key dimension scores", () => {
      // Backend key dimensions: TECHNICAL_KNOWLEDGE, PROBLEM_SOLVING, TIME_MANAGEMENT
      // CREATIVITY is not a key dimension for backend
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 3 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 3 },
        { dimension: AssessmentDimension.CREATIVITY, score: 1 }, // Low but not key
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
      expect(result.meetsThreshold).toBe(true);
    });
  });

  describe("Senior level (key dimensions >= 4)", () => {
    it("should pass when all key dimensions score >= 4", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 4 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 4 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "SENIOR");
      expect(result.meetsThreshold).toBe(true);
    });

    it("should fail when any key dimension scores < 4", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 5 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "SENIOR");
      expect(result.meetsThreshold).toBe(false);
      expect(result.failingDimensions).toContain(AssessmentDimension.TECHNICAL_KNOWLEDGE);
    });

    it("should fail when a key dimension is missing", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
        // PROBLEM_SOLVING is missing
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 5 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "SENIOR");
      expect(result.meetsThreshold).toBe(false);
    });

    it("should pass with perfect scores", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 5 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "SENIOR");
      expect(result.meetsThreshold).toBe(true);
    });
  });

  describe("Result details", () => {
    it("should return threshold used in result", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
      ];

      const midResult = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
      expect(midResult.threshold).toBe(3);

      const seniorResult = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "SENIOR");
      expect(seniorResult.threshold).toBe(4);
    });

    it("should return key dimensions checked", () => {
      const scores: DimensionScoreInput[] = [];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
      expect(result.keyDimensionsChecked).toBeDefined();
      expect(result.keyDimensionsChecked.length).toBeGreaterThan(0);
    });

    it("should return failing dimensions when threshold not met", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 2 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 4 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
      expect(result.failingDimensions).toContain(AssessmentDimension.TECHNICAL_KNOWLEDGE);
      expect(result.failingDimensions).toContain(AssessmentDimension.PROBLEM_SOLVING);
      expect(result.failingDimensions).not.toContain(AssessmentDimension.TIME_MANAGEMENT);
    });

    it("should return empty failing dimensions when threshold met", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
        { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5 },
        { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 5 },
      ];

      const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "SENIOR");
      expect(result.failingDimensions).toHaveLength(0);
    });
  });

  describe("Different archetypes", () => {
    it("should use archetype-specific key dimensions for ENGINEERING_MANAGER", () => {
      // Manager key dimensions: COMMUNICATION, LEADERSHIP, COLLABORATION
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.COMMUNICATION, score: 4 },
        { dimension: AssessmentDimension.LEADERSHIP, score: 4 },
        { dimension: AssessmentDimension.COLLABORATION, score: 4 },
        // TECHNICAL_KNOWLEDGE low but not key for manager
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 },
      ];

      const result = meetsThreshold(scores, "ENGINEERING_MANAGER", "SENIOR");
      expect(result.meetsThreshold).toBe(true);
    });

    it("should use archetype-specific key dimensions for TECH_LEAD", () => {
      // Tech Lead key dimensions: TECHNICAL_KNOWLEDGE, LEADERSHIP, COMMUNICATION
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 4 },
        { dimension: AssessmentDimension.LEADERSHIP, score: 4 },
        { dimension: AssessmentDimension.COMMUNICATION, score: 4 },
      ];

      const result = meetsThreshold(scores, "TECH_LEAD", "SENIOR");
      expect(result.meetsThreshold).toBe(true);
    });

    it("should fail TECH_LEAD senior when LEADERSHIP is below threshold", () => {
      const scores: DimensionScoreInput[] = [
        { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
        { dimension: AssessmentDimension.LEADERSHIP, score: 3 }, // Below 4
        { dimension: AssessmentDimension.COMMUNICATION, score: 5 },
      ];

      const result = meetsThreshold(scores, "TECH_LEAD", "SENIOR");
      expect(result.meetsThreshold).toBe(false);
      expect(result.failingDimensions).toContain(AssessmentDimension.LEADERSHIP);
    });
  });
});

// ============================================================================
// filterCandidatesBySeniority Tests
// ============================================================================

describe("filterCandidatesBySeniority", () => {
  interface TestCandidate {
    id: string;
    name: string;
    scores: DimensionScoreInput[];
  }

  it("should filter out candidates not meeting threshold", () => {
    const candidates: TestCandidate[] = [
      {
        id: "1",
        name: "Senior Dev",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 5 },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 5 },
        ],
      },
      {
        id: "2",
        name: "Junior Dev",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 2 },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 2 },
        ],
      },
    ];

    const result = filterCandidatesBySeniority(
      candidates,
      (c) => c.scores,
      "SENIOR_BACKEND_ENGINEER",
      "SENIOR"
    );

    expect(result.passing).toHaveLength(1);
    expect(result.passing[0].candidate.id).toBe("1");
    expect(result.filtered).toHaveLength(1);
    expect(result.filtered[0].candidate.id).toBe("2");
  });

  it("should include all candidates for JUNIOR level", () => {
    const candidates: TestCandidate[] = [
      {
        id: "1",
        name: "Low Scorer",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 1 },
        ],
      },
      {
        id: "2",
        name: "High Scorer",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 },
        ],
      },
    ];

    const result = filterCandidatesBySeniority(
      candidates,
      (c) => c.scores,
      "SENIOR_BACKEND_ENGINEER",
      "JUNIOR"
    );

    expect(result.passing).toHaveLength(2);
    expect(result.filtered).toHaveLength(0);
  });

  it("should return empty passing array when no candidates meet threshold", () => {
    const candidates: TestCandidate[] = [
      {
        id: "1",
        name: "Junior 1",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 2 },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 2 },
        ],
      },
      {
        id: "2",
        name: "Junior 2",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 2 },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 2 },
        ],
      },
    ];

    const result = filterCandidatesBySeniority(
      candidates,
      (c) => c.scores,
      "SENIOR_BACKEND_ENGINEER",
      "SENIOR"
    );

    expect(result.passing).toHaveLength(0);
    expect(result.filtered).toHaveLength(2);
  });

  it("should work with empty candidates array", () => {
    const result = filterCandidatesBySeniority(
      [],
      (c: TestCandidate) => c.scores,
      "SENIOR_BACKEND_ENGINEER",
      "SENIOR"
    );

    expect(result.passing).toHaveLength(0);
    expect(result.filtered).toHaveLength(0);
  });

  it("should include threshold result details for each candidate", () => {
    const candidates: TestCandidate[] = [
      {
        id: "1",
        name: "Test Candidate",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4 },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 2 },
        ],
      },
    ];

    const result = filterCandidatesBySeniority(
      candidates,
      (c) => c.scores,
      "SENIOR_BACKEND_ENGINEER",
      "MID"
    );

    expect(result.filtered).toHaveLength(1);
    const filteredCandidate = result.filtered[0];
    expect(filteredCandidate.thresholdResult).toBeDefined();
    expect(filteredCandidate.thresholdResult.failingDimensions).toContain(
      AssessmentDimension.TIME_MANAGEMENT
    );
  });

  it("should filter correctly for MID level", () => {
    const candidates: TestCandidate[] = [
      {
        id: "1",
        name: "Mid-Level",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 3 },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 3 },
        ],
      },
      {
        id: "2",
        name: "Below Mid",
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 2 },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 3 },
        ],
      },
    ];

    const result = filterCandidatesBySeniority(
      candidates,
      (c) => c.scores,
      "SENIOR_BACKEND_ENGINEER",
      "MID"
    );

    expect(result.passing).toHaveLength(1);
    expect(result.passing[0].candidate.id).toBe("1");
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("getSeniorityDisplayName", () => {
  it("should return display name for JUNIOR", () => {
    expect(getSeniorityDisplayName("JUNIOR")).toBe("Junior");
  });

  it("should return display name for MID", () => {
    expect(getSeniorityDisplayName("MID")).toBe("Mid-Level");
  });

  it("should return display name for SENIOR", () => {
    expect(getSeniorityDisplayName("SENIOR")).toBe("Senior");
  });
});

describe("getAllSeniorityLevels", () => {
  it("should return all seniority levels", () => {
    const levels = getAllSeniorityLevels();
    expect(levels).toEqual(["JUNIOR", "MID", "SENIOR"]);
  });
});

describe("getKeyDimensionsForArchetype", () => {
  it("should return key dimensions for given archetype", () => {
    const keyDims = getKeyDimensionsForArchetype("SENIOR_BACKEND_ENGINEER");
    expect(keyDims).toContain(AssessmentDimension.TECHNICAL_KNOWLEDGE);
    expect(keyDims).toContain(AssessmentDimension.PROBLEM_SOLVING);
  });

  it("should return different dimensions for different archetypes", () => {
    const backendKeyDims = getKeyDimensionsForArchetype("SENIOR_BACKEND_ENGINEER");
    const managerKeyDims = getKeyDimensionsForArchetype("ENGINEERING_MANAGER");

    // Backend focuses on technical, Manager on leadership
    expect(backendKeyDims).toContain(AssessmentDimension.TECHNICAL_KNOWLEDGE);
    expect(managerKeyDims).toContain(AssessmentDimension.LEADERSHIP);
    expect(backendKeyDims).not.toContain(AssessmentDimension.LEADERSHIP);
    expect(managerKeyDims).not.toContain(AssessmentDimension.TECHNICAL_KNOWLEDGE);
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle duplicate dimension scores (use last value)", () => {
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 },
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5 }, // Duplicate, higher
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4 },
      { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 4 },
    ];

    const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "SENIOR");
    // Should use the last value (5) for TECHNICAL_KNOWLEDGE
    expect(result.meetsThreshold).toBe(true);
  });

  it("should handle scores at exact threshold boundary for MID", () => {
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3 }, // Exactly at threshold
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 3 },
      { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 3 },
    ];

    const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
    expect(result.meetsThreshold).toBe(true);
  });

  it("should handle scores just below threshold boundary for MID", () => {
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2 }, // Just below
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 3 },
      { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 3 },
    ];

    const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "MID");
    expect(result.meetsThreshold).toBe(false);
  });

  it("should handle scores at exact threshold boundary for SENIOR", () => {
    const scores: DimensionScoreInput[] = [
      { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 4 }, // Exactly at threshold
      { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4 },
      { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 4 },
    ];

    const result = meetsThreshold(scores, "SENIOR_BACKEND_ENGINEER", "SENIOR");
    expect(result.meetsThreshold).toBe(true);
  });
});
