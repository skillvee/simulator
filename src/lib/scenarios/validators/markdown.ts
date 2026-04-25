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
const PLACEHOLDER_PATTERNS = [/\bTODO\b/i, /\bplaceholder\b/i, /\bLorem ipsum\b/i, /\bFIXME\b/i];

export function validateMarkdownDocs(input: MarkdownValidatorInput): string[] {
  const errors: string[] = [];
  const { docs, taskDescription } = input;

  if (docs.length !== 3) {
    errors.push(`Expected exactly 3 docs, got ${docs.length}`);
  }

  const otherRefsByDoc = new Map<string, string[]>();
  for (const d of docs) {
    const refs = [
      ...docs
        .filter((x) => x.name !== d.name)
        .flatMap((x) => [
          x.name,
          x.filename,
          x.filename.replace(/\.md$/i, ""),
          x.id,
        ]),
    ].filter(Boolean);
    otherRefsByDoc.set(d.name, refs);
  }

  for (const doc of docs) {
    if (!doc.markdown || doc.markdown.trim().length < 500) {
      errors.push(`Doc "${doc.name}" is too short (<500 chars)`);
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

    // Cross-reference check: accept references to the other docs by any of
    // their identifiers (display name, filename, filename-without-ext, id).
    // The model sometimes uses filenames (\`data_dictionary.md\`) rather than
    // display names ("Data Dictionary") — both are fine.
    const body = doc.markdown.toLowerCase();
    const refs = otherRefsByDoc.get(doc.name) ?? [];
    const referencesAnother = refs.some((r) => body.includes(r.toLowerCase()));
    if (!referencesAnother && refs.length > 0) {
      errors.push(
        `Doc "${doc.name}" doesn't reference any of the other docs by name, filename, or id`
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
