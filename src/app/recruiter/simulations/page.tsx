import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { SimulationsTableClient } from "./client";

export interface SimulationManageData {
  id: string;
  name: string;
  companyName: string;
  createdAt: string;
  isPublished: boolean;
  candidateCount: number;
  repoUrl: string | null;
  targetLevel: string;
}

async function getSimulations(
  recruiterId: string
): Promise<SimulationManageData[]> {
  const scenarios = await db.scenario.findMany({
    where: { createdById: recruiterId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      companyName: true,
      createdAt: true,
      isPublished: true,
      repoUrl: true,
      targetLevel: true,
      _count: {
        select: { assessments: true },
      },
    },
  });

  return scenarios.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    companyName: scenario.companyName,
    createdAt: scenario.createdAt.toISOString(),
    isPublished: scenario.isPublished,
    candidateCount: scenario._count.assessments,
    repoUrl: scenario.repoUrl,
    targetLevel: scenario.targetLevel ?? "mid",
  }));
}

export default async function RecruiterSimulationsPage() {
  const user = await requireRecruiter();
  const simulations = await getSimulations(user.id);

  return <SimulationsTableClient simulations={simulations} />;
}
