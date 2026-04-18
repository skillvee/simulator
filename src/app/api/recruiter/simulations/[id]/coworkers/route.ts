import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";

const logger = createLogger("api:recruiter:coworkers");

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
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const { id: scenarioId } = await context.params;

  // Check if scenario exists and is owned by the current user (or user is admin)
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    return error("Scenario not found", 404);
  }

  // Security: Only allow the scenario owner (or admin) to add coworkers
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return error("Not authorized to modify this scenario", 403);
  }

  const body = await request.json();
  const { name, role, personaStyle, personality, knowledge, avatarUrl, voiceName, language } = body;

  // Validate required fields
  if (!name || !role || !personaStyle) {
    return error("Missing required fields: name, role, personaStyle", 400);
  }

  // Validate and ensure knowledge is an array
  let validatedKnowledge = [];
  if (knowledge) {
    if (Array.isArray(knowledge)) {
      validatedKnowledge = knowledge;
    } else {
      logger.warn(`Knowledge is not an array for ${name}, converting to empty array`, { knowledge });
    }
  }

  const coworker = await db.coworker.create({
    data: {
      scenarioId,
      name,
      role,
      personaStyle,
      personality: personality || null,
      knowledge: validatedKnowledge,  // Use validated array
      avatarUrl,
      voiceName: voiceName || null,
      language: language || scenario.language || 'en',
    },
  });

  return success({ coworker }, 201);
}
