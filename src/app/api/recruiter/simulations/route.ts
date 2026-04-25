import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error, validateRequest } from "@/lib/api";
import { ScenarioCreateSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/core";
import { env } from "@/lib/core/env";
import type { ResourcePipelineMeta } from "@/types";
import type { Prisma } from "@prisma/client";

const logger = createLogger("server:api:recruiter:simulations");

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
    logger.error("Failed to fetch simulations", { err });
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
  const { name, companyName, companyDescription, taskDescription, repoUrl, techStack, targetLevel, archetypeId, simulationDepth, resources, language, creationLogId } = validated.data;

  // ----- v2 path: pre-create scenario in "planning" status, no resources, isPublished=false.
  // The client follows up with POST /simulations/[id]/start-pipeline which runs Step 1
  // synchronously and Steps 2-4 via Vercel after().
  if (env.RESOURCE_PIPELINE_V2) {
    try {
      const initialMeta: ResourcePipelineMeta = {
        version: "v2",
        status: "planning",
        attempts: 0,
        startedAt: new Date().toISOString(),
      };

      const scenario = await db.scenario.create({
        data: {
          name,
          companyName,
          companyDescription,
          taskDescription,
          repoUrl,
          techStack,
          targetLevel,
          simulationDepth,
          archetypeId,
          language,
          isPublished: false, // v2: explicit publish gate
          pipelineVersion: "v2",
          resourcePipelineMeta: initialMeta as unknown as Prisma.InputJsonValue,
          createdById: user.id,
        },
      });

      return success({ scenario }, 201);
    } catch (err) {
      logger.error("Failed to create scenario (v2)", { err });
      return error("Failed to create simulation", 500);
    }
  }

  // ----- v1 path (default): create with resources and isPublished=true.
  // Fallback: if the client didn't send resources but we have a creation log,
  // look up the completed generate_resources step and use its output.
  // This closes a race where the client's fetch to generate-resources times
  // out but the backend step eventually succeeds and persists its output.
  let finalResources = resources;
  if ((!finalResources || finalResources.length === 0) && creationLogId) {
    const step = await db.simulationGenerationStep.findFirst({
      where: { creationLogId, stepName: "generate_resources", status: "completed" },
      orderBy: { createdAt: "desc" },
    });
    const recovered = (step?.outputData as { resources?: unknown } | null)?.resources;
    if (Array.isArray(recovered) && recovered.length > 0) {
      logger.info("Recovered resources from generate_resources step", { creationLogId, count: recovered.length });
      finalResources = recovered as typeof resources;
    }
  }

  // Create scenario with createdById set to current user and isPublished true
  try {
    const scenario = await db.scenario.create({
      data: {
        name,
        companyName,
        companyDescription,
        taskDescription,
        repoUrl,
        techStack,
        targetLevel,
        simulationDepth,
        archetypeId,
        resources: finalResources as unknown as Prisma.InputJsonValue,
        language, // Persist the language field
        isPublished: true, // Recruiter scenarios are always active
        createdById: user.id, // Set ownership to current user
      },
    });

    return success({ scenario }, 201);
  } catch (err) {
    logger.error("Failed to create scenario", { err });
    return error("Failed to create simulation", 500);
  }
}
