/**
 * Cascade-delete a scenario along with its Supabase Storage blobs.
 *
 * The Prisma schema already cascades child rows (Coworker, Assessment,
 * ScenarioDataFile, …) on Scenario deletion. This helper additionally removes
 * the storage blobs that those rows referenced, fixing a pre-existing leak
 * where deleting a scenario left CSV files orphaned in the bucket.
 */

import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { removeAllScenarioFiles } from "@/lib/external/scenario-data-storage";

const logger = createLogger("lib:scenarios:cascade-delete");

export async function deleteScenarioCascade(scenarioId: string): Promise<void> {
  // Storage cleanup runs first — if the DB delete fails we still want the
  // blobs gone for any scenario that's effectively dead.
  await removeAllScenarioFiles(scenarioId);

  try {
    await db.scenario.delete({ where: { id: scenarioId } });
  } catch (err) {
    logger.error("Failed to delete scenario row", {
      scenarioId,
      err: String(err),
    });
    throw err;
  }
}
