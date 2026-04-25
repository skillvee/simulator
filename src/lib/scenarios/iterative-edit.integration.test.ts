/**
 * Integration test: can Gemini 3.1 Pro do "edit, don't regenerate" via the
 * Python code-execution sandbox?
 *
 * Three progressive tests, each independent:
 *
 *   1. Attachment proof — pass a CSV inline, see whether the Python sandbox
 *      can read it (mounted as a file, or recoverable from context).
 *
 *   2. Multi-turn state — ask the model to chain multiple Python turns within
 *      one `generateContent` call, verifying that variables/dataframes persist
 *      across `executableCode` parts.
 *
 *   3. Realistic edit — replicate the cmoeddfkc failure: attach a too-sparse
 *      "prior attempt" CSV plus judge feedback, ask the model to load it,
 *      scale it up programmatically, and re-emit. Then verify the result
 *      actually addresses the feedback.
 *
 * Each test writes captured output to `tmp/iterative-edit/<n>/<run-id>/`
 * for human inspection.
 *
 * Run: `npm run test:integration -- iterative-edit`
 * Requires: GEMINI_API_KEY
 */

import { describe, it, expect } from "vitest";
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  extractCsvsFromGeminiParts,
  type GeminiResponsePart,
} from "./csv-parsing";

// ---------------------------------------------------------------------------
// Config & helpers
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PRO_MODEL = "gemini-3.1-pro-preview";
const FLASH_MODEL = "gemini-3-flash-preview";
const canRun = !!GEMINI_API_KEY;

// Production parser only scans stdout; the model sometimes emits the final
// CSV as text (saw this in Test 3). For testing, scan both.
const FILE_MARKER_REGEX_LENIENT =
  /===\s*FILE:\s*([^\s=]+)\s*===\s*\n([\s\S]*?)\n===\s*END\s*===/g;

function extractCsvsLenient(parts: GeminiResponsePart[]): Array<{
  filename: string;
  csv: string;
}> {
  const stdout = parts
    .map((p) => p.codeExecutionResult?.output ?? "")
    .filter(Boolean)
    .join("\n");
  const text = parts.map((p) => p.text ?? "").filter(Boolean).join("");
  const combined = `${stdout}\n${text}`;

  const out: Array<{ filename: string; csv: string }> = [];
  for (const match of combined.matchAll(FILE_MARKER_REGEX_LENIENT)) {
    const filename = match[1].trim();
    if (!filename.toLowerCase().endsWith(".csv")) continue;
    out.push({ filename, csv: match[2] });
  }
  return out;
}

interface RunResult {
  parts: GeminiResponsePart[];
  durationMs: number;
  chunkCount: number;
}

async function runGemini(args: {
  promptText: string;
  inlineFiles?: Array<{ filename: string; mimeType: string; content: string }>;
  temperature?: number;
  model?: string;
}): Promise<RunResult> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });

  const parts: Array<Record<string, unknown>> = [{ text: args.promptText }];
  for (const f of args.inlineFiles ?? []) {
    parts.push({
      inlineData: {
        mimeType: f.mimeType,
        data: Buffer.from(f.content, "utf8").toString("base64"),
      },
    });
  }

  const startTs = Date.now();
  const stream = await ai.models.generateContentStream({
    model: args.model ?? PRO_MODEL,
    contents: [{ role: "user", parts: parts as never }],
    config: {
      tools: [{ codeExecution: {} }],
      temperature: args.temperature ?? 0.6,
    },
  });

  const collected: GeminiResponsePart[] = [];
  let chunkCount = 0;
  for await (const chunk of stream) {
    chunkCount += 1;
    const chunkParts = chunk.candidates?.[0]?.content?.parts as
      | GeminiResponsePart[]
      | undefined;
    if (chunkParts) collected.push(...chunkParts);
    if (chunkCount % 10 === 0) {
      const elapsed = ((Date.now() - startTs) / 1000).toFixed(0);
      console.log(`  …${chunkCount} chunks, ${collected.length} parts, ${elapsed}s`);
    }
  }
  const durationMs = Date.now() - startTs;
  return { parts: collected, durationMs, chunkCount };
}

