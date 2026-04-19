import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { getPoolAvatarPath, inferDemographics, isEthnicity, isGender, type Ethnicity, type Gender } from "@/lib/avatar/name-ethnicity";
import { pickVoiceForCoworker } from "@/lib/ai/gemini-config";

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
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const { id: scenarioId } = await context.params;

  // Check if scenario exists
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    return error("Scenario not found", 404);
  }

  const coworkers = await db.coworker.findMany({
    where: { scenarioId },
    orderBy: { createdAt: "asc" },
  });

  return success({ coworkers });
}

/**
 * POST /api/admin/scenarios/[id]/coworkers
 * Create a new coworker for a scenario (admin only)
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

  const { id: scenarioId } = await context.params;

  // Check if scenario exists
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    return error("Scenario not found", 404);
  }

  const body = await request.json();
  const { name, role, personaStyle, personality, knowledge, avatarUrl, voiceName, gender, ethnicity } = body;

  // Validate required fields
  if (!name || !role || !personaStyle) {
    return error("Missing required fields: name, role, personaStyle", 400);
  }

  const inferred = inferDemographics(name);
  const resolvedGender: Gender = isGender(gender) ? gender : inferred.gender;
  const resolvedEthnicity: Ethnicity = isEthnicity(ethnicity) ? ethnicity : inferred.ethnicity;

  const coworker = await db.coworker.create({
    data: {
      scenarioId,
      name,
      role,
      personaStyle,
      personality: personality || null,
      knowledge: knowledge || {},
      gender: resolvedGender,
      ethnicity: resolvedEthnicity,
      avatarUrl: avatarUrl || getPoolAvatarPath(name, { gender: resolvedGender, ethnicity: resolvedEthnicity }),
      voiceName: voiceName || pickVoiceForCoworker(resolvedGender, name),
    },
  });

  return success({ coworker }, 201);
}
