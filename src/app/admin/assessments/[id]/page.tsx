import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/lib/admin";
import { AssessmentTimelineClient } from "./client";

export default async function AssessmentTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Admin-only route
  await requireAdmin();

  const { id } = await params;

  // Fetch the assessment with all related data for timeline display
  const assessment = await db.assessment.findUnique({
    where: { id },
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
          stackTrace: true,
          promptTokens: true,
          responseTokens: true,
          promptText: true,
          responseText: true,
        },
      },
      recordings: {
        select: {
          id: true,
          type: true,
          storageUrl: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!assessment) {
    notFound();
  }

  // Serialize dates for client component
  const serializedAssessment = {
    ...assessment,
    startedAt: assessment.startedAt.toISOString(),
    completedAt: assessment.completedAt?.toISOString() ?? null,
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
    supersededBy: assessment.supersededBy, // For showing if this was replaced
    logs: assessment.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    apiCalls: assessment.apiCalls.map((call) => ({
      ...call,
      requestTimestamp: call.requestTimestamp.toISOString(),
      responseTimestamp: call.responseTimestamp?.toISOString() ?? null,
    })),
    recordings: assessment.recordings.map((rec) => ({
      ...rec,
      startTime: rec.startTime.toISOString(),
      endTime: rec.endTime?.toISOString() ?? null,
    })),
  };

  return <AssessmentTimelineClient assessment={serializedAssessment} />;
}
