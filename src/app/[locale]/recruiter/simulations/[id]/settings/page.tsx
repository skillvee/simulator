import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { SimulationSettingsClient } from "./client";
import type { ScenarioResource, ResourcePipelineMeta } from "@/types";

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
      resources: true,
      techStack: true,
      targetLevel: true,
      language: true,
      createdById: true,
      createdAt: true,
      isPublished: true,
      pipelineVersion: true,
      resourcePipelineMeta: true,
      archetype: {
        select: {
          name: true,
          slug: true,
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
          gender: true,
          ethnicity: true,
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

  // Slug→branch mapping mirrors the orchestrator. Used to render branch-
  // specific copy on the recruiter UI (e.g. "Building the GitHub repo" vs
  // "Generating CSVs in a Python sandbox") without it depending on whether
  // the artifact has finished generating yet.
  const DATA_SLUGS = new Set([
    "data_analyst",
    "data_scientist",
    "analytics_engineer",
    "ml_engineer",
  ]);
  const slug = scenario.archetype?.slug ?? "";
  const resourceType: "repo" | "data" = DATA_SLUGS.has(slug) ? "data" : "repo";

  return {
    id: scenario.id,
    name: scenario.name,
    companyName: scenario.companyName,
    companyDescription: scenario.companyDescription,
    taskDescription: scenario.taskDescription,
    repoUrl: scenario.repoUrl,
    resources: (scenario.resources as unknown as ScenarioResource[]) ?? [],
    techStack: scenario.techStack,
    targetLevel: scenario.targetLevel,
    language: scenario.language,
    archetypeName: scenario.archetype?.name ?? null,
    roleFamilyName: scenario.archetype?.roleFamily.name ?? null,
    createdAt: scenario.createdAt.toISOString(),
    coworkers: scenario.coworkers,
    assessmentCount: scenario._count.assessments,
    isPublished: scenario.isPublished,
    pipelineVersion: scenario.pipelineVersion,
    resourcePipelineMeta:
      (scenario.resourcePipelineMeta as unknown as ResourcePipelineMeta | null) ?? null,
    resourceType,
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
