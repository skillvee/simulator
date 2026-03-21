/**
 * POST /api/avatar/generate
 *
 * Background avatar generation endpoint (RF-021).
 * Generates AI avatars for coworkers in a scenario.
 *
 * This endpoint is designed to be called asynchronously after scenario creation
 * to avoid blocking the save operation.
 */

import { auth } from "@/auth";
import { generateAvatarsForScenario } from "@/lib/avatar";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

export async function POST(request: Request) {
  // Authenticate user
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;

  // Only allow recruiters and admins
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  // Parse request body
  let body: { scenarioId: string };
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body", 400);
  }

  const { scenarioId } = body;

  if (!scenarioId) {
    return error("scenarioId is required", 400);
  }

  // Verify scenario exists and user has access
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: { id: true, createdById: true },
  });

  if (!scenario) {
    return error("Scenario not found", 404);
  }

  // Security: Only allow the scenario owner (or admin) to trigger generation
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return error("Not authorized to modify this scenario", 403);
  }

  // Generate avatars (this runs in the background)
  // We don't await the full generation to return a quick response
  // The generation continues asynchronously
  const generationPromise = generateAvatarsForScenario(scenarioId);

  // For now, we wait for completion and return results
  // In a production system, you might use a job queue instead
  try {
    const results = await generationPromise;

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return success({
      message: `Generated ${successful} avatars, ${failed} failed`,
      results,
    });
  } catch (err) {
    console.error("[Avatar API] Generation failed:", err);
    return error("Avatar generation failed", 500);
  }
}
