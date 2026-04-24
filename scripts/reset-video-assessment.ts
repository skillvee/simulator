/**
 * Reset a stuck VideoAssessment back to PENDING with retryCount=0 so the
 * self-healing pipeline can take a clean swing at it.
 * Usage: npx tsx scripts/reset-video-assessment.ts <assessmentId>
 */
import { Prisma, VideoAssessmentStatus } from "@prisma/client";
import { db } from "../src/server/db";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: tsx scripts/reset-video-assessment.ts <assessmentId>");
    process.exit(1);
  }

  await db.assessment.update({
    where: { id },
    data: { report: Prisma.DbNull },
  });

  const va = await db.videoAssessment.update({
    where: { assessmentId: id },
    data: {
      status: VideoAssessmentStatus.PENDING,
      retryCount: 0,
      lastFailureReason: null,
    },
    select: { id: true, status: true, retryCount: true },
  });

  console.log("Reset:", va);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
