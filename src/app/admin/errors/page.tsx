import { db } from "@/server/db";
import { requireAdmin } from "@/lib/core";
import { ErrorDashboardClient } from "./client";

export default async function GlobalErrorDashboardPage() {
  await requireAdmin();

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Fetch client errors (last 7 days for the list, all time would be too much)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [clientErrors, apiErrors, clientErrorsLast24h, clientErrorsPrior24h, apiErrorsLast24h, apiErrorsPrior24h, assessments, users] = await Promise.all([
    // All client errors (last 7 days)
    db.clientError.findMany({
      where: { timestamp: { gte: sevenDaysAgo } },
      orderBy: { timestamp: "desc" },
      include: {
        assessment: { select: { id: true, scenario: { select: { name: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    // API errors (last 7 days)
    db.assessmentApiCall.findMany({
      where: {
        errorMessage: { not: null },
        requestTimestamp: { gte: sevenDaysAgo },
      },
      orderBy: { requestTimestamp: "desc" },
      select: {
        id: true,
        assessmentId: true,
        requestTimestamp: true,
        errorMessage: true,
        stackTrace: true,
        statusCode: true,
        modelVersion: true,
        promptType: true,
        assessment: { select: { id: true, userId: true, scenario: { select: { name: true } }, user: { select: { id: true, name: true, email: true } } } },
      },
    }),
    // Count last 24h
    db.clientError.count({ where: { timestamp: { gte: twentyFourHoursAgo } } }),
    // Count prior 24h
    db.clientError.count({ where: { timestamp: { gte: fortyEightHoursAgo, lt: twentyFourHoursAgo } } }),
    db.assessmentApiCall.count({ where: { errorMessage: { not: null }, requestTimestamp: { gte: twentyFourHoursAgo } } }),
    db.assessmentApiCall.count({ where: { errorMessage: { not: null }, requestTimestamp: { gte: fortyEightHoursAgo, lt: twentyFourHoursAgo } } }),
    // Assessments for filter dropdown
    db.assessment.findMany({
      select: { id: true, scenario: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    // Users for filter dropdown
    db.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalErrorsLast24h = clientErrorsLast24h + apiErrorsLast24h;
  const totalErrorsPrior24h = clientErrorsPrior24h + apiErrorsPrior24h;

  // Find most common error message (last 24h)
  const recentClientErrors = clientErrors.filter(
    (e) => new Date(e.timestamp) >= twentyFourHoursAgo
  );
  const recentApiErrors = apiErrors.filter(
    (e) => new Date(e.requestTimestamp) >= twentyFourHoursAgo
  );
  const allRecentMessages = [
    ...recentClientErrors.map((e) => e.message),
    ...recentApiErrors.map((e) => e.errorMessage!),
  ];
  const messageCounts = new Map<string, number>();
  for (const msg of allRecentMessages) {
    const key = msg.slice(0, 100); // Normalize by truncating
    messageCounts.set(key, (messageCounts.get(key) || 0) + 1);
  }
  let mostCommonError = "N/A";
  let mostCommonCount = 0;
  for (const [msg, count] of messageCounts) {
    if (count > mostCommonCount) {
      mostCommonError = msg;
      mostCommonCount = count;
    }
  }

  // Find most affected assessment (last 24h)
  const assessmentCounts = new Map<string, { count: number; name: string }>();
  for (const err of recentClientErrors) {
    if (err.assessment) {
      const key = err.assessment.id;
      const existing = assessmentCounts.get(key);
      assessmentCounts.set(key, {
        count: (existing?.count || 0) + 1,
        name: err.assessment.scenario?.name || key.slice(0, 8),
      });
    }
  }
  for (const err of recentApiErrors) {
    const key = err.assessmentId;
    const existing = assessmentCounts.get(key);
    assessmentCounts.set(key, {
      count: (existing?.count || 0) + 1,
      name: err.assessment.scenario?.name || key.slice(0, 8),
    });
  }
  let mostAffectedAssessment = { id: "", name: "N/A", count: 0 };
  for (const [id, data] of assessmentCounts) {
    if (data.count > mostAffectedAssessment.count) {
      mostAffectedAssessment = { id, name: data.name, count: data.count };
    }
  }

  // Serialize errors for client
  const serializedErrors = [
    ...clientErrors.map((e) => ({
      id: e.id,
      source: "client" as const,
      timestamp: e.timestamp.toISOString(),
      errorType: e.errorType,
      message: e.message,
      stackTrace: e.stackTrace,
      componentName: e.componentName,
      url: e.url,
      assessmentId: e.assessmentId,
      assessmentName: e.assessment?.scenario?.name || null,
      userId: e.userId,
      userName: e.user?.name || e.user?.email || null,
    })),
    ...apiErrors.map((e) => ({
      id: e.id,
      source: "api" as const,
      timestamp: e.requestTimestamp.toISOString(),
      errorType: "API_ERROR" as const,
      message: e.errorMessage!,
      stackTrace: e.stackTrace,
      componentName: null,
      url: null,
      statusCode: e.statusCode,
      modelVersion: e.modelVersion,
      promptType: e.promptType,
      assessmentId: e.assessmentId,
      assessmentName: e.assessment.scenario?.name || null,
      userId: e.assessment.userId,
      userName: e.assessment.user?.name || e.assessment.user?.email || null,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const summaryStats = {
    totalErrorsLast24h,
    totalErrorsPrior24h,
    mostCommonError,
    mostCommonCount,
    mostAffectedAssessment,
  };

  const filterOptions = {
    assessments: assessments.map((a) => ({
      id: a.id,
      name: a.scenario?.name || a.id.slice(0, 8),
    })),
    users: users.map((u) => ({
      id: u.id,
      name: u.name || u.email || u.id.slice(0, 8),
    })),
  };

  return (
    <ErrorDashboardClient
      errors={serializedErrors}
      summaryStats={summaryStats}
      filterOptions={filterOptions}
    />
  );
}