interface ExecTurn {
  code: string;
  output: string;
}

function summarizeParts(parts: GeminiResponsePart[]): {
  textBlocks: string[];
  execTurns: ExecTurn[];
  partKinds: Record<string, number>;
} {
  const textBlocks: string[] = [];
  const execTurns: ExecTurn[] = [];
  const partKinds: Record<string, number> = {};

  // Pair executableCode with the codeExecutionResult that follows it.
  let pendingCode: string | null = null;
  for (const p of parts) {
    if (p.text) {
      textBlocks.push(p.text);
      partKinds.text = (partKinds.text ?? 0) + 1;
    } else if (p.executableCode) {
      pendingCode = p.executableCode.code ?? "";
      partKinds.executableCode = (partKinds.executableCode ?? 0) + 1;
    } else if (p.codeExecutionResult) {
      execTurns.push({
        code: pendingCode ?? "",
        output: p.codeExecutionResult.output ?? "",
      });
      pendingCode = null;
      partKinds.codeExecutionResult = (partKinds.codeExecutionResult ?? 0) + 1;
    } else {
      partKinds.unknown = (partKinds.unknown ?? 0) + 1;
    }
  }
  return { textBlocks, execTurns, partKinds };
}

function persistRun(args: {
  testNum: number;
  result: RunResult;
  inputs?: Array<{ filename: string; content: string }>;
  extra?: Record<string, unknown>;
}): string {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(
    process.cwd(),
    "tmp/iterative-edit",
    `${args.testNum}`,
    runId
  );
  fs.mkdirSync(outDir, { recursive: true });

  for (const f of args.inputs ?? []) {
    fs.writeFileSync(path.join(outDir, `input-${f.filename}`), f.content);
  }

  const summary = summarizeParts(args.result.parts);
  fs.writeFileSync(
    path.join(outDir, "_summary.json"),
    JSON.stringify(
      {
        durationMs: args.result.durationMs,
        chunkCount: args.result.chunkCount,
        partKinds: summary.partKinds,
        textBlockCount: summary.textBlocks.length,
        execTurnCount: summary.execTurns.length,
        ...args.extra,
      },
      null,
      2
    )
  );

  // Save each Python turn separately so we can review them.
  summary.execTurns.forEach((t, i) => {
    fs.writeFileSync(
      path.join(outDir, `turn-${String(i + 1).padStart(2, "0")}.py`),
      t.code
    );
    fs.writeFileSync(
      path.join(outDir, `turn-${String(i + 1).padStart(2, "0")}.out.txt`),
      t.output
    );
  });

  fs.writeFileSync(
    path.join(outDir, "_text-blocks.md"),
    summary.textBlocks.map((t, i) => `### Block ${i + 1}\n\n${t}`).join("\n\n---\n\n")
  );

  return outDir;
}

// ---------------------------------------------------------------------------
// Test 1 — Attachment proof of concept
// ---------------------------------------------------------------------------

