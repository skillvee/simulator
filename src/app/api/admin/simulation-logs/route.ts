import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

/**
 * GET /api/admin/simulation-logs
 * Fetch all simulation creation logs for the admin panel
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return error("Unauthorized", 401);
  }

  try {
    const logs = await db.simulationCreationLog.findMany({
      include: {
        user: { select: { name: true, email: true } },
        scenario: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return success({ logs });
  } catch (err) {
    console.error("Failed to fetch simulation creation logs:", err);
    return error("Failed to fetch logs", 500);
  }
}
