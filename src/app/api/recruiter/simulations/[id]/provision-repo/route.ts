/**
 * POST /api/recruiter/simulations/[id]/provision-repo
 *
 * Background repository provisioning endpoint (US-007).
 * Creates a new GitHub repository from a template for a simulation.
 *
 * This endpoint is designed to be called asynchronously after scenario creation
 * to avoid blocking the save operation.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { selectTemplate, provisionRepo } from "@/lib/scenarios/repo-templates";

interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const scenarioId = params.id;

  if (!scenarioId) {
    return NextResponse.json(
      { error: "scenarioId is required" },
      { status: 400 }
    );
  }

  // Verify scenario exists and user has access
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      id: true,
      createdById: true,
      techStack: true,
      repoUrl: true,
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

  // Parse request body to get optional templateId
  let templateId: string | undefined;
  try {
    const body = await request.json();
    templateId = body.templateId;
  } catch {
    // Body is optional - if not provided, we'll auto-select based on tech stack
  }

  // Select template based on tech stack if not explicitly provided
  if (!templateId) {
    const selectedTemplate = selectTemplate(scenario.techStack);
    templateId = selectedTemplate.id;
  }

  // Provision the repository (this runs in the background)
  // We don't await the full generation to return a quick response
  // The generation continues asynchronously
  const provisionPromise = provisionRepo(scenarioId, templateId);

  // For now, we wait for completion and return results
  // In a production system, you might use a job queue instead
  try {
    const repoUrl = await provisionPromise;

    if (!repoUrl) {
      return NextResponse.json(
        {
          error: "Repository provisioning failed",
          details: "GitHub API returned an error or GITHUB_ORG_TOKEN is not set",
        },
        { status: 500 }
      );
    }

    // Update the scenario with the new repo URL
    await db.scenario.update({
      where: { id: scenarioId },
      data: { repoUrl },
    });

    return NextResponse.json({
      success: true,
      message: "Repository provisioned successfully",
      repoUrl,
      templateId,
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
