import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assessmentId } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "Assessment ID is required" },
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

    // Check that assessment is in WORKING status (after PR submission, before defense)
    if (assessment.status !== AssessmentStatus.WORKING) {
      return NextResponse.json(
        {
          error: `Cannot finalize assessment in ${assessment.status} status. Must be in WORKING status.`,
        },
        { status: 400 }
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
      } catch (error) {
        console.warn(
          `CI status fetch warning for assessment ${assessmentId}:`,
          error
        );
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
          console.warn(
            `PR cleanup warning for assessment ${assessmentId}:`,
            prCleanupResult.message
          );
        }
      } catch (error) {
        console.error(
          `PR cleanup error for assessment ${assessmentId}:`,
          error
        );
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
          console.warn(
            `Video assessment trigger warning for ${assessmentId}:`,
            videoAssessmentResult.error
          );
        }
      } catch (error) {
        console.warn(
          `Video assessment trigger error for ${assessmentId}:`,
          error
        );
        // Don't fail the finalization if video assessment trigger fails
      }
    }

    return NextResponse.json({
      success: true,
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
    });
  } catch (error) {
    console.error("Error finalizing assessment:", error);
    return NextResponse.json(
      { error: "Failed to finalize assessment" },
      { status: 500 }
    );
  }
}
