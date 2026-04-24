import { db } from "../src/server/db";

async function main() {
  const id = process.argv[2];
  const va = await db.videoAssessment.findUnique({
    where: { assessmentId: id },
    include: {
      summary: { select: { rawAiResponse: true, overallSummary: true, updatedAt: true } },
      scores: true,
    },
  });
  if (!va) {
    console.log("no VA");
    process.exit(1);
  }
  console.log("VA status:", va.status, "completedAt:", va.completedAt, "retryCount:", va.retryCount);
  console.log("Summary updatedAt:", va.summary?.updatedAt);
  console.log("Summary overallSummary length:", va.summary?.overallSummary?.length);
  console.log("Score count:", va.scores.length);
  if (va.summary) {
    const raw = va.summary.rawAiResponse as Record<string, unknown> | null;
    console.log("rawAiResponse type:", typeof raw, "isNull:", raw === null);
    if (raw && typeof raw === "object") {
      console.log("Top-level keys:", Object.keys(raw));
      console.log("Stringified length:", JSON.stringify(raw).length);
    }
  }
  await db.$disconnect();
}
main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
