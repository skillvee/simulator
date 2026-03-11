/**
 * Analytics module for tracking and aggregating usage metrics.
 * Privacy-focused: No PII (emails, names, IPs) exposed in analytics.
 * All data is aggregated to prevent individual identification.
 */

import { z } from "zod";
import { db } from "@/server/db";
import type { AssessmentStatus } from "@prisma/client";

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Time period for analytics queries.
 */
export const TimePeriodSchema = z.enum([
  "today",
  "yesterday",
  "last7days",
  "last30days",
  "last90days",
  "all",
]);
export type TimePeriod = z.infer<typeof TimePeriodSchema>;

/**
 * Daily count data point for trends.
 */
export const DailyCountSchema = z.object({
  date: z.string(), // ISO date string (YYYY-MM-DD)
  count: z.number(),
});
export type DailyCount = z.infer<typeof DailyCountSchema>;

/**
 * Phase duration statistics.
 */
export const PhaseDurationStatsSchema = z.object({
  phase: z.string(),
  avgDurationMinutes: z.number(),
  minDurationMinutes: z.number(),
  maxDurationMinutes: z.number(),
  sampleSize: z.number(),
});
export type PhaseDurationStats = z.infer<typeof PhaseDurationStatsSchema>;

/**
 * Status distribution data.
 */
export const StatusDistributionSchema = z.object({
  status: z.string(),
  count: z.number(),
  percentage: z.number(),
});
export type StatusDistribution = z.infer<typeof StatusDistributionSchema>;

/**
 * Completion funnel data.
 */
export const FunnelStepSchema = z.object({
  step: z.string(),
  count: z.number(),
  percentage: z.number(), // Percentage of previous step (or 100 for first)
  dropoffRate: z.number(), // Percentage that dropped off before this step
});
export type FunnelStep = z.infer<typeof FunnelStepSchema>;

/**
 * Complete analytics data structure.
 */
export const AnalyticsDataSchema = z.object({
  // Overview metrics
  overview: z.object({
    totalUsers: z.number(),
    totalAssessments: z.number(),
    completedAssessments: z.number(),
    activeAssessments: z.number(),
    completionRate: z.number(), // Percentage
    avgCompletionTimeMinutes: z.number().nullable(),
  }),

  // Trend data
  trends: z.object({
    signups: z.array(DailyCountSchema),
    assessmentStarts: z.array(DailyCountSchema),
    assessmentCompletions: z.array(DailyCountSchema),
  }),

  // Phase analysis
  phaseDurations: z.array(PhaseDurationStatsSchema),

  // Status distribution
  statusDistribution: z.array(StatusDistributionSchema),

  // Completion funnel
  completionFunnel: z.array(FunnelStepSchema),

  // Period metadata
  period: TimePeriodSchema,
  generatedAt: z.string(),
});
export type AnalyticsData = z.infer<typeof AnalyticsDataSchema>;

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Get the start date for a given time period.
 */
export function getStartDateForPeriod(period: TimePeriod): Date | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return today;
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    case "last7days": {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today
      return sevenDaysAgo;
    }
    case "last30days": {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // Include today
      return thirtyDaysAgo;
    }
    case "last90days": {
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89); // Include today
      return ninetyDaysAgo;
    }
    case "all":
      return null;
  }
}

/**
 * Get the end date for yesterday period.
 */
export function getEndDateForPeriod(period: TimePeriod): Date | null {
  if (period === "yesterday") {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return null;
}

/**
 * Generate array of dates between start and end.
 */
export function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD).
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

/**
 * Get signups count per day for a time period.
 * Privacy: Returns only counts, no user identifiers.
 */
export async function getSignupTrends(
  period: TimePeriod
): Promise<DailyCount[]> {
  const startDate = getStartDateForPeriod(period);
  const endDate = getEndDateForPeriod(period);

  const whereClause: {
    createdAt?: { gte?: Date; lt?: Date };
    deletedAt: null;
  } = {
    deletedAt: null,
  };

  if (startDate) {
    whereClause.createdAt = { gte: startDate };
  }
  if (endDate) {
    whereClause.createdAt = { ...whereClause.createdAt, lt: endDate };
  }

  const users = await db.user.findMany({
    where: whereClause,
    select: { createdAt: true },
  });

  // Group by date
  const countsByDate: Record<string, number> = {};
  for (const user of users) {
    const dateKey = toISODateString(user.createdAt);
    countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
  }

  // Generate full date range with zeros for missing dates
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = startDate || new Date(2020, 0, 1);
  const end = endDate || today;

  const dateRange = generateDateRange(start, end);
  return dateRange.map((date) => ({
    date,
    count: countsByDate[date] || 0,
  }));
}

/**
 * Get assessment starts count per day for a time period.
 * Privacy: Returns only counts, no assessment identifiers.
 */
