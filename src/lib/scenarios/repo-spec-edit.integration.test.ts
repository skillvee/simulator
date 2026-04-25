/**
 * Integration test: can Gemini 3 Flash do "edit, don't regenerate" on a
 * RepoSpec when given the prior spec + judge feedback in context?
 *
 * Mirrors the iterative-edit tests on the data branch, but for repos:
 *   1. Baseline — generate a fresh spec from a fixture metadata.
 *   2. Modify — pass the baseline back with judge feedback that targets ONE
 *      file (the README); assert most files are byte-identical and the
 *      README actually changed.
 *   3. Add — pass the baseline back with judge feedback that asks for a NEW
 *      file; assert the new file appears and other files are preserved.
 *
 * Calls GoogleGenAI directly (not via @/lib/ai/gemini) so we don't pull in
 * the full server env barrel — same pattern as data-artifact-generator.integration.test.ts.
 *
 * Each test writes captured output to `tmp/repo-spec-edit/<n>/<run-id>/`.
 *
 * Run: `npm run test:integration -- repo-spec-edit`
 * Requires: GEMINI_API_KEY
 */

import { describe, it, expect, beforeAll } from "vitest";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  REPO_SPEC_GENERATOR_PROMPT,
} from "@/prompts/recruiter/repo-spec-generator";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FLASH_MODEL = "gemini-3-flash-preview";
const canRun = !!GEMINI_API_KEY;

// ---------------------------------------------------------------------------
// Local copies of the types/schema we need (avoid pulling logger/env barrel)
// ---------------------------------------------------------------------------

interface ScenarioMetadata {
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  techStack: string[];
  targetLevel: string;
  coworkers: Array<{
    name: string;
    role: string;
    personaStyle: string;
    knowledge: Array<{
      topic: string;
      triggerKeywords: string[];
      response: string;
      isCritical: boolean;
    }>;
  }>;
}

const repoSpecSchema = z.object({
  projectName: z.string().min(1),
  projectDescription: z.string().min(1),
  scaffoldId: z.enum(["nextjs-ts", "express-ts"]),
  readmeContent: z.string().min(50),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
        purpose: z.enum(["stub", "working", "test", "doc", "config"]),
        addedInCommit: z.number().int().min(0),
      })
    )
    .min(3),
  commitHistory: z
    .array(
      z.object({
        message: z.string().min(1),
        authorName: z.string().min(1),
        authorEmail: z.string().email(),
        daysAgo: z.number().int().min(0),
      })
    )
    .min(3),
  issues: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(10),
        labels: z.array(z.string()).default([]),
        state: z.enum(["open", "closed"]),
        isMainTask: z.boolean(),
        comments: z
          .array(
            z.object({
              authorName: z.string().min(1),
              body: z.string().min(1),
            })
          )
          .default([]),
      })
    )
    .min(2),
  authors: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.string().min(1),
      })
    )
    .min(2),
});

type RepoSpec = z.infer<typeof repoSpecSchema>;

// ---------------------------------------------------------------------------
// Fixture metadata — Senior backend role at a fake logistics company.
// ---------------------------------------------------------------------------

