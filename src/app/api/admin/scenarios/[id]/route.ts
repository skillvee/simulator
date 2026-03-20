import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error, validateRequest } from "@/lib/api";
import { ScenarioUpdateSchema } from "@/lib/schemas";

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
 * GET /api/admin/scenarios/[id]
 * Get a single scenario with coworkers (admin only)
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const { id } = await context.params;

  const scenario = await db.scenario.findUnique({
    where: { id },
    include: { coworkers: true },
  });

  if (!scenario) {
    return error("Scenario not found", 404);
  }

  return success({ scenario });
}

/**
 * PUT /api/admin/scenarios/[id]
 * Update a scenario (admin only)
 */
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const { id } = await context.params;

  // Check if scenario exists
  const existing = await db.scenario.findUnique({
    where: { id },
  });

  if (!existing) {
    return error("Scenario not found", 404);
  }

  // Validate request body using Zod schema
  const validated = await validateRequest(request, ScenarioUpdateSchema);
  if ("error" in validated) return validated.error;
  const { name, companyName, companyDescription, taskDescription, repoUrl, techStack, isPublished } = validated.data;

  // Build update data with only provided fields
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (companyName !== undefined) updateData.companyName = companyName;
  if (companyDescription !== undefined) updateData.companyDescription = companyDescription;
  if (taskDescription !== undefined) updateData.taskDescription = taskDescription;
  if (repoUrl !== undefined) updateData.repoUrl = repoUrl;
  if (techStack !== undefined) updateData.techStack = techStack;
  if (isPublished !== undefined) updateData.isPublished = isPublished;

  const scenario = await db.scenario.update({
    where: { id },
    data: updateData,
  });

  return success({ scenario });
}

/**
 * DELETE /api/admin/scenarios/[id]
 * Delete a scenario (admin only)
 */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const { id } = await context.params;

  // Check if scenario exists
  const existing = await db.scenario.findUnique({
    where: { id },
  });

  if (!existing) {
    return error("Scenario not found", 404);
  }

  await db.scenario.delete({
    where: { id },
  });

  return success({ message: "Scenario deleted" });
}
