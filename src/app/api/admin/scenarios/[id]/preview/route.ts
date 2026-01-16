import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/scenarios/[id]/preview
 * Create a preview assessment for testing a scenario (admin only)
 * Admins can test scenarios before publishing them
 */
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await context.params;

  // Fetch the scenario (with coworkers for validation)
  const scenario = await db.scenario.findUnique({
    where: { id },
    include: { coworkers: true },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Parse request body for optional skipTo parameter
  let skipTo: string | undefined;
  try {
    const body = await request.json();
    skipTo = body.skipTo;
  } catch {
    // No body or invalid JSON is fine - default behavior
  }

  // Determine starting status and URL based on skipTo
  let status: "HR_INTERVIEW" | "ONBOARDING" | "WORKING" = "HR_INTERVIEW";
  let urlSuffix = "";

  if (skipTo === "coworkers") {
    // Skip directly to the working/coworker chat phase
    status = "WORKING";
    urlSuffix = "/chat";
  } else if (skipTo === "kickoff") {
    status = "ONBOARDING";
    urlSuffix = "/kickoff";
  }

  // Create a preview assessment for this admin
  const assessment = await db.assessment.create({
    data: {
      userId: user.id,
      scenarioId: id,
      status,
    },
  });

  const previewUrl = `/assessment/${assessment.id}${urlSuffix}`;

  return NextResponse.json({
    assessment,
    previewUrl,
    scenario: {
      id: scenario.id,
      name: scenario.name,
      isPublished: scenario.isPublished,
      coworkerCount: scenario.coworkers.length,
    },
  });
}
