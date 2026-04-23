/**
 * Backfill embeddings for COMPLETED VideoAssessments that are missing them.
 *
 * Usage:
 *   tsx scripts/backfill-embeddings.ts                # dry run: list missing
 *   tsx scripts/backfill-embeddings.ts --run          # backfill all missing
 *   tsx scripts/backfill-embeddings.ts <id>           # backfill one specific id
 */
import { db } from "../src/server/db";
import { generateAndStoreEmbeddings } from "../src/lib/candidate/embeddings";

async function findMissing(): Promise<string[]> {
  const rows = await db.videoAssessment.findMany({
    where: {
      status: "COMPLETED",
      embeddings: null,
      summary: { isNot: null },
      scores: { some: {} },
    },
    select: { id: true, candidateId: true, completedAt: true },
    orderBy: { completedAt: "desc" },
  });
  console.log(`Found ${rows.length} completed VideoAssessments missing embeddings:`);
  for (const r of rows) {
    console.log(`  ${r.id}  candidate=${r.candidateId}  completedAt=${r.completedAt?.toISOString() ?? "n/a"}`);
  }
  return rows.map((r) => r.id);
}

async function backfillOne(id: string): Promise<boolean> {
  process.stdout.write(`  ${id} ... `);
  const result = await generateAndStoreEmbeddings(id);
  if (result.success) {
    console.log("ok");
    return true;
  }
  console.log(`FAILED: ${result.error}`);
  return false;
}

async function main() {
  const arg = process.argv[2];

  if (arg && arg !== "--run") {
    // Single-id mode
    const ok = await backfillOne(arg);
    process.exit(ok ? 0 : 1);
  }

  const ids = await findMissing();
  if (ids.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  if (arg !== "--run") {
    console.log("\nDry run. Re-run with --run to backfill.");
    return;
  }

  console.log("\nBackfilling...");
  let ok = 0;
  let fail = 0;
  for (const id of ids) {
    const success = await backfillOne(id);
    success ? ok++ : fail++;
  }
  console.log(`\nDone: ${ok} succeeded, ${fail} failed`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
