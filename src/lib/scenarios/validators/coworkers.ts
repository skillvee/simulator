/**
 * Deterministic validator for AI coworker knowledge.
 *
 * The judge sees coworker knowledge in v2.3+, but a regex backstop catches the
 * single highest-leverage class of hallucination — file/path references — without
 * burning a Pro call. Coworkers occasionally claim concrete artifacts exist
 * (`docker-compose.yml`, `tests/test_engine.py`) that aren't in the bundle;
 * when the candidate asks, the persona doubles down and the simulation breaks.
 *
 * We extract anything that looks like a path with a known extension from each
 * `knowledge[].response`, then check it against:
 *   - the repo file tree (repo branch),
 *   - generated CSV filenames (data branch),
 *   - plan resource filenames,
 *   - doc filenames.
 *
 * The set of common scaffold filenames that may not appear in our local view
 * (e.g. `package.json` from the GitHub template) is whitelisted so we don't
 * false-positive on standard project metadata.
 */

import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { buildRepoArtifactSummary } from "../artifact-summary";
import type { ResourceType } from "../archetype-resource-mapping";
import type { ResourcePlan, ScenarioDoc } from "@/types";

const logger = createLogger("lib:scenarios:validators:coworkers");

export interface CoworkerValidatorInput {
  scenarioId: string;
  resourceType: ResourceType;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
}

// Path-like tokens with a known file extension. Restricting to known extensions
// avoids matching ordinary words and most natural-language phrases like
// "src.status" (which a stray "." regex would catch).
const PATH_REGEX =
  /\b[\w\-./]+\.(?:yml|yaml|json|toml|ini|cfg|conf|env|sql|py|ts|tsx|js|jsx|md|sh|lock|txt|csv|tsv|html|css|scss|dockerfile)\b/gi;

// Well-known filenames that are commonly referenced without an extension.
// `docker-compose` implies `docker-compose.yml`/`.yaml`; `Dockerfile`,
// `Makefile`, `Procfile`, `Pipfile` are extension-less by convention. When a
// coworker mentions one, it's a hallucination unless a matching file (any of
// `candidates`) is in the bundle.
const WELL_KNOWN_TOKENS: Array<{ pattern: RegExp; ref: string; candidates: string[] }> = [
  {
    pattern: /\bdocker[- ]compose\b/i,
    ref: "docker-compose",
    candidates: ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"],
  },
  { pattern: /\bDockerfile\b/, ref: "Dockerfile", candidates: ["Dockerfile"] },
  { pattern: /\bMakefile\b/, ref: "Makefile", candidates: ["Makefile", "makefile"] },
  { pattern: /\bProcfile\b/, ref: "Procfile", candidates: ["Procfile"] },
  { pattern: /\bPipfile\b/, ref: "Pipfile", candidates: ["Pipfile", "Pipfile.lock"] },
];

// Standard scaffold/config files that ship with most templates and may not be
// surfaced by our local plan/docs/repo summary. Treat references to these as
// safe (the candidate will find them in the repo even though we can't
// guarantee it from the data we have here).
const SAFE_SCAFFOLD_NAMES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "vite.config.ts",
  "vitest.config.ts",
  "jest.config.js",
  ".gitignore",
  ".eslintrc.json",
  ".prettierrc",
  "readme.md",
  "license",
  "license.md",
  ".env",
  ".env.example",
  "dockerfile",
  "requirements.txt",
  "pyproject.toml",
  "poetry.lock",
  "setup.py",
  "go.mod",
  "go.sum",
  "cargo.toml",
  "cargo.lock",
]);

