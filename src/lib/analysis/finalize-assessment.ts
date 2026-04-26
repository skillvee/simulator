import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { AssessmentStatus } from "@prisma/client";
import { generateProfilePhoto } from "@/lib/candidate";
import { mergeRecordingChunks } from "./video-merge";
import { triggerVideoAssessment } from "./video-evaluation";

const logger = createLogger("lib:analysis:finalize-assessment");

export type FinalizeAssessmentSuccess = {
  ok: true;
  assessment: {
    id: string;
    status: AssessmentStatus;
    startedAt: Date;
    completedAt: Date | null;
    codeReview: unknown;
  };
  timing: {
    startedAt: Date;
    completedAt: Date;
    totalDurationSeconds: number;
  };
  videoAssessment: {
    triggered: boolean;
    hasRecording: boolean;
  };
  profilePhoto: {
    generated: boolean;
    imageUrl: string | null;
  };
};

export type FinalizeAssessmentError = {
  ok: false;
  code: "NOT_FOUND" | "INVALID_STATUS";
  message: string;
};

export type FinalizeAssessmentResult =
  | FinalizeAssessmentSuccess
  | FinalizeAssessmentError;

/**
 * Shared finalization pipeline. Owns the WORKING/WALKTHROUGH_CALL → COMPLETED
 * status flip *and* the downstream side effects (recording merge, video
 * evaluation trigger, profile photo generation). Idempotent on already-
 * COMPLETED rows so the safety-net entrypoints (work-page hard-expiry, cron)
 * can call it freely without double-running.
 *
 * Three callers today:
 *   - POST /api/assessment/finalize  (candidate-driven, after walkthrough)
 *   - work/page.tsx hard-expiry      (reload past cap+grace)
 *   - GET /api/cron/finalize-stale   (idle-tab safety net)
 */
export async function finalizeAssessment(
  assessmentId: string
): Promise<FinalizeAssessmentResult> {
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
      scenario: { select: { taskDescription: true } },
      recordings: {
        where: { type: "screen" },
        select: { storageUrl: true },
        take: 1,
      },
    },
  });

  if (!assessment) {
    return { ok: false, code: "NOT_FOUND", message: "Assessment not found" };
  }

  // Allowed source statuses: WORKING (legacy direct path), KICKOFF_CALL or
  // WALKTHROUGH_CALL (mid-flow, finalize owns the COMPLETED flip), or
  // COMPLETED (idempotent re-run from cron / hard-expiry). Reject earlier
  // phases — candidate hasn't progressed enough to finalize.
  const finalizable: AssessmentStatus[] = [
    AssessmentStatus.WORKING,
    AssessmentStatus.KICKOFF_CALL,
    AssessmentStatus.WALKTHROUGH_CALL,
    AssessmentStatus.COMPLETED,
  ];
  if (!finalizable.includes(assessment.status)) {
    return {
      ok: false,
      code: "INVALID_STATUS",
      message: `Cannot finalize assessment in ${assessment.status} status.`,
    };
  }

  const now = new Date();
  const timerStart = assessment.workingStartedAt ?? assessment.startedAt;
  const alreadyCompleted = assessment.status === AssessmentStatus.COMPLETED;
  const completedAt = alreadyCompleted
    ? (assessment.completedAt ?? now)
    : now;
  const totalDurationSeconds = Math.floor(
    (completedAt.getTime() - timerStart.getTime()) / 1000
  );

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

  // Skip side effects on idempotent re-runs — they were already triggered
  // (or attempted) on the first call, and re-firing video evaluation would
  // burn Gemini credits + risk overwriting partial results.
  if (alreadyCompleted) {
    return {
      ok: true,
      assessment: updatedAssessment,
      timing: {
        startedAt: assessment.startedAt,
        completedAt,
        totalDurationSeconds,
      },
      videoAssessment: { triggered: false, hasRecording: false },
      profilePhoto: { generated: false, imageUrl: null },
    };
  }

  // Fire-and-forget recording merge + video evaluation. Both can take minutes
  // (Gemini upload + ACTIVE polling), so we don't block the caller.
  const recordingUrl = assessment.recordings[0]?.storageUrl;
  let videoAssessmentTriggered = false;
  if (recordingUrl) {
    videoAssessmentTriggered = true;
    const candidateId = assessment.userId;
    const taskDescription = assessment.scenario.taskDescription;

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
          logger.warn("Video assessment trigger warning", {
            assessmentId,
            error: result.error,
          });
        }
      })
      .catch((err) => {
        logger.warn("Video assessment trigger error", {
          assessmentId,
          error: String(err),
        });
      });
  }

  // Profile photo generation — awaited, but failures are non-fatal.
  let profilePhotoGenerated = false;
  let profilePhotoUrl: string | null = null;
  try {
    const result = await generateProfilePhoto({
      assessmentId,
      userId: assessment.userId,
    });
    profilePhotoGenerated = result.success;
    profilePhotoUrl = result.imageUrl;
    if (!result.success) {
      logger.warn("Profile photo generation warning", {
        assessmentId,
        error: result.error,
      });
    }
  } catch (err) {
    logger.warn("Profile photo generation error", {
      assessmentId,
      error: String(err),
    });
  }

  return {
    ok: true,
    assessment: updatedAssessment,
    timing: {
      startedAt: assessment.startedAt,
      completedAt,
      totalDurationSeconds,
    },
    videoAssessment: {
      triggered: videoAssessmentTriggered,
      hasRecording: !!recordingUrl,
    },
    profilePhoto: {
      generated: profilePhotoGenerated,
      imageUrl: profilePhotoUrl,
    },
  };
}
