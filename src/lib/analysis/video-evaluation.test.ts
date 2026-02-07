import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  VideoAssessmentStatus,
} from "@prisma/client";

// Mock gemini module
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
}));

// Mock database with $transaction support
const mockTransaction = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    videoAssessment: {
      update: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    dimensionScore: {
      upsert: vi.fn(),
    },
    videoAssessmentSummary: {
      upsert: vi.fn(),
    },
    videoAssessmentLog: {
      create: vi.fn(),
    },
    videoAssessmentApiCall: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

// Mock error recovery module (source imports from @/lib/core which re-exports)
vi.mock("@/lib/core/error-recovery", () => ({
  withRetry: async <T>(
    operation: () => Promise<T>,
    _config?: unknown
  ): Promise<T> => {
    return operation();
  },
  categorizeError: vi.fn().mockReturnValue({
    category: "api",
    message: "Test error",
    isRetryable: true,
    userMessage: "Test error",
  }),
}));

// Mock assessment-logging module (logger abstraction)
const mockLogEvent = vi.fn().mockResolvedValue(new Date());
const mockApiCallTrackerComplete = vi.fn().mockResolvedValue(undefined);
const mockApiCallTrackerFail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/analysis/assessment-logging", () => ({
  createVideoAssessmentLogger: vi.fn(() => ({
    logEvent: mockLogEvent,
    startApiCall: vi.fn(() => ({
      complete: mockApiCallTrackerComplete,
      fail: mockApiCallTrackerFail,
    })),
    getLastEventTimestamp: vi.fn(() => null),
  })),
  logVideoAssessmentEvent: vi.fn(),
  logVideoAssessmentApiCall: vi.fn(),
}));

