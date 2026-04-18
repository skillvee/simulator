import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkScenarioLanguage() {
  const scenario = await prisma.scenario.findUnique({
    where: { id: "test-scenario-mobile" },
    select: {
      id: true,
      name: true,
      language: true,
    },
  });

  console.log("Mobile scenario:", scenario);

  await prisma.$disconnect();
}

checkScenarioLanguage().catch(console.error);