import { db } from "@/server/db";
import { AssessmentsClient } from "./client";

export default async function AdminAssessmentsPage() {
  // Fetch all assessments with related data for diagnostics
  const [assessments, scenarios] = await Promise.all([
    db.assessment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        scenario: { select: { id: true, name: true } },
        logs: {
          orderBy: { timestamp: "asc" },
          select: {
            id: true,
            eventType: true,
            timestamp: true,
            durationMs: true,
            metadata: true,
          },
        },
        apiCalls: {
          orderBy: { requestTimestamp: "asc" },
          select: {
            id: true,
            requestTimestamp: true,
            responseTimestamp: true,
            durationMs: true,
            modelVersion: true,
            statusCode: true,
            errorMessage: true,
            promptTokens: true,
            responseTokens: true,
          },
        },
        _count: {
          select: { clientErrors: true },
        },
      },
    }),
    db.scenario.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Calculate aggregate stats
  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(
    (a) => a.status === "COMPLETED"
  ).length;
  const failedAssessments = assessments.filter((a) =>
    a.logs.some((log) => log.eventType === "ERROR")
  ).length;

  // Calculate success rate
  const successRate =
    totalAssessments > 0
      ? Math.round((completedAssessments / totalAssessments) * 100)
      : 0;

  // Calculate average duration (from startedAt to completedAt)
  const completedWithDuration = assessments.filter(
    (a) => a.completedAt && a.startedAt
  );
  const avgDurationMs =
    completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce(
            (sum, a) =>
              sum +
              (new Date(a.completedAt!).getTime() -
                new Date(a.startedAt).getTime()),
            0
          ) / completedWithDuration.length
        )
      : null;

  // Serialize dates to strings for client component
  const serializedAssessments = assessments.map((a) => {
    const apiErrorCount = a.apiCalls.filter(
      (call) => call.errorMessage !== null
    ).length;
    const clientErrorCount = a._count.clientErrors;
    return {
      ...a,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      errorCount: apiErrorCount + clientErrorCount,
      logs: a.logs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      apiCalls: a.apiCalls.map((call) => ({
        ...call,
        requestTimestamp: call.requestTimestamp.toISOString(),
        responseTimestamp: call.responseTimestamp?.toISOString() ?? null,
      })),
    };
  });

  return (
    <AssessmentsClient
      assessments={serializedAssessments}
      scenarios={scenarios}
      stats={{
        total: totalAssessments,
        completed: completedAssessments,
        failed: failedAssessments,
        successRate,
        avgDurationMs,
      }}
    />
  );
}
