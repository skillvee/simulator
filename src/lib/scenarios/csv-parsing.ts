/**
 * CSV parsing for the v2 data branch.
 *
 * Gemini's code-execution responses interleave `text`, `executableCode`, and
 * `codeExecutionResult` parts. Our prompt instructs the model to print each
 * generated CSV between markers `=== FILE: <name> ===\n<csv>\n=== END ===`,
 * which we extract from `codeExecutionResult.output`.
 *
 * If the sandbox times out (~30s) the model sometimes recovers in `text` parts
 * with fenced ```csv blocks; we fall back to those.
 */

import Papa from "papaparse";

export interface ParsedCsvFile {
  filename: string;
  csv: string;
  rowCount: number;
  columns: string[];
}

export interface CsvParseError {
  filename?: string;
  message: string;
}

export interface CsvExtractionResult {
  files: ParsedCsvFile[];
  errors: CsvParseError[];
}

const FILE_MARKER_REGEX = /===\s*FILE:\s*([^\s=]+)\s*===\s*\n([\s\S]*?)\n===\s*END\s*===/g;
const FENCED_CSV_REGEX = /```csv\s+(?:filename:\s*([^\n]+)\n)?([\s\S]*?)```/g;

export interface GeminiResponsePart {
  text?: string;
  executableCode?: { language?: string; code: string };
  codeExecutionResult?: { outcome?: string; output?: string };
}

/**
 * Extract every CSV from a Gemini code-execution response.
 *
 * Pass `parts` from `response.candidates[0].content.parts`. Returns the parsed
 * files plus any per-file errors (so the caller can surface them as judge
 * feedback for retry).
 */
export function extractCsvsFromGeminiParts(
  parts: GeminiResponsePart[] | undefined | null
): CsvExtractionResult {
  if (!parts || parts.length === 0) {
    return { files: [], errors: [{ message: "No response parts" }] };
  }

  const stdout = parts
    .map((p) => p.codeExecutionResult?.output ?? "")
    .filter(Boolean)
    .join("\n");

  const text = parts
    .map((p) => p.text ?? "")
    .filter(Boolean)
    .join("\n");

  const blocks: Array<{ filename: string; csv: string }> = [];

  // Primary: marker-delimited blocks from stdout.
  for (const match of stdout.matchAll(FILE_MARKER_REGEX)) {
    blocks.push({ filename: match[1].trim(), csv: match[2] });
  }

  // Fallback: fenced ```csv blocks in text parts (when sandbox times out).
  if (blocks.length === 0) {
    let fallbackIndex = 0;
    for (const match of text.matchAll(FENCED_CSV_REGEX)) {
      fallbackIndex += 1;
      const filename = match[1]?.trim() || `data-${fallbackIndex}.csv`;
      blocks.push({ filename, csv: match[2] });
    }
  }

  if (blocks.length === 0) {
    return {
      files: [],
      errors: [
        {
          message:
            "No CSV files found in Gemini response (neither marker-delimited stdout nor fenced text blocks).",
        },
      ],
    };
  }

  return validateAndStructure(blocks);
}

function validateAndStructure(
  blocks: Array<{ filename: string; csv: string }>
): CsvExtractionResult {
  const files: ParsedCsvFile[] = [];
  const errors: CsvParseError[] = [];

  for (const block of blocks) {
    const trimmed = block.csv.trim();
    if (!trimmed) {
      errors.push({ filename: block.filename, message: "CSV body is empty" });
      continue;
    }

    const result = Papa.parse<string[]>(trimmed, {
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
      errors.push({
        filename: block.filename,
        message: `Parse errors: ${result.errors
          .slice(0, 3)
          .map((e) => `${e.type}@${e.row}: ${e.message}`)
          .join("; ")}`,
      });
      continue;
    }

    const rows = result.data;
    if (rows.length < 2) {
      errors.push({
        filename: block.filename,
        message: `CSV has fewer than 2 rows (header + data): ${rows.length}`,
      });
      continue;
    }

    const header = rows[0];
    if (header.length === 0) {
      errors.push({ filename: block.filename, message: "Header row is empty" });
      continue;
    }

    files.push({
      filename: block.filename,
      csv: trimmed,
      rowCount: rows.length - 1,
      columns: header.map((c) => String(c).trim()),
    });
  }

  return { files, errors };
}

/**
 * Parse a single CSV string into structured preview rows (first N rows).
 * Used for `ScenarioDataFile.previewRows` so the candidate UI can show a
 * sample without fetching the whole file.
 */
export function buildPreviewRows(
  csv: string,
  limit = 20
): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    preview: limit,
  });

  if (result.errors.length > 0) {
    return [];
  }

  return result.data;
}

/**
 * Compute a basic schema description ({ name, type, sample }) for each column.
 * Type detection is heuristic (number, boolean, date, string).
 */
export function inferSchemaJson(
  csv: string,
  columns: string[]
): { columns: Array<{ name: string; type: string; sample?: unknown }> } {
  const previewRows = buildPreviewRows(csv, 50);
  return {
    columns: columns.map((name) => {
      const samples = previewRows
        .map((row) => row[name])
        .filter((v) => v !== undefined && v !== "");
      const sample = samples[0];
      const type = inferType(samples);
      return { name, type, sample };
    }),
  };
}

function inferType(samples: unknown[]): string {
  if (samples.length === 0) return "unknown";

  let allNumbers = true;
  let allBooleans = true;
  let allDates = true;

  for (const v of samples) {
    const s = String(v).trim();
    if (allNumbers && (s === "" || isNaN(Number(s)))) allNumbers = false;
    if (allBooleans && !/^(true|false|0|1|yes|no)$/i.test(s)) allBooleans = false;
    if (allDates && isNaN(Date.parse(s))) allDates = false;
  }

  if (allNumbers) return "number";
  if (allBooleans) return "boolean";
  if (allDates) return "date";
  return "string";
}
