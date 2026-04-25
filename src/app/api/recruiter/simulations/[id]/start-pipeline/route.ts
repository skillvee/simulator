/**
 * POST /api/recruiter/simulations/[id]/start-pipeline
 *
 * v2 resource pipeline entry point. Runs Step 1 (plan + docs) synchronously,
 * persists results to the Scenario row, returns the docs to the recruiter,
 * and kicks off Steps 2-4 in the background via Vercel's after().
 */

import { after } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";
import {
  generatePlanAndPersist,
  runArtifactPipeline,
} from "@/lib/scenarios/orchestrator";
import {
  archetypeToResourceType,
} from "@/lib/scenarios/archetype-resource-mapping";
import {
  getArchetypeDisplayName,
  type RoleArchetype,
} from "@/lib/candidate";
import { isSupportedLanguage, DEFAULT_LANGUAGE } from "@/lib/core/language";

const logger = createLogger("api:recruiter:start-pipeline");

interface SessionUser {
  id: string;
  role?: string;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) return error("Unauthorized", 401);
  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const scenario = await db.scenario.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      companyName: true,
      companyDescription: true,
      taskDescription: true,
      techStack: true,
      targetLevel: true,
      language: true,
      pipelineVersion: true,
      createdById: true,
      archetype: { select: { slug: true, name: true } },
      coworkers: { select: { name: true, role: true } },
      simulationCreationLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!scenario) return error("Scenario not found", 404);
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return error("Not authorized to modify this scenario", 403);
  }
  if (scenario.pipelineVersion !== "v2") {
    return error("Scenario is not on v2 pipeline", 400);
  }

  const archetype = mapArchetypeSlugToRoleArchetype(scenario.archetype?.slug);
  if (!archetype) {
    return error("Scenario archetype is not mapped to a v2 role archetype", 400);
  }

  const resourceType = archetypeToResourceType(archetype);
  const language = isSupportedLanguage(scenario.language)
    ? scenario.language
    : DEFAULT_LANGUAGE;
  const creationLogId = scenario.simulationCreationLogs[0]?.id;

  try {
    const { plan, docs, pipelineMeta } = await generatePlanAndPersist({
      scenarioId: scenario.id,
      archetype,
      archetypeName: scenario.archetype?.name ?? getArchetypeDisplayName(archetype),
      resourceType,
      creationLogId,
      generateInput: {
        companyName: scenario.companyName,
        companyDescription: scenario.companyDescription,
        taskDescription: scenario.taskDescription,
        techStack: scenario.techStack,
        roleName: scenario.archetype?.name ?? getArchetypeDisplayName(archetype),
        seniorityLevel: scenario.targetLevel,
        archetypeName: scenario.archetype?.name ?? getArchetypeDisplayName(archetype),
        resourceType,
        coworkers: scenario.coworkers,
        language,
      },
    });

    // Kick off the artifact pipeline asynchronously. We don't await it.
    after(async () => {
      try {
        await runArtifactPipeline(scenario.id, { archetype, creationLogId });
      } catch (err) {
        logger.error("runArtifactPipeline crashed", {
          scenarioId: scenario.id,
          err: String(err),
        });
      }
    });

    return success({ plan, docs, pipelineMeta });
  } catch (err) {
    logger.error("start-pipeline Step 1 failed", {
      scenarioId: scenario.id,
      err: String(err),
    });
    return error("Failed to generate plan + docs", 500);
  }
}

/**
 * Map a real `Archetype.slug` (from the seeded rubric system) to the
 * `RoleArchetype` union used by the v2 pipeline. The seed slugs aren't 1:1
 * with the union — many roles share weight configs, so we map semantically.
 *
 * Roles outside the v2 scope (PM, sales, CS) return null and the caller
 * falls back to the legacy v1 path or rejects the start-pipeline request.
 */
const SLUG_TO_ARCHETYPE: Record<string, RoleArchetype> = {
  // engineering
  frontend_engineer: "SENIOR_FRONTEND_ENGINEER",
  backend_engineer: "SENIOR_BACKEND_ENGINEER",
  fullstack_engineer: "FULLSTACK_ENGINEER",
  tech_lead: "TECH_LEAD",
  devops_sre: "DEVOPS_ENGINEER",
  // data
  data_analyst: "DATA_ANALYST",
  data_scientist: "DATA_SCIENTIST",
  analytics_engineer: "DATA_ENGINEER",
  ml_engineer: "DATA_SCIENTIST",
  // engineering-manager-style
  engineering_manager: "ENGINEERING_MANAGER",
  // generic / fallback
  software_engineer: "GENERAL_SOFTWARE_ENGINEER",
};

function mapArchetypeSlugToRoleArchetype(
  slug: string | undefined | null
): RoleArchetype | null {
  if (!slug) return null;
  return SLUG_TO_ARCHETYPE[slug] ?? null;
}
