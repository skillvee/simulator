#!/usr/bin/env node

/**
 * prepare-commit-msg hook: normalizes commit messages to conventional format.
 * - Lowercases the subject after type(scope):
 * - Strips trailing periods from the subject line
 * - Truncates subject to 72 characters
 */

import { readFileSync, writeFileSync } from "node:fs";

const msgFile = process.argv[2];
const source = process.argv[3]; // message, merge, squash, commit (amend)

// Skip merge and squash commits — they have their own format
if (source === "merge" || source === "squash") {
  process.exit(0);
}

const raw = readFileSync(msgFile, "utf8");
const lines = raw.split("\n");
const subject = lines[0];

// Match conventional commit: type(scope): description  or  type: description
const match = subject.match(/^(\w+(?:\([^)]*\))?\s*:\s*)(.+)$/);

if (!match) {
  // Not a conventional commit message — leave it alone
  process.exit(0);
}

const prefix = match[1];
let description = match[2];

// Lowercase first character of the description
description = description.charAt(0).toLowerCase() + description.slice(1);

// Strip trailing period(s)
description = description.replace(/\.+$/, "");

// Enforce 72-char subject line (prefix + description)
const maxDescLen = 72 - prefix.length;
if (description.length > maxDescLen) {
  description = description.slice(0, maxDescLen);
}

lines[0] = prefix + description;
writeFileSync(msgFile, lines.join("\n"), "utf8");
