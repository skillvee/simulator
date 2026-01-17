/**
 * Admin Assessment Retry API
 *
 * POST /api/admin/assessment/retry
 * Manually triggers a reassessment for a failed or completed assessment.
 * Creates a fresh assessment record and marks the old one as superseded.
 *
 * @since 2026-01-17
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/server/db";
import { AssessmentStatus, Prisma } from "@prisma/client";
import {
  triggerVideoAssessment,
  type TriggerVideoAssessmentResult,
} from "@/lib/video-evaluation";

// Allowed statuses for reassessment
const RETRIABLE_STATUSES: AssessmentStatus[] = [
  AssessmentStatus.COMPLETED,
  AssessmentStatus.PROCESSING,
];

export interface RetryAssessmentRequest {
  assessmentId: string;
}

export interface RetryAssessmentResponse {
  success: boolean;
  newAssessmentId?: string;
  oldAssessmentId?: string;
  message: string;
  videoAssessment?: {
    triggered: boolean;
    videoAssessmentId: string | null;
  };
}

/**
 * POST /api/admin/assessment/retry
 * Triggers a reassessment for a failed or completed assessment.
 *
 * Creates a NEW assessment record with fresh data and marks the old
 * assessment with superseded_by pointing to the new assessment ID.
 *
 * The new assessment logs will include "triggered_by: admin_retry" in metadata.
 */
export async function POST(
  request: Request
): Promise<NextResponse<RetryAssessmentResponse>> {
  try {
    // Verify admin access
    await requireAdmin();

    const body = await request.json();
    const { assessmentId } = body as RetryAssessmentRequest;

    if (!assessmentId) {
      return NextResponse.json(
        { success: false, message: "Assessment ID is required" },
        { status: 400 }
      );
    }

    // Fetch the original assessment with all required data for recreation
    const originalAssessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        user: { select: { id: true } },
        scenario: { select: { id: true, taskDescription: true } },
        recordings: {
          where: { type: "screen" },
          select: { storageUrl: true },
          take: 1,
        },
        logs: {
          select: { eventType: true },
        },
      },
    });

    if (!originalAssessment) {
      return NextResponse.json(
        { success: false, message: "Assessment not found" },
        { status: 404 }
      );
    }

    // Check if assessment has errors (for visibility) or is completed
    const hasErrors = originalAssessment.logs.some(
      (log) => log.eventType === "ERROR"
    );

    // Validate status - only allow retry for failed or completed assessments
    if (
      !RETRIABLE_STATUSES.includes(originalAssessment.status) &&
      !hasErrors
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot retry assessment with status ${originalAssessment.status}. Retry is only available for completed or failed assessments.`,
        },
        { status: 400 }
      );
    }

    // Create a new assessment record (preserving history)
    const newAssessment = await db.assessment.create({
      data: {
        userId: originalAssessment.userId,
        scenarioId: originalAssessment.scenarioId,
        status: AssessmentStatus.PROCESSING,
        // Copy relevant data from original assessment
        cvUrl: originalAssessment.cvUrl,
        parsedProfile: originalAssessment.parsedProfile as Prisma.InputJsonValue | undefined,
        prUrl: originalAssessment.prUrl,
        prSnapshot: originalAssessment.prSnapshot as Prisma.InputJsonValue | undefined,
        ciStatus: originalAssessment.ciStatus as Prisma.InputJsonValue | undefined,
        codeReview: originalAssessment.codeReview as Prisma.InputJsonValue | undefined,
      },
    });

    // Update the original assessment to mark it as superseded
    await db.assessment.update({
      where: { id: assessmentId },
      data: {
        supersededBy: newAssessment.id,
      },
    });

    // Log the admin retry event on the new assessment
    await db.assessmentLog.create({
      data: {
        assessmentId: newAssessment.id,
        eventType: "STARTED",
        metadata: {
          triggered_by: "admin_retry",
          original_assessment_id: assessmentId,
          retry_reason: hasErrors ? "assessment_failure" : "manual_retry",
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Trigger video assessment if recording exists
    let videoAssessmentResult: TriggerVideoAssessmentResult | null = null;
    const recordingUrl = originalAssessment.recordings[0]?.storageUrl;

    if (recordingUrl) {
      try {
        videoAssessmentResult = await triggerVideoAssessment({
          assessmentId: newAssessment.id,
          candidateId: originalAssessment.userId,
          videoUrl: recordingUrl,
          taskDescription: originalAssessment.scenario.taskDescription,
        });

        if (!videoAssessmentResult.success) {
          console.warn(
            `Video assessment trigger warning for retry ${newAssessment.id}:`,
            videoAssessmentResult.error
          );
        }
      } catch (error) {
        console.warn(
          `Video assessment trigger error for retry ${newAssessment.id}:`,
          error
        );
        // Don't fail the reassessment if video assessment trigger fails
      }
    }

    console.log(
      `[Admin] Assessment retry initiated: ${assessmentId} -> ${newAssessment.id}`
    );

    return NextResponse.json({
      success: true,
      newAssessmentId: newAssessment.id,
      oldAssessmentId: assessmentId,
      message: "Reassessment queued successfully",
      videoAssessment: videoAssessmentResult
        ? {
            triggered: true,
            videoAssessmentId: videoAssessmentResult.videoAssessmentId,
          }
        : {
            triggered: false,
            videoAssessmentId: null,
          },
    });
  } catch (error) {
    console.error("Error creating reassessment:", error);

    // Check if it's an auth error from requireAdmin
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create reassessment" },
      { status: 500 }
    );
  }
}
