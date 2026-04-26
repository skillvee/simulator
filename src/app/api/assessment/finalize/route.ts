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
 * - Records final completion timestamp
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
        workingStartedAt: true,
        completedAt: true,
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

    // Allow finalize from WORKING (legacy direct path), WALKTHROUGH_CALL (the
    // new flow — finalize owns the COMPLETED transition so a network failure
    // between transition + finalize can't strand the row mid-flow), or
    // COMPLETED (idempotent re-run). Reject WELCOME and other earlier phases
    // — candidate hasn't progressed far enough to finalize.
    if (
      assessment.status !== AssessmentStatus.WORKING &&
      assessment.status !== AssessmentStatus.WALKTHROUGH_CALL &&
      assessment.status !== AssessmentStatus.COMPLETED
    ) {
      return error(
        `Cannot finalize assessment in ${assessment.status} status.`,
        400
      );
    }

    // Calculate total duration (use workingStartedAt if available, else fall back to startedAt)
    const now = new Date();
    const timerStart = assessment.workingStartedAt ?? assessment.startedAt;
    const alreadyCompleted = assessment.status === AssessmentStatus.COMPLETED;
    const completedAt = alreadyCompleted
      ? (assessment.completedAt ?? now)
      : now;
    const totalDurationMs = completedAt.getTime() - timerStart.getTime();
    const totalDurationSeconds = Math.floor(totalDurationMs / 1000);

    // Idempotent: when status is already COMPLETED, skip the status flip and
    // preserve the original completedAt. Otherwise flip to COMPLETED — and
    // when coming from WALKTHROUGH_CALL also stamp `walkthroughEndedAt` so
    // the row reflects the call ending here, not in a separate transition
    // call that may never have happened (network failure between client
    // requests).
    const updatedAssessment = alreadyCompleted
      ? {
          id: assessment.id,
          status: assessment.status,
          startedAt: assessment.startedAt,
          completedAt,
          codeReview: assessment.codeReview,
        }
      : await db.assessment.update({
          where: { id: assessmentId },
          data: {
            status: AssessmentStatus.COMPLETED,
            completedAt: now,
            ...(assessment.status === AssessmentStatus.WALKTHROUGH_CALL
              ? { walkthroughEndedAt: now }
              : {}),
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
        completedAt: completedAt.toISOString(),
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