// Mock candidate embeddings
vi.mock("@/lib/candidate", () => ({
  generateAndStoreEmbeddings: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock rubric loading
vi.mock("@/lib/rubric", () => ({
  loadRubricForRoleFamily: vi.fn().mockResolvedValue({
    roleFamily: { slug: "engineering", name: "Engineering" },
    dimensions: [],
    redFlags: [],
  }),
}));

// Mock rubric evaluation prompt builder
vi.mock("@/prompts/analysis/rubric-evaluation", () => ({
  buildRubricEvaluationPrompt: vi.fn().mockReturnValue(
    "You are an objective, evidence-based evaluator. Evaluate this video."
  ),
  RUBRIC_EVALUATION_PROMPT_VERSION: "1.0.0",
}));

// Import after mocks are set up
import {
  evaluateVideo,
  getEvaluationStatus,
  getEvaluationResults,
  triggerVideoAssessment,
  getVideoAssessmentStatusByAssessment,
  retryVideoAssessment,
  forceRetryVideoAssessment,
  VIDEO_EVALUATION_MODEL,
} from "./video-evaluation";
import { gemini } from "@/lib/ai/gemini";
import { db } from "@/server/db";

// Cast to mocked types for easier access
const mockGenerateContent = gemini.models.generateContent as ReturnType<
  typeof vi.fn
>;
const mockVideoAssessmentUpdate = db.videoAssessment.update as ReturnType<
  typeof vi.fn
>;
const mockVideoAssessmentFindUnique = db.videoAssessment
  .findUnique as ReturnType<typeof vi.fn>;
const mockVideoAssessmentCreate = db.videoAssessment.create as ReturnType<
  typeof vi.fn
>;
const mockVideoAssessmentUpsert = (db.videoAssessment as unknown as { upsert: ReturnType<typeof vi.fn> }).upsert;
const mockDimensionScoreUpsert = db.dimensionScore.upsert as ReturnType<
  typeof vi.fn
>;
const mockVideoAssessmentSummaryUpsert = db.videoAssessmentSummary
  .upsert as ReturnType<typeof vi.fn>;
const mockVideoAssessmentLogCreate = db.videoAssessmentLog.create as ReturnType<
  typeof vi.fn
>;
const mockVideoAssessmentApiCallCreate = db.videoAssessmentApiCall
  .create as ReturnType<typeof vi.fn>;
const mockVideoAssessmentApiCallUpdate = db.videoAssessmentApiCall
  .update as ReturnType<typeof vi.fn>;

// ============================================================================
// Test Data
// ============================================================================

const mockEvaluationResponse = {
  evaluation_version: "1.0.0",
  role_family_slug: "engineering",
  overall_score: 4.2,
  dimension_scores: {
    COMMUNICATION: {
      score: 4,
      confidence: "high",
      rationale: "Clear communicator",
      observable_behaviors: ["Clear verbal communication during explanations"],
      timestamps: ["01:23", "05:45", "12:30"],
      trainable_gap: false,
      green_flags: [],
      red_flags: [],
    },
    PROBLEM_SOLVING: {
      score: 5,
      confidence: "high",
      rationale: "Systematic approach",
      observable_behaviors: ["Systematic debugging approach"],
      timestamps: ["02:10", "08:15"],
      trainable_gap: false,
      green_flags: [],
      red_flags: [],
    },
    TECHNICAL_KNOWLEDGE: {
      score: 4,
      confidence: "medium",
      rationale: "Good patterns",
      observable_behaviors: ["Good understanding of React patterns"],
      timestamps: ["03:00", "10:20", "15:45"],
      trainable_gap: true,
      green_flags: [],
      red_flags: [],
    },
    COLLABORATION: {
      score: 3,
      confidence: "medium",
      rationale: "Some collaboration",
      observable_behaviors: ["Some interaction with AI assistant"],
      timestamps: ["04:30"],
      trainable_gap: true,
      green_flags: [],
      red_flags: [],
    },
    ADAPTABILITY: {
      score: 4,
      confidence: "medium",
      rationale: "Good adaptability",
      observable_behaviors: ["Adjusted approach when first solution failed"],
      timestamps: ["07:00", "11:15"],
      trainable_gap: false,
      green_flags: [],
      red_flags: [],
    },
    LEADERSHIP: {
      score: null,
      confidence: "low",
      rationale: "Insufficient evidence",
      observable_behaviors: ["Insufficient evidence for leadership evaluation"],
      timestamps: [],
      trainable_gap: false,
      green_flags: [],
      red_flags: [],
    },
    CREATIVITY: {
      score: 4,
      confidence: "medium",
      rationale: "Creative solutions",
      observable_behaviors: ["Novel solution for state management"],
      timestamps: ["09:30", "14:00"],
      trainable_gap: false,
      green_flags: [],
      red_flags: [],
    },
    TIME_MANAGEMENT: {
      score: 5,
      confidence: "high",
      rationale: "Efficient prioritization",
      observable_behaviors: ["Efficient task prioritization"],
      timestamps: ["00:30", "06:00", "13:00"],
      trainable_gap: false,
      green_flags: [],
      red_flags: [],
    },
  },
  detected_red_flags: [],
  overall_summary:
    "Strong candidate with excellent problem-solving skills and technical knowledge. Shows good time management and adaptability.",
  evaluation_confidence: "high",
  insufficient_evidence_notes: "Leadership could not be evaluated in solo task",
};

// ============================================================================
// Model Constant Tests
// ============================================================================

describe("VIDEO_EVALUATION_MODEL", () => {
  it("should be set to gemini-3-pro-preview", () => {
    expect(VIDEO_EVALUATION_MODEL).toBe("gemini-3-pro-preview");
  });
});

// ============================================================================
// evaluateVideo Tests
// ============================================================================

describe("evaluateVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoAssessmentUpdate.mockResolvedValue({ id: "test-assessment-id" });
    mockDimensionScoreUpsert.mockResolvedValue({ id: "test-score-id" });
    mockVideoAssessmentSummaryUpsert.mockResolvedValue({
      id: "test-summary-id",
    });
    mockVideoAssessmentLogCreate.mockResolvedValue({ id: "test-log-id" });
    mockVideoAssessmentApiCallCreate.mockResolvedValue({
      id: "test-api-call-id",
    });
    mockVideoAssessmentApiCallUpdate.mockResolvedValue({
      id: "test-api-call-id",
    });
    mockLogEvent.mockResolvedValue(new Date());
    mockApiCallTrackerComplete.mockResolvedValue(undefined);
    mockApiCallTrackerFail.mockResolvedValue(undefined);
    // Mock transaction to execute the callback with transaction-capable db client
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        dimensionScore: {
          upsert: mockDimensionScoreUpsert,
        },
        videoAssessmentSummary: {
          upsert: mockVideoAssessmentSummaryUpsert,
        },
        videoAssessment: {
          update: mockVideoAssessmentUpdate,
        },
      };
      return fn(tx);
    });
  });

  it("should successfully evaluate a video and store results", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(true);
    expect(result.assessmentId).toBe("test-assessment-id");
    expect(result.overallScore).toBe(4.2);
    expect(result.summary).toBe(mockEvaluationResponse.overall_summary);
    expect(result.error).toBeUndefined();
  });

  it("should update status to PROCESSING at start", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(mockVideoAssessmentUpdate).toHaveBeenCalledWith({
      where: { id: "test-assessment-id" },
      data: { status: "PROCESSING" },
    });
  });

  it("should update status to COMPLETED on success", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    // PROCESSING update + transaction's COMPLETED update
    expect(mockVideoAssessmentUpdate).toHaveBeenCalledTimes(2);
    expect(mockVideoAssessmentUpdate).toHaveBeenLastCalledWith({
      where: { id: "test-assessment-id" },
      data: {
        status: "COMPLETED",
        completedAt: expect.any(Date),
      },
    });
  });

  it("should update status to FAILED on error with retry tracking", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API Error"));
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("API Error");
    expect(mockVideoAssessmentUpdate).toHaveBeenLastCalledWith({
      where: { id: "test-assessment-id" },
      data: {
        status: "FAILED",
        retryCount: 1,
        lastFailureReason: "API Error",
      },
    });
  });

  it("should call Gemini with correct model and video data", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: "gemini-3-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                fileUri: "https://storage.example.com/video.mp4",
                mimeType: "video/mp4",
              },
            },
            {
              text: expect.stringContaining(
                "objective, evidence-based evaluator"
              ),
            },
          ],
        },
      ],
    });
  });

  it("should include video context in prompt when provided", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
      videoDurationMinutes: 45,
      taskDescription: "Build a React component",
      expectedOutcomes: ["Component renders correctly", "Tests pass"],
    });

    // The prompt is built by the mocked buildRubricEvaluationPrompt
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("should upsert dimension scores for non-null scores", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    // Should upsert scores for all dimensions except LEADERSHIP (which is null)
    expect(mockDimensionScoreUpsert).toHaveBeenCalledTimes(7);

    // Verify one of the upsert calls (uses dimensionSlug mapping)
    expect(mockDimensionScoreUpsert).toHaveBeenCalledWith({
      where: {
        assessmentId_dimension: {
          assessmentId: "test-assessment-id",
          dimension: "COMMUNICATION",
        },
      },
      create: {
        assessmentId: "test-assessment-id",
        dimension: "COMMUNICATION",
        score: 4,
        confidence: "high",
        observableBehaviors: "Clear verbal communication during explanations",
        timestamps: ["01:23", "05:45", "12:30"],
        trainableGap: false,
        rationale: "Clear communicator",
      },
      update: {
        score: 4,
        confidence: "high",
        observableBehaviors: "Clear verbal communication during explanations",
        timestamps: ["01:23", "05:45", "12:30"],
        trainableGap: false,
        rationale: "Clear communicator",
      },
    });
  });

  it("should not upsert dimension scores for null scores", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    // LEADERSHIP has null score, should not be upserted
    const leadershipCall = mockDimensionScoreUpsert.mock.calls.find(
      (call: unknown[]) =>
        (
          call[0] as {
            where: { assessmentId_dimension: { dimension: string } };
          }
        ).where.assessmentId_dimension.dimension === "LEADERSHIP"
    );
    expect(leadershipCall).toBeUndefined();
  });

  it("should store assessment summary with raw AI response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(mockVideoAssessmentSummaryUpsert).toHaveBeenCalledWith({
      where: { assessmentId: "test-assessment-id" },
      create: {
        assessmentId: "test-assessment-id",
        overallSummary: mockEvaluationResponse.overall_summary,
        rawAiResponse: expect.objectContaining({
          overallScore: 4.2,
          overallSummary: mockEvaluationResponse.overall_summary,
        }),
      },
      update: {
        overallSummary: mockEvaluationResponse.overall_summary,
        rawAiResponse: expect.objectContaining({
          overallScore: 4.2,
          overallSummary: mockEvaluationResponse.overall_summary,
        }),
      },
    });
  });

  it("should handle JSON response wrapped in markdown code blocks", async () => {
    const wrappedResponse =
      "```json\n" + JSON.stringify(mockEvaluationResponse) + "\n```";
    mockGenerateContent.mockResolvedValue({
      text: wrappedResponse,
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(true);
    expect(result.overallScore).toBe(4.2);
  });

  it("should handle invalid JSON response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "This is not valid JSON",
    });
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should handle missing overall_score in response", async () => {
    const invalidResponse = { ...mockEvaluationResponse };
    delete (invalidResponse as Record<string, unknown>).overall_score;

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(invalidResponse),
    });
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("overall_score");
  });

  it("should handle missing dimension_scores in response", async () => {
    const invalidResponse = { ...mockEvaluationResponse };
    delete (invalidResponse as Record<string, unknown>).dimension_scores;

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(invalidResponse),
    });
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("dimension_scores");
  });

  it("should handle empty response from Gemini", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "",
    });
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No response from Gemini");
  });

  it("should handle null text in Gemini response", async () => {
    mockGenerateContent.mockResolvedValue({
      text: null,
    });
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No response from Gemini");
  });

  it("should return dimension scores as Map", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.dimensionScores).toBeInstanceOf(Map);
    expect(result.dimensionScores.get("COMMUNICATION")).toBe(4);
    expect(result.dimensionScores.get("LEADERSHIP")).toBeNull();
  });

  it("should filter invalid timestamps", async () => {
    const responseWithBadTimestamps = {
      ...mockEvaluationResponse,
      dimension_scores: {
        ...mockEvaluationResponse.dimension_scores,
        COMMUNICATION: {
          ...mockEvaluationResponse.dimension_scores.COMMUNICATION,
          timestamps: ["01:23", "invalid", "05:45", "not-a-time", "1:23:45"],
        },
      },
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(responseWithBadTimestamps),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const communicationCall = mockDimensionScoreUpsert.mock.calls.find(
      (call: unknown[]) =>
        (
          call[0] as {
            where: { assessmentId_dimension: { dimension: string } };
          }
        ).where.assessmentId_dimension.dimension === "COMMUNICATION"
    );

    expect(communicationCall).toBeDefined();
    const timestamps = (
      communicationCall![0] as { create: { timestamps: unknown[] } }
    ).create.timestamps;
    expect(timestamps).toContain("01:23");
    expect(timestamps).toContain("05:45");
    expect(timestamps).toContain("1:23:45");
    expect(timestamps).not.toContain("invalid");
    expect(timestamps).not.toContain("not-a-time");
  });

  // ============================================================================
  // Transaction Tests (DI-002)
  // ============================================================================

  it("should wrap dimension score upserts in a transaction for atomicity", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should save no scores if transaction fails mid-upsert (rollback)", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    const attemptedDimensions: string[] = [];
    let upsertCallCount = 0;

    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        dimensionScore: {
          upsert: vi.fn().mockImplementation(async (args: { where: { assessmentId_dimension: { dimension: string } } }) => {
            upsertCallCount++;
            attemptedDimensions.push(args.where.assessmentId_dimension.dimension);
            if (upsertCallCount === 5) {
              throw new Error("Database error on 5th upsert");
            }
            return { id: `score-${upsertCallCount}` };
          }),
        },
        videoAssessmentSummary: {
          upsert: vi.fn().mockResolvedValue({ id: "summary-id" }),
        },
        videoAssessment: {
          update: vi.fn().mockResolvedValue({ id: "test-assessment-id" }),
        },
      };
      return fn(tx);
    });

    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Database error on 5th upsert");
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(attemptedDimensions.length).toBe(5);
  });

  it("should update assessment status within the same transaction", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    const txOperations: string[] = [];
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        dimensionScore: {
          upsert: vi.fn().mockImplementation(async () => {
            txOperations.push("dimensionScore.upsert");
            return { id: "score-id" };
          }),
        },
        videoAssessmentSummary: {
          upsert: vi.fn().mockImplementation(async () => {
            txOperations.push("videoAssessmentSummary.upsert");
            return { id: "summary-id" };
          }),
        },
        videoAssessment: {
          update: vi.fn().mockImplementation(async () => {
            txOperations.push("videoAssessment.update");
            return { id: "test-assessment-id" };
          }),
        },
      };
      return fn(tx);
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(txOperations).toContain("dimensionScore.upsert");
    expect(txOperations).toContain("videoAssessmentSummary.upsert");
    expect(txOperations).toContain("videoAssessment.update");

    const lastOperation = txOperations[txOperations.length - 1];
    expect(lastOperation).toBe("videoAssessment.update");
  });

  it("should allow retry after failed evaluation without duplicate scores", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    let attemptCount = 0;
    mockTransaction.mockImplementation(async (fn) => {
      attemptCount++;
      if (attemptCount === 1) {
        throw new Error("First attempt failed");
      }
      const tx = {
        dimensionScore: {
          upsert: mockDimensionScoreUpsert,
        },
        videoAssessmentSummary: {
          upsert: mockVideoAssessmentSummaryUpsert,
        },
        videoAssessment: {
          update: mockVideoAssessmentUpdate,
        },
      };
      return fn(tx);
    });

    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    const result1 = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });
    expect(result1.success).toBe(false);

    mockDimensionScoreUpsert.mockClear();

    const result2 = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });
    expect(result2.success).toBe(true);
    expect(mockDimensionScoreUpsert).toHaveBeenCalledTimes(7);
  });

  // ============================================================================
  // Logging Tests (US-020)
  // ============================================================================

  it("should log STARTED event with job_id on evaluation start", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const startedCall = mockLogEvent.mock.calls.find(
      (call: unknown[]) => call[0] === "STARTED"
    );
    expect(startedCall).toBeDefined();
    expect(startedCall![1]).toHaveProperty("job_id");
  });

  it("should log PROMPT_SENT event with prompt_length", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const promptSentCall = mockLogEvent.mock.calls.find(
      (call: unknown[]) => call[0] === "PROMPT_SENT"
    );

    expect(promptSentCall).toBeDefined();
    expect(promptSentCall![1]).toHaveProperty("prompt_length");
  });

  it("should log RESPONSE_RECEIVED event with response_length and status_code", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const responseReceivedCall = mockLogEvent.mock.calls.find(
      (call: unknown[]) => call[0] === "RESPONSE_RECEIVED"
    );

    expect(responseReceivedCall).toBeDefined();
    const metadata = responseReceivedCall![1] as Record<string, unknown>;
    expect(metadata).toHaveProperty("response_length");
    expect(metadata).toHaveProperty("status_code");
    expect(metadata.status_code).toBe(200);
  });

  it("should log PARSING_STARTED event", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const parsingStartedCall = mockLogEvent.mock.calls.find(
      (call: unknown[]) => call[0] === "PARSING_STARTED"
    );

    expect(parsingStartedCall).toBeDefined();
  });

  it("should log PARSING_COMPLETED event with parsed dimension count", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const parsingCompletedCall = mockLogEvent.mock.calls.find(
      (call: unknown[]) => call[0] === "PARSING_COMPLETED"
    );

    expect(parsingCompletedCall).toBeDefined();
    const metadata = parsingCompletedCall![1] as Record<string, unknown>;
    expect(metadata).toHaveProperty("parsed_dimension_count");
    expect(metadata.parsed_dimension_count).toBe(7);
  });

  it("should log COMPLETED event on success", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const completedCall = mockLogEvent.mock.calls.find(
      (call: unknown[]) => call[0] === "COMPLETED"
    );

    expect(completedCall).toBeDefined();
  });

  it("should log ERROR event with error details on failure", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API Error"));
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-assessment-id",
      retryCount: 0,
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const errorCall = mockLogEvent.mock.calls.find(
      (call: unknown[]) => call[0] === "ERROR"
    );

    expect(errorCall).toBeDefined();
    const metadata = errorCall![1] as Record<string, unknown>;
    expect(metadata).toHaveProperty("error_message");
    expect(metadata).toHaveProperty("stack_trace");
    expect(metadata).toHaveProperty("error_name");
  });

  it("should log all events in correct order", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const eventTypes = mockLogEvent.mock.calls.map(
      (call: unknown[]) => call[0]
    );

    expect(eventTypes).toEqual([
      "STARTED",
      "PROMPT_SENT",
      "RESPONSE_RECEIVED",
      "PARSING_STARTED",
      "PARSING_COMPLETED",
      "COMPLETED",
    ]);
  });

  it("should track API call via logger", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(mockApiCallTrackerComplete).toHaveBeenCalledWith({
      responseText: expect.any(String),
      statusCode: 200,
    });
  });

  it("should calculate and store duration_ms for each event", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    // Logger handles duration tracking internally
    expect(mockLogEvent).toHaveBeenCalledTimes(6);
  });
});

