import { auth } from "@/auth";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";
import { sendReportEmail, isEmailServiceConfigured } from "@/lib/external";
import { generateOrFetchReport } from "@/lib/analysis";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
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
    const { assessmentId, forceRegenerate = false } = body as {
      assessmentId?: string;
      forceRegenerate?: boolean;
    };

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    const existing = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: { userId: true, report: true, user: { select: { name: true, email: true } } },
    });

    if (!existing) return error("Assessment not found", 404);
    if (existing.userId !== session.user.id) {
      return error("Unauthorized to access this assessment", 403);
    }

    const hadCachedReport = !!existing.report;

    if (forceRegenerate && hadCachedReport) {
      await db.assessment.update({
        where: { id: assessmentId },
        data: { report: Prisma.DbNull },
      });
    }

    const result = await generateOrFetchReport(assessmentId, session.user.id);

    if (result.status === "not_found") return error("Assessment not found", 404);
    if (result.status === "unauthorized") return error("Unauthorized to access this assessment", 403);
    if (result.status === "processing") return error("Video evaluation is still in progress. Please try again later.", 202);
    if (result.status === "error") return error(result.message, 500);

    const cached = hadCachedReport && !forceRegenerate;

    // Fire-and-forget email notification for freshly generated reports
    let emailSent = false;
    if (!cached) {
      emailSent = isEmailServiceConfigured() && !!existing.user?.email;
      if (emailSent && existing.user?.email) {
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        void sendReportEmail({
          to: existing.user.email,
          candidateName: existing.user.name || undefined,
          assessmentId,
          report: result.report as AssessmentReport,
          appBaseUrl: `${protocol}://${host}`,
          language: result.report.language || "en",
        })
          .then((r) => r.success
            ? logger.info("Report email sent", { email: existing.user?.email })
            : logger.warn("Failed to send report email", { error: r.error }))
          .catch((err) => logger.error("Error sending report email", { error: String(err) }));
      }
    }

    return success({ report: result.report, cached, emailSent });
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
