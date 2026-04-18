import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateScenarioLanguage() {
  const scenario = await prisma.scenario.update({
    where: { id: "test-scenario-mobile" },
    data: {
      language: "es",
    },
    select: {
      id: true,
      name: true,
      language: true,
    },
  });

  console.log("Updated mobile scenario to Spanish:", scenario);

  await prisma.$disconnect();
}

updateScenarioLanguage().catch(console.error);