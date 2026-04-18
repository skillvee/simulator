/**
 * POST /api/recruiter/simulations/[id]/clone
 *
 * Clone a scenario to another language, regenerating all content
 * Available to RECRUITER and ADMIN roles only
 * The source scenario must be owned by the current user (unless admin)
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error, validationError } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { type SupportedLanguage, isSupportedLanguage } from "@/lib/core/language";
import { generateCodingTask } from "@/lib/scenarios/task-generator";
import { generateResources } from "@/lib/scenarios/resource-generator";
import { generateCoworkers } from "@/lib/scenarios/coworker-generator";
import { z } from "zod";

const logger = createLogger("api:recruiter:clone-scenario");

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

const requestSchema = z.object({
  language: z.string().refine(
    (val) => isSupportedLanguage(val),
    { message: "Invalid language code" }
  ),
});

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const { id: sourceScenarioId } = await context.params;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return validationError(validationResult.error);
    }

    const { language } = validationResult.data;
    const targetLanguage = language as SupportedLanguage;

    // Fetch the source scenario with coworkers
    const sourceScenario = await db.scenario.findUnique({
      where: { id: sourceScenarioId },
      include: { coworkers: true },
    });

    if (!sourceScenario) {
      return error("Scenario not found", 404);
    }

    // Security: Only allow the scenario owner (or admin) to clone
    if (sourceScenario.createdById !== user.id && user.role !== "ADMIN") {
      return error("Not authorized to clone this scenario", 403);
    }

    // Don't clone if target language is same as source
    if (sourceScenario.language === targetLanguage) {
      return error("Cannot clone to the same language", 400);
    }

    logger.info("Starting scenario clone", {
      sourceId: sourceScenarioId,
      sourceLanguage: sourceScenario.language,
      targetLanguage
    });

    // 1. Regenerate the task description in the new language
    const taskResult = await generateCodingTask({
      roleName: sourceScenario.name,
      seniorityLevel: (sourceScenario.targetLevel || "mid") as "junior" | "mid" | "senior" | "staff" | "principal",
      techStack: sourceScenario.techStack,
      keyResponsibilities: ["Build and maintain software"], // Generic since not stored
      domainContext: sourceScenario.companyDescription,
      companyName: sourceScenario.companyName,
      simulationDepth: sourceScenario.simulationDepth as "short" | "medium" | "long",
      language: targetLanguage,
    });

    // Pick the first generated task
    const newTask = taskResult.taskOptions[0];
    if (!newTask) {
      throw new Error("Failed to generate task in new language");
    }

    // 2. Regenerate resources in the new language
    const resourceResult = await generateResources({
      companyName: sourceScenario.companyName,
      taskDescription: newTask.description,
      techStack: sourceScenario.techStack,
      roleName: sourceScenario.name,
      seniorityLevel: sourceScenario.targetLevel || "mid",
      language: targetLanguage,
    });

    // 3. Generate new coworkers in the new language
    const coworkerResult = await generateCoworkers({
      roleName: sourceScenario.name,
      seniorityLevel: (sourceScenario.targetLevel || "mid") as "junior" | "mid" | "senior" | "staff" | "principal",
      companyName: sourceScenario.companyName,
      companyDescription: sourceScenario.companyDescription,
      taskDescription: newTask.description,
      techStack: sourceScenario.techStack,
      keyResponsibilities: ["Build and maintain software", "Collaborate with team", "Review code"], // Generic responsibilities
      language: targetLanguage,
    });

    // 4. Create the new scenario with regenerated content
    const newScenario = await db.scenario.create({
      data: {
        name: sourceScenario.name,
        companyName: sourceScenario.companyName,
        companyDescription: sourceScenario.companyDescription,
        taskDescription: newTask.description,
        repoUrl: sourceScenario.repoUrl,
        techStack: sourceScenario.techStack,
        targetLevel: sourceScenario.targetLevel,
        simulationDepth: sourceScenario.simulationDepth,
        archetypeId: sourceScenario.archetypeId,
        resources: resourceResult.resources as unknown as import("@prisma/client").Prisma.InputJsonValue,
        isPublished: true,
        isChallenge: false,
        language: targetLanguage,
        createdById: user.id,
      },
    });

    // 5. Create coworkers for the new scenario
    if (coworkerResult.coworkers && coworkerResult.coworkers.length > 0) {
      await db.coworker.createMany({
        data: coworkerResult.coworkers.map((coworker) => ({
          scenarioId: newScenario.id,
          name: coworker.name,
          role: coworker.role,
          personaStyle: coworker.personaStyle,
          personality: coworker.personality ? coworker.personality as unknown as import("@prisma/client").Prisma.InputJsonValue : undefined,
          knowledge: coworker.knowledge || [],
          avatarUrl: null, // Avatar will be generated separately if needed
          voiceName: null, // Voice can be configured later
          language: targetLanguage,
        })),
      });
    }

    logger.info("Scenario cloned successfully", {
      sourceId: sourceScenarioId,
      newId: newScenario.id,
      targetLanguage
    });

    return success({
      scenarioId: newScenario.id,
      language: targetLanguage,
      message: `Scenario cloned to ${targetLanguage} successfully`
    }, 201);

  } catch (err) {
    logger.error("Scenario clone error", {
      error: err instanceof Error ? err.message : String(err),
      sourceId: sourceScenarioId
    });
    return error("Failed to clone scenario", 500);
  }
}