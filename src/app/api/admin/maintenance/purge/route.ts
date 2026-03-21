import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { purgeOldObservabilityData } from "@/lib/maintenance";

const logger = createLogger("api:admin:maintenance:purge");

/**
 * POST /api/admin/maintenance/purge
 * Manually trigger purge of observability data older than 30 days.
 * Admin-only endpoint.
 *
 * Returns JSON with number of records deleted per table.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return error("Forbidden", 403);
  }

  try {
    const result = await purgeOldObservabilityData();
    logger.info("Manual purge triggered by admin", {
      userId: session.user.id,
      ...result,
    });
    return success(result);
  } catch (err) {
    logger.error("Purge failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return error("Failed to purge observability data", 500);
  }
}
