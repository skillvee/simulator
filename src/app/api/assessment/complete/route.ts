import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";
import { isValidPrUrl } from "@/lib/pr-validation";

/**
 * POST /api/assessment/complete
 * Marks assessment as complete (transitions to FINAL_DEFENSE phase)
 * - Validates PR link
 * - Updates assessment status
 * - Records completion time for time tracking
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assessmentId, prUrl } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
    }

    if (!prUrl) {
      return NextResponse.json(
        { error: "PR URL is required" },
        { status: 400 }
      );
    }

    // Validate PR URL format
    if (!isValidPrUrl(prUrl)) {
      return NextResponse.json(
        { error: "Invalid PR URL. Must be a valid GitHub or GitLab PR/MR link" },
        { status: 400 }
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
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to modify this assessment" },
        { status: 403 }
      );
    }

    // Check that assessment is in WORKING status
    if (assessment.status !== AssessmentStatus.WORKING) {
      return NextResponse.json(
        {
          error: `Cannot complete assessment in ${assessment.status} status. Must be in WORKING status.`,
        },
        { status: 400 }
      );
    }

    // Calculate working duration
    const now = new Date();
    const workingDurationMs = now.getTime() - assessment.startedAt.getTime();
    const workingDurationSeconds = Math.floor(workingDurationMs / 1000);

    // Update assessment status to FINAL_DEFENSE
    const updatedAssessment = await db.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.FINAL_DEFENSE,
        prUrl,
        // Note: completedAt is set when the entire assessment is done (after final defense)
        // We track the working phase end time in the response
      },
      select: {
        id: true,
        status: true,
        prUrl: true,
        startedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      assessment: updatedAssessment,
      timing: {
        startedAt: assessment.startedAt.toISOString(),
        completedWorkingAt: now.toISOString(),
        workingDurationSeconds,
      },
    });
  } catch (error) {
    console.error("Error completing assessment:", error);
    return NextResponse.json(
      { error: "Failed to complete assessment" },
      { status: 500 }
    );
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    if (assessment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to view this assessment" },
        { status: 403 }
      );
    }

    // Calculate elapsed time
    const now = new Date();
    const elapsedMs = now.getTime() - assessment.startedAt.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    return NextResponse.json({
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
  } catch (error) {
    console.error("Error getting assessment status:", error);
    return NextResponse.json(
      { error: "Failed to get assessment status" },
      { status: 500 }
    );
  }
}

