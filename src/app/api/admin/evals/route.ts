/**
 * GET /api/admin/evals — List all eval runs
 * POST /api/admin/evals — Trigger a new eval run (background)
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return error("Unauthorized", 401);

  const runs = await db.evalRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      results: {
        select: {
          scenarioId: true,
          scenarioName: true,
          category: true,
          overallScore: true,
          flagged: true,
        },
      },
    },
  });

  return success(runs);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return error("Unauthorized", 401);

  // Note: actual eval execution happens via CLI or background job
  // This endpoint just creates a placeholder run for tracking
  const body = await request.json().catch(() => ({}));

  const run = await db.evalRun.create({
    data: {
      name: body.name || `eval-${new Date().toISOString().slice(0, 16)}`,
      promptVersion: "production",
      model: "gemini-3-flash-preview",
      status: "pending",
      scenarioCount: 15,
    },
  });

  return success(run);
}
