import { auth } from "@/auth";
import { success, error, validateRequest } from "@/lib/api";
import { AssessmentStartSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { getDeadlineAt } from "@/lib/core/assessment-timer";
import { AssessmentStatus } from "@prisma/client";
import type { SimulationDepth } from "@/types";

const logger = createLogger("api:assessment:start");

/**
 * POST /api/assessment/start
 * Transitions WELCOME → REVIEW_MATERIALS and starts the session clock.
 * Called when the candidate clicks "Start Simulation" on the welcome page.
 *
 * The candidate's first phase is now "review the brief + materials." Subsequent
 * phases (KICKOFF_CALL → WORKING → WALKTHROUGH_CALL → COMPLETED) move via
 * /api/assessment/transition.
 *
 * `workingStartedAt` is kept set to the same moment for backwards compatibility —
 * the deadline math and any legacy consumers reading that field continue working.
 *
 * Idempotent: if the session clock is already running, returns the existing
 * timestamp without changing status.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const validated = await validateRequest(request, AssessmentStartSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId } = validated.data;

    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        workingStartedAt: true,
        reviewStartedAt: true,
        scenario: {
          select: { simulationDepth: true },
        },
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to modify this assessment", 403);
    }

    const depth = (assessment.scenario.simulationDepth || "medium") as SimulationDepth;

    // Idempotent: if the session clock is already running, return the existing
    // anchor. Prefer reviewStartedAt, fall back to workingStartedAt for rows
    // that started before the phase split.
    const existingClockStart = assessment.reviewStartedAt ?? assessment.workingStartedAt;
    if (existingClockStart) {
      const deadlineAt = getDeadlineAt(existingClockStart, depth);
      return success({
        workingStartedAt: existingClockStart.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
      });
    }

    if (assessment.status === AssessmentStatus.COMPLETED) {
      return error("Assessment is already completed", 400);
    }

    const now = new Date();
    const deadlineAt = getDeadlineAt(now, depth);

    await db.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.REVIEW_MATERIALS,
        reviewStartedAt: now,
        workingStartedAt: now,
      },
    });

    logger.info("Assessment started", {
      assessmentId,
      reviewStartedAt: now.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
    });

    return success({
      workingStartedAt: now.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
    });
  } catch (err) {
    logger.error("Error starting assessment", { error: String(err) });
    return error("Failed to start assessment", 500);
  }
}
