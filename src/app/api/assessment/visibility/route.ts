import { auth } from "@/auth";
import { success, error, validateRequest } from "@/lib/api";
import { AssessmentVisibilitySchema } from "@/lib/schemas";
import { db } from "@/server/db";

/**
 * POST /api/assessment/visibility
 * Sets the candidate's profile visibility (isSearchable) for this assessment.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const validated = await validateRequest(request, AssessmentVisibilitySchema);
  if ("error" in validated) return validated.error;
  const { assessmentId, isSearchable } = validated.data;

  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, userId: session.user.id },
    select: { id: true, videoAssessment: { select: { id: true } } },
  });
  if (!assessment) {
    return error("Not found", 404, "NOT_FOUND");
  }
  if (!assessment.videoAssessment) {
    return error(
      "No assessment profile to share yet",
      409,
      "NO_VIDEO_ASSESSMENT"
    );
  }

  await db.videoAssessment.update({
    where: { id: assessment.videoAssessment.id },
    data: { isSearchable },
  });

  return success({ isSearchable });
}
