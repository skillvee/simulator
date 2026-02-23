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
 * GET /api/recruiter/simulations
 * Get all simulations for the current recruiter
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  try {
    const scenarios = await db.scenario.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        createdAt: true,
        isPublished: true,
        repoUrl: true,
        targetLevel: true,
        techStack: true,
        taskDescription: true,
        _count: {
          select: { assessments: true },
        },
      },
    });

    const simulations = scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      companyName: scenario.companyName,
      createdAt: scenario.createdAt.toISOString(),
      isPublished: scenario.isPublished,
      candidateCount: scenario._count.assessments,
      repoUrl: scenario.repoUrl,
      targetLevel: scenario.targetLevel ?? "mid",
      techStack: scenario.techStack,
      taskDescription: scenario.taskDescription,
    }));

    return success({ simulations });
  } catch (err) {
    console.error("Failed to fetch simulations:", err);
    return error("Failed to fetch simulations", 500);
  }
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
