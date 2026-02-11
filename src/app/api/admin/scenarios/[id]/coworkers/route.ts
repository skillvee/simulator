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
 * GET /api/admin/scenarios/[id]/coworkers
 * List all coworkers for a scenario (admin only)
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

  const { id: scenarioId } = await context.params;

  // Check if scenario exists
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const coworkers = await db.coworker.findMany({
    where: { scenarioId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ coworkers });
}

/**
 * POST /api/admin/scenarios/[id]/coworkers
 * Create a new coworker for a scenario (admin only)
 */
export async function POST(request: Request, context: RouteContext) {
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

  const { id: scenarioId } = await context.params;

  // Check if scenario exists
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, role, personaStyle, personality, knowledge, avatarUrl, voiceName } = body;

  // Validate required fields
  if (!name || !role || !personaStyle) {
    return NextResponse.json(
      { error: "Missing required fields: name, role, personaStyle" },
      { status: 400 }
    );
  }

  const coworker = await db.coworker.create({
    data: {
      scenarioId,
      name,
      role,
      personaStyle,
      personality: personality || null,
      knowledge: knowledge || {},
      avatarUrl,
      voiceName: voiceName || null,
    },
  });

  return NextResponse.json({ coworker }, { status: 201 });
}
