/**
 * Scenario Data Storage
 *
 * Thin wrapper around the private Supabase Storage bucket "scenario-data" used
 * by the v2 resource pipeline to persist generated CSV files for DA/DS/DE
 * archetypes. Long-lived signed URLs are never persisted; callers request a
 * fresh signed URL on demand.
 */

import { supabaseAdmin } from "./supabase";
import { createLogger } from "@/lib/core";

const logger = createLogger("lib:external:scenario-data-storage");

export const SCENARIO_DATA_BUCKET = "scenario-data";

const ALLOWED_EXTENSIONS = new Set([".csv", ".md", ".json"]);

function assertAllowedFilename(filename: string): void {
  const lower = filename.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".")) : "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Filename must end with one of ${Array.from(ALLOWED_EXTENSIONS).join(", ")}: ${filename}`
    );
  }
}

export function storagePathFor(scenarioId: string, filename: string): string {
  return `${scenarioId}/${filename}`;
}

/**
 * Upload a generated artifact to the scenario-data bucket.
 *
 * @returns The storage path (caller persists this on `ScenarioDataFile`).
 */
export async function uploadScenarioFile(
  scenarioId: string,
  filename: string,
  body: string | Buffer,
  contentType: string
): Promise<string> {
  assertAllowedFilename(filename);
  const path = storagePathFor(scenarioId, filename);

  const { error } = await supabaseAdmin.storage
    .from(SCENARIO_DATA_BUCKET)
    .upload(path, body, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload scenario file ${path}: ${error.message}`);
  }

  return path;
}

/**
 * Generate a short-lived signed URL for a scenario file.
 * Default TTL: 60 minutes.
 */
export async function getSignedScenarioFileUrl(
  storagePath: string,
  expiresIn = 60 * 60
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(SCENARIO_DATA_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to sign scenario file URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Remove specific files from the scenario-data bucket.
 * Errors are logged but never thrown — callers should treat this as best-effort cleanup.
 */
export async function removeScenarioFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  const { error } = await supabaseAdmin.storage
    .from(SCENARIO_DATA_BUCKET)
    .remove(paths);

  if (error) {
    logger.warn("Failed to remove scenario files", {
      err: error.message,
      count: paths.length,
    });
  }
}

/**
 * Remove every file under a scenario's storage prefix. Used by cascade-delete.
 */
export async function removeAllScenarioFiles(scenarioId: string): Promise<void> {
  const prefix = `${scenarioId}/`;
  const { data, error } = await supabaseAdmin.storage
    .from(SCENARIO_DATA_BUCKET)
    .list(scenarioId, { limit: 1000 });

  if (error) {
    logger.warn("Failed to list scenario files for delete", {
      scenarioId,
      err: error.message,
    });
    return;
  }

  const paths = (data ?? [])
    .filter((entry) => entry.name)
    .map((entry) => `${prefix}${entry.name}`);

  await removeScenarioFiles(paths);
}
