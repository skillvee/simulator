import { auth } from "@/auth";
import { success, error, validateRequest } from "@/lib/api";
import { AssessmentFinalizeSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { AssessmentStatus } from "@prisma/client";
import {
  triggerVideoAssessment,
  mergeRecordingChunks,
} from "@/lib/analysis";
import {
  generateProfilePhoto,
  type GenerateProfilePhotoResult,
} from "@/lib/candidate";

const logger = createLogger("api:assessment:finalize");

/**
 * POST /api/assessment/finalize
 * Marks assessment as fully completed after the defense call
 * - Transitions status from WORKING to COMPLETED
 * - Records final completion timestamp
 * - Cleans up (closes) the submitted PR to prevent scenario leakage
 * - Preserves PR content in prSnapshot for historical reference
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const validated = await validateRequest(request, AssessmentFinalizeSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId } = validated.data;

    // Verify assessment exists and belongs to user
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        codeReview: true,
        scenario: {
          select: {
            taskDescription: true,
          },
        },
        recordings: {
          where: { type: "screen" },
          select: {
            storageUrl: true,
          },
          take: 1,
        },
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to modify this assessment", 403);
    }

    // Check that assessment is in WORKING status (after PR submission, before defense)
    if (assessment.status !== AssessmentStatus.WORKING) {
      return error(
        `Cannot finalize assessment in ${assessment.status} status. Must be in WORKING status.`,
        400
      );
    }

    // Calculate total duration
    const now = new Date();
    const totalDurationMs = now.getTime() - assessment.startedAt.getTime();
    const totalDurationSeconds = Math.floor(totalDurationMs / 1000);

    // Update assessment status to COMPLETED
    const updatedAssessment = await db.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: now,
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        codeReview: true,
      },
    });

    // Merge recording chunks and trigger video assessment (async, non-blocking)
    // The merge + Gemini upload + ACTIVE polling can take minutes for large videos,
    // so we fire-and-forget to avoid blocking the HTTP response.
    let videoAssessmentTriggered = false;
    const recordingUrl = assessment.recordings[0]?.storageUrl;

    if (recordingUrl) {
      videoAssessmentTriggered = true;
      const candidateId = session.user.id;
      const taskDescription = assessment.scenario.taskDescription;

      // Fire-and-forget: merge + evaluate in background
      mergeRecordingChunks(assessmentId)
        .then((mergeResult) => {
          if (mergeResult.success && mergeResult.geminiFileUri) {
            logger.info("Recording merged successfully", {
              assessmentId,
              segments: String(mergeResult.totalSegments),
              chunks: String(mergeResult.totalChunks),
              sizeBytes: String(mergeResult.totalSizeBytes),
            });
          } else {
            logger.warn("Recording merge failed, falling back to last chunk URL", {
              assessmentId,
              error: mergeResult.error,
            });
          }

          return triggerVideoAssessment({
            assessmentId,
            candidateId,
            videoUrl: recordingUrl,
            geminiFileUri: mergeResult.geminiFileUri,
            taskDescription,
          });
        })
        .then((result) => {
          if (result && !result.success) {
            logger.warn("Video assessment trigger warning", { assessmentId, error: result.error });
          }
        })
        .catch((err) => {
          logger.warn("Video assessment trigger error", { assessmentId, error: String(err) });
        });
    }

    // Trigger profile photo generation (async, non-blocking)
    let profilePhotoResult: GenerateProfilePhotoResult | null = null;
    try {
      profilePhotoResult = await generateProfilePhoto({
        assessmentId,
        userId: session.user.id,
      });

      if (!profilePhotoResult.success) {
        logger.warn("Profile photo generation warning", { assessmentId, error: profilePhotoResult.error });
      }
    } catch (err) {
      logger.warn("Profile photo generation error", { assessmentId, error: String(err) });
      // Don't fail the finalization if profile photo generation fails
    }

    return success({
      assessment: updatedAssessment,
      timing: {
        startedAt: assessment.startedAt.toISOString(),
        completedAt: now.toISOString(),
        totalDurationSeconds,
      },
      videoAssessment: {
          triggered: videoAssessmentTriggered,
          videoAssessmentId: null, // Resolved async after response
          hasRecording: !!recordingUrl,
        },
      profilePhoto: profilePhotoResult
        ? {
            generated: profilePhotoResult.success,
            imageUrl: profilePhotoResult.imageUrl,
          }
        : {
            generated: false,
            imageUrl: null,
          },
    });
  } catch (err) {
    logger.error("Error finalizing assessment", { error: String(err) });
    return error("Failed to finalize assessment", 500);
  }
}