const FIXTURE_METADATA: ScenarioMetadata = {
  name: "Webhook delivery diagnostics",
  companyName: "Loomly Logistics",
  companyDescription:
    "Last-mile delivery routing platform. Drivers ping the API with location updates; warehouses subscribe via webhooks to dispatch follow-on orders.",
  taskDescription:
    "Webhooks have started timing out for ~5% of subscribers since last week's release. The team thinks it's auth-related but they're not sure. Investigate, find the root cause, and propose a fix. The previous engineer left some scaffolding around webhook delivery but it's incomplete.",
  techStack: ["Next.js", "TypeScript", "Prisma"],
  targetLevel: "Senior",
  coworkers: [
    {
      name: "Sasha Reyes",
      role: "Engineering Manager",
      personaStyle: "Direct, asks clarifying questions, expects clean PRs.",
      knowledge: [
        {
          topic: "Recent release",
          triggerKeywords: ["release", "deploy", "last week"],
          response:
            "We rolled out webhook signature verification last Friday — it might be related but I haven't dug in.",
          isCritical: true,
        },
      ],
    },
    {
      name: "Jordan Park",
      role: "Senior Backend Engineer",
      personaStyle: "Pragmatic, prefers concrete examples over theory.",
      knowledge: [
        {
          topic: "Webhook architecture",
          triggerKeywords: ["webhook", "delivery", "timeout"],
          response:
            "The dispatcher fans out to subscribers via Promise.all with no per-request timeout. Probably worth checking that.",
          isCritical: true,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildContextPrompt(
  metadata: ScenarioMetadata,
  scaffoldId: string
): string {
  const coworkerList = metadata.coworkers
    .map((c) => {
      const criticalKnowledge = c.knowledge
        .filter((k) => k.isCritical)
        .map((k) => `    - ${k.topic}: ${k.response}`)
        .join("\n");
      return `- **${c.name}** (${c.role}): ${c.personaStyle}\n  Critical knowledge:\n${criticalKnowledge}`;
    })
    .join("\n\n");

  return `**Company Name:** ${metadata.companyName}
**Company Description:** ${metadata.companyDescription}
**Scenario Name:** ${metadata.name}
**Target Level:** ${metadata.targetLevel}
**Tech Stack:** ${metadata.techStack.join(", ")}
**Scaffold:** ${scaffoldId}

**Task Description (written as manager speaking to candidate):**
${metadata.taskDescription}

**Team Members (coworkers the candidate will interact with):**
${coworkerList}

Generate a complete RepoSpec for this scenario. The repo should feel like a real codebase at ${metadata.companyName}, not a toy exercise. Use the coworker names as git authors and issue commenters. Make the project name something that fits ${metadata.companyName}'s domain.`;
}

function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned.trim();
}

async function callGenerateRepoSpec(args: {
  metadata: ScenarioMetadata;
  extraContext?: string;
}): Promise<{ spec: RepoSpec; rawText: string; durationMs: number }> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
  const baseContext = buildContextPrompt(args.metadata, "nextjs-ts");
  const fullContext = args.extraContext
    ? `${baseContext}\n\n## Additional Context\n\n${args.extraContext}`
    : baseContext;

  const fullPrompt = `${REPO_SPEC_GENERATOR_PROMPT}\n\n## Context for Generation\n\n${fullContext}`;

  const startTs = Date.now();
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
  });
  const durationMs = Date.now() - startTs;

  const rawText = response.text ?? "";
  if (!rawText) throw new Error("Empty response from Gemini");

  const cleaned = cleanJsonResponse(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `JSON parse failed: ${(err as Error).message}\nFirst 500 chars of cleaned: ${cleaned.slice(0, 500)}`
    );
  }
  const result = repoSpecSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid RepoSpec: ${issues}`);
  }

  return { spec: result.data, rawText, durationMs };
}

function persistSpec(args: {
  testNum: number;
  label: string;
  spec: RepoSpec;
  rawText?: string;
  meta?: Record<string, unknown>;
}): string {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(
    process.cwd(),
    "tmp/repo-spec-edit",
    String(args.testNum),
    `${runId}-${args.label}`
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "spec.json"), JSON.stringify(args.spec, null, 2));
  if (args.rawText) {
    fs.writeFileSync(path.join(outDir, "raw.txt"), args.rawText);
  }
  fs.writeFileSync(
    path.join(outDir, "_summary.json"),
    JSON.stringify(
      {
        projectName: args.spec.projectName,
        scaffoldId: args.spec.scaffoldId,
        fileCount: args.spec.files.length,
        commitCount: args.spec.commitHistory.length,
        issueCount: args.spec.issues.length,
        files: args.spec.files.map((f) => ({
          path: f.path,
          purpose: f.purpose,
          byteSize: Buffer.byteLength(f.content, "utf8"),
        })),
        ...(args.meta ?? {}),
      },
      null,
      2
    )
  );
  return outDir;
}

interface DiffResult {
  baselineFileCount: number;
  retryFileCount: number;
  identical: string[];
  modified: string[];
  added: string[];
  removed: string[];
  preservationRatio: number;
}

// Cheap O(n) similarity — character-level Jaccard over fixed-size shingles.
// Good enough to detect "essentially unchanged" vs "rewritten" without
// pulling in a real diff library.
function sequenceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const shingles = (s: string, k = 8) => {
    const out = new Set<string>();
    for (let i = 0; i <= s.length - k; i++) out.add(s.slice(i, i + k));
    return out;
  };
  const A = shingles(a);
  const B = shingles(b);
  let inter = 0;
  for (const sh of A) if (B.has(sh)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function diffSpecs(baseline: RepoSpec, retry: RepoSpec): DiffResult {
  const baselineFiles = new Map(baseline.files.map((f) => [f.path, f.content]));
  const retryFiles = new Map(retry.files.map((f) => [f.path, f.content]));

  const identical: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  for (const [pathKey, content] of baselineFiles) {
    if (!retryFiles.has(pathKey)) {
      removed.push(pathKey);
    } else if (retryFiles.get(pathKey) === content) {
      identical.push(pathKey);
    } else {
      modified.push(pathKey);
    }
  }
  const added: string[] = [];
  for (const pathKey of retryFiles.keys()) {
    if (!baselineFiles.has(pathKey)) added.push(pathKey);
  }

  return {
    baselineFileCount: baselineFiles.size,
    retryFileCount: retryFiles.size,
    identical,
    modified,
    added,
    removed,
    preservationRatio: identical.length / Math.max(baselineFiles.size, 1),
  };
}

function buildEditContext(args: {
  priorSpec: RepoSpec;
  judgeFeedback: string;
}): string {
  return `## Iterative refinement — you are EDITING, not regenerating from scratch

This is a retry. Your previous attempt produced the spec below. A judge has reviewed it and given feedback. Emit a NEW \`RepoSpec\` JSON that addresses the feedback.

### CRITICAL RULES

1. PRESERVE every file that the feedback does not call out. Their \`path\`,
   \`content\`, \`purpose\`, and \`addedInCommit\` MUST be byte-identical to the
   prior spec. Do not touch whitespace, comments, or imports if not asked.

2. Only modify or add files that the feedback explicitly requests. If you
   touch a file, make a real, surgical change — do not paraphrase or
   "improve" surrounding code.

3. Keep \`projectName\`, \`scaffoldId\`, \`authors\`, \`commitHistory\` (except
   for any new commits you add for new files), \`issues\`, and \`readmeContent\`
   identical unless the feedback requires changing them.

### Prior spec (your previous attempt)

\`\`\`json
${JSON.stringify(args.priorSpec, null, 2)}
\`\`\`

### Judge feedback

${args.judgeFeedback}

### What to emit

A complete RepoSpec JSON. Include EVERY file from the prior spec — even the
unchanged ones, copy them verbatim. Add or modify only what the feedback
demands. Your output is the full new spec, not a diff.`;
}

