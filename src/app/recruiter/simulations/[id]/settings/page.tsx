import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { SimulationSettingsClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getScenarioDetails(scenarioId: string, userId: string, userRole: string) {
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      id: true,
      name: true,
      companyName: true,
      companyDescription: true,
      taskDescription: true,
      repoUrl: true,
      techStack: true,
      targetLevel: true,
      createdById: true,
      createdAt: true,
      archetype: {
        select: {
          name: true,
          roleFamily: { select: { name: true } },
        },
      },
      coworkers: {
        select: {
          id: true,
          name: true,
          role: true,
          voiceName: true,
          avatarUrl: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { assessments: true },
      },
    },
  });

  if (!scenario) return null;

  if (scenario.createdById !== userId && userRole !== "ADMIN") {
    return null;
  }

  return {
    id: scenario.id,
    name: scenario.name,
    companyName: scenario.companyName,
    companyDescription: scenario.companyDescription,
    taskDescription: scenario.taskDescription,
    repoUrl: scenario.repoUrl,
    techStack: scenario.techStack,
    targetLevel: scenario.targetLevel,
    archetypeName: scenario.archetype?.name ?? null,
    roleFamilyName: scenario.archetype?.roleFamily.name ?? null,
    createdAt: scenario.createdAt.toISOString(),
    coworkers: scenario.coworkers,
    assessmentCount: scenario._count.assessments,
  };
}

export default async function SimulationSettingsPage({ params }: PageProps) {
  const user = await requireRecruiter();
  const { id } = await params;

  const scenario = await getScenarioDetails(id, user.id, user.role || "USER");

  if (!scenario) {
    notFound();
  }

  return <SimulationSettingsClient scenario={scenario} />;
}
