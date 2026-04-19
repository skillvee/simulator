import { gemini } from "@/lib/ai/gemini";
import { TEXT_MODEL } from "@/lib/ai/gemini-config";
import { supabaseAdmin } from "@/lib/external/supabase";
import { STORAGE_BUCKETS } from "@/lib/external/storage";
import { createLogger } from "@/lib/core";
import { DELIVERABLE_SUMMARY_PROMPT } from "@/prompts/analysis/deliverable-summary";

const logger = createLogger("lib:analysis:deliverable-parser");

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "rst",
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "ipynb",
  "go", "rs", "java", "kt", "scala",
  "rb", "php",
  "c", "h", "cpp", "hpp", "cc", "cs",
  "swift", "m", "mm",
  "sql", "graphql", "proto",
  "sh", "bash", "zsh", "fish", "ps1",
  "html", "htm", "css", "scss", "sass", "less",
  "json", "yaml", "yml", "toml", "ini", "env", "xml",
  "vue", "svelte", "astro",
  "r", "jl", "lua", "dart", "ex", "exs", "clj", "hs",
  "dockerfile", "makefile",
]);

const INLINE_MIME_EXTENSIONS = new Set([
  "pdf",
  "png", "jpg", "jpeg", "webp", "gif",
]);

const ARCHIVE_EXTENSIONS = new Set([
  "zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz",
]);

const MAX_TEXT_BYTES = 200_000;

function mimeForExtension(ext: string): string {
  switch (ext) {
    case "pdf": return "application/pdf";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    default: return "application/octet-stream";
  }
}

/**
 * Summarize a candidate's uploaded deliverable so the manager has context
 * going into the defense call. Returns null if parsing fails or the file
 * cannot be read (archive, unreadable binary). Callers should treat null
 * as "no summary available" — never fail the upload on a parse error.
 */
export async function summarizeDeliverable(
  storagePath: string,
  filename: string,
): Promise<string | null> {
  try {
    const ext = (filename.split(".").pop() || "").toLowerCase();

    if (ARCHIVE_EXTENSIONS.has(ext)) {
      return `Submission is an archive (${filename}). Contents could not be inspected automatically — ask the candidate to walk through what's inside.`;
    }

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.DELIVERABLES)
      .download(storagePath);

    if (error || !data) {
      logger.warn("Could not download deliverable for summarization", {
        storagePath,
        error: error?.message,
      });
      return null;
    }

    if (TEXT_EXTENSIONS.has(ext)) {
      const text = await data.text();
      const truncated = text.length > MAX_TEXT_BYTES
        ? `${text.slice(0, MAX_TEXT_BYTES)}\n\n[Truncated — original file was ${text.length} chars]`
        : text;

      const result = await gemini.models.generateContent({
        model: TEXT_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${DELIVERABLE_SUMMARY_PROMPT}\n\nFilename: ${filename}\n\n--- FILE CONTENTS ---\n${truncated}`,
              },
            ],
          },
        ],
      });
      return result.text?.trim() || null;
    }

    if (INLINE_MIME_EXTENSIONS.has(ext)) {
      const buffer = Buffer.from(await data.arrayBuffer());
      const base64 = buffer.toString("base64");
      const result = await gemini.models.generateContent({
        model: TEXT_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: mimeForExtension(ext), data: base64 } },
              { text: `${DELIVERABLE_SUMMARY_PROMPT}\n\nFilename: ${filename}` },
            ],
          },
        ],
      });
      return result.text?.trim() || null;
    }

    return `Submission is ${filename}. Format not recognized for automatic inspection — ask the candidate to walk through it.`;
  } catch (err) {
    logger.error("Failed to summarize deliverable", {
      storagePath,
      filename,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
