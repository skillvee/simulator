import { auth } from "@/auth";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { getReportStatus } from "@/lib/analysis/report-status";

const logger = createLogger("api:assessment:report-status");

/**
 * GET /api/assessment/report-status?assessmentId=xxx
 *
 * Polled by the candidate's results page. Returns one of:
 *   { state: "ready" }      → report is in the DB, client reloads
 *   { state: "processing" } → keep polling
 *   { state: "exhausted" }  → retries hit the ceiling (rare; UI shows a
 *                             "taking longer than expected" message, never
 *                             a button)
 *
 * The endpoint is self-healing: each call nudges the pipeline forward if
 * it's stuck (see getReportStatus). This is the recovery path for cases
 * where finalize's fire-and-forget evaluation was killed by Vercel.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");
    if (!assessmentId) return error("Assessment ID is required", 400);

    const result = await getReportStatus(assessmentId, session.user.id);

    if (result.state === "not_found") return error("Assessment not found", 404);
    if (result.state === "unauthorized") {
      return error("Unauthorized to access this assessment", 403);
    }

    return success({ state: result.state });
  } catch (err) {
    logger.error("report-status failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    // Treat as transient — client keeps polling rather than giving up.
    return success({ state: "processing" });
  }
}
