/**
 * Compare Step 1 + Step 2 outputs of the v2 resource pipeline before/after a
 * prompt change, without persisting to DB or external services.
 *
 * Usage:
 *   npx tsx scripts/compare-prompt-versions.ts <scenarioId> [scenarioId ...]
 *
 * Flags:
 *   --step1-only   Skip Step 2 (artifact generation). Faster, ~1 Pro call per
 *                  scenario instead of 2.
 *
 * Output: tmp/compare-prompts-<timestamp>/<scenarioId>-<archetype>/
 *           ├── before/   — existing docs, plan, artifacts (current DB state)
 *           ├── after/    — fresh outputs from current prompt code
 *           └── DIFF.md   — side-by-side summary
 *
 * Notes:
 *   - DB is read-only. Step 2 generators are NOT called via the orchestrator
 *     (which would mutate DB / create real GitHub repos / upload to Supabase).
 *   - Repo path: calls `generateRepoSpec` directly. Skips `buildRepoFromSpec`
 *     so no GitHub repo is created.
 *   - Data path: re-implements the Gemini call from `generateDataArtifact`
 *     to skip Supabase upload + DB writes. Same prompt, same model.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

import { generatePlanAndDocs } from "@/lib/scenarios/plan-and-docs-generator";
import { archetypeToResourceType } from "@/lib/scenarios/archetype-resource-mapping";
import { getArchetypeDisplayName, type RoleArchetype } from "@/lib/candidate";
import { isSupportedLanguage, DEFAULT_LANGUAGE } from "@/lib/core/language";
import { generateRepoSpec } from "@/lib/scenarios/repo-spec-generator";
import {
  selectScaffold,
  type ScenarioMetadata,
} from "@/lib/scenarios/repo-spec";
import { gemini } from "@/lib/ai/gemini";
import { PRO_MODEL } from "@/lib/ai/gemini-config";
import {
  buildDataArtifactPrompt,
  DATA_ARTIFACT_PROMPT_VERSION,
} from "@/prompts/recruiter/data-artifact";
import {
  extractCsvsFromGeminiParts,
  type GeminiResponsePart,
} from "@/lib/scenarios/csv-parsing";
import type { ResourcePlan, ScenarioDoc } from "@/types";

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

interface ScenarioRow {
  id: string;
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  techStack: string[];
  targetLevel: string;
  language: string;
  archetype: { slug: string; name: string } | null;
  coworkers: Array<{
    name: string;
    role: string;
    personaStyle: string;
    knowledge: unknown;
  }>;
  docs: unknown;
  plan: unknown;
  repoSpec: unknown;
  dataFiles: Array<{ filename: string; storagePath: string; byteSize: number; rowCount: number }>;
}

function w(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function safeName(s: string) {
  return s.replace(/[^\w.-]/g, "_");
}

async function captureBefore(s: ScenarioRow, dir: string, prisma: PrismaClient) {
  // Existing docs
  const docs = (s.docs ?? []) as Array<{ name: string; filename: string; markdown: string }>;
  for (const d of docs) {
    w(path.join(dir, "docs", safeName(d.filename)), d.markdown);
  }
  w(path.join(dir, "plan.json"), JSON.stringify(s.plan, null, 2));

  const archetype = SLUG_TO_ARCHETYPE[s.archetype?.slug ?? ""];
  const resourceType = archetype ? archetypeToResourceType(archetype) : "repo";

  // Existing artifacts
  if (resourceType === "repo") {
    const spec = (s.repoSpec ?? null) as
      | { files?: Array<{ path: string; content?: string; purpose?: string }>; readmeContent?: string }
      | null;
    if (spec?.readmeContent) {
      w(path.join(dir, "artifacts", "README.md"), spec.readmeContent);
    }
    for (const f of spec?.files ?? []) {
      w(path.join(dir, "artifacts", "files", safeName(f.path)), f.content ?? "");
    }
    w(
      path.join(dir, "artifacts", "_index.json"),
      JSON.stringify(
        {
          fileCount: spec?.files?.length ?? 0,
          files: spec?.files?.map((f) => ({ path: f.path, purpose: f.purpose })) ?? [],
        },
        null,
        2,
      ),
    );
  } else {
    // Data: download CSVs from Supabase storage
    const { downloadScenarioFileText } = await import(
      "@/lib/external/scenario-data-storage"
    );
    for (const f of s.dataFiles) {
      try {
        const csv = await downloadScenarioFileText(f.storagePath);
        w(path.join(dir, "artifacts", safeName(f.filename)), csv);
      } catch (err) {
        w(
          path.join(dir, "artifacts", safeName(f.filename) + ".error"),
          `Failed to download: ${String(err)}`,
        );
      }
    }
    w(
      path.join(dir, "artifacts", "_index.json"),
      JSON.stringify(
        s.dataFiles.map((f) => ({
          filename: f.filename,
          rows: f.rowCount,
          bytes: f.byteSize,
        })),
        null,
        2,
      ),
    );
  }
}

async function generateAfterDocs(s: ScenarioRow) {
  const archetype = SLUG_TO_ARCHETYPE[s.archetype?.slug ?? ""];
  if (!archetype) throw new Error(`Cannot map archetype slug "${s.archetype?.slug}"`);
  const resourceType = archetypeToResourceType(archetype);
  const language = isSupportedLanguage(s.language) ? s.language : DEFAULT_LANGUAGE;

  let scaffoldLayout:
    | { name: string; description: string; baselineFiles: string[] }
    | undefined;
  if (resourceType === "repo") {
    try {
      const sc = selectScaffold(s.techStack);
      scaffoldLayout = {
        name: sc.name,
        description: sc.layoutDescription,
        baselineFiles: sc.baselineFiles,
      };
    } catch {
      /* no scaffold match */
    }
  }

  const result = await generatePlanAndDocs({
    companyName: s.companyName,
    companyDescription: s.companyDescription,
    taskDescription: s.taskDescription,
    techStack: s.techStack,
    roleName: s.archetype?.name ?? getArchetypeDisplayName(archetype),
    seniorityLevel: s.targetLevel,
    archetypeName: s.archetype?.name ?? getArchetypeDisplayName(archetype),
    resourceType,
    coworkers: s.coworkers.map((c) => ({ name: c.name, role: c.role })),
    language,
    scaffoldLayout,
  });

  return { ...result, archetype, resourceType };
}

