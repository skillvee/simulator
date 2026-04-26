import { auth } from "@/auth";
import { success, error, validateRequest } from "@/lib/api";
import { AssessmentFinalizeSchema } from "@/lib/schemas";
import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { finalizeAssessment } from "@/lib/analysis/finalize-assessment";

const logger = createLogger("api:assessment:finalize");

/**
 * POST /api/assessment/finalize
 * Marks assessment as fully completed after the defense call.
 *
 * Thin wrapper over `finalizeAssessment` (lib/analysis) — the same helper is
 * also called by the work-page hard-expiry guard and the finalize-stale cron,
 * so all three entrypoints share one status-flip + side-effect pipeline.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const validated = await validateRequest(request, AssessmentFinalizeSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId } = validated.data;

    // Ownership check before delegating — keeps cross-user finalize attempts
    // from reaching the helper. The helper itself is auth-agnostic.
    const owner = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true },
    });
    if (!owner) {
      return error("Assessment not found", 404);
    }
    if (owner.userId !== session.user.id) {
      return error("Unauthorized to modify this assessment", 403);
    }

    const result = await finalizeAssessment(assessmentId);
    if (!result.ok) {
      const status = result.code === "NOT_FOUND" ? 404 : 400;
      return error(result.message, status);
    }

    return success({
      assessment: result.assessment,
      timing: {
        startedAt: result.timing.startedAt.toISOString(),
        completedAt: result.timing.completedAt.toISOString(),
        totalDurationSeconds: result.timing.totalDurationSeconds,
      },
      videoAssessment: {
        triggered: result.videoAssessment.triggered,
        videoAssessmentId: null, // Resolved async after response
        hasRecording: result.videoAssessment.hasRecording,
      },
      profilePhoto: result.profilePhoto,
    });
  } catch (err) {
    logger.error("Error finalizing assessment", { error: String(err) });
    return error("Failed to finalize assessment", 500);
  }
}
