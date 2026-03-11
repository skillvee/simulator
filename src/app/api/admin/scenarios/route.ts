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
 * GET /api/admin/scenarios
 * List all scenarios (admin only)
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  const scenarios = await db.scenario.findMany({
    include: {
      _count: {
        select: { coworkers: true, assessments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return success({ scenarios });
}

/**
 * POST /api/admin/scenarios
 * Create a new scenario (admin only)
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") {
    return error("Admin access required", 403);
  }

  // Validate request body using Zod schema
  const validated = await validateRequest(request, ScenarioCreateSchema);
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

  const scenario = await db.scenario.create({
    data: {
      name,
      companyName,
      companyDescription,
      taskDescription,
      repoUrl,
      techStack,
      isPublished,
    },
  });

  return success({ scenario }, 201);
}