// ---------------------------------------------------------------------------
// Shared baseline — one expensive call, two retry tests reuse it.
// ---------------------------------------------------------------------------

let SHARED_BASELINE: RepoSpec | null = null;

beforeAll(async () => {
  if (!canRun) return;
  console.log("Generating shared baseline RepoSpec…");
  const result = await callGenerateRepoSpec({ metadata: FIXTURE_METADATA });
  SHARED_BASELINE = result.spec;
  console.log(
    `Baseline: ${(result.durationMs / 1000).toFixed(1)}s, ${result.spec.files.length} files`
  );
  persistSpec({
    testNum: 0,
    label: "baseline",
    spec: result.spec,
    rawText: result.rawText,
  });
}, 240_000);

// ---------------------------------------------------------------------------
// Test 1 — Baseline sanity
// ---------------------------------------------------------------------------

describe.skipIf(!canRun)("Repo spec edit: baseline sanity", () => {
  it("baseline produces a valid spec with multiple files", () => {
    expect(SHARED_BASELINE).not.toBeNull();
    const spec = SHARED_BASELINE!;
    expect(spec.files.length).toBeGreaterThanOrEqual(3);
    expect(spec.scaffoldId).toBe("nextjs-ts");
    expect(spec.issues.some((i) => i.isMainTask)).toBe(true);
    console.log(
      `Baseline: ${spec.files.length} files, ${spec.commitHistory.length} commits, ${spec.issues.length} issues`
    );
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Modify: README-only change should preserve other files
// ---------------------------------------------------------------------------

describe.skipIf(!canRun)("Repo spec edit: modify README, preserve rest", () => {
  it(
    "given baseline + 'modify README only' feedback, model preserves >=70% of files byte-identical",
    { timeout: 240_000 },
    async () => {
      expect(SHARED_BASELINE).not.toBeNull();
      const baseline = SHARED_BASELINE!;

      const judgeFeedback = `The README is missing a "## Local Setup" section that documents the install command, dev command, and any required environment variables. Add that section to \`README.md\` only. Do not modify any other file. Do not change anything else about the README aside from adding the new section near the top.`;

      const editContext = buildEditContext({
        priorSpec: baseline,
        judgeFeedback,
      });

      console.log("Test 2: running retry with README-only feedback…");
      const result = await callGenerateRepoSpec({
        metadata: FIXTURE_METADATA,
        extraContext: editContext,
      });
      console.log(
        `Test 2: retry generated in ${(result.durationMs / 1000).toFixed(1)}s — ${result.spec.files.length} files`
      );

      const diff = diffSpecs(baseline, result.spec);
      console.log(
        `Test 2: identical=${diff.identical.length}/${diff.baselineFileCount}, modified=${diff.modified.length}, added=${diff.added.length}, removed=${diff.removed.length}, preservation=${(diff.preservationRatio * 100).toFixed(1)}%`
      );
      console.log(`  modified files: ${diff.modified.join(", ") || "(none)"}`);
      console.log(`  added files:    ${diff.added.join(", ") || "(none)"}`);
      console.log(`  removed files:  ${diff.removed.join(", ") || "(none)"}`);

      const outDir = persistSpec({
        testNum: 2,
        label: "retry-readme",
        spec: result.spec,
        rawText: result.rawText,
        meta: { judgeFeedback, diff },
      });
      console.log(`Test 2: artifacts at ${outDir}`);

      expect(
        diff.preservationRatio,
        `Expected >=70% of files preserved byte-identical. ` +
          `Got ${(diff.preservationRatio * 100).toFixed(1)}%. ` +
          `Modified: [${diff.modified.join(", ")}]. See ${outDir}.`
      ).toBeGreaterThanOrEqual(0.7);

      // README lives in `readmeContent`, not `files[]` — assert directly.
      expect(
        result.spec.readmeContent !== baseline.readmeContent,
        `readmeContent unchanged despite 'modify README' feedback. See ${outDir}.`
      ).toBe(true);
      expect(
        result.spec.readmeContent.toLowerCase().includes("local setup"),
        `Local Setup section missing from updated README. See ${outDir}.`
      ).toBe(true);

      expect(
        diff.removed.length,
        `Model dropped ${diff.removed.length} files unexpectedly: [${diff.removed.join(", ")}].`
      ).toBeLessThanOrEqual(1);
    }
  );
});

// ---------------------------------------------------------------------------
// Test 4 — Patch mode: model emits {unchanged: true} for untouched files
//
// This is the cleanest way to eliminate "lazy regeneration drift" — the
// model literally cannot accidentally edit a file if it isn't asked to
// re-emit its content. The test merges {unchanged: true} entries from the
// baseline and diffs to confirm zero drift.
// ---------------------------------------------------------------------------

const patchSpecFileSchema = z.union([
  z.object({
    path: z.string().min(1),
    unchanged: z.literal(true),
  }),
  z.object({
    path: z.string().min(1),
    content: z.string(),
    purpose: z.enum(["stub", "working", "test", "doc", "config"]),
    addedInCommit: z.number().int().min(0),
    unchanged: z.literal(false).optional(),
  }),
]);

const patchSpecSchema = z.object({
  projectName: z.string().min(1),
  projectDescription: z.string().min(1),
  scaffoldId: z.enum(["nextjs-ts", "express-ts"]),
  readmeContent: z.string().min(50),
  files: z.array(patchSpecFileSchema).min(3),
  commitHistory: z
    .array(
      z.object({
        message: z.string().min(1),
        authorName: z.string().min(1),
        authorEmail: z.string().email(),
        daysAgo: z.number().int().min(0),
      })
    )
    .min(3),
  issues: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(10),
        labels: z.array(z.string()).default([]),
        state: z.enum(["open", "closed"]),
        isMainTask: z.boolean(),
        comments: z
          .array(
            z.object({
              authorName: z.string().min(1),
              body: z.string().min(1),
            })
          )
          .default([]),
      })
    )
    .min(2),
  authors: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.string().min(1),
      })
    )
    .min(2),
});