describe.skipIf(!canRun)("Iterative edit: attachment proof", () => {
  it(
    "attached CSV is reachable from the Python sandbox",
    { timeout: 240_000 },
    async () => {
      // 10-row sample. Tiny so the model can't possibly memorize it from training.
      const csv = [
        "user_id,signup_week,events_logged",
        "u_8f3a,2025-W11,17",
        "u_2b91,2025-W11,3",
        "u_c4d7,2025-W12,42",
        "u_99e2,2025-W12,8",
        "u_5417,2025-W13,1",
        "u_d6f8,2025-W13,29",
        "u_30ba,2025-W14,11",
        "u_7e21,2025-W14,55",
        "u_a9c0,2025-W15,4",
        "u_b1d3,2025-W15,22",
      ].join("\n");

      const promptText = `You have a CSV attached called \`signups.csv\`.

Use the Python code execution sandbox to:

1. Try to read the file from disk first (e.g. \`pd.read_csv("signups.csv")\`).
   If that fails because the file isn't mounted, fall back to whatever
   mechanism actually works (e.g. recreate the file from inline bytes).
2. Print:
   - The shape of the dataframe.
   - The exact list of \`user_id\` values you saw.
   - The sum of \`events_logged\`.
3. After the Python turn(s), explain in plain text **how** you accessed the
   data. Specifically: was the file present as \`signups.csv\` in the working
   directory, or did you need a different approach?

Do not generate fake data. The point is to learn whether attached files are
reachable.`;

      console.log("Test 1: running…");
      const result = await runGemini({
        promptText,
        inlineFiles: [
          { filename: "signups.csv", mimeType: "text/csv", content: csv },
        ],
      });

      const summary = summarizeParts(result.parts);
      console.log(
        `Test 1: ${(result.durationMs / 1000).toFixed(1)}s, parts=${JSON.stringify(summary.partKinds)}`
      );

      const outDir = persistRun({
        testNum: 1,
        result,
        inputs: [{ filename: "signups.csv", content: csv }],
        extra: {
          expectedUserIds: [
            "u_8f3a",
            "u_2b91",
            "u_c4d7",
            "u_99e2",
            "u_5417",
            "u_d6f8",
            "u_30ba",
            "u_7e21",
            "u_a9c0",
            "u_b1d3",
          ],
          expectedEventsSum: 192,
        },
      });
      console.log(`Test 1: artifacts at ${outDir}`);

      // Structural assertions only.
      expect(summary.execTurns.length, "at least 1 Python turn").toBeGreaterThanOrEqual(1);

      // Did any Python output mention the right user ids or sum? We don't
      // require all of them — even a partial echo proves access.
      const allOutputs = summary.execTurns.map((t) => t.output).join("\n");
      const matchedIds = [
        "u_8f3a",
        "u_2b91",
        "u_c4d7",
        "u_99e2",
        "u_5417",
        "u_d6f8",
        "u_30ba",
        "u_7e21",
        "u_a9c0",
        "u_b1d3",
      ].filter((id) => allOutputs.includes(id));

      const sumMatched = allOutputs.includes("192");

      console.log(
        `Test 1: matched ${matchedIds.length}/10 user_ids, sum match=${sumMatched}`
      );

      // Either we see the IDs OR the sum — proves the data flowed through.
      // Not both required (model might choose to print a head() vs a sum()).
      expect(
        matchedIds.length >= 3 || sumMatched,
        `Expected real data echoed back. ` +
          `Matched ${matchedIds.length} ids, sum match=${sumMatched}. ` +
          `See ${outDir} to inspect.`
      ).toBe(true);
    }
  );
});

// ---------------------------------------------------------------------------
// Test 2 — Multi-turn sandbox state
// ---------------------------------------------------------------------------

