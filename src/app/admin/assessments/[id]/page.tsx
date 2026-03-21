import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/lib/core";
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
          promptType: true,
          promptVersion: true,
          traceId: true,
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
      conversations: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          coworkerId: true,
          type: true,
          transcript: true,
          createdAt: true,
          updatedAt: true,
          coworker: { select: { id: true, name: true, role: true } },
        },
      },
      voiceSessions: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          coworkerId: true,
          startTime: true,
          endTime: true,
          durationMs: true,
          transcript: true,
          connectionEvents: true,
          tokenName: true,
          errorMessage: true,
        },
      },
    },
  });

  if (!assessment) {
    notFound();
  }

  // Fetch candidate events for this assessment
  const candidateEvents = await db.candidateEvent.findMany({
    where: { assessmentId: id },
    orderBy: { timestamp: "asc" },
    select: {
      id: true,
      eventType: true,
      timestamp: true,
      metadata: true,
    },
  });

  // Fetch client errors for this assessment
  const clientErrors = await db.clientError.findMany({
    where: { assessmentId: id },
    orderBy: { timestamp: "asc" },
    select: {
      id: true,
      errorType: true,
      message: true,
      stackTrace: true,
      componentName: true,
      url: true,
      timestamp: true,
      metadata: true,
    },
  });

  // Fetch coworker info for voice sessions (VoiceSession has no Coworker relation)
  const voiceCoworkerIds = [
    ...new Set(assessment.voiceSessions.map((vs) => vs.coworkerId)),
  ];
  const voiceCoworkers =
    voiceCoworkerIds.length > 0
      ? await db.coworker.findMany({
          where: { id: { in: voiceCoworkerIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
  const coworkerMap = new Map(voiceCoworkers.map((c) => [c.id, c]));

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
    conversations: assessment.conversations.map((conv) => ({
      ...conv,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    })),
    voiceSessions: assessment.voiceSessions.map((vs) => ({
      ...vs,
      startTime: vs.startTime.toISOString(),
      endTime: vs.endTime?.toISOString() ?? null,
      coworker: coworkerMap.get(vs.coworkerId) ?? {
        id: vs.coworkerId,
        name: "Unknown",
        role: "Unknown",
      },
    })),
  };

  const serializedClientErrors = clientErrors.map((err) => ({
    ...err,
    timestamp: err.timestamp.toISOString(),
    createdAt: undefined,
  }));

  const serializedCandidateEvents = candidateEvents.map((evt) => ({
    ...evt,
    timestamp: evt.timestamp.toISOString(),
  }));

  return (
    <AssessmentTimelineClient
      assessment={serializedAssessment}
      clientErrors={serializedClientErrors}
      candidateEvents={serializedCandidateEvents}
    />
  );
}
