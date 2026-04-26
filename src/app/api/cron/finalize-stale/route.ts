import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { env } from "@/lib/core/env";
import { finalizeAssessment } from "@/lib/analysis/finalize-assessment";
import { isAssessmentHardExpired } from "@/lib/core/assessment-timer";
import { AssessmentStatus } from "@prisma/client";
import type { SimulationDepth } from "@/types";

const logger = createLogger("api:cron:finalize-stale");

/**
 * GET /api/cron/finalize-stale
 *
 * Vercel cron entrypoint. Catches abandoned assessments that the work-page
 * hard-expiry guard never finalizes — candidates whose tab idles past the
 * cap+grace window without reloading or navigating. For each stale row we
 * call the same `finalizeAssessment` helper /api/assessment/finalize uses,
 * so analysis (recording merge, video evaluation, profile photo) actually
 * runs instead of leaving the row stuck mid-pipeline.
 *
 * Active walkthroughs (within `STALE_WALKTHROUGH_GRACE_MS`) are excluded so
 * we don't yank a candidate out of a live call. Already-COMPLETED rows are
 * filtered before the helper to keep the cron fast — the helper itself is
 * idempotent, but listing them is wasted work.
 */
export async function GET(request: Request) {
  // Vercel cron auto-attaches `Authorization: Bearer ${CRON_SECRET}`. Fail
  // closed: outside `NODE_ENV=development` we *require* the secret to be set
  // — otherwise this route (which middleware marks public) would be an
  // unauthenticated trigger surface for finalize sweeps on every deploy
  // where someone forgot the env var.
  const expected = env.CRON_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV !== "development") {
      logger.error("CRON_SECRET not configured — refusing to run cron");
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }
    // Dev-only: skip auth so the route can be exercised locally.
  } else {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Active-walkthrough exclusion window — must match work/page.tsx so the
  // two paths agree on what "stale" means.
  const STALE_WALKTHROUGH_GRACE_MS = 30 * 60 * 1000;
  const now = Date.now();

  const candidates = await db.assessment.findMany({
    where: {
      status: {
        in: [
          AssessmentStatus.REVIEW_MATERIALS,
          AssessmentStatus.KICKOFF_CALL,
          AssessmentStatus.WORKING,
          AssessmentStatus.WALKTHROUGH_CALL,
        ],
      },
      workingStartedAt: { not: null },
    },
    select: {
      id: true,
      status: true,
      workingStartedAt: true,
      walkthroughStartedAt: true,
      scenario: { select: { simulationDepth: true } },
    },
  });

  const stale = candidates.filter((a) => {
    const depth = (a.scenario.simulationDepth || "medium") as SimulationDepth;
    if (!isAssessmentHardExpired(a.workingStartedAt, depth)) return false;
    const walkthroughIsActive =
      a.status === AssessmentStatus.WALKTHROUGH_CALL &&
      a.walkthroughStartedAt !== null &&
      now - a.walkthroughStartedAt.getTime() < STALE_WALKTHROUGH_GRACE_MS;
    return !walkthroughIsActive;
  });

  logger.info("Finalize-stale sweep", {
    scanned: String(candidates.length),
    stale: String(stale.length),
  });

  const results = await Promise.allSettled(
    stale.map(async (a) => {
      const result = await finalizeAssessment(a.id);
      return { id: a.id, status: a.status, result };
    })
  );

  const finalized: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  for (const r of results) {
    if (r.status === "rejected") {
      failed.push({ id: "unknown", reason: String(r.reason) });
      continue;
    }
    const { id, result } = r.value;
    if (result.ok) {
      finalized.push(id);
    } else {
      failed.push({ id, reason: `${result.code}: ${result.message}` });
    }
  }

  if (failed.length) {
    logger.warn("Finalize-stale: some rows failed", {
      failed: String(failed.length),
      finalized: String(finalized.length),
    });
  }

  return NextResponse.json({
    scanned: candidates.length,
    stale: stale.length,
    finalized: finalized.length,
    failed: failed.length,
    failures: failed,
  });
}
