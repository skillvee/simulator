/**
 * POST /api/recruiter/simulations/[id]/publish
 *
 * Flips `isPublished=true` for a v2 scenario. Hard-gates on
 * `resourcePipelineMeta.status === "passed"` — no exceptions.
 *
 * v1 scenarios are not publishable through this route (they're auto-published
 * at creation). Returns 400 for v1.
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";
import type { ResourcePipelineMeta } from "@/types";

const logger = createLogger("api:recruiter:publish");

interface SessionUser {
  id: string;
  role?: string;
}

export async function POST(
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
      id: true,
      createdById: true,
      pipelineVersion: true,
      resourcePipelineMeta: true,
      isPublished: true,
    },
  });

  if (!scenario) return error("Scenario not found", 404);
  if (scenario.createdById !== user.id && user.role !== "ADMIN") {
    return error("Not authorized", 403);
  }

  if (scenario.pipelineVersion !== "v2") {
    return error("Publish route is v2-only; v1 scenarios are auto-published", 400);
  }

  const meta = scenario.resourcePipelineMeta as unknown as
    | ResourcePipelineMeta
    | null;

  if (!meta || meta.status !== "passed") {
    return error(
      `Cannot publish: pipeline status is "${meta?.status ?? "unknown"}", expected "passed"`,
      400,
      "PIPELINE_NOT_PASSED"
    );
  }

  if (scenario.isPublished) {
    return success({ scenarioId: scenario.id, isPublished: true, alreadyPublished: true });
  }

  try {
    await db.scenario.update({
      where: { id: scenario.id },
      data: { isPublished: true },
    });
    logger.info("Scenario published", { scenarioId: scenario.id });
    return success({ scenarioId: scenario.id, isPublished: true });
  } catch (err) {
    logger.error("Publish failed", { scenarioId: scenario.id, err: String(err) });
    return error("Publish failed", 500);
  }
}
