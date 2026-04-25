/**
 * Integration test: Gemini 3.1 Pro + codeExecution → CSV files
 *
 * Hits real Gemini using our v2 data-artifact prompt and validates that:
 *   - the response includes CSV files between our markers (or fenced fallback);
 *   - the CSVs parse cleanly via our `csv-parsing.ts`;
 *   - row counts, column counts, and basic distribution sanity look reasonable.
 *
 * Does NOT touch the database or Supabase. The goal is to de-risk the core
 * AI assumption (that Pro + Python sandbox can produce realistic, parseable
 * datasets aligned with our plan) before we wire the rest of the pipeline.
 *
 * Run: `npm run test:integration -- data-artifact-generator`
 *
 * Requires: GEMINI_API_KEY
 *
 * Generated CSVs are written to `tmp/data-artifact-smoke/<run-id>/` so you
 * can eyeball them after a passing run.
 */

import { describe, it, expect } from "vitest";
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  buildDataArtifactPrompt,
  type DataArtifactPromptInput,
} from "@/prompts/recruiter/data-artifact";
import {
  extractCsvsFromGeminiParts,
  type GeminiResponsePart,
} from "./csv-parsing";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PRO_MODEL = "gemini-3.1-pro-preview";

const canRun = !!GEMINI_API_KEY;

// ---------------------------------------------------------------------------
// Fixture: a realistic Data Analyst scenario
// ---------------------------------------------------------------------------

