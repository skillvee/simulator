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
const PLACEHOLDER_PATTERNS = [/\bTODO\b/i, /\bplaceholder\b/i, /\bLorem ipsum\b/i, /\bFIXME\b/i];

export function validateMarkdownDocs(input: MarkdownValidatorInput): string[] {
  const errors: string[] = [];
  const { docs, taskDescription } = input;

  if (docs.length !== 3) {
    errors.push(`Expected exactly 3 docs, got ${docs.length}`);
  }

  const docNames = new Set(docs.map((d) => d.name));

  for (const doc of docs) {
    if (!doc.markdown || doc.markdown.trim().length < 500) {
      errors.push(`Doc "${doc.name}" is too short (<500 chars)`);
    }

    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(doc.markdown)) {
        errors.push(`Doc "${doc.name}" contains placeholder text matching ${pattern}`);
      }
    }

    const urls = doc.markdown.match(URL_REGEX) ?? [];
    if (urls.length > 0) {
      errors.push(
        `Doc "${doc.name}" contains external URL(s) (forbidden): ${urls.slice(0, 3).join(", ")}`
      );
    }

    // "See Also" section should reference at least one other doc by name.
    const otherNames = [...docNames].filter((n) => n !== doc.name);
    const referencesAnother = otherNames.some((n) =>
      doc.markdown.toLowerCase().includes(n.toLowerCase())
    );
    if (!referencesAnother && otherNames.length > 0) {
      errors.push(
        `Doc "${doc.name}" doesn't cross-reference any of the other docs (${otherNames.join(", ")})`
      );
    }
  }

  // The task should appear in at least one doc. Use the first significant
  // chunk (10-50 chars) as a fingerprint instead of the whole thing.
  const taskFingerprint = taskDescription
    .trim()
    .slice(0, 80)
    .toLowerCase();
  if (taskFingerprint.length > 10) {
    const found = docs.some((d) =>
      d.markdown.toLowerCase().includes(taskFingerprint.slice(0, 30))
    );
    if (!found) {
      errors.push(
        "Task description fingerprint not found in any doc — docs may be off-topic"
      );
    }
  }

  return errors;
}