function buildScenarioMetadata(s: ScenarioRow): ScenarioMetadata {
  return {
    name: s.name,
    companyName: s.companyName,
    companyDescription: s.companyDescription,
    taskDescription: s.taskDescription,
    techStack: s.techStack,
    targetLevel: s.targetLevel,
    coworkers: s.coworkers.map((c) => ({
      name: c.name,
      role: c.role,
      personaStyle: c.personaStyle,
      knowledge:
        (c.knowledge as Array<{
          topic: string;
          triggerKeywords: string[];
          response: string;
          isCritical: boolean;
        }>) ?? [],
    })),
  };
}

function buildExtraContext(plan: ResourcePlan, docs: ScenarioDoc[]) {
  const planLines = plan.resources
    .map(
      (r) =>
        `- ${r.label} (\`${r.filename}\`, ${r.type})\n    objective: ${r.objective}\n    candidateUsage: ${r.candidateUsage}`,
    )
    .join("\n");
  const criteriaLines = plan.qualityCriteria.map((q) => `  - ${q}`).join("\n");
  const docSummaries = docs
    .map((d) => `### ${d.name} (${d.filename})\n\n${d.markdown}`)
    .join("\n\n---\n\n");
  return `## Plan resources\n${planLines}\n\n## Quality criteria\n${criteriaLines}\n\n## Docs the candidate will read\n\n${docSummaries}`;
}

