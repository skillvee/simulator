import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

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
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const { id } = await context.params;

  // Fetch the scenario (with coworkers for validation)
  const scenario = await db.scenario.findUnique({
    where: { id },
    include: { coworkers: true },
  });

  if (!scenario) {
    return error("Scenario not found", 404);
  }

  // Parse request body for optional skipTo parameter
  let skipTo: string | undefined;
  try {
    const body = await request.json();
    skipTo = body.skipTo;
  } catch {
    // No body or invalid JSON is fine - default behavior
  }

  // Note: skipTo parameter is now unused
  void skipTo;

  // Create a preview assessment for this admin
  const status = "WORKING" as const;
  const assessment = await db.assessment.create({
    data: {
      userId: user.id,
      scenarioId: id,
      status,
    },
  });

  const previewUrl = `/assessments/${assessment.id}/work`;

  return success({
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