describe.skipIf(!canRun)("Iterative edit: multi-turn sandbox state", () => {
  it(
    "preserves Python state across multiple executableCode turns in one call",
    { timeout: 240_000 },
    async () => {
      const csv = [
        "id,value",
        "a,10",
        "b,20",
        "c,30",
        "d,40",
        "e,50",
      ].join("\n");

      const promptText = `You have a CSV attached called \`data.csv\` with columns \`id\` and \`value\`.

Use the Python sandbox to do this in **separate code turns** (not one big script):

**Turn A** — Load \`data.csv\` into a variable named \`df\` and print its shape.
Do NOT yet do anything else.

**Turn B** — Using the SAME \`df\` variable from Turn A, add a new column
\`doubled\` = \`value\` * 2. Print \`df\` after the change.

**Turn C** — Using the SAME \`df\` from Turn B, write it to \`data_v2.csv\`
without the index. Then print \`open("data_v2.csv").read()\`.

If \`df\` is undefined in Turn B or C (i.e. state didn't persist), print exactly
the string "STATE_LOST" and stop. We need to know definitively.

After all three turns, summarize in plain text: did the variable \`df\` survive
across turns, or did you need to reload it each time?`;

      console.log("Test 2: running…");
      const result = await runGemini({
        promptText,
        inlineFiles: [
          { filename: "data.csv", mimeType: "text/csv", content: csv },
        ],
        temperature: 0.2,
      });

      const summary = summarizeParts(result.parts);
      console.log(
        `Test 2: ${(result.durationMs / 1000).toFixed(1)}s, turns=${summary.execTurns.length}, parts=${JSON.stringify(summary.partKinds)}`
      );

      const outDir = persistRun({ testNum: 2, result });
      console.log(`Test 2: artifacts at ${outDir}`);

      // We need at least 2 separate turns to even test the question.
      expect(
        summary.execTurns.length,
        `Expected the model to use multiple Python turns. ` +
          `Got ${summary.execTurns.length}. See ${outDir}.`
      ).toBeGreaterThanOrEqual(2);

      const allOutputs = summary.execTurns.map((t) => t.output).join("\n");

      // Critical signal: if state was lost, the model was instructed to print STATE_LOST.
      const stateLost = allOutputs.includes("STATE_LOST");

      // Positive signal: if state was preserved, we should see the doubled
      // column (20, 40, 60, 80, 100) appear in the output.
      const hasDoubledValues = ["20", "40", "60", "80", "100"].every((v) =>
        allOutputs.includes(v)
      );

      // Final-text signal: the model was asked to summarize whether state survived.
      const finalText = summary.textBlocks.join("\n").toLowerCase();
      const claimsPersisted =
        finalText.includes("survived") ||
        finalText.includes("persisted") ||
        finalText.includes("preserved");
      const claimsLost =
        finalText.includes("did not persist") ||
        finalText.includes("didn't persist") ||
        finalText.includes("state was lost") ||
        finalText.includes("had to reload") ||
        finalText.includes("needed to reload");

      console.log(
        `Test 2: stateLost=${stateLost}, hasDoubledValues=${hasDoubledValues}, claimsPersisted=${claimsPersisted}, claimsLost=${claimsLost}`
      );

      // Hard-fail only on the explicit STATE_LOST sentinel — everything else
      // is informational (logged + persisted) so the human can read the trace.
      expect(
        stateLost,
        `Sandbox lost state across turns. See ${outDir}/turn-*.out.txt`
      ).toBe(false);
    }
  );
});

// ---------------------------------------------------------------------------
// Test 3 — Realistic edit on a "previous attempt" CSV
// ---------------------------------------------------------------------------

