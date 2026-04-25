/**
 * Seed: data archetypes for the v2 resource pipeline.
 *
 * Adds DATA_ANALYST and DATA_SCIENTIST rows to the Archetype table along with
 * weighted dimensions (mirroring `archetype-weights.ts`) and seniority gates
 * (mirroring `seniority-thresholds.ts`). DATA_ENGINEER already exists; this
 * script is idempotent so re-running it is safe.
 *
 * Run: npx tsx scripts/seed-data-archetypes.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA_ROLE_FAMILY_SLUG = "data_science";

const ARCHETYPE_SEEDS = [
  {
    slug: "data-analyst",
    name: "Data Analyst",
    description:
      "Translates business questions into SQL/spreadsheet/notebook analyses. Strong on communication, problem-solving, and technical fluency with the data stack.",
  },
  {
    slug: "data-scientist",
    name: "Data Scientist",
    description:
      "Designs experiments and models, frames problems statistically, and communicates findings. Strong on creativity, problem-solving, and technical depth.",
  },
];

async function main() {
  const family = await prisma.roleFamily.findUnique({
    where: { slug: DATA_ROLE_FAMILY_SLUG },
  });

  if (!family) {
    throw new Error(
      `RoleFamily "${DATA_ROLE_FAMILY_SLUG}" not found — run prisma/seed-rubrics.ts first.`
    );
  }

  for (const seed of ARCHETYPE_SEEDS) {
    const existing = await prisma.archetype.findUnique({
      where: { slug: seed.slug },
    });

    if (existing) {
      console.log(`  ↺ Archetype "${seed.slug}" already exists (id=${existing.id}), skipping`);
      continue;
    }

    const created = await prisma.archetype.create({
      data: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        roleFamilyId: family.id,
      },
    });
    console.log(`  ✓ Created archetype "${seed.slug}" (id=${created.id})`);
  }
}

main()
  .catch((err) => {
    console.error("seed-data-archetypes failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
