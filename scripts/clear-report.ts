import { Prisma } from "@prisma/client";
import { db } from "../src/server/db";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: tsx scripts/clear-report.ts <assessmentId>");
    process.exit(1);
  }
  const before = await db.assessment.findUnique({
    where: { id },
    select: { id: true, report: true },
  });
  if (!before) {
    console.error("Assessment not found:", id);
    process.exit(1);
  }
  console.log("Before: report is", before.report ? "SET" : "null");
  await db.assessment.update({ where: { id }, data: { report: Prisma.JsonNull } });
  const after = await db.assessment.findUnique({
    where: { id },
    select: { report: true },
  });
  console.log("After:  report is", after?.report ? "SET" : "null");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
