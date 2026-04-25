/**
 * GET /api/assessment/[id]/data-file/[fileId]
 *
 * Auth-checked redirect to a short-lived Supabase signed URL for a scenario
 * data file. The candidate clicks the download link in the sidebar; this route
 * verifies they own the assessment and that the file belongs to its scenario,
 * then 302s to a 60-minute signed URL.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { error } from "@/lib/api";
import { getSignedScenarioFileUrl } from "@/lib/external/scenario-data-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id: assessmentId, fileId } = await params;

  const session = await auth();
  if (!session?.user) return error("Unauthorized", 401);
  const userId = (session.user as { id?: string }).id;
  if (!userId) return error("Unauthorized", 401);

  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, userId: true, scenarioId: true },
  });

  if (!assessment) return error("Assessment not found", 404);
  if (assessment.userId !== userId) return error("Not authorized", 403);

  const file = await db.scenarioDataFile.findUnique({
    where: { id: fileId },
    select: { id: true, scenarioId: true, storagePath: true, filename: true },
  });

  if (!file) return error("Data file not found", 404);
  if (file.scenarioId !== assessment.scenarioId) {
    return error("Data file does not belong to this assessment", 403);
  }

  try {
    const signedUrl = await getSignedScenarioFileUrl(file.storagePath, 60 * 60);
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err) {
    return error(
      `Failed to sign URL: ${err instanceof Error ? err.message : String(err)}`,
      500
    );
  }
}
