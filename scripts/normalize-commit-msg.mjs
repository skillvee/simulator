#!/usr/bin/env node

/**
 * Normalizes a conventional commit message:
 * - Lowercases the type prefix
 * - Ensures space after colon
 * - Lowercases first character of subject
 * - Removes trailing period from subject line
 * - Trims whitespace
 * - Skips merge/revert/fixup/squash commits
 */

const CONVENTIONAL_RE = /^([a-zA-Z]+)(\([^)]*\))?(!)?\s*:\s*(.+)$/;
const SKIP_PREFIXES = ["Merge ", "Revert ", "fixup! ", "squash! "];

export function normalizeCommitMessage(raw) {
  const lines = raw.split("\n");
  const firstLine = lines[0];

  // Skip special commits
  if (SKIP_PREFIXES.some((p) => firstLine.startsWith(p))) {
    return raw;
  }

  const match = firstLine.match(CONVENTIONAL_RE);
  if (!match) {
    return raw;
  }

  const [, type, scope = "", bang = "", subject] = match;
  const normalizedType = type.toLowerCase();
  const normalizedSubject = subject
    .trim()
    .replace(/\.$/, "")
    .replace(/^./, (c) => c.toLowerCase());

  const normalizedFirstLine = `${normalizedType}${scope}${bang}: ${normalizedSubject}`;
  lines[0] = normalizedFirstLine;

  return lines.join("\n");
}

// CLI entry point: read commit message file, normalize, write back
const commitMsgFile = process.argv[2];
if (commitMsgFile) {
  const fs = await import("node:fs");
  const content = fs.readFileSync(commitMsgFile, "utf8");
  const normalized = normalizeCommitMessage(content.trimEnd());
  fs.writeFileSync(commitMsgFile, normalized + "\n");
}
