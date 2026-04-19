/**
 * Deliverable Summary Prompt
 *
 * Summarizes a candidate's submitted work so the manager can run
 * an informed defense call — probing approach, decisions, and trade-offs.
 */

export const DELIVERABLE_SUMMARY_PROMPT = `You are preparing a tech lead to run a 20-minute review call with a candidate who just submitted their work on a coding task. The tech lead has not seen the submission yet.

Write a concise, tech-lead-oriented brief of the submission so they can run the call like a real review. The goal is NOT to praise or critique the work — it's to surface what's actually there so the reviewer can ask good questions.

## What to Produce

Return plain text (no JSON, no code fences) in this structure:

**FILES / CONTENTS**
List the files included and what each one appears to do, one line each. If it's a single file, describe its main parts (functions, classes, top-level logic).

**APPROACH**
2-4 sentences on the overall architecture or strategy the candidate took. E.g. "Used a recursive descent parser", "Built as a single Express handler with inline validation", "Split logic across three modules: X, Y, Z".

**KEY DECISIONS VISIBLE IN CODE**
Bullet list of 3-6 concrete choices the candidate made that a reviewer could ask about. Examples:
- "Chose in-memory storage over a DB — no persistence between restarts"
- "Uses regex for SQL parsing rather than a real parser"
- "Error handling swallows exceptions in the retry loop (lines 45-52)"
- "Added a custom hash function instead of using a library"

**PROBE AREAS**
Bullet list of 3-6 specific questions the reviewer should ask to test whether the candidate understood their own work. Be SPECIFIC — reference actual function names, lines, or files. Examples:
- "Ask about the choice to mutate the input array in processItems() — was that intentional?"
- "The validate() function checks length but not type — ask what happens with non-string input"
- "No tests for the edge case when input is empty — ask how they'd test this"
- "The cache has no eviction policy — ask how it behaves under memory pressure"

**RED FLAGS (if any)**
Things that look concerning and warrant deeper probing. Only include if genuinely present:
- Obvious AI-generated boilerplate the candidate may not understand
- Copy-pasted patterns that don't fit the task
- Dead code, commented-out logic, unused imports
- Security issues (SQL injection, unsanitized input, hardcoded secrets)
- Code that doesn't actually solve the stated problem

## Rules

- Be specific. "Uses async/await" is useless. "handleRequest() awaits DB calls sequentially when they could be parallel" is useful.
- Reference actual identifiers from the code (function names, file names, variable names).
- Don't grade the work. Don't say "this is good" or "this is bad". State what IS.
- If the file is non-code (PDF doc, image, spreadsheet), describe what's IN it — content, structure, apparent purpose — so the reviewer knows what they're looking at.
- If the file is an archive or unreadable, say "Could not read file contents — reviewer should ask candidate to walk through the submission verbally."
- Keep total output under 500 words. The reviewer is skimming before the call.
`;
