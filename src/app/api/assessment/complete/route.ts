import { auth } from "@/auth";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";
import { isValidPrUrl } from "@/lib/external";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";

const logger = createLogger("api:assessment:complete");

/**
 * POST /api/assessment/complete
 * Records PR submission for an assessment
 * - Validates PR link
 * - Updates assessment with PR URL
 * - Assessment stays in WORKING status until defense call completes
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const body = await request.json();
    const { assessmentId, prUrl } = body;

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    if (!prUrl) {
      return error("PR URL is required", 400);
    }

    // Validate PR URL format
    if (!isValidPrUrl(prUrl)) {
      return error(
        "Invalid PR URL. Must be a valid GitHub or GitLab PR/MR link",
        400
      );
    }

    // Verify assessment exists and belongs to user
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to modify this assessment", 403);
    }

    // Check that assessment is in WORKING status
    if (assessment.status !== AssessmentStatus.WORKING) {
      return error(
        `Cannot complete assessment in ${assessment.status} status. Must be in WORKING status.`,
        400
      );
    }

    // Calculate working duration
    const now = new Date();
    const workingDurationMs = now.getTime() - assessment.startedAt.getTime();
    const workingDurationSeconds = Math.floor(workingDurationMs / 1000);

    // Update assessment with PR URL (status stays WORKING until defense call completes)
    const updatedAssessment = await db.assessment.update({
      where: { id: assessmentId },
      data: {
        prUrl,
        // Note: completedAt is set when the entire assessment is done (after defense call)
        // We track the working phase end time in the response
      },
      select: {
        id: true,
        status: true,
        prUrl: true,
        startedAt: true,
      },
    });

    return success({
      assessment: updatedAssessment,
      timing: {
        startedAt: assessment.startedAt.toISOString(),
        completedWorkingAt: now.toISOString(),
        workingDurationSeconds,
      },
    });
  } catch (err) {
    logger.error("Error completing assessment", { error: String(err) });
    return error("Failed to complete assessment", 500);
  }
}

/**
 * GET /api/assessment/complete
 * Get assessment timing information
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        prUrl: true,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to view this assessment", 403);
    }

    // Calculate elapsed time
    const now = new Date();
    const elapsedMs = now.getTime() - assessment.startedAt.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    return success({
      assessment: {
        id: assessment.id,
        status: assessment.status,
        prUrl: assessment.prUrl,
      },
      timing: {
        startedAt: assessment.startedAt.toISOString(),
        completedAt: assessment.completedAt?.toISOString() || null,
        elapsedSeconds,
      },
    });
  } catch (err) {
    logger.error("Error getting assessment status", { error: String(err) });
    return error("Failed to get assessment status", 500);
  }
}
