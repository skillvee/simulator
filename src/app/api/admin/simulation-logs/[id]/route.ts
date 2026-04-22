import { requireAdmin, createLogger } from "@/lib/core";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

const logger = createLogger("api:admin:simulation-logs:detail");

/**
 * GET /api/admin/simulation-logs/[id]
 * Fetch a single simulation creation log with full generation step details
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return error("Unauthorized", 401);
  }

  const { id } = await params;

  try {
    const log = await db.simulationCreationLog.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        scenario: { select: { id: true, name: true } },
        generationSteps: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!log) {
      return error("Log not found", 404);
    }

    return success({ log });
  } catch (err) {
    logger.error("Failed to fetch simulation creation log", {
      error: err instanceof Error ? err.message : String(err),
    });
    return error("Failed to fetch log", 500);
  }
}
