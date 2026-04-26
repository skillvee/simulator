/**
 * Deterministic validators for the v2 markdown docs.
 *
 * Run before the LLM judge. Catches structural failures cheaply so we don't
 * burn a Pro call validating something that's missing a required artifact.
 */

import type { ScenarioDoc } from "@/types";

export interface MarkdownValidatorInput {
  docs: ScenarioDoc[];
  /** Snippet of the task description; the validators check it appears in ≥1 doc. */
  taskDescription: string;
}

const URL_REGEX = /https?:\/\/[^\s)]+/gi;
// localhost / 127.0.0.1 / *.local URLs are legitimate in dev docs
// (`http://localhost:3000`, `http://127.0.0.1:5432`); only flag external links.
const ALLOWED_URL_HOSTS = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|[\w.-]+\.local)(:\d+)?(\/|$|\b)/i;
// `TODO` and `FIXME` are case-sensitive: lowercase `todo` is a common Spanish
// word ("everything"/"all"), and `fixme` shows up in non-English prose too.
// Programmer-marker convention is uppercase, so only flag those.
const PLACEHOLDER_PATTERNS = [/\bTODO\b/, /\bplaceholder\b/i, /\bLorem ipsum\b/i, /\bFIXME\b/];

export function validateMarkdownDocs(input: MarkdownValidatorInput): string[] {
  const errors: string[] = [];
  const { docs, taskDescription } = input;

  // v2.1: docs are now hurried-manager notes (1 doc for repo, 1-2 for data),
  // not the old corporate 3-doc set. Cross-references are explicitly
  // discouraged in the prompt — the docs are independent, deliberately
  // incomplete handoffs.
  if (docs.length < 1 || docs.length > 3) {
    errors.push(`Expected 1-3 docs, got ${docs.length}`);
  }

  for (const doc of docs) {
    if (!doc.markdown || doc.markdown.trim().length < 120) {
      errors.push(`Doc "${doc.name}" is too short (<120 chars)`);
    }

    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(doc.markdown)) {
        errors.push(`Doc "${doc.name}" contains placeholder text matching ${pattern}`);
      }
    }

    const urls = (doc.markdown.match(URL_REGEX) ?? []).filter(
      (u) => !ALLOWED_URL_HOSTS.test(u)
    );
    if (urls.length > 0) {
      errors.push(
        `Doc "${doc.name}" contains external URL(s) (forbidden): ${urls.slice(0, 3).join(", ")}`
      );
    }
  }

  // Task-coherence heuristic: extract the 5 most distinctive words from the
  // task description (length ≥ 5, lowercase) and require at least half of
  // them to appear in at least one doc. This is forgiving of rephrasing while
  // still catching genuinely off-topic output.
  const distinctiveWords = taskDescription
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !STOP_WORDS.has(w))
    .slice(0, 10);

  if (distinctiveWords.length >= 3) {
    const combinedDocs = docs.map((d) => d.markdown.toLowerCase()).join("\n");
    const matched = distinctiveWords.filter((w) => combinedDocs.includes(w));
    if (matched.length < Math.ceil(distinctiveWords.length / 2)) {
      errors.push(
        `Task-description vocabulary barely present in docs (${matched.length}/${distinctiveWords.length} distinctive words matched)`
      );
    }
  }

  return errors;
}

const STOP_WORDS = new Set([
  "about",
  "above",
  "across",
  "after",
  "again",
  "against",
  "among",
  "around",
  "because",
  "before",
  "being",
  "below",
  "between",
  "could",
  "during",
  "either",
  "every",
  "might",
  "other",
  "since",
  "their",
  "there",
  "these",
  "those",
  "through",
  "under",
  "until",
  "where",
  "which",
  "while",
  "would",
]);
