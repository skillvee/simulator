import { getSessionWithRole, isAdmin, createLogger } from "@/lib/core";
import { resetDemoAssessment } from "@/lib/core/demo-reset";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

const logger = createLogger("api:demo:reset");

// POST /api/demo/reset — admin-only.
// Wipes and recreates the fresh demo assessment so the next walkthrough
// starts from the welcome screen with a clean timer. Leaves the polished
// demo-completed-assessment untouched.
//
// Uses manual auth checks (not requireAdmin) because requireAdmin's redirect()
// throws NEXT_REDIRECT, which collapses to a 500 in API routes. We want proper
// 401/403 JSON responses so the client can render a useful error.
export async function POST() {
  try {
    const session = await getSessionWithRole();
    if (!session?.user) {
      return error("Unauthorized", 401);
    }
    if (!isAdmin(session.user)) {
      return error("Admin access required", 403);
    }

    const result = await resetDemoAssessment(db);
    logger.info("Demo assessment reset", { adminId: session.user.id });
    return success(result);
  } catch (err) {
    logger.error("Demo reset failed", { err: String(err) });
    return error(
      err instanceof Error ? err.message : "Failed to reset demo",
      500
    );
  }
}