type PatchSpec = z.infer<typeof patchSpecSchema>;

function buildPatchModeContext(args: {
  priorSpec: RepoSpec;
  judgeFeedback: string;
}): string {
  const fileList = args.priorSpec.files
    .map((f) => `  - \`${f.path}\` (${f.purpose})`)
    .join("\n");

  return `## Iterative refinement — PATCH MODE

This is a retry. Your previous attempt produced the spec referenced below. A judge has reviewed it and given feedback. Emit a NEW \`RepoSpec\` JSON.

### Patch-mode rule (THIS IS THE IMPORTANT PART)

For every file in the prior spec, choose ONE of two output forms:

**(a) Unchanged** — emit only \`{ "path": "...", "unchanged": true }\`. Do NOT include \`content\`, \`purpose\`, or \`addedInCommit\` for unchanged files.

**(b) Modified or new** — emit the full file object: \`{ "path": "...", "content": "...", "purpose": "...", "addedInCommit": N }\`.

Use form (a) for ANY file the feedback does not explicitly require changing. This includes files the feedback doesn't mention at all. The orchestrator will merge unchanged files from the prior spec by path. Do not duplicate content.

### Files in the prior spec (for reference)

${fileList}

### Prior spec — for reference (use this to know what files exist; DO NOT re-emit unchanged content)

\`\`\`json
${JSON.stringify(
  {
    projectName: args.priorSpec.projectName,
    scaffoldId: args.priorSpec.scaffoldId,
    readmeContent: args.priorSpec.readmeContent,
    commitHistory: args.priorSpec.commitHistory,
    issues: args.priorSpec.issues,
    authors: args.priorSpec.authors,
    fileCount: args.priorSpec.files.length,
  },
  null,
  2
)}
\`\`\`

(Files are listed above; full file content omitted from this prompt to discourage you from re-emitting them. Use \`{path, unchanged: true}\` for any file you don't change.)

### Judge feedback

${args.judgeFeedback}

### What to emit

A complete RepoSpec JSON in patch mode. Every file from the prior spec must
appear in \`files[]\` either as \`{path, unchanged: true}\` OR with full
\`content\`. New files appear with full content. The output schema is the
same as RepoSpec except \`files[]\` items can be the unchanged-marker form.`;
}