describe.skipIf(!canRun)("Iterative edit: realistic edit cycle", () => {
  it(
    "loads a too-sparse CSV, applies judge feedback, re-emits a fixed version",
    { timeout: 480_000 },
    async () => {
      // Build a tiny "previous attempt" that exhibits the same pathology
      // as cmoeddfkc: ~1.8 rows per user across 5 weeks. Real fixture had
      // 1,834 / 1,000 = 1.834 rows/user. We use 100 users / 184 rows for
      // speed (same ratio, faster sandbox runtime).
      const priorRows: string[] = ["user_id,week,surface,action_count"];
      // 184 rows total — sprinkled across users randomly so most users have
      // 1-2 rows, a few have 3-4.
      const seededUsers = Array.from({ length: 100 }, (_, i) =>
        `u_${String(i).padStart(3, "0")}`
      );
      const weeks = ["2025-W01", "2025-W02", "2025-W03", "2025-W04", "2025-W05"];
      const surfaces = ["feed", "reels"];
      // Pseudo-random assignment but deterministic across runs.
      let counter = 0;
      while (priorRows.length - 1 < 184) {
        const u = seededUsers[counter % seededUsers.length];
        const w = weeks[(counter * 7) % weeks.length];
        const s = surfaces[(counter * 3) % surfaces.length];
        const c = (counter * 13) % 30 + 1;
        priorRows.push(`${u},${w},${s},${c}`);
        counter += 1;
      }
      const priorCsv = priorRows.join("\n");

      const judgeFeedback = {
        summary:
          "Dataset is too sparse to support time-series cannibalization analysis. With ~1.8 rows per user across 5 weeks and 2 surfaces, you cannot track behavioral shifts.",
        blockingIssues: [
          "user_engagement_weekly.csv has only ~1.8 rows per user. Need 5-10 rows per user (every user should appear in most weeks × surfaces).",
          "Need at least 2,500 rows total to make per-week-per-surface aggregations meaningful.",
        ],
        retryInstructions:
          "Expand the existing dataset: keep the same 100 users and same 5-week range, but generate ~5 rows per user-week so each user appears in most week×surface combinations. Preserve action_count distribution shape (don't make it uniform).",
      };

      const promptText = `You are iterating on a candidate exercise dataset. The previous attempt is attached as \`user_engagement_weekly.csv\`. A judge reviewed it and rejected it.

## Judge feedback

Summary: ${judgeFeedback.summary}

Blocking issues:
${judgeFeedback.blockingIssues.map((b) => `- ${b}`).join("\n")}

Retry instructions: ${judgeFeedback.retryInstructions}

## Your task

Use the Python sandbox to:

1. Load the attached \`user_engagement_weekly.csv\` and print its shape and
   rows-per-user distribution. Confirm you see ~1.8 rows/user.
2. **Edit the dataframe in place** — do not regenerate from scratch:
   - Keep the same 100 \`user_id\` values.
   - Keep the same 5 weeks and 2 surfaces.
   - Expand to ~5 rows per user (so most user×week×surface combos exist).
   - Preserve the \`action_count\` distribution shape from the original
     (sample new values from the empirical distribution of the attached file —
     do NOT use uniform random).
3. Validate inside Python that:
   - Every original user_id is still present.
   - rows-per-user >= 5 on average.
   - action_count distribution is similar to original (mean within ±50%).
4. Print the final CSV between markers, exactly:

\`\`\`
=== FILE: user_engagement_weekly.csv ===
<header>
<rows…>
=== END ===
\`\`\`

Do not wrap the markers in markdown fences. Do not print anything between
\`=== FILE ===\` and \`=== END ===\` other than the CSV content.

If you can't access the attached file, print "ATTACHMENT_NOT_FOUND" and stop —
do not regenerate from scratch.`;

      console.log("Test 3: running… (this is the slow one)");
      const result = await runGemini({
        promptText,
        inlineFiles: [
          {
            filename: "user_engagement_weekly.csv",
            mimeType: "text/csv",
            content: priorCsv,
          },
        ],
        temperature: 0.4,
      });

      const summary = summarizeParts(result.parts);
      console.log(
        `Test 3: ${(result.durationMs / 1000).toFixed(1)}s, turns=${summary.execTurns.length}, parts=${JSON.stringify(summary.partKinds)}`
      );

      const outDir = persistRun({
        testNum: 3,
        result,
        inputs: [
          { filename: "user_engagement_weekly.csv", content: priorCsv },
        ],
        extra: {
          priorRowCount: 184,
          priorUserCount: 100,
          priorRowsPerUser: 1.84,
        },
      });
      console.log(`Test 3: artifacts at ${outDir}`);

      // First, fail loudly if the model couldn't see the file at all.
      const allOutputs = summary.execTurns
        .map((t) => t.output)
        .concat(summary.textBlocks)
        .join("\n");
      expect(
        allOutputs.includes("ATTACHMENT_NOT_FOUND"),
        `Model could not access attached CSV. See ${outDir}.`
      ).toBe(false);

      // Did it emit a final CSV between the markers we asked for?
      const extraction = extractCsvsFromGeminiParts(result.parts);
      console.log(
        `Test 3: extracted ${extraction.files.length} CSV(s); ${extraction.errors.length} parse error(s)`
      );

      if (extraction.files.length > 0) {
        for (const f of extraction.files) {
          fs.writeFileSync(path.join(outDir, `output-${f.filename}`), f.csv);
        }
      }

      expect(
        extraction.files.length,
        `Expected exactly 1 CSV emitted. Got ${extraction.files.length}. See ${outDir}.`
      ).toBeGreaterThanOrEqual(1);

      const out = extraction.files[0]!;

      // The point of the test: did rows-per-user actually increase?
      // Parse user_ids and count.
      const lines = out.csv.split("\n").filter((l) => l.trim().length > 0);
      const dataLines = lines.slice(1); // strip header
      const userIds = new Set(dataLines.map((l) => l.split(",")[0]));
      const rowsPerUser = dataLines.length / Math.max(userIds.size, 1);

      console.log(
        `Test 3: output rows=${dataLines.length}, users=${userIds.size}, rows/user=${rowsPerUser.toFixed(2)}`
      );

      // Persist the parsed metrics for inspection.
      fs.writeFileSync(
        path.join(outDir, "_parsed-metrics.json"),
        JSON.stringify(
          {
            outputRowCount: dataLines.length,
            outputUserCount: userIds.size,
            outputRowsPerUser: rowsPerUser,
            improvement: rowsPerUser / 1.84,
          },
          null,
          2
        )
      );

      // The actual assertion: the model addressed the judge's feedback.
      expect(
        rowsPerUser,
        `Output is still too sparse. Got ${rowsPerUser.toFixed(2)} rows/user, expected >= 4. See ${outDir}.`
      ).toBeGreaterThanOrEqual(4);

      // And it kept (most of) the original users — proves it loaded the input.
      // Allow some users to drop, but most should survive.
      expect(
        userIds.size,
        `Lost too many users (got ${userIds.size}, expected close to 100).`
      ).toBeGreaterThanOrEqual(80);
    }
  );
});

