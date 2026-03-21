import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { VideoAssessmentStatus } from "@prisma/client";
import { getEvaluationResults, evaluateVideo } from "@/lib/analysis/video-evaluation";
import { migrateVideoEvaluationToRubric } from "@/lib/analysis/report-migration";
import type { RubricAssessmentOutput } from "@/types";

const logger = createLogger("analysis:report-data");

/** Shape returned by fetchAssessmentForReport */
export interface AssessmentReportData {
  id: string;
  userId: string;
  status: string;
  report: unknown;
  startedAt: Date;
  completedAt: Date | null;
  user: { name: string | null; email: string | null };
  conversations: { coworkerId: string | null }[];
  recordings: { storageUrl: string }[];
  scenario: { taskDescription: string };
}

/**
 * Fetch assessment data needed for report generation
 */
export async function fetchAssessmentForReport(assessmentId: string): Promise<AssessmentReportData | null> {
  return db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      userId: true,
      status: true,
      report: true,
      startedAt: true,
      completedAt: true,
      user: {
        select: { name: true, email: true },
      },
      conversations: {
        select: { coworkerId: true },
        where: { coworkerId: { not: null } },
      },
      recordings: {
        where: { type: "screen" },
        select: { storageUrl: true },
        take: 1,
      },
      scenario: {
        select: { taskDescription: true },
      },
    },
  });
}

/** Result of resolving video evaluation for report generation */
export type ResolvedVideoEvaluation =
  | { status: "success"; data: RubricAssessmentOutput }
  | { status: "processing" }
  | { status: "error"; message: string };

/**
 * Resolve or trigger video evaluation for an assessment.
 * Returns the rubric assessment output or an error/processing status.
 */
export async function resolveVideoEvaluation(
  assessmentId: string,
  videoUrl: string,
  taskDescription: string,
  userId: string
): Promise<ResolvedVideoEvaluation> {
  const videoAssessment = await db.videoAssessment.findUnique({
    where: { assessmentId },
    select: {
      id: true,
      status: true,
      summary: {
        select: { rawAiResponse: true },
      },
    },
  });

  // Use existing completed evaluation
  if (videoAssessment?.status === VideoAssessmentStatus.COMPLETED && videoAssessment.summary?.rawAiResponse) {
    const videoResult = migrateVideoEvaluationToRubric(videoAssessment.summary.rawAiResponse);
    if (!videoResult) {
      logger.error("Failed to migrate video evaluation format", { assessmentId });
      return { status: "error", message: "Could not retrieve video evaluation results" };
    }
    return { status: "success", data: videoResult };
  }

  // Still processing
  if (videoAssessment?.status === VideoAssessmentStatus.PROCESSING) {
    return { status: "processing" };
  }

  // Trigger new evaluation (PENDING, FAILED, or no record)
  if (!videoAssessment || videoAssessment.status === VideoAssessmentStatus.PENDING ||
      videoAssessment.status === VideoAssessmentStatus.FAILED) {
    try {
      let videoAssessmentId: string;

      if (!videoAssessment) {
        const newVideoAssessment = await db.videoAssessment.create({
          data: {
            candidateId: userId,
            assessmentId,
            videoUrl,
            status: VideoAssessmentStatus.PENDING,
          },
        });
        videoAssessmentId = newVideoAssessment.id;
      } else {
        videoAssessmentId = videoAssessment.id;
        await db.videoAssessment.update({
          where: { id: videoAssessmentId },
          data: { status: VideoAssessmentStatus.PENDING },
        });
      }

      const evalResult = await evaluateVideo({
        assessmentId: videoAssessmentId,
        videoUrl,
        taskDescription,
      });

      if (!evalResult.success) {
        logger.error("Video evaluation failed", { error: evalResult.error });
        return { status: "error", message: "Video evaluation failed" };
      }

      const results = await getEvaluationResults(videoAssessmentId);
      if (results.summary?.rawAiResponse) {
        const videoResult = migrateVideoEvaluationToRubric(results.summary.rawAiResponse);
        if (!videoResult) {
          logger.error("Failed to migrate newly evaluated video format", { assessmentId });
          return { status: "error", message: "Could not retrieve video evaluation results" };
        }
        return { status: "success", data: videoResult };
      }

      return { status: "error", message: "Could not retrieve video evaluation results" };
    } catch (err) {
      logger.error("Error running video evaluation", { error: String(err) });
      return { status: "error", message: "Failed to evaluate video" };
    }
  }

  return { status: "error", message: "Could not retrieve video evaluation results" };
}

/**
 * Calculate timing metrics for the assessment
 */
export function calculateTiming(startedAt: Date, completedAt: Date | null): {
  totalDurationMinutes: number;
  workingPhaseMinutes: number;
} {
  const completed = completedAt || new Date();
  const totalDurationMs = completed.getTime() - startedAt.getTime();
  const totalDurationMinutes = Math.floor(totalDurationMs / 60000);
  return { totalDurationMinutes, workingPhaseMinutes: totalDurationMinutes };
}

/**
 * Count unique coworkers contacted in an assessment
 */
export function countUniqueCoworkers(conversations: { coworkerId: string | null }[]): number {
  const uniqueCoworkerIds = new Set(
    conversations
      .map(c => c.coworkerId)
      .filter((id): id is string => id !== null)
  );
  return uniqueCoworkerIds.size;
}
