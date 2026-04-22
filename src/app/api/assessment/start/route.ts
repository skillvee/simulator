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
 * Marks the assessment as WORKING and records when the candidate started.
 * This is called when the candidate clicks "Start Simulation" on the welcome page.
 *
 * Idempotent: if workingStartedAt is already set, returns the existing value.
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

    // Idempotent: if already started, return existing timestamp
    if (assessment.workingStartedAt) {
      const deadlineAt = getDeadlineAt(assessment.workingStartedAt, depth);
      return success({
        workingStartedAt: assessment.workingStartedAt.toISOString(),
        deadlineAt: deadlineAt.toISOString(),
      });
    }

    // Only allow starting from WELCOME or WORKING (for backward compat)
    if (assessment.status === AssessmentStatus.COMPLETED) {
      return error("Assessment is already completed", 400);
    }

    const now = new Date();
    const deadlineAt = getDeadlineAt(now, depth);

    await db.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.WORKING,
        workingStartedAt: now,
      },
    });

    logger.info("Assessment started", {
      assessmentId,
      workingStartedAt: now.toISOString(),
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
