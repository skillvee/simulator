import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VideoAssessmentStatus, AssessmentDimension } from "@prisma/client";

// Mock gemini module
vi.mock("@/lib/gemini", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
}));

// Mock database
vi.mock("@/server/db", () => ({
  db: {
    videoAssessment: {
      update: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
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
  },
}));

// Mock error recovery module - need to provide the actual withRetry implementation
vi.mock("@/lib/error-recovery", () => ({
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
import { gemini } from "@/lib/gemini";
import { db } from "@/server/db";

// Cast to mocked types for easier access
const mockGenerateContent = gemini.models.generateContent as ReturnType<typeof vi.fn>;
const mockVideoAssessmentUpdate = db.videoAssessment.update as ReturnType<typeof vi.fn>;
const mockVideoAssessmentFindUnique = db.videoAssessment.findUnique as ReturnType<typeof vi.fn>;
const mockVideoAssessmentCreate = db.videoAssessment.create as ReturnType<typeof vi.fn>;
const mockDimensionScoreUpsert = db.dimensionScore.upsert as ReturnType<typeof vi.fn>;
const mockVideoAssessmentSummaryUpsert = db.videoAssessmentSummary.upsert as ReturnType<typeof vi.fn>;
const mockVideoAssessmentLogCreate = db.videoAssessmentLog.create as ReturnType<typeof vi.fn>;
const mockVideoAssessmentApiCallCreate = db.videoAssessmentApiCall.create as ReturnType<typeof vi.fn>;
const mockVideoAssessmentApiCallUpdate = db.videoAssessmentApiCall.update as ReturnType<typeof vi.fn>;

// ============================================================================
// Test Data
// ============================================================================

const mockEvaluationResponse = {
  evaluation_version: "1.0.0",
  overall_score: 4.2,
  dimension_scores: {
    COMMUNICATION: {
      score: 4,
      observable_behaviors: "Clear verbal communication during explanations",
      timestamps: ["01:23", "05:45", "12:30"],
      trainable_gap: false,
    },
    PROBLEM_SOLVING: {
      score: 5,
      observable_behaviors: "Systematic debugging approach",
      timestamps: ["02:10", "08:15"],
      trainable_gap: false,
    },
    TECHNICAL_KNOWLEDGE: {
      score: 4,
      observable_behaviors: "Good understanding of React patterns",
      timestamps: ["03:00", "10:20", "15:45"],
      trainable_gap: true,
    },
    COLLABORATION: {
      score: 3,
      observable_behaviors: "Some interaction with AI assistant",
      timestamps: ["04:30"],
      trainable_gap: true,
    },
    ADAPTABILITY: {
      score: 4,
      observable_behaviors: "Adjusted approach when first solution failed",
      timestamps: ["07:00", "11:15"],
      trainable_gap: false,
    },
    LEADERSHIP: {
      score: null,
      observable_behaviors: "Insufficient evidence for leadership evaluation",
      timestamps: [],
      trainable_gap: false,
    },
    CREATIVITY: {
      score: 4,
      observable_behaviors: "Novel solution for state management",
      timestamps: ["09:30", "14:00"],
      trainable_gap: false,
    },
    TIME_MANAGEMENT: {
      score: 5,
      observable_behaviors: "Efficient task prioritization",
      timestamps: ["00:30", "06:00", "13:00"],
      trainable_gap: false,
    },
  },
  key_highlights: [
    {
      timestamp: "02:10",
      type: "positive",
      dimension: "PROBLEM_SOLVING",
      description: "Excellent debugging methodology",
      quote: null,
    },
    {
      timestamp: "09:30",
      type: "positive",
      dimension: "CREATIVITY",
      description: "Innovative state management approach",
      quote: "Let me try a different pattern here",
    },
  ],
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
    mockVideoAssessmentSummaryUpsert.mockResolvedValue({ id: "test-summary-id" });
    mockVideoAssessmentLogCreate.mockResolvedValue({ id: "test-log-id" });
    mockVideoAssessmentApiCallCreate.mockResolvedValue({ id: "test-api-call-id" });
    mockVideoAssessmentApiCallUpdate.mockResolvedValue({ id: "test-api-call-id" });
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

    // Should be called twice: once for PROCESSING, once for COMPLETED
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
              text: expect.stringContaining("objective, evidence-based evaluator"),
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

    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: "gemini-3-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            expect.any(Object),
            {
              text: expect.stringContaining("Video Duration: 45 minutes"),
            },
          ],
        },
      ],
    });
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
    // That's 7 dimensions with scores
    expect(mockDimensionScoreUpsert).toHaveBeenCalledTimes(7);

    // Verify one of the upsert calls
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
        observableBehaviors: "Clear verbal communication during explanations",
        timestamps: ["01:23", "05:45", "12:30"],
        trainableGap: false,
      },
      update: {
        score: 4,
        observableBehaviors: "Clear verbal communication during explanations",
        timestamps: ["01:23", "05:45", "12:30"],
        trainableGap: false,
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
        (call[0] as { where: { assessmentId_dimension: { dimension: string } } })
          .where.assessmentId_dimension.dimension === "LEADERSHIP"
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
        rawAiResponse: mockEvaluationResponse,
      },
      update: {
        overallSummary: mockEvaluationResponse.overall_summary,
        rawAiResponse: mockEvaluationResponse,
      },
    });
  });

  it("should handle JSON response wrapped in markdown code blocks", async () => {
    const wrappedResponse = "```json\n" + JSON.stringify(mockEvaluationResponse) + "\n```";
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

    const result = await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("JSON");
  });

  it("should handle missing overall_score in response", async () => {
    const invalidResponse = { ...mockEvaluationResponse };
    delete (invalidResponse as Record<string, unknown>).overall_score;

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(invalidResponse),
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
    expect(result.dimensionScores.get("COMMUNICATION" as AssessmentDimension)).toBe(4);
    expect(result.dimensionScores.get("LEADERSHIP" as AssessmentDimension)).toBeNull();
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

    // Check that upsert was called with filtered timestamps
    const communicationCall = mockDimensionScoreUpsert.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { where: { assessmentId_dimension: { dimension: string } } })
          .where.assessmentId_dimension.dimension === "COMMUNICATION"
    );

    expect(communicationCall).toBeDefined();
    const timestamps = (communicationCall![0] as { create: { timestamps: string[] } }).create.timestamps;
    expect(timestamps).toContain("01:23");
    expect(timestamps).toContain("05:45");
    expect(timestamps).toContain("1:23:45");
    expect(timestamps).not.toContain("invalid");
    expect(timestamps).not.toContain("not-a-time");
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

    // Check STARTED event was logged first
    const startedCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "STARTED"
    );

    expect(startedCall).toBeDefined();
    expect((startedCall![0] as { data: { metadata: { job_id: string } } }).data.metadata).toHaveProperty("job_id");
  });

  it("should log PROMPT_SENT event with prompt_length", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const promptSentCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "PROMPT_SENT"
    );

    expect(promptSentCall).toBeDefined();
    expect((promptSentCall![0] as { data: { metadata: { prompt_length: number } } }).data.metadata).toHaveProperty("prompt_length");
  });

  it("should log RESPONSE_RECEIVED event with response_length and status_code", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const responseReceivedCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "RESPONSE_RECEIVED"
    );

    expect(responseReceivedCall).toBeDefined();
    const metadata = (responseReceivedCall![0] as { data: { metadata: { response_length: number; status_code: number } } }).data.metadata;
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

    const parsingStartedCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "PARSING_STARTED"
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

    const parsingCompletedCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "PARSING_COMPLETED"
    );

    expect(parsingCompletedCall).toBeDefined();
    const metadata = (parsingCompletedCall![0] as { data: { metadata: { parsed_dimension_count: number } } }).data.metadata;
    expect(metadata).toHaveProperty("parsed_dimension_count");
    // 7 dimensions have scores (LEADERSHIP is null)
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

    const completedCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "COMPLETED"
    );

    expect(completedCall).toBeDefined();
  });

  it("should log ERROR event with full error details on failure", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API Error"));

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const errorCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "ERROR"
    );

    expect(errorCall).toBeDefined();
    const metadata = (errorCall![0] as { data: { metadata: { error_message: string; stack_trace: string } } }).data.metadata;
    expect(metadata).toHaveProperty("error_message");
    expect(metadata).toHaveProperty("stack_trace");
  });

  it("should log all events in correct order", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    const eventTypes = mockVideoAssessmentLogCreate.mock.calls.map(
      (call: unknown[]) => (call[0] as { data: { eventType: string } }).data.eventType
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

  it("should store API call details in assessment_api_calls table", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });

    await evaluateVideo({
      assessmentId: "test-assessment-id",
      videoUrl: "https://storage.example.com/video.mp4",
    });

    // Check API call was created
    expect(mockVideoAssessmentApiCallCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "test-assessment-id",
        promptText: expect.any(String),
        modelVersion: "gemini-3-pro-preview",
      }),
    });

    // Check API call was updated with response
    expect(mockVideoAssessmentApiCallUpdate).toHaveBeenCalledWith({
      where: { id: "test-api-call-id" },
      data: expect.objectContaining({
        responseTimestamp: expect.any(Date),
        durationMs: expect.any(Number),
        responseText: expect.any(String),
        statusCode: 200,
      }),
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

    // First event (STARTED) should have null durationMs
    const startedCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "STARTED"
    );
    expect((startedCall![0] as { data: { durationMs: number | null } }).data.durationMs).toBeNull();

    // Subsequent events should have durationMs calculated
    const promptSentCall = mockVideoAssessmentLogCreate.mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { data: { eventType: string } }).data.eventType === "PROMPT_SENT"
    );
    expect((promptSentCall![0] as { data: { durationMs: number | null } }).data.durationMs).not.toBeNull();
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
        dimension: "COMMUNICATION" as AssessmentDimension,
        score: 4,
        observableBehaviors: "Clear communication",
        timestamps: ["01:23", "05:45"],
        trainableGap: false,
      },
      {
        dimension: "PROBLEM_SOLVING" as AssessmentDimension,
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
          dimension: "COMMUNICATION" as AssessmentDimension,
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
    mockDimensionScoreUpsert.mockResolvedValue({ id: "test-score-id" });
    mockVideoAssessmentSummaryUpsert.mockResolvedValue({ id: "test-summary-id" });
    mockVideoAssessmentLogCreate.mockResolvedValue({ id: "test-log-id" });
    mockVideoAssessmentApiCallCreate.mockResolvedValue({ id: "test-api-call-id" });
    mockVideoAssessmentApiCallUpdate.mockResolvedValue({ id: "test-api-call-id" });
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });
  });

  it("should create new VideoAssessment and trigger evaluation", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue(null);

    const result = await triggerVideoAssessment({
      assessmentId: "simulation-123",
      candidateId: "user-456",
      videoUrl: "https://storage.example.com/recording.webm",
      taskDescription: "Build a todo list feature",
    });

    expect(result.success).toBe(true);
    expect(result.videoAssessmentId).toBe("video-assessment-123");
    expect(result.error).toBeUndefined();

    // Should create new video assessment
    expect(mockVideoAssessmentCreate).toHaveBeenCalledWith({
      data: {
        candidateId: "user-456",
        assessmentId: "simulation-123",
        videoUrl: "https://storage.example.com/recording.webm",
        status: "PENDING",
      },
    });
  });

  it("should return existing VideoAssessment if already exists and not failed", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
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

    // Should not create new video assessment
    expect(mockVideoAssessmentCreate).not.toHaveBeenCalled();
  });

  it("should re-trigger evaluation for failed VideoAssessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
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

    // Should reset status to PENDING
    expect(mockVideoAssessmentUpdate).toHaveBeenCalledWith({
      where: { id: "failed-video-assessment" },
      data: { status: "PENDING" },
    });
  });

  it("should handle database errors gracefully", async () => {
    mockVideoAssessmentFindUnique.mockRejectedValue(new Error("DB error"));

    const result = await triggerVideoAssessment({
      assessmentId: "simulation-123",
      candidateId: "user-456",
      videoUrl: "https://storage.example.com/recording.webm",
    });

    expect(result.success).toBe(false);
    expect(result.videoAssessmentId).toBeNull();
    expect(result.error).toBe("DB error");
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
    mockDimensionScoreUpsert.mockResolvedValue({ id: "test-score-id" });
    mockVideoAssessmentSummaryUpsert.mockResolvedValue({ id: "test-summary-id" });
    mockVideoAssessmentLogCreate.mockResolvedValue({ id: "test-log-id" });
    mockVideoAssessmentApiCallCreate.mockResolvedValue({ id: "test-api-call-id" });
    mockVideoAssessmentApiCallUpdate.mockResolvedValue({ id: "test-api-call-id" });
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });
  });

  it("should retry failed video assessment with retryCount < 3", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "FAILED",
      videoUrl: "https://storage.example.com/recording.webm",
      assessmentId: "simulation-123",
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

    // Should reset status to PENDING
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
      assessmentId: "simulation-123",
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
    expect(result.error).toContain("admin manual reassessment");
  });

  it("should return error for non-failed assessment", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "COMPLETED",
      videoUrl: "https://storage.example.com/recording.webm",
      assessmentId: "simulation-123",
      retryCount: 0,
      assessment: null,
    });

    const result = await retryVideoAssessment("video-assessment-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot retry assessment with status COMPLETED");
    expect(result.error).toContain("Only FAILED assessments can be retried");
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
    mockDimensionScoreUpsert.mockResolvedValue({ id: "test-score-id" });
    mockVideoAssessmentSummaryUpsert.mockResolvedValue({ id: "test-summary-id" });
    mockVideoAssessmentLogCreate.mockResolvedValue({ id: "test-log-id" });
    mockVideoAssessmentApiCallCreate.mockResolvedValue({ id: "test-api-call-id" });
    mockVideoAssessmentApiCallUpdate.mockResolvedValue({ id: "test-api-call-id" });
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mockEvaluationResponse),
    });
  });

  it("should force retry even when retryCount >= 3", async () => {
    mockVideoAssessmentFindUnique.mockResolvedValue({
      id: "video-assessment-123",
      status: "FAILED",
      videoUrl: "https://storage.example.com/recording.webm",
      assessmentId: "simulation-123",
      assessment: {
        scenario: {
          taskDescription: "Build a todo list feature",
        },
      },
    });

    const result = await forceRetryVideoAssessment("video-assessment-123");

    expect(result.success).toBe(true);
    expect(result.videoAssessmentId).toBe("video-assessment-123");

    // Should reset status to PENDING and reset retryCount
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