// ---------------------------------------------------------------------------
// Test 4 — Same realistic edit, but on Flash instead of Pro.
//
// Flash is documented as faster + cheaper with code-execution support. If it
// produces comparable output for this task, we should switch.
// ---------------------------------------------------------------------------

describe.skipIf(!canRun)("Iterative edit: realistic edit on Flash", () => {
  it(
    "Flash produces a comparable edit",
    { timeout: 600_000 },
    async () => {
      const priorRows: string[] = ["user_id,week,surface,action_count"];
      const seededUsers = Array.from({ length: 100 }, (_, i) =>
        `u_${String(i).padStart(3, "0")}`
      );
      const weeks = ["2025-W01", "2025-W02", "2025-W03", "2025-W04", "2025-W05"];
      const surfaces = ["feed", "reels"];
      let counter = 0;
      while (priorRows.length - 1 < 184) {
        const u = seededUsers[counter % seededUsers.length];
        const w = weeks[(counter * 7) % weeks.length];
        const s = surfaces[(counter * 3) % surfaces.length];
        const c = (counter * 13) % 30 + 1;
        priorRows.push(`${u},${w},${s},${c}`);
        counter += 1;
      }
      const priorCsv = priorRows.join("\n");

      const promptText = `You are iterating on a candidate exercise dataset. The previous attempt is attached as \`input_file_0.csv\` (originally named \`user_engagement_weekly.csv\`). A judge reviewed it and rejected it.

## Judge feedback

Summary: Dataset is too sparse to support time-series cannibalization analysis. With ~1.8 rows per user across 5 weeks and 2 surfaces, you cannot track behavioral shifts.

Blocking issues:
- The attached CSV has only ~1.8 rows per user. Need 5-10 rows per user (every user should appear in most weeks × surfaces).
- Need at least 2,500 rows total to make per-week-per-surface aggregations meaningful.

Retry instructions: Expand the existing dataset: keep the same 100 users and same 5-week range, but generate ~5 rows per user-week so each user appears in most week×surface combinations. Preserve action_count distribution shape (don't make it uniform). HARD CAP: do not exceed 3000 total rows.

## Your task

Use the Python sandbox to:

1. Load the attached file at \`input_file_0.csv\` (it's the prior CSV) and print its shape and rows-per-user distribution.
2. **Edit the dataframe in place** — do not regenerate from scratch:
   - Keep the same 100 \`user_id\` values.
   - Keep the same 5 weeks and 2 surfaces.
   - Expand to ~5 rows per user (so most user×week×surface combos exist).
   - Preserve the \`action_count\` distribution shape from the original
     (sample new values from the empirical distribution of the attached file —
     do NOT use uniform random).
3. Validate inside Python that:
   - Every original user_id is still present.
   - rows-per-user >= 5 on average.
   - action_count distribution is similar to original (mean within ±50%).
4. Print the final CSV to stdout (USE \`print()\` from Python, not in your text response) between markers, exactly:

\`\`\`
=== FILE: user_engagement_weekly.csv ===
<header>
<rows…>
=== END ===
\`\`\`

Do not wrap the markers in markdown fences. Do not print anything between
\`=== FILE ===\` and \`=== END ===\` other than the CSV content.

If you can't access the attached file, print "ATTACHMENT_NOT_FOUND" and stop.`;

      console.log("Test 4: running on Flash (should be ~3x faster than Pro)…");
      const result = await runGemini({
        promptText,
        inlineFiles: [
          {
            filename: "user_engagement_weekly.csv",
            mimeType: "text/csv",
            content: priorCsv,
          },
        ],
        temperature: 0.4,
        model: FLASH_MODEL,
      });

      const summary = summarizeParts(result.parts);
      console.log(
        `Test 4: ${(result.durationMs / 1000).toFixed(1)}s, turns=${summary.execTurns.length}, parts=${JSON.stringify(summary.partKinds)}`
      );

      const outDir = persistRun({
        testNum: 4,
        result,
        inputs: [
          { filename: "user_engagement_weekly.csv", content: priorCsv },
        ],
        extra: {
          model: FLASH_MODEL,
          priorRowCount: 184,
          priorUserCount: 100,
          priorRowsPerUser: 1.84,
        },
      });
      console.log(`Test 4: artifacts at ${outDir}`);

      const allOutputs = summary.execTurns
        .map((t) => t.output)
        .concat(summary.textBlocks)
        .join("\n");
      expect(
        allOutputs.includes("ATTACHMENT_NOT_FOUND"),
        `Flash could not access attached CSV. See ${outDir}.`
      ).toBe(false);

      // Use lenient extraction — scan stdout AND text for markers.
      const extracted = extractCsvsLenient(result.parts);
      console.log(
        `Test 4: extracted ${extracted.length} CSV(s) (lenient: stdout + text)`
      );

      if (extracted.length > 0) {
        for (const f of extracted) {
          fs.writeFileSync(path.join(outDir, `output-${f.filename}`), f.csv);
        }
      }

      expect(
        extracted.length,
        `Expected at least 1 CSV. Got ${extracted.length}. See ${outDir}.`
      ).toBeGreaterThanOrEqual(1);

      const out = extracted[0]!;
      const lines = out.csv.split("\n").filter((l) => l.trim().length > 0);
      const dataLines = lines.slice(1);
      const userIds = new Set(dataLines.map((l) => l.split(",")[0]));
      const rowsPerUser = dataLines.length / Math.max(userIds.size, 1);

      console.log(
        `Test 4: output rows=${dataLines.length}, users=${userIds.size}, rows/user=${rowsPerUser.toFixed(2)}, walltime=${(result.durationMs / 1000).toFixed(1)}s`
      );

      fs.writeFileSync(
        path.join(outDir, "_parsed-metrics.json"),
        JSON.stringify(
          {
            model: FLASH_MODEL,
            durationSec: result.durationMs / 1000,
            outputRowCount: dataLines.length,
            outputUserCount: userIds.size,
            outputRowsPerUser: rowsPerUser,
            improvement: rowsPerUser / 1.84,
          },
          null,
          2
        )
      );

      expect(
        rowsPerUser,
        `Flash output is too sparse. Got ${rowsPerUser.toFixed(2)} rows/user, expected >= 4. See ${outDir}.`
      ).toBeGreaterThanOrEqual(4);

      expect(
        userIds.size,
        `Flash lost too many users (got ${userIds.size}).`
      ).toBeGreaterThanOrEqual(80);
    }
  );
});
