import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { ScenarioDetailClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Fetch scenario with coworkers and assessment count
 * Only returns if scenario belongs to current recruiter (or user is ADMIN)
 */
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
      createdById: true,
      createdAt: true,
      coworkers: {
        select: {
          id: true,
          name: true,
          role: true,
          voiceName: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { assessments: true },
      },
    },
  });

  if (!scenario) {
    return null;
  }

  // Check access: scenario must belong to current user OR user is ADMIN
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
    createdAt: scenario.createdAt.toISOString(),
    coworkers: scenario.coworkers,
    assessmentCount: scenario._count.assessments,
  };
}

export default async function ScenarioDetailPage({ params }: PageProps) {
  const user = await requireRecruiter();
  const { id } = await params;

  const scenario = await getScenarioDetails(id, user.id, user.role || "USER");

  if (!scenario) {
    notFound();
  }

  return <ScenarioDetailClient scenario={scenario} />;
}
