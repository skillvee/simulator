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
import {
  uploadScenarioFile,
  removeScenarioFiles,
  downloadScenarioFileText,
} from "@/lib/external/scenario-data-storage";
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
  /**
   * On retry attempts (attempt > 1), the prior CSVs from the failed attempt.
   * Attached inline so the model edits them in pandas instead of regenerating
   * from scratch. Filename remapping (input_file_<n>.csv) is handled by the
   * prompt builder.
   */
  priorFiles?: Array<{ filename: string; csv: string }>;
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
  const {
    scenarioId,
    plan,
    docs,
    scenarioContext,
    judgeFeedback,
    attempt,
  } = input;

  // Auto-load priors on retry: when the orchestrator passes judgeFeedback we
  // know this is a retry attempt — pull the previously-generated CSVs out of
  // storage and attach them so the model can EDIT in pandas instead of
  // regenerating from scratch. Caller can override via input.priorFiles.
  let priorFiles = input.priorFiles;
  if (!priorFiles && judgeFeedback) {
    const priorRows = await db.scenarioDataFile.findMany({
      where: { scenarioId },
      select: { filename: true, storagePath: true },
    });
    if (priorRows.length > 0) {
      priorFiles = await Promise.all(
        priorRows.map(async (r) => ({
          filename: r.filename,
          csv: await downloadScenarioFileText(r.storagePath),
        }))
      );
      logger.info("Auto-loaded prior CSVs for retry", {
        scenarioId,
        attempt,
        priorCount: priorFiles.length,
      });
    }
  }

  // On a fresh attempt (no priors), clear out any orphan rows. On a retry
  // with attached priors, leave the rows in place — we'll atomically replace
  // them after the new artifacts are uploaded.
  if (!priorFiles || priorFiles.length === 0) {
    await db.scenarioDataFile.deleteMany({ where: { scenarioId } });
  }

  // Build inline-attachment + filename mapping. Gemini renames attached files
  // to `input_file_<n>.csv` in the sandbox; the prompt has to reference that.
  const attachments = (priorFiles ?? []).map((f, i) => ({
    inlineData: {
      mimeType: "text/csv",
      data: Buffer.from(f.csv, "utf8").toString("base64"),
    },
    sandboxPath: `input_file_${i}.csv`,
    originalFilename: f.filename,
  }));

  const promptText = buildDataArtifactPrompt({
    plan,
    docs,
    scenario: scenarioContext,
    judgeFeedback,
    attempt,
    priorFiles: attachments.map((a) => ({
      sandboxPath: a.sandboxPath,
      originalFilename: a.originalFilename,
    })),
  });

  logger.info("Calling Gemini 3.1 Pro with codeExecution (streaming)", {
    scenarioId,
    attempt,
    attachmentCount: attachments.length,
  });

  // Build user parts: prompt text first, then any inline-attached prior CSVs.
  // Gemini renames attached files to input_file_<n>.csv in the sandbox; the
  // prompt builder publishes that mapping back to the model.
  const userParts: Array<Record<string, unknown>> = [{ text: promptText }];
  for (const a of attachments) {
    userParts.push({ inlineData: a.inlineData });
  }

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
    // Stream so the connection stays alive past Node's 5-minute undici headers
    // timeout — code execution + Python data generation can run that long.
    const stream = await wrapAICall(
      () =>
        gemini.models.generateContentStream({
          model: PRO_MODEL,
          contents: [{ role: "user", parts: userParts as never }],
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

  // Retry path: capture the prior storage paths before deleting DB rows so we
  // can clean up any storage objects that won't be reused by the new attempt.
  const priorStoragePaths: string[] = [];
  if (priorFiles && priorFiles.length > 0) {
    const existing = await db.scenarioDataFile.findMany({
      where: { scenarioId },
      select: { storagePath: true },
    });
    priorStoragePaths.push(...existing.map((r) => r.storagePath));
    await db.scenarioDataFile.deleteMany({ where: { scenarioId } });
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

  // Retry cleanup: remove storage objects from the prior attempt that are not
  // part of the new set. Same-named files were already overwritten via upsert.
  if (priorStoragePaths.length > 0) {
    const newPathSet = new Set(persisted.map((p) => p.storagePath));
    const orphans = priorStoragePaths.filter((p) => !newPathSet.has(p));
    if (orphans.length > 0) {
      await removeScenarioFiles(orphans);
    }
  }

  logger.info("Data artifact generation complete", {
    scenarioId,
    fileCount: persisted.length,
    parseErrorCount: extraction.errors.length,
    priorOrphansRemoved: Math.max(
      0,
      priorStoragePaths.length -
        new Set(persisted.map((p) => p.storagePath)).size
    ),
  });

  return {
    files: persisted,
    parseErrors: extraction.errors.map((e) =>
      e.filename ? `${e.filename}: ${e.message}` : e.message
    ),
  };
}
