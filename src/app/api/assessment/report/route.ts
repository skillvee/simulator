import { auth } from "@/auth";
import { success, error } from "@/lib/api";
import { db } from "@/server/db";
import { createLogger } from "@/lib/core";
import { sendReportEmail, isEmailServiceConfigured } from "@/lib/external";
import {
  fetchAssessmentForReport,
  resolveVideoEvaluation,
  calculateTiming,
  countUniqueCoworkers,
  convertRubricToReport,
  reportToPrismaJson,
} from "@/lib/analysis";
import type { AssessmentReport } from "@/types";

const logger = createLogger("api:assessment:report");

/** POST /api/assessment/report — Generate final assessment report */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const body = await request.json();
    const { assessmentId, forceRegenerate = false } = body;

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    const assessment = await fetchAssessmentForReport(assessmentId);
    if (!assessment) {
      return error("Assessment not found", 404);
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to access this assessment", 403);
    }

    // Return cached report if available
    if (assessment.report && !forceRegenerate) {
      return success({ report: assessment.report, cached: true });
    }

    const videoUrl = assessment.recordings[0]?.storageUrl;
    if (!videoUrl) {
      return error("No video recording found for this assessment. Video evaluation cannot proceed without a recording.", 400);
    }
    const videoResult = await resolveVideoEvaluation(
      assessmentId, videoUrl, assessment.scenario.taskDescription, session.user.id
    );

    if (videoResult.status === "processing")
      return error("Video evaluation is still in progress. Please try again later.", 202);
    if (videoResult.status === "error")
      return error(videoResult.message, 500);

    const timing = calculateTiming(assessment.startedAt, assessment.completedAt);
    const coworkersContacted = countUniqueCoworkers(assessment.conversations);

    const report = convertRubricToReport(
      videoResult.data,
      assessmentId,
      assessment.user?.name || undefined,
      timing,
      coworkersContacted
    );

    // Store report
    await db.assessment.update({
      where: { id: assessmentId },
      data: { report: reportToPrismaJson(report) },
    });

    // Send email notification asynchronously (fire-and-forget)
    const emailSent = isEmailServiceConfigured() && !!assessment.user?.email;
    if (emailSent) {
      const host = request.headers.get("host") || "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";
      sendReportEmail({
        to: assessment.user!.email!,
        candidateName: assessment.user.name || undefined,
        assessmentId,
        report: report as AssessmentReport,
        appBaseUrl: `${protocol}://${host}`,
      })
        .then((r) => r.success
          ? logger.info("Report email sent", { email: assessment.user?.email })
          : logger.warn("Failed to send report email", { error: r.error }))
        .catch((err) => logger.error("Error sending report email", { error: String(err) }));
    }

    return success({ report, cached: false, emailSent });
  } catch (err) {
    logger.error("Error generating assessment report", { error: String(err) });
    return error("Failed to generate assessment report", 500);
  }
}

/** GET /api/assessment/report?assessmentId=xxx — Retrieve existing report */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        report: true,
        user: { select: { name: true } },
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to access this assessment", 403);
    }

    if (!assessment.report) {
      return error("No report generated yet", 404);
    }

    return success({
      report: assessment.report,
      assessmentStatus: assessment.status,
    });
  } catch (err) {
    logger.error("Error fetching assessment report", { error: String(err) });
    return error("Failed to fetch assessment report", 500);
  }
}
