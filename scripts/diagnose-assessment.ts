/**
 * Dump everything we know about an assessment's report pipeline.
 * Usage: npx tsx scripts/diagnose-assessment.ts <assessmentId>
 */
import { db } from "../src/server/db";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: tsx scripts/diagnose-assessment.ts <assessmentId>");
    process.exit(1);
  }

  const assessment = await db.assessment.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      completedAt: true,
      workingStartedAt: true,
      report: true,
      scenario: { select: { name: true, companyName: true, taskDescription: true } },
      recordings: {
        select: {
          id: true,
          type: true,
          storageUrl: true,
          segments: {
            select: { segmentIndex: true, chunkPaths: true },
            orderBy: { segmentIndex: "asc" },
          },
        },
      },
      videoAssessment: {
        include: {
          summary: { select: { id: true, overallSummary: true } },
          scores: { select: { dimension: true, score: true } },
          logs: {
            select: { eventType: true, timestamp: true, metadata: true },
            orderBy: { timestamp: "desc" },
            take: 30,
          },
          apiCalls: {
            select: {
              requestTimestamp: true,
              responseTimestamp: true,
              statusCode: true,
              errorMessage: true,
              modelVersion: true,
              promptTokens: true,
              responseTokens: true,
            },
            orderBy: { requestTimestamp: "desc" },
            take: 10,
          },
        },
      },
    },
  });

  if (!assessment) {
    console.error("Assessment not found:", id);
    process.exit(1);
  }

  console.log("\n=== ASSESSMENT ===");
  console.log({
    id: assessment.id,
    status: assessment.status,
    userId: assessment.userId,
    startedAt: assessment.startedAt,
    completedAt: assessment.completedAt,
    workingStartedAt: assessment.workingStartedAt,
    reportStored: !!assessment.report,
    scenario: assessment.scenario,
  });

  console.log("\n=== RECORDINGS ===");
  for (const r of assessment.recordings) {
    console.log({
      id: r.id,
      type: r.type,
      storageUrl: r.storageUrl?.slice(0, 120) + (r.storageUrl && r.storageUrl.length > 120 ? "…" : ""),
      segmentCount: r.segments.length,
      totalChunks: r.segments.reduce((acc, s) => acc + s.chunkPaths.length, 0),
      segments: r.segments.map((s) => ({ idx: s.segmentIndex, chunks: s.chunkPaths.length })),
    });
  }

  console.log("\n=== VIDEO ASSESSMENT ===");
  if (!assessment.videoAssessment) {
    console.log("NO VideoAssessment row exists");
  } else {
    const v = assessment.videoAssessment;
    console.log({
      id: v.id,
      status: v.status,
      createdAt: v.createdAt,
      completedAt: v.completedAt,
      retryCount: v.retryCount,
      lastFailureReason: v.lastFailureReason,
      hasSummary: !!v.summary,
      scoreCount: v.scores.length,
    });

    console.log("\n=== RECENT VIDEO ASSESSMENT LOGS (newest first) ===");
    for (const log of v.logs) {
      console.log(
        `[${log.timestamp.toISOString()}] ${log.eventType}`,
        log.metadata ? JSON.stringify(log.metadata) : ""
      );
    }

    console.log("\n=== RECENT API CALLS (newest first) ===");
    for (const call of v.apiCalls) {
      console.log({
        requestTimestamp: call.requestTimestamp,
        responseTimestamp: call.responseTimestamp,
        modelVersion: call.modelVersion,
        statusCode: call.statusCode,
        promptTokens: call.promptTokens,
        responseTokens: call.responseTokens,
        errorMessage: call.errorMessage?.slice(0, 500),
      });
    }
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