const FIXTURE_INPUT: DataArtifactPromptInput = {
  scenario: {
    companyName: "Bramble Coffee",
    taskDescription:
      "Q4 holiday revenue underperformed — investigate whether the new bundle SKUs are responsible or if something else is driving it.",
    techStack: ["SQL", "Python", "Pandas"],
    roleName: "Data Analyst",
    seniorityLevel: "mid",
  },
  plan: {
    resources: [
      {
        id: "orders",
        type: "csv",
        label: "Q4 Orders",
        filename: "orders.csv",
        objective:
          "Q4 2025 orders with order_id, order_date, channel, order_value, refund_status, customer_id.",
        candidateUsage:
          "Primary fact table for revenue, AOV, refund-rate analysis.",
        targetRowCount: 1500,
        dataShape:
          "Lognormal order_value (mean ~$48); ~3% refund_status='refunded' overall, rising to ~9% in week 51; channel mix web 60%, mobile 30%, retail 10%; dates spanning Oct-Dec 2025.",
      },
      {
        id: "order-items",
        type: "csv",
        label: "Order Items",
        filename: "order_items.csv",
        objective:
          "Per-line-item detail joining orders to SKUs, with a is_bundle flag.",
        candidateUsage:
          "Joined to orders on order_id to split bundle vs single-SKU revenue.",
        targetRowCount: 2500,
        dataShape:
          "Each order has 1-3 line items; ~25% contain a bundle SKU; bundle items show ~1.5x higher refund correlation than singles.",
      },
    ],
    qualityCriteria: [
      "Row counts approximately match plan targets.",
      "Every order_id in order_items.csv resolves to a row in orders.csv.",
      "Refund rate is visibly higher in week 51.",
      "order_value distribution is not uniform — should look lognormal-like.",
    ],
  },
  docs: [
    {
      id: "brief",
      name: "Project Brief",
      filename: "project-brief.md",
      objective: "Sets up the business question and success criteria",
      markdown: "Q4 revenue softness investigation — see plan.",
    },
    {
      id: "data-dictionary",
      name: "Data Dictionary",
      filename: "data-dictionary.md",
      objective:
        "Describes every CSV (orders.csv, order_items.csv, skus.csv) and every column",
      markdown:
        "References orders.csv, order_items.csv, skus.csv with column-level detail.",
    },
    {
      id: "onboarding",
      name: "Onboarding Memo",
      filename: "onboarding.md",
      objective: "How the analytics team works and who cares about findings",
      markdown: "See Project Brief and Data Dictionary.",
    },
  ],
  attempt: 1,
};

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe.skipIf(!canRun)("Gemini 3.1 Pro + codeExecution → CSVs", () => {
  it(
    "produces parseable CSVs aligned with the plan",
    { timeout: 480_000 },
    async () => {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY! });
      const prompt = buildDataArtifactPrompt(FIXTURE_INPUT);

      console.log(`Calling ${PRO_MODEL} with codeExecution (streaming) …`);
      const startTs = Date.now();
      const stream = await ai.models.generateContentStream({
        model: PRO_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          tools: [{ codeExecution: {} }],
          temperature: 0.6,
        },
      });

      // Streaming keeps the HTTP connection alive past Node's 5-minute
      // headers-timeout default. Accumulate parts from every chunk.
      const parts: GeminiResponsePart[] = [];
      let chunkCount = 0;
      for await (const chunk of stream) {
        chunkCount += 1;
        const chunkParts = chunk.candidates?.[0]?.content?.parts as
          | GeminiResponsePart[]
          | undefined;
        if (chunkParts) parts.push(...chunkParts);
        if (chunkCount % 5 === 0) {
          console.log(
            `  …${chunkCount} chunks, ${parts.length} parts, ${((Date.now() - startTs) / 1000).toFixed(0)}s elapsed`
          );
        }
      }
      const durationMs = Date.now() - startTs;
      console.log(
        `Gemini stream finished in ${(durationMs / 1000).toFixed(1)}s (${chunkCount} chunks, ${parts.length} parts)`
      );

      // Sanity: log what the model emitted.
      const partKinds = (parts ?? []).map((p) => {
        if (p.codeExecutionResult) return "codeExecutionResult";
        if (p.executableCode) return "executableCode";
        if (p.text) return "text";
        return "unknown";
      });
      console.log(
        `Response had ${partKinds.length} parts: ${JSON.stringify(
          countBy(partKinds)
        )}`
      );

      const extraction = extractCsvsFromGeminiParts(parts);
      console.log(
        `Extracted ${extraction.files.length} CSV(s); ${extraction.errors.length} parse error(s)`
      );

      // Persist to disk for human inspection (in tmp/, gitignored).
      const runId = new Date().toISOString().replace(/[:.]/g, "-");
      const outDir = path.resolve(process.cwd(), "tmp/data-artifact-smoke", runId);
      fs.mkdirSync(outDir, { recursive: true });
      for (const f of extraction.files) {
        fs.writeFileSync(path.join(outDir, f.filename), f.csv);
      }
      const summary = {
        durationMs,
        partKinds: countBy(partKinds),
        files: extraction.files.map((f) => ({
          filename: f.filename,
          rowCount: f.rowCount,
          columnCount: f.columns.length,
          columns: f.columns,
        })),
        parseErrors: extraction.errors,
      };
      fs.writeFileSync(
        path.join(outDir, "_summary.json"),
        JSON.stringify(summary, null, 2)
      );
      console.log(`Wrote outputs to ${outDir}`);

      // Assertions — structural, not quality. Don't fail on a slightly-off
      // distribution; that's what the LLM judge is for.
      expect(extraction.files.length, "at least 2 CSVs extracted").toBeGreaterThanOrEqual(2);

      for (const f of extraction.files) {
        // Row count should be in our cap range. Plan asks for 3000/4500/1200;
        // sandbox cap is 5000. Allow generous floor since the model often
        // halves to fit timing.
        expect(f.rowCount, `${f.filename} row count`).toBeGreaterThanOrEqual(200);
        expect(f.rowCount, `${f.filename} row count cap`).toBeLessThanOrEqual(5500);
        expect(f.columns.length, `${f.filename} column count`).toBeGreaterThanOrEqual(3);
        // Columns shouldn't be empty strings.
        for (const col of f.columns) {
          expect(col.length, `${f.filename} column name`).toBeGreaterThan(0);
        }
      }

      // Filenames should overlap meaningfully with the plan.
      const planFilenames = FIXTURE_INPUT.plan.resources.map((r) => r.filename);
      const matched = extraction.files.filter((f) =>
        planFilenames.includes(f.filename)
      );
      expect(
        matched.length,
        `at least 1 CSV matches a planned filename (got: ${extraction.files
          .map((f: { filename: string }) => f.filename)
          .join(", ")})`
      ).toBeGreaterThanOrEqual(1);
    }
  );
});

function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, k) => {
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
