import { auth } from "@/auth";
import { success, error, validateRequest } from "@/lib/api";
import { AssessmentTransitionSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import {
  canTransition,
  getTargetStatus,
  type TransitionAction,
} from "@/lib/core/assessment-phase";

const logger = createLogger("api:assessment:transition");

/**
 * POST /api/assessment/transition
 * Moves an assessment between phases in the 4-phase flow:
 *   REVIEW_MATERIALS → KICKOFF_CALL → WORKING → WALKTHROUGH_CALL → COMPLETED
 *
 * Stamps the corresponding timestamp column on the way through.
 * Idempotent: a transition already applied returns the existing state as 200.
 * Invalid transitions (wrong source status) return 400.
 *
 * Note: `end_walkthrough` flips status to COMPLETED here, but the
 * post-assessment pipeline (video eval, profile photo, merge recordings)
 * still lives in /api/assessment/finalize which the client calls next.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const validated = await validateRequest(request, AssessmentTransitionSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId, action } = validated.data;

    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        kickoffStartedAt: true,
        kickoffEndedAt: true,
        workStartedAt: true,
        walkthroughStartedAt: true,
        walkthroughEndedAt: true,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to modify this assessment", 403);
    }

    const target = getTargetStatus(action);

    // Idempotent: if we're already at (or past) the target and the matching
    // timestamp is set, treat as a no-op. "Past" detection isn't straightforward
    // because status is a narrow enum — keep the check focused on exact-match.
    if (assessment.status === target) {
      return success({
        status: assessment.status,
        alreadyApplied: true,
      });
    }

    if (!canTransition(assessment.status, action as TransitionAction)) {
      return error(
        `Cannot ${action} from status ${assessment.status}`,
        400,
        "INVALID_TRANSITION"
      );
    }

    const now = new Date();
    const update: Record<string, unknown> = { status: target };

    switch (action) {
      case "start_kickoff":
        update.kickoffStartedAt = now;
        break;
      case "end_kickoff":
        update.kickoffEndedAt = now;
        update.workStartedAt = now;
        break;
      case "start_walkthrough":
        update.walkthroughStartedAt = now;
        break;
      case "end_walkthrough":
        update.walkthroughEndedAt = now;
        update.completedAt = now;
        break;
    }

    await db.assessment.update({
      where: { id: assessmentId },
      data: update,
    });

    logger.info("Assessment transitioned", {
      assessmentId,
      action,
      from: assessment.status,
      to: target,
    });

    return success({
      status: target,
      alreadyApplied: false,
    });
  } catch (err) {
    logger.error("Error transitioning assessment", { error: String(err) });
    return error("Failed to transition assessment", 500);
  }
}
