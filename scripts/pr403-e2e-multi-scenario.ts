/**
 * PR 403 multi-scenario E2E driver (no DB required).
 *
 * For each fixture below it:
 *   1. Calls Step 1 of the resource pipeline: `generatePlanAndDocs`.
 *   2. For data archetypes, calls the data-artifact prompt against Pro+codeExec
 *      (mirroring `data-artifact-generator.integration.test.ts`) and parses
 *      the CSVs.
 *   3. For repo archetypes, calls `generateRepoSpec`.
 *   4. Persists every artifact to `tmp/pr403-e2e/<scenarioSlug>/` for
 *      human inspection.
 *
 * Mirrors the orchestrator's flow without touching Prisma or Supabase, so it
 * runs in the sandbox where TCP egress to Postgres is firewalled.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { GoogleGenAI } from "@google/genai";

import { generatePlanAndDocs } from "../src/lib/scenarios/plan-and-docs-generator";
import { generateRepoSpec } from "../src/lib/scenarios/repo-spec-generator";
import { selectScaffold } from "../src/lib/scenarios/repo-spec";
import { extractCsvsFromGeminiParts, type GeminiResponsePart } from "../src/lib/scenarios/csv-parsing";
import { buildDataArtifactPrompt } from "../src/prompts/recruiter/data-artifact";
import { validateMarkdownDocs } from "../src/lib/scenarios/validators/markdown";
// Note: validateCsvArtifact and validateRepoArtifact both read from Prisma
// (db.scenarioDataFile / db.scenario), so we can't use them in this no-DB
// driver. We do a lightweight manual sanity check instead.

const PRO_MODEL = "gemini-3.1-pro-preview";

type DataFixture = {
  kind: "data";
  slug: string;
  input: Parameters<typeof generatePlanAndDocs>[0];
};
type RepoFixture = {
  kind: "repo";
  slug: string;
  input: Parameters<typeof generatePlanAndDocs>[0];
  metadata: Parameters<typeof generateRepoSpec>[0];
};
type Fixture = DataFixture | RepoFixture;

const FIXTURES: Fixture[] = [
  {
    kind: "data",
    slug: "data-scientist-marketplace-fraud",
    input: {
      companyName: "Hopper Marketplace",
      companyDescription:
        "Two-sided marketplace for second-hand electronics, ~120k MAU, 3% take rate.",
      taskDescription:
        "Disputes are up 18% MoM. Investigate whether a new wave of seller fraud is driving it, or whether buyers are gaming our 30-day refund window.",
      techStack: ["Python", "SQL", "scikit-learn", "Pandas"],
      roleName: "Data Scientist",
      seniorityLevel: "senior",
      archetypeName: "Data Scientist",
      resourceType: "data",
      coworkers: [
        { name: "Maya", role: "Trust & Safety PM" },
        { name: "Devin", role: "Senior Data Engineer" },
      ],
      language: "en" as const,
    },
  },
  {
    kind: "repo",
    slug: "senior-frontend-checkout-rewrite",
    input: {
      companyName: "Lumen Tickets",
      companyDescription:
        "Live event ticketing platform, ~$80M GMV/year, mobile-first checkout.",
      taskDescription:
        "Our checkout abandons at 38% on the seat-selection step. Investigate the SeatPicker component and ship a fix that meaningfully reduces drop-off without breaking the venue API contract.",
      techStack: ["React", "Next.js", "TypeScript", "Tailwind"],
      roleName: "Senior Frontend Engineer",
      seniorityLevel: "senior",
      archetypeName: "Senior Frontend Engineer",
      resourceType: "repo",
      coworkers: [
        { name: "Priya", role: "Engineering Manager" },
        { name: "Theo", role: "Staff Backend Engineer" },
      ],
      language: "en" as const,
      scaffoldLayout: {
        name: "Next.js App Router",
        description: "Next.js 15 + App Router + Tailwind, with Vitest set up.",
        baselineFiles: ["package.json", "next.config.ts", "src/app/layout.tsx"],
      },
    },
    metadata: {
      name: "Lumen Tickets — SeatPicker abandonment",
      companyName: "Lumen Tickets",
      companyDescription:
        "Live event ticketing platform, ~$80M GMV/year, mobile-first checkout.",
      taskDescription:
        "Investigate why the SeatPicker component drives 38% drop-off and ship a fix without breaking the venue API contract.",
      techStack: ["React", "Next.js", "TypeScript", "Tailwind"],
      targetLevel: "senior",
      coworkers: [
        {
          name: "Priya",
          role: "Engineering Manager",
          personaStyle: "Pragmatic, asks for tradeoffs before implementation details.",
          knowledge: [
            {
              topic: "Why SeatPicker is hot",
              triggerKeywords: ["seat", "picker", "abandon"],
              response:
                "Yes — it's the #1 conversion blocker for the quarter. We've already tried two A/B tests on copy, neither moved the needle.",
              isCritical: true,
            },
          ],
        },
        {
          name: "Theo",
          role: "Staff Backend Engineer",
          personaStyle: "Precise, blunt about API contracts.",
          knowledge: [
            {
              topic: "Venue API contract",
              triggerKeywords: ["api", "venue", "contract"],
              response:
                "The venue API expects a stable seat-hold call within 250ms of selection. Don't batch holds — we've burned that bridge.",
              isCritical: true,
            },
          ],
        },
      ],
    },
  },
];

async function runDataArtifact(plan: { resources: any[]; qualityCriteria: string[] }, docs: any[], fixture: DataFixture): Promise<{ csvs: Array<{ filename: string; rowCount: number; columns: string[]; csv: string }>; durationMs: number }> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const promptInput = {
    scenario: {
      companyName: fixture.input.companyName,
      taskDescription: fixture.input.taskDescription,
      techStack: fixture.input.techStack,
      roleName: fixture.input.roleName,
      seniorityLevel: fixture.input.seniorityLevel,
    },
    plan: {
      resources: plan.resources
        .filter((r) => r.type === "csv")
        .map((r) => ({
          id: r.id,
          type: "csv" as const,
          label: r.label,
          filename: r.filename,
          objective: r.objective,
          candidateUsage: r.candidateUsage,
          targetRowCount: r.targetRowCount ?? 1000,
          dataShape: r.dataShape ?? "",
        })),
      qualityCriteria: plan.qualityCriteria,
    },
    docs: docs.map((d) => ({
      id: d.id,
      name: d.name,
      filename: d.filename,
      objective: d.objective,
      markdown: d.markdown,
    })),
    attempt: 1,
  };

  const prompt = buildDataArtifactPrompt(promptInput);
  console.log(`[data-artifact] calling ${PRO_MODEL} with codeExecution …`);
  const start = Date.now();
  const stream = await ai.models.generateContentStream({
    model: PRO_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      tools: [{ codeExecution: {} }],
      temperature: 0.6,
    },
  });
  const parts: GeminiResponsePart[] = [];
  let chunks = 0;
  for await (const chunk of stream) {
    chunks++;
    const cps = chunk.candidates?.[0]?.content?.parts as GeminiResponsePart[] | undefined;
    if (cps) parts.push(...cps);
    if (chunks % 5 === 0) {
      console.log(`[data-artifact]   …${chunks} chunks, ${parts.length} parts, ${((Date.now() - start) / 1000).toFixed(0)}s`);
    }
  }
  const durationMs = Date.now() - start;
  console.log(`[data-artifact] done in ${(durationMs / 1000).toFixed(1)}s`);
  const extraction = extractCsvsFromGeminiParts(parts);
  return { csvs: extraction.files, durationMs };
}

async function processFixture(fixture: Fixture, outRoot: string) {
  const dir = path.join(outRoot, fixture.slug);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`\n=========== ${fixture.slug} (${fixture.kind}) ===========`);

  // Step 1: plan + docs
  console.log(`[step1] generating plan + 3 docs via ${PRO_MODEL} …`);
  const step1Start = Date.now();
  const result = await generatePlanAndDocs(fixture.input);
  console.log(`[step1] done in ${((Date.now() - step1Start) / 1000).toFixed(1)}s — ${result.plan.resources.length} resources, ${result.docs.length} docs, attempts=${result._meta.attempts}`);

  // Persist docs.
  for (const doc of result.docs) {
    fs.writeFileSync(path.join(dir, doc.filename), doc.markdown);
  }
  fs.writeFileSync(path.join(dir, "_plan.json"), JSON.stringify(result.plan, null, 2));

  // Validators (markdown).
  const docResources = result.plan.resources.filter((r) => r.type === "document");
  const csvResources = result.plan.resources.filter((r) => r.type === "csv");
  const repoResources = result.plan.resources.filter((r) => r.type === "repository");

  const mdErrors = validateMarkdownDocs({
    docs: result.docs,
    taskDescription: fixture.input.taskDescription,
  });
  fs.writeFileSync(path.join(dir, "_markdown-validation.json"), JSON.stringify({ errors: mdErrors }, null, 2));
  console.log(`[validators] markdown: errors=${mdErrors.length}${mdErrors.length ? "\n  - " + mdErrors.join("\n  - ") : ""}`);

  // Step 2: artifact branch.
  if (fixture.kind === "data") {
    if (csvResources.length === 0) {
      console.log("[step2] WARN: plan produced no csv resources, skipping data-artifact step");
    } else {
      const { csvs } = await runDataArtifact(result.plan, result.docs, fixture);
      for (const f of csvs) {
        fs.writeFileSync(path.join(dir, f.filename), f.csv);
      }
      // Manual sanity check (the real validateCsvArtifact reads from Prisma).
      const sanity: string[] = [];
      const planFilenames = csvResources.map((r) => r.filename);
      const matchedPlan = csvs.filter((f) => planFilenames.includes(f.filename));
      if (matchedPlan.length === 0) {
        sanity.push(`No CSVs match planned filenames (got: ${csvs.map((c) => c.filename).join(", ")}; planned: ${planFilenames.join(", ")})`);
      }
      for (const f of csvs) {
        if (f.rowCount < 30) sanity.push(`${f.filename}: ${f.rowCount} rows (<30 floor)`);
        if (f.rowCount > 5000) sanity.push(`${f.filename}: ${f.rowCount} rows (>5k cap)`);
        if (f.columns.length < 3) sanity.push(`${f.filename}: only ${f.columns.length} columns`);
        if (f.columns.some((c) => !c)) sanity.push(`${f.filename}: empty column header`);
      }
      fs.writeFileSync(path.join(dir, "_csv-sanity.json"), JSON.stringify({ errors: sanity }, null, 2));
      console.log(`[sanity] csv: errors=${sanity.length}${sanity.length ? "\n  - " + sanity.join("\n  - ") : ""}`);
      fs.writeFileSync(
        path.join(dir, "_csv-summary.json"),
        JSON.stringify(
          csvs.map((c) => ({ filename: c.filename, rowCount: c.rowCount, columnCount: c.columns.length, columns: c.columns })),
          null,
          2,
        ),
      );
    }
  } else {
    // Repo branch — generate spec only (no GitHub repo build, since the user
    // asked us to verify file creation; the spec is the file plan).
    console.log("[step2] generating repo spec …");
    const start = Date.now();
    const spec = await generateRepoSpec(fixture.metadata, {
      extraContext: `Plan resources:\n${JSON.stringify(repoResources, null, 2)}\n\nDocs (excerpt): ${result.docs.map((d) => d.name).join(", ")}`,
    });
    console.log(`[step2] repo spec done in ${((Date.now() - start) / 1000).toFixed(1)}s — ${spec.spec.files.length} files`);
    fs.writeFileSync(path.join(dir, "_repo-spec.json"), JSON.stringify(spec.spec, null, 2));

    // Lightweight repo-spec sanity (the real validateRepoArtifact needs DB).
    const sanity: string[] = [];
    if (!Array.isArray(spec.spec.files) || spec.spec.files.length === 0) sanity.push("spec.files is empty");
    if (!Array.isArray(spec.spec.commitHistory) || spec.spec.commitHistory.length === 0) sanity.push("spec.commitHistory is empty");
    if (!Array.isArray(spec.spec.issues) || !spec.spec.issues.some((i: any) => i.isMainTask)) sanity.push("spec.issues lacks a main-task issue");
    fs.writeFileSync(path.join(dir, "_repo-sanity.json"), JSON.stringify({ errors: sanity }, null, 2));
    console.log(`[sanity] repo: errors=${sanity.length}${sanity.length ? "\n  - " + sanity.join("\n  - ") : ""}`);
  }

  console.log(`[done] artifacts in ${dir}`);
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is required");
    process.exit(1);
  }
  const outRoot = path.resolve(process.cwd(), "tmp/pr403-e2e");
  fs.mkdirSync(outRoot, { recursive: true });

  const onlySlug = process.argv[2];
  const targets = onlySlug ? FIXTURES.filter((f) => f.slug === onlySlug) : FIXTURES;
  for (const fixture of targets) {
    try {
      await processFixture(fixture, outRoot);
    } catch (e: any) {
      console.error(`FIXTURE FAILED: ${fixture.slug}`, e.message ?? e);
      fs.writeFileSync(path.join(outRoot, fixture.slug, "_FAILURE.txt"), String(e?.stack ?? e));
    }
  }
  console.log("\n=== summary ===");
  console.log("Outputs at:", outRoot);
}

main().then(() => process.exit(0));
