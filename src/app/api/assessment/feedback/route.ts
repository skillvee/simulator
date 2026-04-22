import { auth } from "@/auth";
import { success, error, validateRequest } from "@/lib/api";
import { AssessmentFeedbackSchema } from "@/lib/schemas";
import { db } from "@/server/db";

/**
 * POST /api/assessment/feedback
 * Saves candidate's rating (LIKE/DISLIKE) and optional comment about the
 * assessment experience. Idempotent per assessment — re-submits overwrite.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, AssessmentFeedbackSchema);
  if ("error" in validated) return validated.error;
  const { assessmentId, rating, comment } = validated.data;

  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, userId: session.user.id },
    select: { id: true },
  });
  if (!assessment) {
    return error("Not found", 404, "NOT_FOUND");
  }

  const saved = await db.assessmentFeedback.upsert({
    where: { assessmentId },
    create: { assessmentId, rating, comment: comment || null },
    update: { rating, comment: comment || null },
    select: { rating: true, comment: true },
  });

  return success(saved);
}
