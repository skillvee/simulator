import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createSpanishAssessment() {
  // Get the test user
  const user = await prisma.user.findUnique({
    where: { email: "user@test.com" },
  });

  if (!user) {
    console.error("Test user not found");
    return;
  }

  // Create assessment for Spanish scenario
  const assessment = await prisma.assessment.create({
    data: {
      id: "test-spanish-assessment",
      userId: user.id,
      scenarioId: "test-scenario-mobile", // This is our Spanish scenario
      status: "WELCOME",
    },
    select: {
      id: true,
      scenario: {
        select: {
          name: true,
          language: true,
        },
      },
    },
  });

  console.log("Created Spanish assessment:", assessment);
  console.log("Test URLs:");
  console.log("  English (should redirect): http://localhost:3000/en/assessments/test-spanish-assessment/welcome");
  console.log("  Spanish (no redirect):     http://localhost:3000/es/assessments/test-spanish-assessment/welcome");

  await prisma.$disconnect();
}

createSpanishAssessment().catch(console.error);