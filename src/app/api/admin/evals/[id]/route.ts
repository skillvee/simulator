/**
 * GET /api/admin/evals/[id] — Get full eval run details with all results
 *
 * Returns everything a Claude Code session needs to analyze results:
 * - All scenario results with prompts, responses, scores, judge reasoning
 * - Aggregated scores and flagged scenarios
 */

import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return error("Unauthorized", 401);

  const { id } = await params;

  const run = await db.evalRun.findUnique({
    where: { id },
    include: {
      results: {
        orderBy: { scenarioId: "asc" },
      },
    },
  });

  if (!run) return error("Eval run not found", 404);

  // Compute category breakdowns
  const categories = new Map<string, { count: number; totalScore: number }>();
  for (const result of run.results) {
    const cat = categories.get(result.category) || { count: 0, totalScore: 0 };
    cat.count++;
    cat.totalScore += result.overallScore || 0;
    categories.set(result.category, cat);
  }

  const categoryBreakdown = Object.fromEntries(
    Array.from(categories.entries()).map(([cat, data]) => [
      cat,
      { count: data.count, averageScore: Math.round((data.totalScore / data.count) * 100) / 100 },
    ])
  );

  // Dimension averages
  const dims = ["naturalness", "roleAccuracy", "brevity", "contextAwareness", "infoDiscipline", "aiIsms"] as const;
  const dimensionAverages: Record<string, number> = {};
  for (const dim of dims) {
    const values = run.results.map((r) => (r[dim] as number) || 0);
    dimensionAverages[dim] = values.length > 0
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
      : 0;
  }

  return success({
    ...run,
    categoryBreakdown,
    dimensionAverages,
    flaggedCount: run.results.filter((r) => r.flagged).length,
  });
}
