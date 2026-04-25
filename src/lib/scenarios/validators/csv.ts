/**
 * Deterministic validators for the v2 data branch (CSV outputs).
 *
 * Reads `ScenarioDataFile` rows from the DB plus the CSV blobs from Supabase
 * (we only need the schema/preview already on the row — actual blob isn't
 * re-fetched here). Checks structural integrity, declared-vs-actual schema,
 * and that the data dictionary doc references every CSV.
 */

import { db } from "@/server/db";
import type { ScenarioDoc } from "@/types";

const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
// Floor is intentionally low: legitimate files (daily summary tables, small
// dimension tables) can have <100 rows. The judge catches "too sparse to be
// useful" qualitatively. Hard cap on the upper end — sandbox stdout + token
// budget force the ceiling.
const MIN_ROWS = 30;
const MAX_ROWS = 2000;
const DUPLICATE_RATIO_LIMIT = 0.05;

export interface CsvValidatorInput {
  scenarioId: string;
  docs: ScenarioDoc[];
}

export async function validateCsvArtifact(
  input: CsvValidatorInput
): Promise<string[]> {
  const errors: string[] = [];
  const { scenarioId, docs } = input;

  const files = await db.scenarioDataFile.findMany({
    where: { scenarioId },
    select: {
      id: true,
      filename: true,
      rowCount: true,
      byteSize: true,
      schemaJson: true,
      previewRows: true,
    },
  });

  if (files.length < 2 || files.length > 5) {
    errors.push(`Expected 2-5 CSV files, got ${files.length}`);
  }

  let totalBytes = 0;
  for (const f of files) {
    totalBytes += f.byteSize ?? 0;

    const rowCount = f.rowCount ?? 0;
    if (rowCount < MIN_ROWS) {
      errors.push(`${f.filename}: row count ${rowCount} below minimum ${MIN_ROWS}`);
    }
    if (rowCount > MAX_ROWS) {
      errors.push(`${f.filename}: row count ${rowCount} above sandbox cap ${MAX_ROWS}`);
    }

    const schema = f.schemaJson as
      | { columns: Array<{ name: string; type: string; sample?: unknown }> }
      | null;
    if (!schema || !Array.isArray(schema.columns) || schema.columns.length === 0) {
      errors.push(`${f.filename}: schemaJson missing or empty`);
      continue;
    }

    // Check no column is all-null across ALL preview rows. We used to flag
    // every all-null column but that was too strict — real datasets have
    // conditional fields (e.g. `error_code` only populated on failures) that
    // can legitimately be all-null in a 20-row sample. Flag only if MOST
    // columns are empty, which would indicate a genuinely malformed file.
    const preview = (f.previewRows as Record<string, unknown>[] | null) ?? [];
    if (preview.length > 0) {
      const allNullCols = schema.columns.filter((col) =>
        preview.every((row) => {
          const v = row[col.name];
          return v === undefined || v === null || v === "";
        })
      );
      if (allNullCols.length > schema.columns.length / 2) {
        errors.push(
          `${f.filename}: ${allNullCols.length}/${schema.columns.length} columns are all-null in preview rows (file looks empty)`
        );
      }
    }

    // Cheap duplicate-row check on preview.
    const previewKeys = preview.map((r) => JSON.stringify(r));
    const uniqueKeys = new Set(previewKeys).size;
    if (preview.length > 0) {
      const dupRatio = 1 - uniqueKeys / preview.length;
      if (dupRatio > DUPLICATE_RATIO_LIMIT) {
        errors.push(
          `${f.filename}: duplicate-row ratio ${(dupRatio * 100).toFixed(1)}% above ${(
            DUPLICATE_RATIO_LIMIT * 100
          ).toFixed(0)}% threshold (preview-only sample)`
        );
      }
    }
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    errors.push(
      `Total CSV size ${(totalBytes / 1024 / 1024).toFixed(2)} MB exceeds 25 MB`
    );
  }

  // Data dictionary doc must reference every CSV by filename.
  const dataDictionaryDoc = docs.find((d) =>
    /data dictionary|datasets?|schema/i.test(d.name + " " + d.objective)
  );
  if (!dataDictionaryDoc) {
    errors.push(
      "No 'Data Dictionary'-style doc found; data archetype docs must include one that references every CSV"
    );
  } else {
    const body = dataDictionaryDoc.markdown.toLowerCase();
    for (const f of files) {
      if (!body.includes(f.filename.toLowerCase())) {
        errors.push(
          `Data dictionary doc "${dataDictionaryDoc.name}" doesn't reference CSV ${f.filename}`
        );
      }
    }
  }

  return errors;
}
