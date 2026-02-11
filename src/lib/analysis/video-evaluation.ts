/**
 * Video Evaluation Service
 *
 * Server-side service that sends simulation videos to Gemini 3 Pro for evaluation.
 * Produces dimension scores with evidence and timestamps using data-driven rubrics.
 * Includes comprehensive logging for all assessment events (US-020).
 *
 * @since 2026-01-16
 * @updated 2026-02-06 - Migrated to data-driven rubric system
 */

import { gemini } from "@/lib/ai/gemini";
import { db } from "@/server/db";
import { withRetry } from "@/lib/core";
import { createVideoAssessmentLogger } from "@/lib/analysis";
import { generateAndStoreEmbeddings } from "@/lib/candidate";
import { loadRubricForRoleFamily } from "@/lib/rubric";
import {
  buildRubricEvaluationPrompt,
  RUBRIC_EVALUATION_PROMPT_VERSION,
  type RubricPromptInput,
} from "@/prompts/analysis/rubric-evaluation";
import {
  AssessmentLogEventType,
  VideoAssessmentStatus,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { RubricAssessmentOutput, TimestampedBehavior, DimensionConfidence } from "@/types";

// Model for video evaluation (Gemini 3 Pro)
const VIDEO_EVALUATION_MODEL = "gemini-3-pro-preview";

// Default role family when none is specified
const DEFAULT_ROLE_FAMILY_SLUG = "engineering";

// ============================================================================
// Types
// ============================================================================

export interface VideoEvaluationResult {
  success: boolean;
  assessmentId: string;
  overallScore: number | null;
  dimensionScores: Map<string, number | null>;
  summary: string | null;
  error?: string;
}

export interface EvaluateVideoOptions {
  assessmentId: string;
  videoUrl: string;
  videoDurationMinutes?: number;
  taskDescription?: string;
  expectedOutcomes?: string[];
  /** Role family slug for rubric selection (defaults to "engineering") */
  roleFamilySlug?: string;
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Cleans JSON response from Gemini by removing markdown code blocks
 */
function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();

  // Remove markdown code block markers
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/**
 * Parses and validates the Gemini evaluation response against the rubric output schema
 */
function parseEvaluationResponse(responseText: string): RubricAssessmentOutput {
  const cleaned = cleanJsonResponse(responseText);
  const parsed = JSON.parse(cleaned);

  // Validate required fields
  if (typeof parsed.overall_score !== "number") {
    throw new Error("Missing or invalid overall_score in response");
  }

  if (!parsed.dimension_scores || typeof parsed.dimension_scores !== "object") {
    throw new Error("Missing or invalid dimension_scores in response");
  }

  if (!parsed.overall_summary || typeof parsed.overall_summary !== "string") {
    throw new Error("Missing or invalid overall_summary in response");
  }

  // Map the raw response to RubricAssessmentOutput
  const dimensionScores = Object.entries(parsed.dimension_scores as Record<string, Record<string, unknown>>).map(
    ([slug, data]) => {
      // Handle both v3 (array of {timestamp, behavior}) and v2 (flat string array) formats
      const rawBehaviors = data.observable_behaviors as
        | TimestampedBehavior[]
        | string[]
        | undefined;
      let observableBehaviors: TimestampedBehavior[];
      let timestamps: string[];

      if (
        Array.isArray(rawBehaviors) &&
        rawBehaviors.length > 0 &&
        typeof rawBehaviors[0] === "object" &&
        "timestamp" in (rawBehaviors[0] as object)
      ) {
        // v3 format: array of {timestamp, behavior}
        observableBehaviors = rawBehaviors as TimestampedBehavior[];
        timestamps = observableBehaviors.map((b) => b.timestamp);
      } else {
        // v2 format: flat string array — pair with timestamps array
        const flatBehaviors = (rawBehaviors as string[]) ?? [];
        const flatTimestamps = (data.timestamps as string[]) ?? [];
        observableBehaviors = flatBehaviors.map((b, i) => ({
          timestamp: flatTimestamps[i] ?? "",
          behavior: b,
        }));
        timestamps = flatTimestamps;
      }

      return {
        dimensionSlug: slug,
        dimensionName: slug, // Will be enriched from rubric data
        score: (data.score as number | null) ?? null,
        summary: (data.summary as string) ?? "",
        confidence: ((data.confidence as string) ?? "medium") as DimensionConfidence,
        rationale: (data.rationale as string) ?? "",
        observableBehaviors,
        timestamps,
        trainableGap: (data.trainable_gap as boolean) ?? false,
        greenFlags: (data.green_flags as string[]) ?? [],
        redFlags: (data.red_flags as string[]) ?? [],
      };
    }
  );

  const detectedRedFlags = (parsed.detected_red_flags ?? []).map(
    (rf: Record<string, unknown>) => ({
      slug: rf.slug as string,
      name: rf.slug as string,
      description: "",
      evidence: (rf.evidence as string) ?? "",
      timestamps: (rf.timestamps as string[]) ?? [],
    })
  );

  // Parse top_strengths and growth_areas (v3 fields)
  const topStrengths = (parsed.top_strengths ?? []).map(
    (s: Record<string, unknown>) => ({
      dimension: (s.dimension as string) ?? "",
      score: (s.score as number) ?? 0,
      description: (s.description as string) ?? "",
    })
  );

  const growthAreas = (parsed.growth_areas ?? []).map(
    (g: Record<string, unknown>) => ({
      dimension: (g.dimension as string) ?? "",
      score: (g.score as number) ?? 0,
      description: (g.description as string) ?? "",
    })
  );

  return {
    evaluationVersion: parsed.evaluation_version ?? RUBRIC_EVALUATION_PROMPT_VERSION,
    roleFamilySlug: parsed.role_family_slug ?? DEFAULT_ROLE_FAMILY_SLUG,
    overallScore: parsed.overall_score,
    dimensionScores,
    detectedRedFlags,
    topStrengths,
    growthAreas,
    overallSummary: parsed.overall_summary,
    evaluationConfidence: (parsed.evaluation_confidence ?? "medium") as DimensionConfidence,
    insufficientEvidenceNotes: parsed.insufficient_evidence_notes ?? null,
  };
}

/**
 * Formats timestamps array to JSON for database storage
 * Ensures timestamps are in MM:SS or HH:MM:SS format
 */
function formatTimestamps(timestamps: string[]): Prisma.InputJsonValue {
  const timestampRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
  const validTimestamps = timestamps.filter((ts) => timestampRegex.test(ts));
  return validTimestamps as unknown as Prisma.InputJsonValue;
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * Evaluates a video using Gemini 3 Pro
 *
 * Loads the rubric for the specified role family, builds a dynamic evaluation prompt,
 * sends the video to Gemini, and stores results with dimension slug-based scores.
 *
 * @param options - Evaluation options including assessmentId and videoUrl
 * @returns Evaluation result with scores and summary
 */
export async function evaluateVideo(
  options: EvaluateVideoOptions
): Promise<VideoEvaluationResult> {
  const {
    assessmentId,
    videoUrl,
    videoDurationMinutes,
    taskDescription,
    expectedOutcomes,
    roleFamilySlug = DEFAULT_ROLE_FAMILY_SLUG,
  } = options;

  // Generate a unique job ID for this evaluation run
  const jobId = `job-${assessmentId}-${Date.now()}`;

  // Create logger for this assessment
  const logger = createVideoAssessmentLogger(assessmentId);

  // Log: Job started
  await logger.logEvent(AssessmentLogEventType.STARTED, { job_id: jobId });

  // Update status to PROCESSING
  await db.videoAssessment.update({
    where: { id: assessmentId },
    data: { status: VideoAssessmentStatus.PROCESSING },
  });

  try {
    // Load rubric data from the database
    let rubricInput: RubricPromptInput;
    try {
      rubricInput = await loadRubricForRoleFamily(db, roleFamilySlug);
    } catch {
      console.warn(
        `[VideoEvaluation] Role family "${roleFamilySlug}" not found, falling back to "${DEFAULT_ROLE_FAMILY_SLUG}"`
      );
      rubricInput = await loadRubricForRoleFamily(db, DEFAULT_ROLE_FAMILY_SLUG);
    }

    // Add video context if provided
    if (videoDurationMinutes || taskDescription || expectedOutcomes) {
      rubricInput.videoContext = {
        videoDurationMinutes,
        taskDescription,
        expectedOutcomes,
      };
    }

    // Build the evaluation prompt dynamically from rubric data
    const prompt = buildRubricEvaluationPrompt(rubricInput);

    // Log: Prompt sent
    await logger.logEvent(AssessmentLogEventType.PROMPT_SENT, {
      prompt_length: prompt.length,
      role_family: roleFamilySlug,
    });

    // Start API call tracking
    const apiCallTracker = logger.startApiCall(prompt, VIDEO_EVALUATION_MODEL);

    let responseText: string;
    try {
      responseText = await withRetry(
        async () => {
          const result = await gemini.models.generateContent({
            model: VIDEO_EVALUATION_MODEL,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    fileData: {
                      fileUri: videoUrl,
                      mimeType: "video/mp4",
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          });

          const text = result.text;
          if (!text) {
            throw new Error("No response from Gemini");
          }
          return text;
        },
        {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 30000,
          onRetry: (attempt, error, delay) => {
            console.warn(
              `[VideoEvaluation] Retry ${attempt} after ${delay}ms: ${error.message}`
            );
          },
        }
      );

      await logger.logEvent(AssessmentLogEventType.RESPONSE_RECEIVED, {
        response_length: responseText.length,
        status_code: 200,
      });

      await apiCallTracker.complete({
        responseText,
        statusCode: 200,
      });
    } catch (apiError) {
      await apiCallTracker.fail(
        apiError instanceof Error ? apiError : new Error(String(apiError))
      );
      throw apiError;
    }

    await logger.logEvent(AssessmentLogEventType.PARSING_STARTED);

    // Parse the response
    const evaluation = parseEvaluationResponse(responseText);

    const dimensionCount = evaluation.dimensionScores.filter(
      (d) => d.score !== null
    ).length;

    await logger.logEvent(AssessmentLogEventType.PARSING_COMPLETED, {
      parsed_dimension_count: dimensionCount,
    });

    // Store results — use rubric dimension slugs directly as the dimension key
    const dimensionScores = new Map<string, number | null>();
    for (const dimScore of evaluation.dimensionScores) {
      dimensionScores.set(dimScore.dimensionSlug, dimScore.score);
    }

    await db.$transaction(async (tx) => {
      for (const dimScore of evaluation.dimensionScores) {
        if (dimScore.score !== null) {
          const behaviorsText = JSON.stringify(dimScore.observableBehaviors);
          await tx.dimensionScore.upsert({
            where: {
              assessmentId_dimension: {
                assessmentId,
                dimension: dimScore.dimensionSlug,
              },
            },
            create: {
              assessmentId,
              dimension: dimScore.dimensionSlug,
              score: dimScore.score,
              confidence: dimScore.confidence,
              observableBehaviors: behaviorsText,
              timestamps: formatTimestamps(dimScore.timestamps),
              trainableGap: dimScore.trainableGap,
              rationale: dimScore.rationale,
            },
            update: {
              score: dimScore.score,
              confidence: dimScore.confidence,
              observableBehaviors: behaviorsText,
              timestamps: formatTimestamps(dimScore.timestamps),
              trainableGap: dimScore.trainableGap,
              rationale: dimScore.rationale,
            },
          });
        }
      }

      await tx.videoAssessmentSummary.upsert({
        where: { assessmentId },
        create: {
          assessmentId,
          overallSummary: evaluation.overallSummary,
          rawAiResponse: evaluation as unknown as Prisma.InputJsonValue,
        },
        update: {
          overallSummary: evaluation.overallSummary,
          rawAiResponse: evaluation as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.videoAssessment.update({
        where: { id: assessmentId },
        data: {
          status: VideoAssessmentStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    });

    await logger.logEvent(AssessmentLogEventType.COMPLETED);

    // Generate and store embeddings for semantic search (async)
    generateAndStoreEmbeddings(assessmentId)
      .then((embeddingResult) => {
        if (embeddingResult.success) {
          console.log(
            `[VideoEvaluation] Successfully generated embeddings for ${assessmentId}`
          );
        } else {
          console.warn(
            `[VideoEvaluation] Failed to generate embeddings for ${assessmentId}: ${embeddingResult.error}`
          );
        }
      })
      .catch((error) => {
        console.error(
          `[VideoEvaluation] Embedding generation error for ${assessmentId}:`,
          error
        );
      });

    return {
      success: true,
      assessmentId,
      overallScore: evaluation.overallScore,
      dimensionScores,
      summary: evaluation.overallSummary,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[VideoEvaluation] Evaluation failed:", error);

    const errorObj = error instanceof Error ? error : new Error(String(error));
    await logger.logEvent(AssessmentLogEventType.ERROR, {
      error_message: errorObj.message,
      error_name: errorObj.name,
      stack_trace: errorObj.stack,
    });

    const currentAssessment = await db.videoAssessment.findUnique({
      where: { id: assessmentId },
      select: { retryCount: true },
    });

    const currentRetryCount = currentAssessment?.retryCount ?? 0;
    const newRetryCount = currentRetryCount + 1;

    await db.videoAssessment.update({
      where: { id: assessmentId },
      data: {
        status: VideoAssessmentStatus.FAILED,
        retryCount: newRetryCount,
        lastFailureReason: errorMessage,
      },
    });

    console.error(
      `[ASSESSMENT FAILURE ALERT] Video assessment ${assessmentId} failed ` +
        `(attempt ${newRetryCount}/3). Reason: ${errorMessage}`
    );

    if (newRetryCount >= 3) {
      console.error(
        `[ASSESSMENT FAILURE ALERT] Video assessment ${assessmentId} has failed 3 times ` +
          `and will not be automatically retried. Admin intervention required.`
      );
    }

    return {
      success: false,
      assessmentId,
      overallScore: null,
      dimensionScores: new Map(),
      summary: null,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Gets the evaluation status for an assessment
 */
export async function getEvaluationStatus(assessmentId: string): Promise<{
  status: VideoAssessmentStatus;
  completedAt: Date | null;
  hasScores: boolean;
  hasSummary: boolean;
}> {
  const assessment = await db.videoAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      scores: { select: { id: true } },
      summary: { select: { id: true } },
    },
  });

  if (!assessment) {
    throw new Error(`Assessment not found: ${assessmentId}`);
  }

  return {
    status: assessment.status,
    completedAt: assessment.completedAt,
    hasScores: assessment.scores.length > 0,
    hasSummary: !!assessment.summary,
  };
}

/**
 * Gets the full evaluation results for an assessment
 */
export async function getEvaluationResults(assessmentId: string): Promise<{
  assessment: {
    id: string;
    status: VideoAssessmentStatus;
    completedAt: Date | null;
  };
  scores: Array<{
    dimension: string;
    score: number;
    observableBehaviors: string;
    timestamps: string[];
    trainableGap: boolean;
  }>;
  summary: {
    overallSummary: string;
    rawAiResponse: RubricAssessmentOutput | null;
  } | null;
}> {
  const assessment = await db.videoAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      scores: true,
      summary: true,
    },
  });

  if (!assessment) {
    throw new Error(`Assessment not found: ${assessmentId}`);
  }

  return {
    assessment: {
      id: assessment.id,
      status: assessment.status,
      completedAt: assessment.completedAt,
    },
    scores: assessment.scores.map((score) => ({
      dimension: score.dimension,
      score: score.score,
      observableBehaviors: score.observableBehaviors,
      timestamps: (score.timestamps as string[]) || [],
      trainableGap: score.trainableGap,
    })),
    summary: assessment.summary
      ? {
          overallSummary: assessment.summary.overallSummary,
          rawAiResponse: assessment.summary
            .rawAiResponse as unknown as RubricAssessmentOutput | null,
        }
      : null,
  };
}

// ============================================================================
// Trigger Function (for auto-triggering from simulation completion)
// ============================================================================

export interface TriggerVideoAssessmentOptions {
  assessmentId: string;
  candidateId: string;
  videoUrl: string;
  taskDescription?: string;
  roleFamilySlug?: string;
}

export interface TriggerVideoAssessmentResult {
  success: boolean;
  videoAssessmentId: string | null;
  error?: string;
}

/**
 * Triggers a video assessment for a completed simulation.
 */
export async function triggerVideoAssessment(
  options: TriggerVideoAssessmentOptions
): Promise<TriggerVideoAssessmentResult> {
  const { assessmentId, candidateId, videoUrl, taskDescription, roleFamilySlug } = options;

  try {
    const videoAssessment = await db.videoAssessment.upsert({
      where: { assessmentId },
      create: {
        candidateId,
        assessmentId,
        videoUrl,
        status: VideoAssessmentStatus.PENDING,
      },
      update: {},
      select: { id: true, status: true },
    });

    if (videoAssessment.status === VideoAssessmentStatus.FAILED) {
      await db.videoAssessment.update({
        where: { id: videoAssessment.id },
        data: { status: VideoAssessmentStatus.PENDING },
      });

      evaluateVideo({
        assessmentId: videoAssessment.id,
        videoUrl,
        taskDescription,
        roleFamilySlug,
      }).catch((error) => {
        console.error(
          `[VideoEvaluation] Background evaluation failed for ${videoAssessment.id}:`,
          error
        );
      });

      return { success: true, videoAssessmentId: videoAssessment.id };
    }

    if (
      videoAssessment.status === VideoAssessmentStatus.PROCESSING ||
      videoAssessment.status === VideoAssessmentStatus.COMPLETED
    ) {
      return { success: true, videoAssessmentId: videoAssessment.id };
    }

    evaluateVideo({
      assessmentId: videoAssessment.id,
      videoUrl,
      taskDescription,
      roleFamilySlug,
    }).catch((error) => {
      console.error(
        `[VideoEvaluation] Background evaluation failed for ${videoAssessment.id}:`,
        error
      );
    });

    return { success: true, videoAssessmentId: videoAssessment.id };
  } catch (error) {
    console.error("[VideoEvaluation] Failed to trigger video assessment:", error);
    return {
      success: false,
      videoAssessmentId: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getVideoAssessmentStatusByAssessment(
  assessmentId: string
): Promise<{
  id: string;
  status: VideoAssessmentStatus;
  completedAt: Date | null;
} | null> {
  return db.videoAssessment.findUnique({
    where: { assessmentId },
    select: { id: true, status: true, completedAt: true },
  });
}

export async function retryVideoAssessment(
  videoAssessmentId: string
): Promise<TriggerVideoAssessmentResult> {
  try {
    const videoAssessment = await db.videoAssessment.findUnique({
      where: { id: videoAssessmentId },
      select: {
        id: true,
        status: true,
        videoUrl: true,
        retryCount: true,
        assessment: {
          select: { scenario: { select: { taskDescription: true } } },
        },
      },
    });

    if (!videoAssessment) {
      return { success: false, videoAssessmentId: null, error: "Video assessment not found" };
    }

    if (videoAssessment.status !== VideoAssessmentStatus.FAILED) {
      return {
        success: false,
        videoAssessmentId,
        error: `Cannot retry assessment with status ${videoAssessment.status}.`,
      };
    }

    if (videoAssessment.retryCount >= 3) {
      return {
        success: false,
        videoAssessmentId,
        error: "Assessment has already failed 3 times.",
      };
    }

    await db.videoAssessment.update({
      where: { id: videoAssessmentId },
      data: { status: VideoAssessmentStatus.PENDING },
    });

    evaluateVideo({
      assessmentId: videoAssessmentId,
      videoUrl: videoAssessment.videoUrl,
      taskDescription: videoAssessment.assessment?.scenario?.taskDescription,
    }).catch((error) => {
      console.error(`[VideoEvaluation] Retry failed for ${videoAssessmentId}:`, error);
    });

    return { success: true, videoAssessmentId };
  } catch (error) {
    console.error("[VideoEvaluation] Failed to retry:", error);
    return {
      success: false,
      videoAssessmentId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function forceRetryVideoAssessment(
  videoAssessmentId: string
): Promise<TriggerVideoAssessmentResult> {
  try {
    const videoAssessment = await db.videoAssessment.findUnique({
      where: { id: videoAssessmentId },
      select: {
        id: true,
        videoUrl: true,
        assessment: {
          select: { scenario: { select: { taskDescription: true } } },
        },
      },
    });

    if (!videoAssessment) {
      return { success: false, videoAssessmentId: null, error: "Video assessment not found" };
    }

    await db.videoAssessment.update({
      where: { id: videoAssessmentId },
      data: { status: VideoAssessmentStatus.PENDING, retryCount: 0, lastFailureReason: null },
    });

    console.log(`[VideoEvaluation] Admin force-retry for ${videoAssessmentId}`);

    evaluateVideo({
      assessmentId: videoAssessmentId,
      videoUrl: videoAssessment.videoUrl,
      taskDescription: videoAssessment.assessment?.scenario?.taskDescription,
    }).catch((error) => {
      console.error(`[VideoEvaluation] Force retry failed for ${videoAssessmentId}:`, error);
    });

    return { success: true, videoAssessmentId };
  } catch (error) {
    console.error("[VideoEvaluation] Failed to force retry:", error);
    return {
      success: false,
      videoAssessmentId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export { VIDEO_EVALUATION_MODEL };
