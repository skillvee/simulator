/**
 * Tests for Candidate Search Service
 *
 * @since 2026-01-16
 * @see Issue #67: US-011
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentDimension, VideoAssessmentStatus } from "@prisma/client";

// Mock the embeddings module
vi.mock("@/lib/embeddings", () => ({
  generateQueryEmbedding: vi.fn(),
  buildQueryText: vi.fn(),
}));

// Mock the database
vi.mock("@/server/db", () => ({
  db: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    videoAssessment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Import after mocks
import { generateQueryEmbedding, buildQueryText } from "@/lib/embeddings";
import { db } from "@/server/db";
import {
  searchCandidates,
  calculateCombinedScore,
  getCandidatesWithEmbeddings,
  getEmbeddingStats,
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_RESULT_LIMIT,
  SEMANTIC_WEIGHT,
  FIT_SCORE_WEIGHT,
  type CandidateSearchCriteria,
} from "./candidate-search";

// Cast mocks for type-safe access
const mockGenerateQueryEmbedding = generateQueryEmbedding as ReturnType<typeof vi.fn>;
const mockBuildQueryText = buildQueryText as ReturnType<typeof vi.fn>;
const mockQueryRaw = db.$queryRaw as unknown as ReturnType<typeof vi.fn>;
const mockExecuteRaw = db.$executeRaw as unknown as ReturnType<typeof vi.fn>;
const mockDbVideoAssessment = db.videoAssessment as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

// ============================================================================
// Constants Tests
// ============================================================================

describe("Configuration Constants", () => {
  it("should have default similarity threshold of 0.3", () => {
    expect(DEFAULT_SIMILARITY_THRESHOLD).toBe(0.3);
  });

  it("should have default result limit of 20", () => {
    expect(DEFAULT_RESULT_LIMIT).toBe(20);
  });

  it("should have semantic weight of 0.4", () => {
    expect(SEMANTIC_WEIGHT).toBe(0.4);
  });

  it("should have fit score weight of 0.6", () => {
    expect(FIT_SCORE_WEIGHT).toBe(0.6);
  });

  it("should have weights that sum to 1", () => {
    expect(SEMANTIC_WEIGHT + FIT_SCORE_WEIGHT).toBe(1);
  });
});

// ============================================================================
// Combined Score Calculation Tests
// ============================================================================

describe("calculateCombinedScore", () => {
  it("should combine semantic similarity and fit score with weights", () => {
    // Semantic: 0.8 * 100 = 80, weighted: 80 * 0.4 = 32
    // Fit: 70, weighted: 70 * 0.6 = 42
    // Combined: 32 + 42 = 74
    const result = calculateCombinedScore(0.8, 70);
    expect(result).toBe(74);
  });

  it("should handle perfect scores", () => {
    // Semantic: 1.0 * 100 = 100, weighted: 100 * 0.4 = 40
    // Fit: 100, weighted: 100 * 0.6 = 60
    // Combined: 40 + 60 = 100
    const result = calculateCombinedScore(1.0, 100);
    expect(result).toBe(100);
  });

  it("should handle zero scores", () => {
    const result = calculateCombinedScore(0, 0);
    expect(result).toBe(0);
  });

  it("should round to 1 decimal place", () => {
    // Use values that would produce many decimal places
    const result = calculateCombinedScore(0.333, 66.666);
    expect(result.toString()).toMatch(/^\d+\.?\d?$/);
  });

  it("should prioritize fit score over semantic similarity", () => {
    // Two candidates with same total but different distributions
    // Candidate A: high semantic (0.9), low fit (50)
    // Candidate B: low semantic (0.5), high fit (80)
    const scoreA = calculateCombinedScore(0.9, 50);
    const scoreB = calculateCombinedScore(0.5, 80);

    // B should score higher due to higher fit score weight
    expect(scoreB).toBeGreaterThan(scoreA);
  });
});

// ============================================================================
// Search Candidates Tests
// ============================================================================

describe("searchCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty results when no semantic matches", async () => {
    const mockEmbedding = Array(768).fill(0.1);
    mockGenerateQueryEmbedding.mockResolvedValue(mockEmbedding);
    mockBuildQueryText.mockReturnValue("Test query");
    mockQueryRaw.mockResolvedValue([]);

    const criteria: CandidateSearchCriteria = {
      skills: ["TypeScript"],
      experienceDomains: ["frontend"],
      archetype: "SENIOR_FRONTEND_ENGINEER",
    };

    const result = await searchCandidates(criteria);

    expect(result.candidates).toHaveLength(0);
    expect(result.totalMatches).toBe(0);
    expect(result.queryText).toBe("Test query");
  });

  it("should filter and rank candidates correctly", async () => {
    const mockEmbedding = Array(768).fill(0.1);
    mockGenerateQueryEmbedding.mockResolvedValue(mockEmbedding);
    mockBuildQueryText.mockReturnValue("Search query");

    // Mock semantic search results
    mockQueryRaw.mockResolvedValue([
      { video_assessment_id: "va-1", similarity: 0.85 },
      { video_assessment_id: "va-2", similarity: 0.75 },
    ]);

    // Mock candidate data fetch
    mockDbVideoAssessment.findMany.mockResolvedValue([
      {
        id: "va-1",
        status: VideoAssessmentStatus.COMPLETED,
        candidate: { id: "user-1", name: "Alice", email: "alice@test.com" },
        scores: [
          { dimension: AssessmentDimension.COMMUNICATION, score: 4, observableBehaviors: "Good" },
          { dimension: AssessmentDimension.CREATIVITY, score: 5, observableBehaviors: "Excellent" },
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 4, observableBehaviors: "Strong" },
        ],
        summary: { overallSummary: "Strong frontend candidate" },
      },
      {
        id: "va-2",
        status: VideoAssessmentStatus.COMPLETED,
        candidate: { id: "user-2", name: "Bob", email: "bob@test.com" },
        scores: [
          { dimension: AssessmentDimension.COMMUNICATION, score: 3, observableBehaviors: "Average" },
          { dimension: AssessmentDimension.CREATIVITY, score: 4, observableBehaviors: "Good" },
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 3, observableBehaviors: "Moderate" },
        ],
        summary: { overallSummary: "Adequate frontend candidate" },
      },
    ]);

    const criteria: CandidateSearchCriteria = {
      skills: ["React", "TypeScript"],
      experienceDomains: ["frontend"],
      archetype: "SENIOR_FRONTEND_ENGINEER",
    };

    const result = await searchCandidates(criteria);

    expect(result.candidates).toHaveLength(2);
    expect(result.totalMatches).toBe(2);

    // First candidate should have higher combined score
    expect(result.candidates[0].candidateId).toBe("user-1");
    expect(result.candidates[0].semanticSimilarity).toBe(0.85);

    // Results should be sorted by combined score
    expect(result.candidates[0].combinedScore).toBeGreaterThanOrEqual(
      result.candidates[1].combinedScore
    );
  });

  it("should apply seniority threshold filtering", async () => {
    const mockEmbedding = Array(768).fill(0.1);
    mockGenerateQueryEmbedding.mockResolvedValue(mockEmbedding);
    mockBuildQueryText.mockReturnValue("Search query");

    // Mock semantic search with two matches
    mockQueryRaw.mockResolvedValue([
      { video_assessment_id: "va-1", similarity: 0.8 },
      { video_assessment_id: "va-2", similarity: 0.7 },
    ]);

    // Mock candidate data - one meets senior threshold, one doesn't
    mockDbVideoAssessment.findMany.mockResolvedValue([
      {
        id: "va-1",
        status: VideoAssessmentStatus.COMPLETED,
        candidate: { id: "user-1", name: "Senior Dev", email: "senior@test.com" },
        scores: [
          // High scores in key dimensions for SENIOR_BACKEND_ENGINEER (TECHNICAL, PROBLEM_SOLVING, TIME_MGMT)
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5, observableBehaviors: "Expert" },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4, observableBehaviors: "Strong" },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 4, observableBehaviors: "Good" },
        ],
        summary: { overallSummary: "Senior level engineer" },
      },
      {
        id: "va-2",
        status: VideoAssessmentStatus.COMPLETED,
        candidate: { id: "user-2", name: "Junior Dev", email: "junior@test.com" },
        scores: [
          // Low scores - won't meet senior threshold
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 2, observableBehaviors: "Basic" },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 2, observableBehaviors: "Needs work" },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 2, observableBehaviors: "Developing" },
        ],
        summary: { overallSummary: "Junior level engineer" },
      },
    ]);

    const criteria: CandidateSearchCriteria = {
      skills: ["Node.js"],
      experienceDomains: ["backend"],
      archetype: "SENIOR_BACKEND_ENGINEER",
      seniorityLevel: "SENIOR",
    };

    const result = await searchCandidates(criteria);

    // Only the senior candidate should pass threshold
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].candidateId).toBe("user-1");
  });

  it("should respect limit parameter", async () => {
    const mockEmbedding = Array(768).fill(0.1);
    mockGenerateQueryEmbedding.mockResolvedValue(mockEmbedding);
    mockBuildQueryText.mockReturnValue("Search query");

    // Mock multiple semantic matches
    mockQueryRaw.mockResolvedValue([
      { video_assessment_id: "va-1", similarity: 0.9 },
      { video_assessment_id: "va-2", similarity: 0.8 },
      { video_assessment_id: "va-3", similarity: 0.7 },
    ]);

    // Mock corresponding candidate data
    mockDbVideoAssessment.findMany.mockResolvedValue(
      ["va-1", "va-2", "va-3"].map((id, index) => ({
        id,
        status: VideoAssessmentStatus.COMPLETED,
        candidate: { id: `user-${index + 1}`, name: `User ${index + 1}`, email: `user${index + 1}@test.com` },
        scores: [
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 4, observableBehaviors: "Good" },
        ],
        summary: { overallSummary: `Candidate ${index + 1}` },
      }))
    );

    const criteria: CandidateSearchCriteria = {
      skills: ["Python"],
      experienceDomains: ["data"],
      archetype: "DATA_ENGINEER",
      limit: 2,
    };

    const result = await searchCandidates(criteria);

    expect(result.candidates).toHaveLength(2);
    expect(result.totalMatches).toBe(3);
  });

  it("should use default values for optional parameters", async () => {
    const mockEmbedding = Array(768).fill(0.1);
    mockGenerateQueryEmbedding.mockResolvedValue(mockEmbedding);
    mockBuildQueryText.mockReturnValue("Search query");
    mockQueryRaw.mockResolvedValue([]);

    const criteria: CandidateSearchCriteria = {
      skills: [],
      experienceDomains: [],
      archetype: "GENERAL_SOFTWARE_ENGINEER",
    };

    await searchCandidates(criteria);

    // Should have been called (parameters tested through mock verification)
    expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith([], [], undefined);
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("getCandidatesWithEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return video assessment IDs with embeddings", async () => {
    mockQueryRaw.mockResolvedValue([
      { videoAssessmentId: "va-1" },
      { videoAssessmentId: "va-2" },
    ]);

    const result = await getCandidatesWithEmbeddings();

    expect(result).toEqual(["va-1", "va-2"]);
  });

  it("should return empty array when no embeddings exist", async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await getCandidatesWithEmbeddings();

    expect(result).toEqual([]);
  });

  it("should filter by status", async () => {
    mockQueryRaw.mockResolvedValue([{ videoAssessmentId: "va-1" }]);

    await getCandidatesWithEmbeddings(VideoAssessmentStatus.COMPLETED);

    expect(mockQueryRaw).toHaveBeenCalled();
  });
});

describe("getEmbeddingStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return embedding statistics", async () => {
    mockExecuteRaw.mockResolvedValue(5); // 5 embeddings
    mockDbVideoAssessment.count.mockResolvedValue(10); // 10 completed assessments

    const result = await getEmbeddingStats();

    expect(result).toEqual({
      totalEmbeddings: 5,
      completedAssessments: 10,
      pendingEmbeddings: 5, // 10 - 5
    });
  });

  it("should handle zero counts", async () => {
    mockExecuteRaw.mockResolvedValue(0);
    mockDbVideoAssessment.count.mockResolvedValue(0);

    const result = await getEmbeddingStats();

    expect(result).toEqual({
      totalEmbeddings: 0,
      completedAssessments: 0,
      pendingEmbeddings: 0,
    });
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Search Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle complete search flow with archetype and seniority", async () => {
    const mockEmbedding = Array(768).fill(0.1);
    mockGenerateQueryEmbedding.mockResolvedValue(mockEmbedding);
    mockBuildQueryText.mockReturnValue("Frontend developer with React experience");

    mockQueryRaw.mockResolvedValue([
      { video_assessment_id: "va-1", similarity: 0.82 },
    ]);

    mockDbVideoAssessment.findMany.mockResolvedValue([
      {
        id: "va-1",
        status: VideoAssessmentStatus.COMPLETED,
        candidate: {
          id: "candidate-123",
          name: "Jane Developer",
          email: "jane@company.com",
        },
        scores: [
          { dimension: AssessmentDimension.COMMUNICATION, score: 4, observableBehaviors: "Articulate speaker" },
          { dimension: AssessmentDimension.CREATIVITY, score: 5, observableBehaviors: "Innovative solutions" },
          { dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE, score: 5, observableBehaviors: "Deep React expertise" },
          { dimension: AssessmentDimension.PROBLEM_SOLVING, score: 4, observableBehaviors: "Systematic approach" },
          { dimension: AssessmentDimension.COLLABORATION, score: 4, observableBehaviors: "Team player" },
          { dimension: AssessmentDimension.TIME_MANAGEMENT, score: 3, observableBehaviors: "Generally punctual" },
          { dimension: AssessmentDimension.ADAPTABILITY, score: 4, observableBehaviors: "Flexible" },
          { dimension: AssessmentDimension.LEADERSHIP, score: 3, observableBehaviors: "Emerging leader" },
        ],
        summary: {
          overallSummary: "Strong frontend developer with excellent React skills and creative problem-solving abilities.",
        },
      },
    ]);

    const criteria: CandidateSearchCriteria = {
      skills: ["React", "TypeScript", "CSS"],
      experienceDomains: ["frontend", "web-development"],
      archetype: "SENIOR_FRONTEND_ENGINEER",
      seniorityLevel: "SENIOR",
      additionalContext: "Building component libraries",
    };

    const result = await searchCandidates(criteria);

    expect(result.candidates).toHaveLength(1);

    const candidate = result.candidates[0];
    expect(candidate.candidateId).toBe("candidate-123");
    expect(candidate.candidateName).toBe("Jane Developer");
    expect(candidate.semanticSimilarity).toBe(0.82);
    expect(candidate.fitScore.archetype).toBe("SENIOR_FRONTEND_ENGINEER");
    expect(candidate.thresholdResult.meetsThreshold).toBe(true);
    expect(candidate.combinedScore).toBeGreaterThan(0);
    expect(candidate.dimensionScores).toHaveLength(8);
    expect(candidate.overallSummary).toContain("React skills");
  });
});
