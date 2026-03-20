import { auth } from "@/auth";
import { db } from "@/server/db";
import {
  getAnalytics,
  TimePeriodSchema,
  type TimePeriod,
} from "@/lib/core";
import { success, error } from "@/lib/api";

/**
 * GET /api/admin/analytics
 * Returns aggregated analytics data for the admin dashboard.
 * Privacy: All data is aggregated, no PII exposed.
 *
 * Query params:
 * - period: "today" | "yesterday" | "last7days" | "last30days" | "last90days" | "all"
 */
export async function GET(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  // Check admin role
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return error("Forbidden", 403);
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period") || "last30days";

  // Validate period
  const periodResult = TimePeriodSchema.safeParse(periodParam);
  if (!periodResult.success) {
    return error(
      "Invalid period. Must be one of: today, yesterday, last7days, last30days, last90days, all",
      400
    );
  }

  const period: TimePeriod = periodResult.data;

  try {
    const analytics = await getAnalytics(period);
    return success(analytics);
  } catch (err) {
    console.error("[Analytics API Error]", err);
    return error("Failed to fetch analytics", 500);
  }
}
