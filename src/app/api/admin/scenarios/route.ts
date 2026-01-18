import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api-response";

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

  const body = await request.json();
  const {
    name,
    companyName,
    companyDescription,
    taskDescription,
    repoUrl,
    techStack,
    isPublished,
  } = body;

  // Validate required fields
  if (
    !name ||
    !companyName ||
    !companyDescription ||
    !taskDescription ||
    !repoUrl
  ) {
    return error("Missing required fields", 400);
  }

  // Validate techStack is an array
  if (techStack !== undefined && !Array.isArray(techStack)) {
    return error("techStack must be an array", 400);
  }

  const scenario = await db.scenario.create({
    data: {
      name,
      companyName,
      companyDescription,
      taskDescription,
      repoUrl,
      techStack: techStack || [],
      isPublished: isPublished ?? false,
    },
  });

  return success({ scenario }, 201);
}
