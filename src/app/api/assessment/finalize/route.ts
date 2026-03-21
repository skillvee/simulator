import { auth } from "@/auth";
import { success, error, validateRequest } from "@/lib/api";
import { AssessmentFinalizeSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { AssessmentStatus, Prisma } from "@prisma/client";
import {
  cleanupPrAfterAssessment,
  fetchPrCiStatus,
  type PrCleanupResult,
  type PrCiStatus,
} from "@/lib/external";
import {
  triggerVideoAssessment,
  type TriggerVideoAssessmentResult,
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
        prUrl: true,
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

    // Fetch final CI status before cleanup (to capture test pass/fail status)
    // This is the authoritative CI status used in the final assessment
    let finalCiStatus: PrCiStatus | null = null;
    if (assessment.prUrl) {
      try {
        finalCiStatus = await fetchPrCiStatus(assessment.prUrl);
      } catch (err) {
        logger.warn("CI status fetch failed", { assessmentId, error: String(err) });
        // Continue without CI status - don't block finalization
      }
    }

    // Clean up PR after assessment (close it to prevent scenario leakage)
    // This is done gracefully - failure doesn't block finalization
    let prCleanupResult: PrCleanupResult | null = null;
    if (assessment.prUrl) {
      try {
        prCleanupResult = await cleanupPrAfterAssessment(assessment.prUrl);
        if (!prCleanupResult.success) {
          logger.warn("PR cleanup warning", { assessmentId, message: prCleanupResult.message });
        }
      } catch (err) {
        logger.error("PR cleanup error", { assessmentId, error: String(err) });
        // Don't fail the finalization if PR cleanup fails
      }
    }

    // Update assessment status to COMPLETED and store PR snapshot + CI status
    const updatedAssessment = await db.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: now,
        // Store PR snapshot for historical reference
        ...(prCleanupResult?.prSnapshot && {
          prSnapshot:
            prCleanupResult.prSnapshot as unknown as Prisma.InputJsonValue,
        }),
        // Store final CI status for assessment
        ...(finalCiStatus && {
          ciStatus: finalCiStatus as unknown as Prisma.InputJsonValue,
        }),
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        prUrl: true,
        ciStatus: true,
        codeReview: true,
      },
    });

    // Trigger video assessment if recording exists (async, non-blocking)
    let videoAssessmentResult: TriggerVideoAssessmentResult | null = null;
    const recordingUrl = assessment.recordings[0]?.storageUrl;

    if (recordingUrl) {
      try {
        videoAssessmentResult = await triggerVideoAssessment({
          assessmentId,
          candidateId: session.user.id,
          videoUrl: recordingUrl,
          taskDescription: assessment.scenario.taskDescription,
        });

        if (!videoAssessmentResult.success) {
          logger.warn("Video assessment trigger warning", { assessmentId, error: videoAssessmentResult.error });
        }
      } catch (err) {
        logger.warn("Video assessment trigger error", { assessmentId, error: String(err) });
        // Don't fail the finalization if video assessment trigger fails
      }
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
      prCleanup: prCleanupResult
        ? {
            success: prCleanupResult.success,
            action: prCleanupResult.action,
            message: prCleanupResult.message,
          }
        : null,
      ciStatus: finalCiStatus
        ? {
            overallStatus: finalCiStatus.overallStatus,
            checksCount: finalCiStatus.checksCount,
            checksPassed: finalCiStatus.checksPassed,
            checksFailed: finalCiStatus.checksFailed,
            testResults: finalCiStatus.testResults,
          }
        : null,
      videoAssessment: videoAssessmentResult
        ? {
            triggered: true,
            videoAssessmentId: videoAssessmentResult.videoAssessmentId,
            hasRecording: !!recordingUrl,
          }
        : {
            triggered: false,
            videoAssessmentId: null,
            hasRecording: false,
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
