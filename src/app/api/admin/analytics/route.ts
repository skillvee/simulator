import { auth } from "@/auth";
import { db } from "@/server/db";
import { NextResponse } from "next/server";
import { getAnalytics, TimePeriodSchema, type TimePeriod } from "@/lib/core";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period") || "last30days";

  // Validate period
  const periodResult = TimePeriodSchema.safeParse(periodParam);
  if (!periodResult.success) {
    return NextResponse.json(
      {
        error:
          "Invalid period. Must be one of: today, yesterday, last7days, last30days, last90days, all",
      },
      { status: 400 }
    );
  }

  const period: TimePeriod = periodResult.data;

  try {
    const analytics = await getAnalytics(period);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[Analytics API Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