export async function validateCoworkerKnowledge(
  input: CoworkerValidatorInput
): Promise<string[]> {
  const errors: string[] = [];
  const { scenarioId, resourceType, plan, docs } = input;

  const coworkers = await db.coworker.findMany({
    where: { scenarioId },
    select: { name: true, knowledge: true },
  });
  if (coworkers.length === 0) return errors;

  const knownFiles = await collectKnownFiles({ scenarioId, resourceType, plan, docs });

  for (const c of coworkers) {
    const knowledge = Array.isArray(c.knowledge)
      ? (c.knowledge as Array<{ topic?: string; response?: string }>)
      : [];

    for (const entry of knowledge) {
      const response = typeof entry?.response === "string" ? entry.response : "";
      if (!response) continue;

      const matches = response.match(PATH_REGEX) ?? [];
      const seen = new Set<string>();
      for (const raw of matches) {
        const ref = normalizePath(raw);
        if (seen.has(ref)) continue;
        seen.add(ref);
        if (SAFE_SCAFFOLD_NAMES.has(ref.toLowerCase())) continue;
        if (knownFiles.has(ref) || referencedByBasename(knownFiles, ref)) continue;
        const topic = entry.topic ? ` ("${entry.topic}")` : "";
        errors.push(
          `Coworker "${c.name}"${topic} references \`${raw}\`, which is not in the bundle (no matching repo file, plan resource, doc filename, or data file)`
        );
      }

      // Extension-less well-known files — same hallucination class but the
      // basic regex doesn't catch them.
      for (const token of WELL_KNOWN_TOKENS) {
        if (seen.has(token.ref)) continue;
        if (!token.pattern.test(response)) continue;
        seen.add(token.ref);
        const found = token.candidates.some(
          (cand) => knownFiles.has(cand) || referencedByBasename(knownFiles, cand)
        );
        if (found) continue;
        const topic = entry.topic ? ` ("${entry.topic}")` : "";
        errors.push(
          `Coworker "${c.name}"${topic} references \`${token.ref}\`, which is not in the bundle (expected one of: ${token.candidates.join(", ")})`
        );
      }
    }
  }

  if (errors.length > 0) {
    logger.warn("coworker knowledge references missing artifacts", {
      scenarioId,
      errorCount: errors.length,
    });
  }
  return errors;
}

async function collectKnownFiles(args: {
  scenarioId: string;
  resourceType: ResourceType;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
}): Promise<Set<string>> {
  const { scenarioId, resourceType, plan, docs } = args;
  const out = new Set<string>();

  for (const r of plan.resources) {
    if (r.filename) out.add(normalizePath(r.filename));
  }
  for (const d of docs) {
    if (d.filename) out.add(normalizePath(d.filename));
  }

  if (resourceType === "data") {
    const files = await db.scenarioDataFile.findMany({
      where: { scenarioId },
      select: { filename: true },
    });
    for (const f of files) out.add(normalizePath(f.filename));
  } else {
    // Repo branch: pull the live file tree. A failed fetch is non-fatal here —
    // the validator's job is to catch obvious hallucinations, not to be a
    // gate that depends on GitHub uptime.
    try {
      const summary = await buildRepoArtifactSummary(scenarioId);
      for (const p of summary?.fileTree ?? []) out.add(normalizePath(p));
    } catch (err) {
      logger.warn("could not load repo file tree for coworker validation", {
        scenarioId,
        err: String(err),
      });
    }
  }

  return out;
}

function normalizePath(p: string): string {
  return p.replace(/^\.\/+/, "").replace(/\\/g, "/");
}

/**
 * Coworkers often refer to files by basename ("Dockerfile", "schema.sql")
 * even when the bundle has the file at a deeper path (`python-agent/Dockerfile`).
 * Treat a basename match as a hit so we don't false-positive on legitimate
 * references.
 */
function referencedByBasename(known: Set<string>, ref: string): boolean {
  const refBase = ref.split("/").pop()?.toLowerCase() ?? "";
  if (!refBase || refBase === ref.toLowerCase()) {
    // The reference is already a basename; check if any known file ends with it.
    for (const k of known) {
      if (k.toLowerCase() === refBase || k.toLowerCase().endsWith("/" + refBase)) return true;
    }
    return false;
  }
  // The reference includes a path; check if any known file basename matches the
  // reference's basename (so `tests/foo.py` matches `pkg/tests/foo.py`).
  for (const k of known) {
    const kBase = k.split("/").pop()?.toLowerCase() ?? "";
    if (kBase && kBase === refBase) return true;
  }
  return false;
}
