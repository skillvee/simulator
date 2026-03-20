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
  params: Promise<{ id: string; coworkerId: string }>;
}

/**
 * GET /api/admin/scenarios/[id]/coworkers/[coworkerId]
 * Get a single coworker (admin only)
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

  const { id: scenarioId, coworkerId } = await context.params;

  const coworker = await db.coworker.findUnique({
    where: { id: coworkerId },
  });

  if (!coworker) {
    return error("Coworker not found", 404);
  }

  if (coworker.scenarioId !== scenarioId) {
    return error("Coworker not found in this scenario", 404);
  }

  return success({ coworker });
}

/**
 * PUT /api/admin/scenarios/[id]/coworkers/[coworkerId]
 * Update a coworker (admin only)
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

  const { id: scenarioId, coworkerId } = await context.params;

  // Check if coworker exists
  const existing = await db.coworker.findUnique({
    where: { id: coworkerId },
  });

  if (!existing) {
    return error("Coworker not found", 404);
  }

  if (existing.scenarioId !== scenarioId) {
    return error("Coworker not found in this scenario", 404);
  }

  const body = await request.json();
  const { name, role, personaStyle, personality, knowledge, avatarUrl, voiceName } = body;

  // Build update data with only provided fields
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (personaStyle !== undefined) updateData.personaStyle = personaStyle;
  if (personality !== undefined) updateData.personality = personality;
  if (knowledge !== undefined) updateData.knowledge = knowledge;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
  if (voiceName !== undefined) updateData.voiceName = voiceName;

  const coworker = await db.coworker.update({
    where: { id: coworkerId },
    data: updateData,
  });

  return success({ coworker });
}

/**
 * DELETE /api/admin/scenarios/[id]/coworkers/[coworkerId]
 * Delete a coworker (admin only)
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

  const { id: scenarioId, coworkerId } = await context.params;

  // Check if coworker exists
  const existing = await db.coworker.findUnique({
    where: { id: coworkerId },
  });

  if (!existing) {
    return error("Coworker not found", 404);
  }

  if (existing.scenarioId !== scenarioId) {
    return error("Coworker not found in this scenario", 404);
  }

  await db.coworker.delete({
    where: { id: coworkerId },
  });

  return success({ message: "Coworker deleted" });
}