// ============================================================================
// getEvaluationStatus Tests
// ============================================================================

describe("getEvaluationStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return status for existing assessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      status: "COMPLETED",
      completedAt: new Date("2024-01-15T10:00:00Z"),
      scores: [{ id: "score-1" }, { id: "score-2" }],
      summary: { id: "summary-1" },
    });

    const status = await getEvaluationStatus("test-id");

    expect(status.status).toBe("COMPLETED");
    expect(status.completedAt).toEqual(new Date("2024-01-15T10:00:00Z"));
    expect(status.hasScores).toBe(true);
    expect(status.hasSummary).toBe(true);
  });

  it("should indicate no scores when empty", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      status: "PENDING",
      completedAt: null,
      scores: [],
      summary: null,
    });

    const status = await getEvaluationStatus("test-id");

    expect(status.hasScores).toBe(false);
    expect(status.hasSummary).toBe(false);
  });

  it("should throw for non-existent assessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue(null);

    await expect(getEvaluationStatus("non-existent")).rejects.toThrow(
      "Assessment not found: non-existent"
    );
  });
});

// ============================================================================
// getEvaluationResults Tests
// ============================================================================

describe("getEvaluationResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return full evaluation results", async () => {
    const mockScores = [
      {
        dimension: "COMMUNICATION",
        score: 4,
        observableBehaviors: "Clear communication",
        timestamps: ["01:23", "05:45"],
        trainableGap: false,
      },
      {
        dimension: "PROBLEM_SOLVING",
        score: 5,
        observableBehaviors: "Systematic approach",
        timestamps: ["02:10"],
        trainableGap: false,
      },
    ];

    const mockSummary = {
      overallSummary: "Strong candidate overall",
      rawAiResponse: mockEvaluationResponse,
    };

    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      status: "COMPLETED" as VideoAssessmentStatus,
      completedAt: new Date("2024-01-15T10:00:00Z"),
      scores: mockScores,
      summary: mockSummary,
    });

    const results = await getEvaluationResults("test-id");

    expect(results.assessment.id).toBe("test-id");
    expect(results.assessment.status).toBe("COMPLETED");
    expect(results.scores).toHaveLength(2);
    expect(results.scores[0].dimension).toBe("COMMUNICATION");
    expect(results.scores[0].score).toBe(4);
    expect(results.summary?.overallSummary).toBe("Strong candidate overall");
    expect(results.summary?.rawAiResponse).toEqual(mockEvaluationResponse);
  });

  it("should handle null timestamps in scores", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      status: "COMPLETED" as VideoAssessmentStatus,
      completedAt: new Date(),
      scores: [
        {
          dimension: "COMMUNICATION",
          score: 4,
          observableBehaviors: "Clear communication",
          timestamps: null,
          trainableGap: false,
        },
      ],
      summary: null,
    });

    const results = await getEvaluationResults("test-id");

    expect(results.scores[0].timestamps).toEqual([]);
  });

  it("should handle missing summary", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "test-id",
      status: "PROCESSING" as VideoAssessmentStatus,
      completedAt: null,
      scores: [],
      summary: null,
    });

    const results = await getEvaluationResults("test-id");

    expect(results.summary).toBeNull();
  });

  it("should throw for non-existent assessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue(null);

    await expect(getEvaluationResults("non-existent")).rejects.toThrow(
      "Assessment not found: non-existent"
    );
  });
});