async function callGenerateRepoSpecPatchMode(args: {
  metadata: ScenarioMetadata;
  priorSpec: RepoSpec;
  judgeFeedback: string;
}): Promise<{ rawText: string; durationMs: number; mergedSpec: RepoSpec; patchSpec: PatchSpec; unchangedCount: number; modifiedCount: number; addedCount: number }> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
  const baseContext = buildContextPrompt(args.metadata, "nextjs-ts");
  const editContext = buildPatchModeContext({
    priorSpec: args.priorSpec,
    judgeFeedback: args.judgeFeedback,
  });

  const fullPrompt = `${REPO_SPEC_GENERATOR_PROMPT}\n\n## Context for Generation\n\n${baseContext}\n\n${editContext}`;

  const startTs = Date.now();
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
  });
  const durationMs = Date.now() - startTs;

  const rawText = response.text ?? "";
  if (!rawText) throw new Error("Empty response");
  const cleaned = cleanJsonResponse(rawText);
  const parsed = JSON.parse(cleaned);
  const patch = patchSpecSchema.parse(parsed);

  // Merge: build the final files[] from patch + baseline.
  const baselineByPath = new Map(args.priorSpec.files.map((f) => [f.path, f]));
  const mergedFiles: RepoSpec["files"] = [];
  let unchangedCount = 0;
  let modifiedCount = 0;
  let addedCount = 0;

  for (const file of patch.files) {
    if ("unchanged" in file && file.unchanged === true) {
      const orig = baselineByPath.get(file.path);
      if (!orig) {
        throw new Error(
          `Patch references unchanged file '${file.path}' that doesn't exist in baseline.`
        );
      }
      mergedFiles.push(orig);
      unchangedCount += 1;
    } else if ("content" in file) {
      mergedFiles.push({
        path: file.path,
        content: file.content,
        purpose: file.purpose,
        addedInCommit: file.addedInCommit,
      });
      if (baselineByPath.has(file.path)) modifiedCount += 1;
      else addedCount += 1;
    }
  }

  const mergedSpec: RepoSpec = {
    projectName: patch.projectName,
    projectDescription: patch.projectDescription,
    scaffoldId: patch.scaffoldId,
    readmeContent: patch.readmeContent,
    files: mergedFiles,
    commitHistory: patch.commitHistory,
    issues: patch.issues,
    authors: patch.authors,
  };

  return { rawText, durationMs, mergedSpec, patchSpec: patch, unchangedCount, modifiedCount, addedCount };
}

