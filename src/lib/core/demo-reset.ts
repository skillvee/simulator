import { AssessmentStatus, type PrismaClient } from "@prisma/client";

export const DEMO_USER_EMAIL = "demo@test.com";
export const DEMO_ASSESSMENT_ID = "demo-assessment";
export const DEMO_COMPLETED_ASSESSMENT_ID = "demo-completed-assessment";

export interface ResetDemoResult {
  assessmentId: string;
  status: AssessmentStatus;
  welcomeUrl: string;
  resultsUrl: string;
}

/**
 * Wipe and recreate the fresh live-demo assessment.
 *
 * Cascading deletes on Assessment remove all chat messages, conversations,
 * recordings, voice sessions, api call logs, etc. The new row starts at
 * WELCOME so the walkthrough begins on the intro screen; the 90-min timer
 * doesn't start until the candidate clicks "Start Simulation". Leaves
 * `demo-completed-assessment` untouched so the polished results demo is
 * unaffected.
 *
 * Callers: scripts/demo-reset.ts (CLI) and /api/demo/reset (admin HTTP).
 */
export async function resetDemoAssessment(
  prisma: PrismaClient
): Promise<ResetDemoResult> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });
  if (!user) {
    throw new Error(
      `Demo user ${DEMO_USER_EMAIL} not found. Seed the database first.`
    );
  }

  const existing = await prisma.assessment.findUnique({
    where: { id: DEMO_ASSESSMENT_ID },
    select: { scenarioId: true },
  });

  // Preserve the scenario from the existing assessment when possible — that's
  // what the seed originally wired up. Fall back to any scenario so this stays
  // runnable on a fresh DB where the demo row somehow never existed.
  const scenarioId =
    existing?.scenarioId ??
    (await prisma.scenario.findFirst({ select: { id: true } }))?.id;
  if (!scenarioId) {
    throw new Error("No scenarios exist. Seed the database first.");
  }

  if (existing) {
    await prisma.assessment.delete({ where: { id: DEMO_ASSESSMENT_ID } });
  }

  await prisma.assessment.create({
    data: {
      id: DEMO_ASSESSMENT_ID,
      userId: user.id,
      scenarioId,
      status: AssessmentStatus.WELCOME,
      workingStartedAt: null,
    },
  });

  return {
    assessmentId: DEMO_ASSESSMENT_ID,
    status: AssessmentStatus.WELCOME,
    welcomeUrl: `/assessments/${DEMO_ASSESSMENT_ID}/welcome`,
    resultsUrl: `/assessments/${DEMO_COMPLETED_ASSESSMENT_ID}/results`,
  };
}