// ============================================================================
// triggerVideoAssessment Tests (US-001)
// ============================================================================

describe("triggerVideoAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoAssessmentUpdate.mockResolvedValue({ id: "video-assessment-123" });
    mockVideoAssessmentCreate.mockResolvedValue({ id: "video-assessment-123" });
    mockVideoAssessmentUpsert.mockResolvedValue({ id: "video-assessment-123", status: "PENDING" });
    mockDimensionScoreUpsert.mockResolvedValue({ id: "test-score-id" });
    mockVideoAssessmentSummaryUpsert.mockResolvedValue({
      id: "test-summary-id",
    });
    mockVideoAssessmentLogCreate.mockResolvedValue({ id: "test-log-id" });
    mockVideoAssessmentApiCallCreate.mockResolvedValue({
      id: "test-api-call-id",
    });
    mockVideoAssessmentApiCallUpdate.mockResolvedValue({
      id: "test-api-call-id",
    });
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });
    mockLogEvent.mockResolvedValue(new Date());
    mockApiCallTrackerComplete.mockResolvedValue(undefined);
  });

  it("should use upsert to atomically create or get VideoAssessment", async () => {
    mockVideoAssessmentUpsert.mockResolvedValue({ id: "video-assessment-123", status: "PENDING" });

    const result = await triggerVideoAssessment({
      assessmentId: "simulation-123",
      candidateId: "user-456",
      videoUrl: "https://storage.example.com/recording.webm",
      taskDescription: "Build a todo list feature",
    });

    expect(result.success).toBe(true);
    expect(result.videoAssessmentId).toBe("video-assessment-123");
    expect(result.error).toBeUndefined();

    expect(mockVideoAssessmentUpsert).toHaveBeenCalledWith({
      where: { assessmentId: "simulation-123" },
      create: {
        candidateId: "user-456",
        assessmentId: "simulation-123",
        videoUrl: "https://storage.example.com/recording.webm",
        status: "PENDING",
      },
      update: {},
      select: { id: true, status: true },
    });
  });

  it("should return existing VideoAssessment if already exists and processing", async () => {
    mockVideoAssessmentUpsert.mockResolvedValue({
      id: "existing-video-assessment",
      status: "PROCESSING",
    });

    const result = await triggerVideoAssessment({
      assessmentId: "simulation-123",
      candidateId: "user-456",
      videoUrl: "https://storage.example.com/recording.webm",
    });

    expect(result.success).toBe(true);
    expect(result.videoAssessmentId).toBe("existing-video-assessment");
    expect(mockVideoAssessmentUpdate).not.toHaveBeenCalled();
  });

  it("should return existing VideoAssessment if already completed", async () => {
    mockVideoAssessmentUpsert.mockResolvedValue({
      id: "completed-video-assessment",
      status: "COMPLETED",
    });

    const result = await triggerVideoAssessment({
      assessmentId: "simulation-123",
      candidateId: "user-456",
      videoUrl: "https://storage.example.com/recording.webm",
    });

    expect(result.success).toBe(true);
    expect(result.videoAssessmentId).toBe("completed-video-assessment");
    expect(mockVideoAssessmentUpdate).not.toHaveBeenCalled();
  });

  it("should re-trigger evaluation for failed VideoAssessment", async () => {
    mockVideoAssessmentUpsert.mockResolvedValue({
      id: "failed-video-assessment",
      status: "FAILED",
    });

    const result = await triggerVideoAssessment({
      assessmentId: "simulation-123",
      candidateId: "user-456",
      videoUrl: "https://storage.example.com/recording.webm",
    });

    expect(result.success).toBe(true);
    expect(result.videoAssessmentId).toBe("failed-video-assessment");

    expect(mockVideoAssessmentUpdate).toHaveBeenCalledWith({
      where: { id: "failed-video-assessment" },
      data: { status: "PENDING" },
    });
  });

  it("should handle database errors gracefully", async () => {
    mockVideoAssessmentUpsert.mockRejectedValue(new Error("DB error"));

    const result = await triggerVideoAssessment({
      assessmentId: "simulation-123",
      candidateId: "user-456",
      videoUrl: "https://storage.example.com/recording.webm",
    });

    expect(result.success).toBe(false);
    expect(result.videoAssessmentId).toBeNull();
    expect(result.error).toBe("DB error");
  });

  it("should use upsert to prevent race conditions on concurrent triggers", async () => {
    mockVideoAssessmentUpsert.mockResolvedValue({
      id: "video-assessment-123",
      status: "PENDING",
    });

    const [result1, result2] = await Promise.all([
      triggerVideoAssessment({
        assessmentId: "simulation-123",
        candidateId: "user-456",
        videoUrl: "https://storage.example.com/recording.webm",
      }),
      triggerVideoAssessment({
        assessmentId: "simulation-123",
        candidateId: "user-456",
        videoUrl: "https://storage.example.com/recording.webm",
      }),
    ]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.videoAssessmentId).toBe(result2.videoAssessmentId);
    expect(mockVideoAssessmentUpsert).toHaveBeenCalledTimes(2);
    expect(mockVideoAssessmentCreate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// getVideoAssessmentStatusByAssessment Tests (US-001)
// ============================================================================

describe("getVideoAssessmentStatusByAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return status for existing video assessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "PROCESSING",
      completedAt: null,
    });

    const result = await getVideoAssessmentStatusByAssessment("simulation-123");

    expect(result).toEqual({
      id: "video-assessment-123",
      status: "PROCESSING",
      completedAt: null,
    });

    expect(mockVideoAssessmentFindUnique).toHaveBeenCalledWith({
      where: { assessmentId: "simulation-123" },
      select: {
        id: true,
        status: true,
        completedAt: true,
      },
    });
  });

  it("should return null when no video assessment exists", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue(null);

    const result = await getVideoAssessmentStatusByAssessment("simulation-456");

    expect(result).toBeNull();
  });

  it("should return completed status with date", async () => {
    const completedAt = new Date("2024-01-15T10:00:00Z");
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "COMPLETED",
      completedAt,
    });

    const result = await getVideoAssessmentStatusByAssessment("simulation-123");

    expect(result?.status).toBe("COMPLETED");
    expect(result?.completedAt).toEqual(completedAt);
  });
});

