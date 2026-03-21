import { requireAdmin, createLogger } from "@/lib/core";

const logger = createLogger("api:admin:video-retry");
import { db } from "@/server/db";
import {
  retryVideoAssessment,
  forceRetryVideoAssessment,
} from "@/lib/analysis";
import { VideoAssessmentStatus } from "@prisma/client";
import { success, error } from "@/lib/api";

/**
 * POST /api/admin/video-assessment/retry
 * Retries a failed video assessment.
 * Admin only - for manually retrying failed assessments.
 *
 * Request body:
 * - videoAssessmentId: string (required) - The ID of the video assessment to retry
 * - force: boolean (optional) - If true, resets retry count and forces retry even after 3 failures
 */
export async function POST(request: Request) {
  try {
    // Verify admin role
    await requireAdmin();

    const body = await request.json();
    const { videoAssessmentId, force } = body;

    if (!videoAssessmentId) {
      return error("videoAssessmentId is required", 400);
    }

    // Use force retry if requested (resets retry count, allows retry after 3 failures)
    const result = force
      ? await forceRetryVideoAssessment(videoAssessmentId)
      : await retryVideoAssessment(videoAssessmentId);

    if (!result.success) {
      return error(result.error || "Failed to retry assessment", 400);
    }

    return success({
      videoAssessmentId: result.videoAssessmentId,
      message: force
        ? "Video assessment force-retry initiated (retry count reset)"
        : "Video assessment retry initiated",
    });
  } catch (err) {
    logger.error("Error retrying video assessment", { error: err instanceof Error ? err.message : String(err) });
    return error("Internal server error", 500);
  }
}

/**
 * GET /api/admin/video-assessment/retry
 * Lists all failed video assessments that can be retried.
 * Admin only.
 *
 * Response includes:
 * - retryCount: number of retry attempts so far
 * - lastFailureReason: reason from the last failure
 * - canAutoRetry: whether the assessment can be retried automatically (retryCount < 3)
 */
export async function GET() {
  try {
    // Verify admin role
    await requireAdmin();

    const failedAssessments = await db.videoAssessment.findMany({
      where: {
        status: VideoAssessmentStatus.FAILED,
      },
      select: {
        id: true,
        candidateId: true,
        assessmentId: true,
        videoUrl: true,
        createdAt: true,
        retryCount: true,
        lastFailureReason: true,
        candidate: {
          select: {
            name: true,
            email: true,
          },
        },
        assessment: {
          select: {
            scenario: {
              select: {
                name: true,
              },
            },
          },
        },
        logs: {
          where: {
            eventType: "ERROR",
          },
          orderBy: {
            timestamp: "desc",
          },
          take: 1,
          select: {
            timestamp: true,
            metadata: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return success({
      failedAssessments: failedAssessments.map((assessment) => ({
        id: assessment.id,
        candidateId: assessment.candidateId,
        candidateName: assessment.candidate.name,
        candidateEmail: assessment.candidate.email,
        assessmentId: assessment.assessmentId,
        scenarioName: assessment.assessment?.scenario?.name,
        videoUrl: assessment.videoUrl,
        createdAt: assessment.createdAt.toISOString(),
        retryCount: assessment.retryCount,
        lastFailureReason: assessment.lastFailureReason,
        canAutoRetry: assessment.retryCount < 3,
        lastError: assessment.logs[0]?.metadata,
        lastErrorAt: assessment.logs[0]?.timestamp?.toISOString(),
      })),
      count: failedAssessments.length,
    });
  } catch (err) {
    logger.error("Error listing failed video assessments", { error: err instanceof Error ? err.message : String(err) });
    return error("Internal server error", 500);
  }
}
