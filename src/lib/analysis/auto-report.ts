/**
 * Auto-report generation after video evaluation completes.
 *
 * Called as fire-and-forget from evaluateVideo() so the candidate
 * sees a ready report when they visit the results page.
 */

import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { sendReportEmail, isEmailServiceConfigured } from "@/lib/external";
import {
  calculateTiming,
  countUniqueCoworkers,
  convertRubricToReport,
  reportToPrismaJson,
} from "@/lib/analysis";
import type { RubricAssessmentOutput, AssessmentReport } from "@/types";

const logger = createLogger("analysis:auto-report");

/**
 * Generates and stores the assessment report automatically after video evaluation.
 * Skips if a report already exists.
 */
export async function generateReportForAssessment(
  assessmentId: string,
  evaluation: RubricAssessmentOutput
): Promise<void> {
  // The assessmentId here is the videoAssessment.id, which equals the assessment.id
  // Fetch the assessment data needed for report generation
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      report: true,
      startedAt: true,
      completedAt: true,
      user: { select: { name: true, email: true } },
      conversations: {
        select: { coworkerId: true },
        where: { coworkerId: { not: null } },
      },
      scenario: {
        select: { language: true },
      },
    },
  });

  if (!assessment) {
    logger.warn("Assessment not found for auto-report", { assessmentId });
    return;
  }

  // Don't overwrite an existing report
  if (assessment.report) {
    logger.info("Report already exists, skipping auto-generation", { assessmentId });
    return;
  }

  const timing = calculateTiming(assessment.startedAt, assessment.completedAt);
  const coworkersContacted = countUniqueCoworkers(assessment.conversations);

  const report = convertRubricToReport(
    evaluation,
    assessmentId,
    assessment.user?.name || undefined,
    timing,
    coworkersContacted,
    assessment.scenario.language
  );

  await db.assessment.update({
    where: { id: assessmentId },
    data: { report: reportToPrismaJson(report) },
  });

  logger.info("Auto-generated assessment report", { assessmentId });

  // Send email notification
  if (isEmailServiceConfigured() && assessment.user?.email) {
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://skillvee.com";
    sendReportEmail({
      to: assessment.user.email,
      candidateName: assessment.user.name || undefined,
      assessmentId,
      report: report as AssessmentReport,
      appBaseUrl,
      language: assessment.scenario.language || "en",
    })
      .then((r) =>
        r.success
          ? logger.info("Report email sent", { email: assessment.user?.email })
          : logger.warn("Failed to send report email", { error: r.error })
      )
      .catch((err) =>
        logger.error("Error sending report email", { error: String(err) })
      );
  }
}