export async function getAssessmentStartTrends(
  period: TimePeriod
): Promise<DailyCount[]> {
  const startDate = getStartDateForPeriod(period);
  const endDate = getEndDateForPeriod(period);

  const whereClause: { startedAt?: { gte?: Date; lt?: Date } } = {};

  if (startDate) {
    whereClause.startedAt = { gte: startDate };
  }
  if (endDate) {
    whereClause.startedAt = { ...whereClause.startedAt, lt: endDate };
  }

  const assessments = await db.assessment.findMany({
    where: whereClause,
    select: { startedAt: true },
  });

  // Group by date
  const countsByDate: Record<string, number> = {};
  for (const assessment of assessments) {
    const dateKey = toISODateString(assessment.startedAt);
    countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
  }

  // Generate full date range with zeros for missing dates
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = startDate || new Date(2020, 0, 1);
  const end = endDate || today;

  const dateRange = generateDateRange(start, end);
  return dateRange.map((date) => ({
    date,
    count: countsByDate[date] || 0,
  }));
}

/**
 * Get assessment completions count per day for a time period.
 * Privacy: Returns only counts, no assessment identifiers.
 */
export async function getAssessmentCompletionTrends(
  period: TimePeriod
): Promise<DailyCount[]> {
  const startDate = getStartDateForPeriod(period);
  const endDate = getEndDateForPeriod(period);

  const whereClause: {
    completedAt?: { gte?: Date; lt?: Date; not?: null };
    status: AssessmentStatus;
  } = {
    status: "COMPLETED",
  };

  if (startDate) {
    whereClause.completedAt = { gte: startDate, not: null };
  } else {
    whereClause.completedAt = { not: null };
  }
  if (endDate) {
    whereClause.completedAt = { ...whereClause.completedAt, lt: endDate };
  }

  const assessments = await db.assessment.findMany({
    where: whereClause,
    select: { completedAt: true },
  });

  // Group by date
  const countsByDate: Record<string, number> = {};
  for (const assessment of assessments) {
    if (assessment.completedAt) {
      const dateKey = toISODateString(assessment.completedAt);
      countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
    }
  }

  // Generate full date range with zeros for missing dates
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = startDate || new Date(2020, 0, 1);
  const end = endDate || today;

  const dateRange = generateDateRange(start, end);
  return dateRange.map((date) => ({
    date,
    count: countsByDate[date] || 0,
  }));
}

/**
 * Get phase duration statistics.
 * Privacy: Returns only aggregated statistics, no individual assessment data.
 */
export async function getPhaseDurationStats(): Promise<PhaseDurationStats[]> {
  const stats: PhaseDurationStats[] = [];

  // Total assessment duration (for completed assessments)
  const completedAssessments = await db.assessment.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { not: null },
    },
    select: {
      startedAt: true,
      completedAt: true,
    },
  });

  if (completedAssessments.length > 0) {
    const durations = completedAssessments
      .map((a) => {
        if (!a.completedAt) return 0;
        return (a.completedAt.getTime() - a.startedAt.getTime()) / 1000;
      })
      .filter((d) => d > 0);

    if (durations.length > 0) {
      stats.push({
        phase: "Total Assessment",
        avgDurationMinutes: Math.round(
          durations.reduce((a, b) => a + b, 0) / durations.length / 60
        ),
        minDurationMinutes: Math.round(Math.min(...durations) / 60),
        maxDurationMinutes: Math.round(Math.max(...durations) / 60),
        sampleSize: durations.length,
      });
    }
  }

  // Working phase duration (from segment analysis)
  const segmentAnalyses = await db.segmentAnalysis.findMany({
    where: {
      totalActiveTime: { not: null },
    },
    select: {
      totalActiveTime: true,
      totalIdleTime: true,
    },
  });

  if (segmentAnalyses.length > 0) {
    const activeDurations = segmentAnalyses
      .map((s) => (s.totalActiveTime || 0) + (s.totalIdleTime || 0))
      .filter((d) => d > 0);

    if (activeDurations.length > 0) {
      stats.push({
        phase: "Working (Active)",
        avgDurationMinutes: Math.round(
          activeDurations.reduce((a, b) => a + b, 0) /
            activeDurations.length /
            60
        ),
        minDurationMinutes: Math.round(Math.min(...activeDurations) / 60),
        maxDurationMinutes: Math.round(Math.max(...activeDurations) / 60),
        sampleSize: activeDurations.length,
      });
    }
  }

  return stats;
}

/**
 * Get assessment status distribution.
 * Privacy: Returns only counts per status, no individual assessment data.
 */
