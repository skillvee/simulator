/**
 * POST /api/avatar/generate
 *
 * Background avatar generation endpoint (RF-021).
 * Generates AI avatars for coworkers in a scenario.
 *
 * This endpoint is designed to be called asynchronously after scenario creation
 * to avoid blocking the save operation.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateAvatarsForScenario } from "@/lib/avatar";
import { db } from "@/server/db";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;

  // Only allow recruiters and admins
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Recruiter access required" },
      { status: 403 }
    );
  }

  // Parse request body
  let body: { scenarioId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { scenarioId } = body;

  if (!scenarioId) {
    return NextResponse.json(
      { error: "scenarioId is required" },
      { status: 400 }
    );
  }

  // Verify scenario exists and user has access
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: { id: true, createdById: true },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Security: Only allow the scenario owner (or admin) to trigger generation
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Not authorized to modify this scenario" },
      { status: 403 }
    );
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

    return NextResponse.json({
      success: true,
      message: `Generated ${successful} avatars, ${failed} failed`,
      results,
    });
  } catch (error) {
    console.error("[Avatar API] Generation failed:", error);
    return NextResponse.json(
      {
        error: "Avatar generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
