/**
 * Re-runs Step 1 (plan + docs) of the v2 pipeline for an existing scenario,
 * using the current prompt. Prints + saves the result for human inspection.
 *
 * Usage: npx tsx scripts/regenerate-plan-and-docs.ts <scenarioId>
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

import { generatePlanAndDocs } from "@/lib/scenarios/plan-and-docs-generator";
import { archetypeToResourceType } from "@/lib/scenarios/archetype-resource-mapping";
import { getArchetypeDisplayName, type RoleArchetype } from "@/lib/candidate";
import { isSupportedLanguage, DEFAULT_LANGUAGE } from "@/lib/core/language";

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
  const id = process.argv[2];
  if (!id) throw new Error("Usage: tsx scripts/regenerate-plan-and-docs.ts <scenarioId>");

  const prisma = new PrismaClient();
  try {
    const s = await prisma.scenario.findUnique({
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
      },
    });
    if (!s) throw new Error(`Scenario ${id} not found`);

    const archetype = s.archetype?.slug
      ? SLUG_TO_ARCHETYPE[s.archetype.slug] ?? null
      : null;
    if (!archetype) throw new Error(`Cannot map archetype slug "${s.archetype?.slug}"`);

    const resourceType = archetypeToResourceType(archetype);
    const language = isSupportedLanguage(s.language) ? s.language : DEFAULT_LANGUAGE;

    console.log("Regenerating plan + docs for:", {
      id: s.id,
      name: s.name,
      archetype,
      resourceType,
    });

    const startTs = Date.now();
    const result = await generatePlanAndDocs({
      companyName: s.companyName,
      companyDescription: s.companyDescription,
      taskDescription: s.taskDescription,
      techStack: s.techStack,
      roleName: s.archetype?.name ?? getArchetypeDisplayName(archetype),
      seniorityLevel: s.targetLevel,
      archetypeName: s.archetype?.name ?? getArchetypeDisplayName(archetype),
      resourceType,
      coworkers: s.coworkers,
      language,
    });
    const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
    console.log(`\nGenerated in ${elapsed}s — ${result.docs.length} docs, ${result.plan.resources.length} plan resources, version ${result._meta.promptVersion}\n`);

    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    const outDir = path.resolve(
      process.cwd(),
      "tmp/plan-and-docs-regen",
      `${runId}-${s.id}`
    );
    fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(
      path.join(outDir, "_plan.json"),
      JSON.stringify(result.plan, null, 2)
    );
    fs.writeFileSync(path.join(outDir, "_meta.json"), JSON.stringify({
      scenarioId: s.id,
      durationSec: Number(elapsed),
      promptVersion: result._meta.promptVersion,
      attempts: result._meta.attempts,
      resourceType,
      docCount: result.docs.length,
      docFilenames: result.docs.map((d) => d.filename),
      planResourceCount: result.plan.resources.length,
    }, null, 2));

    for (const d of result.docs) {
      const safeName = d.filename.replace(/[^\w.-]/g, "_");
      fs.writeFileSync(path.join(outDir, safeName), d.markdown);
      console.log(`=== ${d.name} (${d.filename}) — ${d.markdown.length} chars ===\n`);
      console.log(d.markdown);
      console.log("\n---\n");
    }

    console.log("\nPlan resources:");
    for (const r of result.plan.resources) {
      console.log(`  - ${r.label} (${r.filename}, ${r.type})`);
      console.log(`      objective: ${r.objective}`);
      if (r.dataShape) console.log(`      dataShape: ${r.dataShape.slice(0, 200)}`);
    }

    console.log("\nQuality criteria:");
    for (const q of result.plan.qualityCriteria) console.log(`  - ${q}`);

    console.log(`\nArtifacts saved to: ${outDir}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
