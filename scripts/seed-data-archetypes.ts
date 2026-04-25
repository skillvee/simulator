/**
 * Seed verification: data archetypes for the v2 resource pipeline.
 *
 * The rubric seed (prisma/seed-rubrics.ts) already creates `data_analyst`,
 * `data_scientist`, and `analytics_engineer` rows. This script just verifies
 * they exist; it does NOT insert duplicates with a different slug format.
 *
 * Run: npx tsx scripts/seed-data-archetypes.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REQUIRED_SLUGS = ["data_analyst", "data_scientist", "analytics_engineer"];

async function main() {
  const rows = await prisma.archetype.findMany({
    where: { slug: { in: REQUIRED_SLUGS } },
    select: { slug: true, name: true },
  });

  const found = new Set(rows.map((r) => r.slug));
  const missing = REQUIRED_SLUGS.filter((s) => !found.has(s));

  for (const r of rows) {
    console.log(`  ✓ ${r.slug} — ${r.name}`);
  }

  if (missing.length > 0) {
    console.error(
      `  ✗ Missing required archetypes: ${missing.join(", ")}\n` +
        `    Run prisma/seed-rubrics.ts first to seed the rubric system.`
    );
    process.exit(1);
  }

  console.log(`\nAll ${REQUIRED_SLUGS.length} v2 data archetypes present.`);
}

main()
  .catch((err) => {
    console.error("seed-data-archetypes failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
