import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { validateRequest } from "@/lib/api";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  const scenario = await db.scenario.findUnique({
    where: { id },
    include: { coworkers: true },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json({ scenario });
}

/**
 * PUT /api/admin/scenarios/[id]
 * Update a scenario (admin only)
 */
export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  // Check if scenario exists
  const existing = await db.scenario.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Validate request body using Zod schema
  const validated = await validateRequest(request, ScenarioUpdateSchema);
  if ("error" in validated) return validated.error;
  const {
    name,
    companyName,
    companyDescription,
    taskDescription,
    repoUrl,
    techStack,
    isPublished,
  } = validated.data;

  // Build update data with only provided fields
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (companyName !== undefined) updateData.companyName = companyName;
  if (companyDescription !== undefined)
    updateData.companyDescription = companyDescription;
  if (taskDescription !== undefined)
    updateData.taskDescription = taskDescription;
  if (repoUrl !== undefined) updateData.repoUrl = repoUrl;
  if (techStack !== undefined) updateData.techStack = techStack;
  if (isPublished !== undefined) updateData.isPublished = isPublished;

  const scenario = await db.scenario.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ scenario });
}

/**
 * DELETE /api/admin/scenarios/[id]
 * Delete a scenario (admin only)
 */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  // Check if scenario exists
  const existing = await db.scenario.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  await db.scenario.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Scenario deleted" });
}