async function generateAfterArtifacts(
  s: ScenarioRow,
  plan: ResourcePlan,
  docs: ScenarioDoc[],
  resourceType: "repo" | "data",
  outDir: string,
) {
  if (resourceType === "repo") {
    const metadata = buildScenarioMetadata(s);
    const extraContext = buildExtraContext(plan, docs);
    const result = await generateRepoSpec(metadata, { extraContext });
    if (result.spec.readmeContent) {
      w(path.join(outDir, "README.md"), result.spec.readmeContent);
    }
    for (const f of result.spec.files) {
      w(path.join(outDir, "files", safeName(f.path)), f.content ?? "");
    }
    w(
      path.join(outDir, "_index.json"),
      JSON.stringify(
        {
          fileCount: result.spec.files.length,
          files: result.spec.files.map((f) => ({ path: f.path, purpose: f.purpose })),
          commitCount: result.spec.commitHistory.length,
          issueCount: result.spec.issues.length,
          promptVersion: result._meta.promptVersion,
        },
        null,
        2,
      ),
    );
    return { kind: "repo" as const, fileCount: result.spec.files.length };
  }

  // Data path — replicate generateDataArtifact's Gemini call without
  // Supabase upload / DB writes.
  const promptText = buildDataArtifactPrompt({
    plan,
    docs,
    scenario: {
      companyName: s.companyName,
      taskDescription: s.taskDescription,
      techStack: s.techStack,
      roleName: s.archetype?.name ?? "",
      seniorityLevel: s.targetLevel,
    },
    attempt: 1,
  });

  const stream = await gemini.models.generateContentStream({
    model: PRO_MODEL,
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    config: { tools: [{ codeExecution: {} }], temperature: 0.6 },
  });

  const parts: GeminiResponsePart[] = [];
  for await (const chunk of stream) {
    const cps = chunk.candidates?.[0]?.content?.parts as
      | GeminiResponsePart[]
      | undefined;
    if (cps) parts.push(...cps);
  }

  const extraction = extractCsvsFromGeminiParts(parts);

  for (const f of extraction.files) {
    w(path.join(outDir, safeName(f.filename)), f.csv);
  }
  w(
    path.join(outDir, "_index.json"),
    JSON.stringify(
      {
        promptVersion: DATA_ARTIFACT_PROMPT_VERSION,
        fileCount: extraction.files.length,
        files: extraction.files.map((f) => ({
          filename: f.filename,
          rowCount: f.rowCount,
          columns: f.columns,
        })),
        errors: extraction.errors.map((e) =>
          e.filename ? `${e.filename}: ${e.message}` : e.message,
        ),
      },
      null,
      2,
    ),
  );
  return { kind: "data" as const, fileCount: extraction.files.length };
}

function buildDiffSummary(
  s: ScenarioRow,
  beforeDocs: Array<{ name: string; filename: string; markdown: string }>,
  afterDocs: ScenarioDoc[],
  archetype: string,
  resourceType: string,
  artifactSummary: { kind: string; fileCount: number } | null,
) {
  const lines: string[] = [];
  lines.push(`# Comparison: ${s.name}\n`);
  lines.push(`**Scenario ID:** \`${s.id}\``);
  lines.push(`**Archetype:** ${archetype}`);
  lines.push(`**Resource type:** ${resourceType}\n`);

  lines.push(`## Docs\n`);
  lines.push(`| | Before (v2.2 era) | After (current code) |`);
  lines.push(`|---|---|---|`);
  lines.push(
    `| **Doc count** | ${beforeDocs.length} | ${afterDocs.length} |`,
  );
  lines.push(
    `| **Total chars** | ${beforeDocs.reduce((n, d) => n + d.markdown.length, 0)} | ${afterDocs.reduce((n, d) => n + d.markdown.length, 0)} |`,
  );
  lines.push(
    `| **H2 count (sum)** | ${beforeDocs.reduce((n, d) => n + (d.markdown.match(/^## /gm)?.length ?? 0), 0)} | ${afterDocs.reduce((n, d) => n + (d.markdown.match(/^## /gm)?.length ?? 0), 0)} |`,
  );
  lines.push(
    `| **Tables (sum)** | ${beforeDocs.reduce((n, d) => n + (d.markdown.match(/^\|.*\|$/gm)?.length ?? 0), 0)} | ${afterDocs.reduce((n, d) => n + (d.markdown.match(/^\|.*\|$/gm)?.length ?? 0), 0)} |`,
  );
  lines.push(
    `| **Bullet lines (sum)** | ${beforeDocs.reduce((n, d) => n + (d.markdown.match(/^[\s]*[-*] /gm)?.length ?? 0), 0)} | ${afterDocs.reduce((n, d) => n + (d.markdown.match(/^[\s]*[-*] /gm)?.length ?? 0), 0)} |`,
  );

  if (artifactSummary) {
    lines.push(`\n## Artifacts\n`);
    lines.push(
      `Generated **${artifactSummary.fileCount}** ${artifactSummary.kind} artifact(s) from the v2.3 plan.`,
    );
  } else {
    lines.push(`\n## Artifacts\n`);
    lines.push(`Skipped (--step1-only).`);
  }

  lines.push(`\n## File layout\n`);
  lines.push("```");
  lines.push(`before/docs/             — existing markdown docs from DB`);
  lines.push(`before/plan.json         — existing plan from DB`);
  lines.push(`before/artifacts/        — existing repo files / CSVs`);
  lines.push(`after/docs/              — fresh markdown from current prompt`);
  lines.push(`after/plan.json          — fresh plan from current prompt`);
  lines.push(`after/artifacts/         — fresh repo spec / CSVs`);
  lines.push("```");

  return lines.join("\n") + "\n";
}

