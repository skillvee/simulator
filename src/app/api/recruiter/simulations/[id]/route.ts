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
 * GET /api/recruiter/simulations/[id]
 * Get simulation details (used for polling repo provisioning status)
 */
export async function GET(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const { id } = await context.params;

  const scenario = await db.scenario.findUnique({
    where: { id },
    select: { id: true, repoUrl: true, createdById: true },
  });

  if (!scenario) {
    return error("Simulation not found", 404);
  }

  if (user.role === "RECRUITER" && scenario.createdById !== user.id) {
    return error("Not authorized", 403);
  }

  return success({ repoUrl: scenario.repoUrl });
}

/**
 * PATCH /api/recruiter/simulations/[id]
 * Update a simulation (recruiter/admin only)
 * Language is immutable - cannot be changed after creation
 */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const { id } = await context.params;

  // Check if scenario exists and get current language
  const existing = await db.scenario.findUnique({
    where: { id },
    select: { language: true, createdById: true },
  });

  if (!existing) {
    return error("Simulation not found", 404);
  }

  // Recruiters can only update their own simulations
  if (user.role === "RECRUITER" && existing.createdById !== user.id) {
    return error("Not authorized", 403);
  }

  // Parse request body
  const body = await request.json();

  // Check if language is being changed
  if (body.language && body.language !== existing.language) {
    return error("Scenario language is immutable. Clone the scenario to create a version in a different language.", 400);
  }

  // Build update data (excluding language field to ensure it can't be changed)
  const updateData: Record<string, unknown> = {};
  const allowedFields = ["name", "companyName", "companyDescription", "taskDescription", "repoUrl", "techStack", "targetLevel", "simulationDepth"];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  const scenario = await db.scenario.update({
    where: { id },
    data: updateData,
  });

  return success({ scenario });
}

/**
 * DELETE /api/recruiter/simulations/[id]
 * Delete a simulation owned by the current recruiter
 */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const { id } = await context.params;

  const scenario = await db.scenario.findUnique({
    where: { id },
  });

  if (!scenario) {
    return error("Simulation not found", 404);
  }

  // Recruiters can only delete their own simulations
  if (user.role === "RECRUITER" && scenario.createdById !== user.id) {
    return error("You can only delete your own simulations", 403);
  }

  await db.scenario.delete({
    where: { id },
  });

  return success({ message: "Simulation deleted" });
}
