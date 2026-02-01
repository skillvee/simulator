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
 * POST /api/recruiter/simulations/[id]/coworkers
 * Create a new coworker for a simulation (recruiter or admin only)
 * Only allows creating coworkers for simulations owned by the current user
 */
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Recruiter access required" },
      { status: 403 }
    );
  }

  const { id: scenarioId } = await context.params;

  // Check if scenario exists and is owned by the current user (or user is admin)
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Security: Only allow the scenario owner (or admin) to add coworkers
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Not authorized to modify this scenario" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, role, personaStyle, knowledge, avatarUrl, voiceName } = body;

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
      knowledge: knowledge || {},
      avatarUrl,
      voiceName: voiceName || null,
    },
  });

  return NextResponse.json({ coworker }, { status: 201 });
}