async function processOne(
  s: ScenarioRow,
  rootDir: string,
  step1Only: boolean,
  prisma: PrismaClient,
) {
  const archetype = SLUG_TO_ARCHETYPE[s.archetype?.slug ?? ""];
  const arche = archetype ?? "unknown";
  const dir = path.join(rootDir, `${s.id}-${arche.toLowerCase()}`);

  console.log(`\n=== ${s.name} ===`);
  console.log(`  scenario:  ${s.id}`);
  console.log(`  archetype: ${arche}`);

  // Capture before
  console.log(`  capturing before… `);
  await captureBefore(s, path.join(dir, "before"), prisma);

  // Generate after — Step 1
  console.log(`  generating Step 1 (plan+docs)…`);
  const t1 = Date.now();
  const after = await generateAfterDocs(s);
  console.log(
    `    done in ${((Date.now() - t1) / 1000).toFixed(1)}s — ${after.docs.length} docs, ${after.plan.resources.length} plan resources, version ${after._meta.promptVersion}`,
  );

  for (const d of after.docs) {
    w(path.join(dir, "after", "docs", safeName(d.filename)), d.markdown);
  }
  w(path.join(dir, "after", "plan.json"), JSON.stringify(after.plan, null, 2));
  w(
    path.join(dir, "after", "_meta.json"),
    JSON.stringify(after._meta, null, 2),
  );

  // Generate after — Step 2 (optional)
  let artifactSummary: { kind: string; fileCount: number } | null = null;
  if (!step1Only) {
    console.log(`  generating Step 2 (${after.resourceType} artifacts)…`);
    const t2 = Date.now();
    try {
      artifactSummary = await generateAfterArtifacts(
        s,
        after.plan,
        after.docs,
        after.resourceType,
        path.join(dir, "after", "artifacts"),
      );
      console.log(
        `    done in ${((Date.now() - t2) / 1000).toFixed(1)}s — ${artifactSummary.fileCount} ${artifactSummary.kind} files`,
      );
    } catch (err) {
      console.error(`    Step 2 failed: ${String(err)}`);
      w(
        path.join(dir, "after", "artifacts", "_error.txt"),
        String(err),
      );
    }
  }

  // Diff summary
  const beforeDocs =
    (s.docs as Array<{ name: string; filename: string; markdown: string }>) ?? [];
  const diffMd = buildDiffSummary(
    s,
    beforeDocs,
    after.docs,
    arche,
    after.resourceType,
    artifactSummary,
  );
  w(path.join(dir, "DIFF.md"), diffMd);

  console.log(`  → ${dir}/DIFF.md`);
}

async function main() {
  const args = process.argv.slice(2);
  const step1Only = args.includes("--step1-only");
  const ids = args.filter((a) => !a.startsWith("--"));
  if (ids.length === 0) {
    console.error(
      "Usage: tsx scripts/compare-prompt-versions.ts <scenarioId> [...] [--step1-only]",
    );
    process.exit(1);
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const rootDir = path.resolve(process.cwd(), `tmp/compare-prompts-${runId}`);
  fs.mkdirSync(rootDir, { recursive: true });
  console.log(`Output dir: ${rootDir}`);
  console.log(`Mode: ${step1Only ? "Step 1 only" : "Step 1 + Step 2"}`);

  const prisma = new PrismaClient();
  try {
    for (const id of ids) {
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
          coworkers: {
            select: {
              name: true,
              role: true,
              personaStyle: true,
              knowledge: true,
            },
          },
          docs: true,
          plan: true,
          repoSpec: true,
          dataFiles: {
            select: {
              filename: true,
              storagePath: true,
              byteSize: true,
              rowCount: true,
            },
          },
        },
      });
      if (!s) {
        console.error(`scenario ${id} not found, skipping`);
        continue;
      }
      try {
        await processOne(s as ScenarioRow, rootDir, step1Only, prisma);
      } catch (err) {
        console.error(`  Failed: ${String(err)}`);
      }
    }

    console.log(`\nDone. All output: ${rootDir}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
