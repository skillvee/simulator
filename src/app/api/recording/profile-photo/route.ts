import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { generateProfilePhoto } from "@/lib/candidate";

/**
 * POST /api/recording/profile-photo
 *
 * Generates a professional headshot from the webcam profile snapshot.
 * Uses Gemini 2.5 Flash image editing to transform the actual webcam photo
 * into a studio-quality headshot while preserving the person's real face.
 *
 * This endpoint is also triggered automatically during assessment finalization.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const body = await request.json();
    const { assessmentId } = body;

    if (!assessmentId) {
      return error("assessmentId is required", 400, "VALIDATION_ERROR");
    }

    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    const result = await generateProfilePhoto({
      assessmentId,
      userId: session.user.id,
    });

    if (!result.success) {
      return error(
        result.error || "Profile photo generation failed",
        500
      );
    }

    return success({
      imageUrl: result.imageUrl,
      path: `candidates/${session.user.id}.jpg`,
    });
  } catch (err) {
    console.error("[ProfilePhoto] Error:", err);
    return error("Internal server error", 500);
  }
}