describe.skipIf(!canRun)("Repo spec edit: PATCH MODE eliminates drift", () => {
  it(
    "patch-mode emit + merge produces zero unintended file changes",
    { timeout: 240_000 },
    async () => {
      expect(SHARED_BASELINE).not.toBeNull();
      const baseline = SHARED_BASELINE!;

      // Same feedback as Test 3 — known to cause drift on schema.prisma
      // when emitting the full spec each time.
      const judgeFeedback = `Add a new health-check endpoint at \`src/app/api/health/route.ts\` that returns \`{ ok: true, ts: Date.now() }\` as JSON. Add a single new commit for it (authored by an existing author). Do not modify or remove any other file.`;

      console.log("Test 4: running PATCH-MODE retry…");
      const result = await callGenerateRepoSpecPatchMode({
        metadata: FIXTURE_METADATA,
        priorSpec: baseline,
        judgeFeedback,
      });

      console.log(
        `Test 4: ${(result.durationMs / 1000).toFixed(1)}s — unchanged=${result.unchangedCount}, modified=${result.modifiedCount}, added=${result.addedCount}`
      );

      const diff = diffSpecs(baseline, result.mergedSpec);
      console.log(
        `Test 4: identical=${diff.identical.length}/${diff.baselineFileCount}, modified=${diff.modified.length}, added=${diff.added.length}, removed=${diff.removed.length}, preservation=${(diff.preservationRatio * 100).toFixed(1)}%`
      );
      console.log(`  modified files: ${diff.modified.join(", ") || "(none)"}`);
      console.log(`  added files:    ${diff.added.join(", ") || "(none)"}`);

      const outDir = persistSpec({
        testNum: 4,
        label: "patch-mode",
        spec: result.mergedSpec,
        rawText: result.rawText,
        meta: {
          judgeFeedback,
          patchUnchangedCount: result.unchangedCount,
          patchModifiedCount: result.modifiedCount,
          patchAddedCount: result.addedCount,
          rawPatchSpec: result.patchSpec,
          diff,
        },
      });
      console.log(`Test 4: artifacts at ${outDir}`);

      // Patch mode should produce 100% preservation by construction —
      // unchanged files are merged from baseline, not regenerated.
      expect(
        diff.preservationRatio,
        `Patch-mode should give 100% preservation. Got ${(diff.preservationRatio * 100).toFixed(1)}%. See ${outDir}.`
      ).toEqual(1.0);

      // The targeted health endpoint should appear.
      const hasHealthRoute = result.mergedSpec.files.some(
        (f) =>
          f.path.includes("health") &&
          (f.path.endsWith(".ts") || f.path.endsWith(".tsx"))
      );
      expect(
        hasHealthRoute,
        `No health-route file appeared. See ${outDir}.`
      ).toBe(true);

      // README should be substantively preserved for an "add a file" feedback.
      // The model re-emits readmeContent (it's a separate top-level field, not
      // covered by the unchanged-marker protocol), but with the prior README
      // in context it should preserve it nearly verbatim. Allow tiny drift.
      const readmeSimilarity = sequenceSimilarity(
        baseline.readmeContent,
        result.mergedSpec.readmeContent
      );
      console.log(`Test 4: readme similarity = ${(readmeSimilarity * 100).toFixed(2)}%`);
      expect(
        readmeSimilarity,
        `readmeContent drifted significantly (similarity ${(readmeSimilarity * 100).toFixed(2)}%, expected >=98%). See ${outDir}.`
      ).toBeGreaterThanOrEqual(0.98);

      // Token-efficiency signal: most files in patch should be unchanged markers.
      const unchangedRatio = result.unchangedCount / result.patchSpec.files.length;
      console.log(
        `Test 4: unchanged-ratio = ${(unchangedRatio * 100).toFixed(1)}% (higher = more token-efficient)`
      );
    }
  );
});

