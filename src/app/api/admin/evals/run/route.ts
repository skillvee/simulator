/**
 * POST /api/admin/evals/run — Trigger a full eval run from the admin panel
 *
 * Creates an eval run, executes all scenarios in the background,
 * and stores results. The client polls GET /api/admin/evals/[id] for status.
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { runEvalSuite } from "@/lib/evals/runner";
import { env } from "@/lib/core/env";
import type { Prisma } from "@prisma/client";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return error("Unauthorized", 401);

  // Check admin role
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== "ADMIN") return error("Admin access required", 403);

  const name = `eval-${new Date().toISOString().slice(0, 16).replace("T", "-")}`;

  // Create the run record
  const evalRun = await db.evalRun.create({
    data: {
      name,
      promptVersion: "production",
      model: "gemini-3-flash-preview",
      status: "running",
      scenarioCount: 15,
    },
  });

  // Run evals in background (don't await — return immediately)
  runEvalsBackground(evalRun.id, name).catch((err) => {
    console.error("Background eval failed:", err);
  });

  return success({ id: evalRun.id, name, status: "running" });
}

async function runEvalsBackground(evalRunId: string, name: string) {
  try {
    const { results, overallScore, promptVersion } = await runEvalSuite(
      { name, verbose: false },
      { apiKey: env.GEMINI_API_KEY }
    );

    // Store results
    for (const result of results) {
      await db.evalResult.create({
        data: {
          evalRunId,
          scenarioId: result.scenarioId,
          scenarioName: result.scenarioName,
          category: result.category,
          prompt: result.prompt,
          userMessage: result.userMessage,
          response: result.response,
          generationMs: result.generationMs,
          judgments: result.judgments as unknown as Prisma.InputJsonValue,
          naturalness: result.naturalness,
          roleAccuracy: result.roleAccuracy,
          brevity: result.brevity,
          contextAwareness: result.contextAwareness,
          infoDiscipline: result.infoDiscipline,
          aiIsms: result.aiIsms,
          overallScore: result.overallScore,
          flagged: result.flagged,
        },
      });
    }

    await db.evalRun.update({
      where: { id: evalRunId },
      data: {
        status: "completed",
        overallScore,
        promptVersion,
        completedAt: new Date(),
        scenarioCount: results.length,
      },
    });
  } catch (err) {
    await db.evalRun.update({
      where: { id: evalRunId },
      data: { status: "failed" },
    });
    throw err;
  }
}
