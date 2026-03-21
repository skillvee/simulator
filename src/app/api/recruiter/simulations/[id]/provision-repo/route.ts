/**
 * POST /api/recruiter/simulations/[id]/provision-repo
 *
 * Repository provisioning endpoint (US-007).
 * Uses AI to generate a complete, domain-specific GitHub repository
 * based on the scenario's company, tech stack, task, and coworkers.
 *
 * The generated repo is built on top of a clean scaffold, ensuring
 * npm install && npm run build always works.
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { provisionRepo, needsRepo } from "@/lib/scenarios/repo-templates";
import type { ScenarioMetadata } from "@/lib/scenarios/repo-spec";

const logger = createLogger("api:recruiter:provision-repo");

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Authenticate user
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;

  // Only allow recruiters and admins
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const scenarioId = id;

  if (!scenarioId) {
    return error("scenarioId is required", 400);
  }

  // Fetch full scenario with coworkers for AI generation
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      id: true,
      name: true,
      companyName: true,
      companyDescription: true,
      taskDescription: true,
      techStack: true,
      targetLevel: true,
      repoUrl: true,
      createdById: true,
      coworkers: {
        select: {
          name: true,
          role: true,
          personaStyle: true,
          knowledge: true,
        },
      },
    },
  });

  if (!scenario) {
    return error("Scenario not found", 404);
  }

  // Security: Only allow the scenario owner (or admin) to trigger provisioning
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return error("Not authorized to modify this scenario", 403);
  }

  // If repo already exists, don't provision again
  if (scenario.repoUrl) {
    return success({
      message: "Repository already provisioned",
      repoUrl: scenario.repoUrl,
    });
  }

  // Only provision repos for engineering-related tech stacks
  if (!needsRepo(scenario.techStack)) {
    return success({
      skipped: true,
      reason: "non-engineering",
      message: "Repository not needed for this tech stack",
    });
  }

  // Build scenario metadata for AI generation
  const metadata: ScenarioMetadata = {
    name: scenario.name,
    companyName: scenario.companyName,
    companyDescription: scenario.companyDescription,
    taskDescription: scenario.taskDescription,
    techStack: scenario.techStack,
    targetLevel: scenario.targetLevel,
    coworkers: scenario.coworkers.map((c) => ({
      name: c.name,
      role: c.role,
      personaStyle: c.personaStyle,
      knowledge: (c.knowledge as Array<{
        topic: string;
        triggerKeywords: string[];
        response: string;
        isCritical: boolean;
      }>) || [],
    })),
  };

  try {
    const { repoUrl, repoSpec } = await provisionRepo(scenarioId, metadata);

    // Update the scenario with the new repo URL and cached spec
    await db.scenario.update({
      where: { id: scenarioId },
      data: {
        repoUrl,
        ...(repoSpec ? { repoSpec: repoSpec as object } : {}),
      },
    });

    return success({
      message: "Repository provisioned successfully",
      repoUrl,
    });
  } catch (err) {
    logger.error("Provisioning failed", { error: err instanceof Error ? err.message : String(err) });
    return error("Repository provisioning failed", 500);
  }
}
