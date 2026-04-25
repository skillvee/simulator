/**
 * Trigger the v2 resource pipeline for one or more scenario IDs (bypasses auth).
 *
 * Usage:
 *   npx tsx scripts/trigger-v2-pipeline.ts <scenarioId> [<scenarioId>...]
 *
 * Runs Step 1 synchronously, then awaits Step 2-4 (no `after()` here — we
 * keep the process alive so logs land in stdout). Prints final pipelineMeta.
 */

import { db } from "../src/server/db";
import {
  generatePlanAndPersist,
  runArtifactPipeline,
} from "../src/lib/scenarios/orchestrator";
import { archetypeToResourceType } from "../src/lib/scenarios/archetype-resource-mapping";
import { getArchetypeDisplayName, type RoleArchetype } from "../src/lib/candidate";
import {
  isSupportedLanguage,
  DEFAULT_LANGUAGE,
} from "../src/lib/core/language";

const SLUG_TO_ARCHETYPE: Record<string, RoleArchetype> = {
  frontend_engineer: "SENIOR_FRONTEND_ENGINEER",
  backend_engineer: "SENIOR_BACKEND_ENGINEER",
  fullstack_engineer: "FULLSTACK_ENGINEER",
  tech_lead: "TECH_LEAD",
  devops_sre: "DEVOPS_ENGINEER",
  data_analyst: "DATA_ANALYST",
  data_scientist: "DATA_SCIENTIST",
  analytics_engineer: "DATA_ENGINEER",
  ml_engineer: "DATA_SCIENTIST",
  engineering_manager: "ENGINEERING_MANAGER",
  software_engineer: "GENERAL_SOFTWARE_ENGINEER",
};

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("Usage: tsx scripts/trigger-v2-pipeline.ts <scenarioId> [...]");
    process.exit(1);
  }

  for (const id of ids) {
    console.log(`\n============ ${id} ============`);
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
        archetype: { select: { slug: true, name: true } },
        coworkers: { select: { name: true, role: true } },
        simulationCreationLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!scenario) {
      console.error(`scenario ${id} not found`);
      continue;
    }

    const archetype = SLUG_TO_ARCHETYPE[scenario.archetype?.slug ?? ""];
    if (!archetype) {
      console.error(`archetype slug "${scenario.archetype?.slug}" not mapped`);
      continue;
    }
    const resourceType = archetypeToResourceType(archetype);
    const language = isSupportedLanguage(scenario.language)
      ? scenario.language
      : DEFAULT_LANGUAGE;
    const creationLogId = scenario.simulationCreationLogs[0]?.id;

    console.log(`Triggering ${scenario.name} (${resourceType})`);
    const t0 = Date.now();
    const { plan, docs } = await generatePlanAndPersist({
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
    console.log(
      `Step 1 done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${plan.resources.length} resources, ${docs.length} docs`
    );

    const t1 = Date.now();
    await runArtifactPipeline(scenario.id, { archetype, creationLogId });
    console.log(`Steps 2-4 done in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

    const final = await db.scenario.findUnique({
      where: { id: scenario.id },
      select: { resourcePipelineMeta: true, repoUrl: true },
    });
    console.log("Final state:");
    console.log(JSON.stringify(final, null, 2));
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
