import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { getPoolAvatarPath, inferDemographics, type EthnicGroup, type Gender } from "@/lib/avatar/name-ethnicity";
import { pickVoiceForCoworker } from "@/lib/ai/gemini-config";

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
  const { name, role, personaStyle, personality, knowledge, avatarUrl, voiceName, language, gender, ethnicity } = body;

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

  // Resolve gender/ethnicity — prefer caller-provided, fall back to name-based inference.
  const inferred = inferDemographics(name);
  const resolvedGender: Gender = gender === "male" || gender === "female" ? gender : inferred.gender;
  const resolvedEthnicity: EthnicGroup = isEthnicGroup(ethnicity) ? ethnicity : inferred.group;

  const coworker = await db.coworker.create({
    data: {
      scenarioId,
      name,
      role,
      personaStyle,
      personality: personality || null,
      knowledge: validatedKnowledge,
      gender: resolvedGender,
      ethnicity: resolvedEthnicity,
      avatarUrl: avatarUrl || getPoolAvatarPath(name, { gender: resolvedGender, ethnicity: resolvedEthnicity }),
      voiceName: voiceName || pickVoiceForCoworker(resolvedGender, name),
      language: language || scenario.language || 'en',
    },
  });

  return success({ coworker }, 201);
}

function isEthnicGroup(value: unknown): value is EthnicGroup {
  return (
    value === "east-asian" ||
    value === "south-asian" ||
    value === "southeast-asian" ||
    value === "white" ||
    value === "black" ||
    value === "hispanic" ||
    value === "middle-eastern" ||
    value === "mixed"
  );
}