export async function getStatusDistribution(): Promise<StatusDistribution[]> {
  const counts = await db.assessment.groupBy({
    by: ["status"],
    _count: true,
  });

  const total = counts.reduce((sum, c) => sum + c._count, 0);

  // Define order of statuses
  const statusOrder: AssessmentStatus[] = ["WELCOME", "WORKING", "COMPLETED"];

  return statusOrder.map((status) => {
    const found = counts.find((c) => c.status === status);
    const count = found?._count || 0;
    return {
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

/**
 * Get completion funnel data.
 * Privacy: Returns only aggregated counts, no individual assessment data.
 */
export async function getCompletionFunnel(): Promise<FunnelStep[]> {
  // Count assessments that reached each status
  const started = await db.assessment.count();
  const working = await db.assessment.count({
    where: {
      status: {
        in: ["WORKING", "COMPLETED"],
      },
    },
  });
  const completed = await db.assessment.count({
    where: {
      status: "COMPLETED",
    },
  });

  const funnel: FunnelStep[] = [
    {
      step: "Started",
      count: started,
      percentage: 100,
      dropoffRate: 0,
    },
    {
      step: "Working",
      count: working,
      percentage: started > 0 ? Math.round((working / started) * 100) : 0,
      dropoffRate:
        started > 0 ? Math.round(((started - working) / started) * 100) : 0,
    },
    {
      step: "Completed",
      count: completed,
      percentage: working > 0 ? Math.round((completed / working) * 100) : 0,
      dropoffRate:
        working > 0 ? Math.round(((working - completed) / working) * 100) : 0,
    },
  ];

  return funnel;
}

/**
 * Get overview metrics.
 * Privacy: Returns only aggregated counts and averages.
 */
export async function getOverviewMetrics(period: TimePeriod): Promise<{
  totalUsers: number;
  totalAssessments: number;
  completedAssessments: number;
  activeAssessments: number;
  completionRate: number;
  avgCompletionTimeMinutes: number | null;
}> {
  const startDate = getStartDateForPeriod(period);
  const endDate = getEndDateForPeriod(period);

  const userWhere: { createdAt?: { gte?: Date; lt?: Date }; deletedAt: null } =
    {
      deletedAt: null,
    };
  if (startDate) {
    userWhere.createdAt = { gte: startDate };
  }
  if (endDate) {
    userWhere.createdAt = { ...userWhere.createdAt, lt: endDate };
  }

  const assessmentWhere: { startedAt?: { gte?: Date; lt?: Date } } = {};
  if (startDate) {
    assessmentWhere.startedAt = { gte: startDate };
  }
  if (endDate) {
    assessmentWhere.startedAt = { ...assessmentWhere.startedAt, lt: endDate };
  }

  const [
    totalUsers,
    totalAssessments,
    completedAssessments,
    activeAssessments,
  ] = await Promise.all([
    db.user.count({ where: userWhere }),
    db.assessment.count({ where: assessmentWhere }),
    db.assessment.count({
      where: { ...assessmentWhere, status: "COMPLETED" },
    }),
    db.assessment.count({
      where: {
        ...assessmentWhere,
        status: {
          in: ["WELCOME", "WORKING"],
        },
      },
    }),
  ]);

  // Calculate average completion time
  const completedWithTiming = await db.assessment.findMany({
    where: {
      ...assessmentWhere,
      status: "COMPLETED",
      completedAt: { not: null },
    },
    select: {
      startedAt: true,
      completedAt: true,
    },
  });

  let avgCompletionTimeMinutes: number | null = null;
  if (completedWithTiming.length > 0) {
    const totalMinutes = completedWithTiming.reduce((sum, a) => {
      if (!a.completedAt) return sum;
      const durationMs = a.completedAt.getTime() - a.startedAt.getTime();
      return sum + durationMs / 60000;
    }, 0);
    avgCompletionTimeMinutes = Math.round(
      totalMinutes / completedWithTiming.length
    );
  }

  return {
    totalUsers,
    totalAssessments,
    completedAssessments,
    activeAssessments,
    completionRate:
      totalAssessments > 0
        ? Math.round((completedAssessments / totalAssessments) * 100)
        : 0,
    avgCompletionTimeMinutes,
  };
}

// ============================================================================
// MAIN ANALYTICS FUNCTION
// ============================================================================

/**
 * Get complete analytics data for a time period.
 * Privacy: All data is aggregated, no PII exposed.
 */
export async function getAnalytics(period: TimePeriod): Promise<AnalyticsData> {
  const [
    overview,
    signups,
    assessmentStarts,
    assessmentCompletions,
    phaseDurations,
    statusDistribution,
    completionFunnel,
  ] = await Promise.all([
    getOverviewMetrics(period),
    getSignupTrends(period),
    getAssessmentStartTrends(period),
    getAssessmentCompletionTrends(period),
    getPhaseDurationStats(),
    getStatusDistribution(),
    getCompletionFunnel(),
  ]);

  return {
    overview,
    trends: {
      signups,
      assessmentStarts,
      assessmentCompletions,
    },
    phaseDurations,
    statusDistribution,
    completionFunnel,
    period,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Log analytics event to console (for monitoring/debugging).
 * Privacy: Logs only event type and count, no PII.
 */
export function logAnalyticsEvent(
  eventType:
    | "signup"
    | "assessment_start"
    | "assessment_complete"
    | "phase_transition",
  metadata?: { phase?: string; scenarioId?: string }
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    ...(metadata?.phase && { phase: metadata.phase }),
    // Note: scenarioId is not PII, it's a system identifier
    ...(metadata?.scenarioId && { scenarioId: metadata.scenarioId }),
  };

  // Log to console in structured format for log aggregation tools
  console.log(`[ANALYTICS] ${JSON.stringify(logEntry)}`);
}
