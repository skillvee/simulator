/**
 * GET /api/recruiter/simulations/[id]/resource-pipeline
 *
 * Returns the current `resourcePipelineMeta` for a scenario so the recruiter
 * UI can poll for status updates while artifacts generate.
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import type { ResourcePipelineMeta } from "@/types";

interface SessionUser {
  id: string;
  role?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) return error("Unauthorized", 401);
  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const scenario = await db.scenario.findUnique({
    where: { id },
    select: {
      createdById: true,
      pipelineVersion: true,
      resourcePipelineMeta: true,
      isPublished: true,
      docs: true,
      repoUrl: true,
      dataFiles: {
        select: {
          id: true,
          filename: true,
          rowCount: true,
          byteSize: true,
        },
      },
    },
  });

  if (!scenario) return error("Scenario not found", 404);
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return error("Not authorized", 403);
  }

  const pipelineMeta = scenario.resourcePipelineMeta as unknown as
    | ResourcePipelineMeta
    | null;

  return success({
    pipelineVersion: scenario.pipelineVersion,
    pipelineMeta,
    isPublished: scenario.isPublished,
    docCount: Array.isArray(scenario.docs) ? scenario.docs.length : 0,
    dataFiles: scenario.dataFiles,
    repoUrl: scenario.repoUrl,
  });
}
