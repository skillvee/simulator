import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error, validateRequest } from "@/lib/api";
import { ScenarioCreateSchema } from "@/lib/schemas";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

/**
 * POST /api/recruiter/simulations
 * Create a new simulation (recruiter or admin only)
 * Auto-sets createdById to current user and isPublished to true
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  // Validate request body using Zod schema
  const validated = await validateRequest(request, ScenarioCreateSchema);
  if ("error" in validated) return validated.error;
  const { name, companyName, companyDescription, taskDescription, repoUrl, techStack, targetLevel, archetypeId } = validated.data;

  // Create scenario with createdById set to current user and isPublished true
  const scenario = await db.scenario.create({
    data: {
      name,
      companyName,
      companyDescription,
      taskDescription,
      repoUrl,
      techStack,
      targetLevel,
      archetypeId,
      isPublished: true, // Recruiter scenarios are always active
      createdById: user.id, // Set ownership to current user
    },
  });

  return success({ scenario }, 201);
}