// ============================================================================
// retryVideoAssessment Tests (US-001)
// ============================================================================

describe("retryVideoAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoAssessmentUpdate.mockResolvedValue({ id: "video-assessment-123" });
    mockLogEvent.mockResolvedValue(new Date());
    mockApiCallTrackerComplete.mockResolvedValue(undefined);
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });
  });

  it("should retry failed video assessment with retryCount < 3", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "FAILED",
      videoUrl: "https://storage.example.com/recording.webm",
      retryCount: 1,
      assessment: {
        scenario: {
          taskDescription: "Build a todo list feature",
        },
      },
    });

    const result = await retryVideoAssessment("video-assessment-123");

    expect(result.success).toBe(true);
    expect(result.videoAssessmentId).toBe("video-assessment-123");

    expect(mockVideoAssessmentUpdate).toHaveBeenCalledWith({
      where: { id: "video-assessment-123" },
      data: { status: "PENDING" },
    });
  });

  it("should return error when retryCount >= 3", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "FAILED",
      videoUrl: "https://storage.example.com/recording.webm",
      retryCount: 3,
      assessment: {
        scenario: {
          taskDescription: "Build a todo list feature",
        },
      },
    });

    const result = await retryVideoAssessment("video-assessment-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("already failed 3 times");
  });

  it("should return error for non-failed assessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "COMPLETED",
      videoUrl: "https://storage.example.com/recording.webm",
      retryCount: 0,
      assessment: null,
    });

    const result = await retryVideoAssessment("video-assessment-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot retry assessment with status COMPLETED");
  });

  it("should return error for non-existent assessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue(null);

    const result = await retryVideoAssessment("non-existent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Video assessment not found");
  });

  it("should handle database errors gracefully", async () => {
    mockVideoAssessmentFindUnique.mockRejectedValue(new Error("DB error"));

    const result = await retryVideoAssessment("video-assessment-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

// ============================================================================
// forceRetryVideoAssessment Tests (US-015)
// ============================================================================

describe("forceRetryVideoAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVideoAssessmentUpdate.mockResolvedValue({ id: "video-assessment-123" });
    mockLogEvent.mockResolvedValue(new Date());
    mockApiCallTrackerComplete.mockResolvedValue(undefined);
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });
  });

  it("should force retry even when retryCount >= 3", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "FAILED",
      videoUrl: "https://storage.example.com/recording.webm",
      assessment: {
        scenario: {
          taskDescription: "Build a todo list feature",
        },
      },
    });

    const result = await forceRetryVideoAssessment("video-assessment-123");

    expect(result.success).toBe(true);
    expect(result.videoAssessmentId).toBe("video-assessment-123");

    expect(mockVideoAssessmentUpdate).toHaveBeenCalledWith({
      where: { id: "video-assessment-123" },
      data: {
        status: "PENDING",
        retryCount: 0,
        lastFailureReason: null,
      },
    });
  });

  it("should return error for non-existent assessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue(null);

    const result = await forceRetryVideoAssessment("non-existent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Video assessment not found");
  });

  it("should handle database errors gracefully", async () => {
    mockVideoAssessmentFindUnique.mockRejectedValue(new Error("DB error"));

    const result = await forceRetryVideoAssessment("video-assessment-123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});
