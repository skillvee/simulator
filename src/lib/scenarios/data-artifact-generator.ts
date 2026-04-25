/**
 * Step 2 (data branch) of the v2 resource pipeline.
 *
 * Calls Gemini 3.1 Pro with the built-in `codeExecution` tool to generate
 * realistic CSV files for DA/DS/DE archetypes. The model writes Python that
 * prints each CSV between markers; we parse, validate, hash, upload to Supabase
 * Storage, and persist a `ScenarioDataFile` row per file.
 *
 * Note: `responseSchema` and `tools: [{ codeExecution: {} }]` aren't combined
 * because code-execution responses mix text + executableCode + codeExecutionResult
 * parts, making strict-JSON output unreliable.
 */

import crypto from "node:crypto";
import { gemini } from "@/lib/ai/gemini";
import { PRO_MODEL } from "@/lib/ai/gemini-config";
import { wrapAICall } from "@/lib/ai/errors";
import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import {
  buildDataArtifactPrompt,
  DATA_ARTIFACT_PROMPT_VERSION,
  type DataArtifactPromptInput,
} from "@/prompts/recruiter/data-artifact";
import {
  extractCsvsFromGeminiParts,
  buildPreviewRows,
  inferSchemaJson,
  type GeminiResponsePart,
} from "./csv-parsing";
import { uploadScenarioFile } from "@/lib/external/scenario-data-storage";
import type {
  JudgeVerdict,
  ResourcePlan,
  ScenarioDoc,
} from "@/types";

const logger = createLogger("lib:scenarios:data-artifact-generator");

export interface GenerateDataArtifactInput {
  scenarioId: string;
  plan: ResourcePlan;
  docs: ScenarioDoc[];
  scenarioContext: DataArtifactPromptInput["scenario"];
  judgeFeedback?: JudgeVerdict;
  attempt: number;
}

export interface DataArtifactResult {
  files: Array<{
    id: string;
    filename: string;
    storagePath: string;
    rowCount: number;
    byteSize: number;
    sha256: string;
  }>;
  parseErrors: string[];
}

export async function generateDataArtifact(
  input: GenerateDataArtifactInput
): Promise<DataArtifactResult> {
  const { scenarioId, plan, docs, scenarioContext, judgeFeedback, attempt } = input;

  // Idempotency: clear out any rows from a previous attempt so we don't
  // accumulate orphans across retries. Storage cleanup happens after upload.
  await db.scenarioDataFile.deleteMany({ where: { scenarioId } });

  const promptText = buildDataArtifactPrompt({
    plan,
    docs,
    scenario: scenarioContext,
    judgeFeedback,
    attempt,
  });

  logger.info("Calling Gemini 3.1 Pro with codeExecution (streaming)", {
    scenarioId,
    attempt,
  });

  // Sub-retry: codeExecution sometimes returns without producing the marker-
  // delimited stdout we expect (sandbox timeout, model explains instead of
  // running, etc). One extra inner attempt is much cheaper than burning an
  // outer orchestrator attempt that also re-runs the validator + judge.
  const MAX_INNER_ATTEMPTS = 2;
  let extraction: ReturnType<typeof extractCsvsFromGeminiParts> = {
    files: [],
    errors: [],
  };
  let innerLastErr: string[] = [];

  for (let inner = 1; inner <= MAX_INNER_ATTEMPTS; inner++) {
    // Bump temperature slightly on retry to break out of any token-loop the
    // sandbox might be in.
    const temperature = 0.6 + (inner - 1) * 0.15;
    const stream = await wrapAICall(
      () =>
        gemini.models.generateContentStream({
          model: PRO_MODEL,
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          config: {
            tools: [{ codeExecution: {} }],
            temperature,
          },
        }),
      {
        model: PRO_MODEL,
        promptType: "RESOURCE_PIPELINE_DATA_ARTIFACT",
        promptVersion: DATA_ARTIFACT_PROMPT_VERSION,
      }
    );

    const parts: GeminiResponsePart[] = [];
    for await (const chunk of stream) {
      const chunkParts = chunk.candidates?.[0]?.content?.parts as
        | GeminiResponsePart[]
        | undefined;
      if (chunkParts) parts.push(...chunkParts);
    }
    extraction = extractCsvsFromGeminiParts(parts);

    if (extraction.files.length > 0) break;

    innerLastErr = extraction.errors.map((e) => e.message);
    logger.warn("data-artifact inner attempt produced no CSVs; retrying", {
      scenarioId,
      attempt,
      inner,
      errors: innerLastErr,
    });
  }

  if (extraction.files.length === 0) {
    throw new Error(
      `No CSVs extracted from Gemini response after ${MAX_INNER_ATTEMPTS} inner attempts: ${innerLastErr.join("; ")}`
    );
  }

  const persisted: DataArtifactResult["files"] = [];

  for (const file of extraction.files) {
    const bytes = Buffer.byteLength(file.csv, "utf8");
    const sha256 = crypto.createHash("sha256").update(file.csv).digest("hex");

    const storagePath = await uploadScenarioFile(
      scenarioId,
      file.filename,
      file.csv,
      "text/csv"
    );

    const previewRows = buildPreviewRows(file.csv, 20);
    const schemaJson = inferSchemaJson(file.csv, file.columns);

    const created = await db.scenarioDataFile.create({
      data: {
        scenarioId,
        filename: file.filename,
        storagePath,
        rowCount: file.rowCount,
        byteSize: bytes,
        sha256,
        schemaJson: schemaJson as object,
        previewRows: previewRows as object,
      },
    });

    persisted.push({
      id: created.id,
      filename: file.filename,
      storagePath,
      rowCount: file.rowCount,
      byteSize: bytes,
      sha256,
    });
  }

  logger.info("Data artifact generation complete", {
    scenarioId,
    fileCount: persisted.length,
    parseErrorCount: extraction.errors.length,
  });

  return {
    files: persisted,
    parseErrors: extraction.errors.map((e) =>
      e.filename ? `${e.filename}: ${e.message}` : e.message
    ),
  };
}
