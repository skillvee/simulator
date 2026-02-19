/**
 * POST /api/recruiter/simulations/[id]/provision-repo
 *
 * Repository provisioning endpoint (US-007).
 * Uses AI to generate a complete, domain-specific GitHub repository
 * based on the scenario's company, tech stack, task, and coworkers.
 *
 * The generated repo is built on top of a clean scaffold, ensuring
 * npm install && npm run build always works.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { provisionRepo, needsRepo } from "@/lib/scenarios/repo-templates";
import type { ScenarioMetadata } from "@/lib/scenarios/repo-spec";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Authenticate user
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;

  // Only allow recruiters and admins
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Recruiter access required" },
      { status: 403 }
    );
  }

  const scenarioId = id;

  if (!scenarioId) {
    return NextResponse.json(
      { error: "scenarioId is required" },
      { status: 400 }
    );
  }

  // Fetch full scenario with coworkers for AI generation
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      id: true,
      name: true,
      companyName: true,
      companyDescription: true,
      taskDescription: true,
      techStack: true,
      targetLevel: true,
      repoUrl: true,
      createdById: true,
      coworkers: {
        select: {
          name: true,
          role: true,
          personaStyle: true,
          knowledge: true,
        },
      },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  // Security: Only allow the scenario owner (or admin) to trigger provisioning
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Not authorized to modify this scenario" },
      { status: 403 }
    );
  }

  // If repo already exists, don't provision again
  if (scenario.repoUrl) {
    return NextResponse.json(
      {
        success: true,
        message: "Repository already provisioned",
        repoUrl: scenario.repoUrl,
      },
      { status: 200 }
    );
  }

  // Only provision repos for engineering-related tech stacks
  if (!needsRepo(scenario.techStack)) {
    return NextResponse.json(
      {
        success: true,
        skipped: true,
        reason: "non-engineering",
        message: "Repository not needed for this tech stack",
      },
      { status: 200 }
    );
  }

  // Build scenario metadata for AI generation
  const metadata: ScenarioMetadata = {
    name: scenario.name,
    companyName: scenario.companyName,
    companyDescription: scenario.companyDescription,
    taskDescription: scenario.taskDescription,
    techStack: scenario.techStack,
    targetLevel: scenario.targetLevel,
    coworkers: scenario.coworkers.map((c) => ({
      name: c.name,
      role: c.role,
      personaStyle: c.personaStyle,
      knowledge: (c.knowledge as Array<{
        topic: string;
        triggerKeywords: string[];
        response: string;
        isCritical: boolean;
      }>) || [],
    })),
  };

  try {
    const { repoUrl, repoSpec } = await provisionRepo(scenarioId, metadata);

    if (!repoUrl) {
      return NextResponse.json(
        {
          error: "Repository provisioning failed",
          details:
            "AI generation or GitHub API returned an error. Check GITHUB_ORG_TOKEN and GEMINI_API_KEY.",
        },
        { status: 500 }
      );
    }

    // Update the scenario with the new repo URL and cached spec
    await db.scenario.update({
      where: { id: scenarioId },
      data: {
        repoUrl,
        ...(repoSpec ? { repoSpec: repoSpec as object } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Repository provisioned successfully",
      repoUrl,
    });
  } catch (error) {
    console.error("[Provision Repo API] Provisioning failed:", error);
    return NextResponse.json(
      {
        error: "Repository provisioning failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