// ---------------------------------------------------------------------------
// Test 3 — Add: new file should appear, others preserved
// ---------------------------------------------------------------------------

describe.skipIf(!canRun)("Repo spec edit: add a new file, preserve rest", () => {
  it(
    "given baseline + 'add a new file' feedback, model preserves >=70% of files byte-identical and adds the requested file",
    { timeout: 240_000 },
    async () => {
      expect(SHARED_BASELINE).not.toBeNull();
      const baseline = SHARED_BASELINE!;

      const judgeFeedback = `Add a new health-check endpoint at \`src/app/api/health/route.ts\` that returns \`{ ok: true, ts: Date.now() }\` as JSON. Add a single new commit for it (authored by an existing author). Do not modify or remove any other file.`;

      const editContext = buildEditContext({
        priorSpec: baseline,
        judgeFeedback,
      });

      console.log("Test 3: running retry with 'add a file' feedback…");
      const result = await callGenerateRepoSpec({
        metadata: FIXTURE_METADATA,
        extraContext: editContext,
      });
      console.log(
        `Test 3: retry generated in ${(result.durationMs / 1000).toFixed(1)}s — ${result.spec.files.length} files`
      );

      const diff = diffSpecs(baseline, result.spec);
      console.log(
        `Test 3: identical=${diff.identical.length}/${diff.baselineFileCount}, modified=${diff.modified.length}, added=${diff.added.length}, removed=${diff.removed.length}, preservation=${(diff.preservationRatio * 100).toFixed(1)}%`
      );
      console.log(`  modified files: ${diff.modified.join(", ") || "(none)"}`);
      console.log(`  added files:    ${diff.added.join(", ") || "(none)"}`);
      console.log(`  removed files:  ${diff.removed.join(", ") || "(none)"}`);

      const outDir = persistSpec({
        testNum: 3,
        label: "retry-add-file",
        spec: result.spec,
        rawText: result.rawText,
        meta: { judgeFeedback, diff },
      });
      console.log(`Test 3: artifacts at ${outDir}`);

      expect(
        diff.preservationRatio,
        `Expected >=70% preservation. Got ${(diff.preservationRatio * 100).toFixed(1)}%. See ${outDir}.`
      ).toBeGreaterThanOrEqual(0.7);

      const hasHealthRoute = result.spec.files.some(
        (f) =>
          f.path.includes("health") &&
          (f.path.endsWith(".ts") || f.path.endsWith(".tsx"))
      );
      expect(
        hasHealthRoute,
        `No health-route file appeared. See ${outDir}.`
      ).toBe(true);

      // README should NOT change for an "add a file" feedback.
      expect(
        result.spec.readmeContent === baseline.readmeContent,
        `readmeContent changed despite feedback that only asked for a new file. See ${outDir}.`
      ).toBe(true);

      expect(
        diff.removed.length,
        `Model dropped ${diff.removed.length} files unexpectedly: [${diff.removed.join(", ")}].`
      ).toBeLessThanOrEqual(1);
    }
  );
});
