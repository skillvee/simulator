import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { RecruiterScenariosClient } from "./client";

/**
 * Fetch scenarios owned by the recruiter with assessment counts
 */
async function getRecruiterScenarios(recruiterId: string) {
  const scenarios = await db.scenario.findMany({
    where: { createdById: recruiterId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      companyName: true,
      techStack: true,
      createdAt: true,
      _count: {
        select: { assessments: true },
      },
    },
  });

  return scenarios.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    companyName: scenario.companyName,
    techStack: scenario.techStack,
    createdAt: scenario.createdAt.toISOString(),
    assessmentCount: scenario._count.assessments,
  }));
}

export default async function RecruiterScenariosPage() {
  const user = await requireRecruiter();
  const scenarios = await getRecruiterScenarios(user.id);

  return <RecruiterScenariosClient scenarios={scenarios} />;
}
