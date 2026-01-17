import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/server/db";
import { retryVideoAssessment, forceRetryVideoAssessment } from "@/lib/video-evaluation";
import { VideoAssessmentStatus } from "@prisma/client";

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
      return NextResponse.json(
        { error: "videoAssessmentId is required" },
        { status: 400 }
      );
    }

    // Use force retry if requested (resets retry count, allows retry after 3 failures)
    const result = force
      ? await forceRetryVideoAssessment(videoAssessmentId)
      : await retryVideoAssessment(videoAssessmentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to retry assessment" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      videoAssessmentId: result.videoAssessmentId,
      message: force
        ? "Video assessment force-retry initiated (retry count reset)"
        : "Video assessment retry initiated",
    });
  } catch (error) {
    console.error("Error retrying video assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    return NextResponse.json({
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
  } catch (error) {
    console.error("Error listing failed video assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
