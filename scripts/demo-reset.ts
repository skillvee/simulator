/**
 * Demo reset CLI — wipe and recreate the fresh demo assessment.
 *
 * Thin wrapper around `resetDemoAssessment()` so the CLI and the admin HTTP
 * endpoint (POST /api/demo/reset) run identical logic. See that helper for
 * details on what gets wiped and preserved.
 *
 * Run: npm run demo:reset
 */

import { PrismaClient } from "@prisma/client";
import { resetDemoAssessment } from "../src/lib/core/demo-reset";

const prisma = new PrismaClient();

async function main() {
  const result = await resetDemoAssessment(prisma);
  console.log(
    `✅ Reset ${result.assessmentId} — starts at WELCOME, timer waits for "Start Simulation".`
  );
  console.log(`   URL: ${result.welcomeUrl}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
