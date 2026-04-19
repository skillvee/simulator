import { redirect } from "next/navigation";
import { requireCandidate, createLogger } from "@/lib/core";

const logger = createLogger("server:app:results-page");
import { db } from "@/server/db";
import { transformToCandidateResults } from "@/lib/candidate/results-transformer";
import { generateOrFetchReport } from "@/lib/analysis/generate-report";
import { CandidateSidebar } from "@/app/[locale]/candidate/dashboard/components/sidebar";
import { CandidateResultsClient, type NoReportReason } from "./client";
import type { AssessmentReport } from "@/types";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const user = await requireCandidate();
  const { id } = await params;

  // Fetch the assessment and verify ownership
  const assessment = await db.assessment.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      scenario: {
        select: {
          name: true,
          companyName: true,
        },
      },
      videoAssessment: {
        select: { isSearchable: true },
      },
      candidateFeedback: {
        select: { rating: true, comment: true },
      },
    },
  });

  if (!assessment) {
    redirect("/candidate/dashboard");
  }

  // Only COMPLETED assessments can view results
  if (assessment.status !== "COMPLETED") {
    redirect(`/assessments/${id}/work`);
  }

  let report = assessment.report as AssessmentReport | null;
  let noReportReason: NoReportReason | null = null;

  if (!report) {
    const result = await generateOrFetchReport(id, user.id);
    if (result.status === "ready") {
      report = result.report;
    } else if (result.status === "processing") {
      noReportReason = "processing";
    } else if (result.status === "error") {
      logger.error("Failed to generate report on results page", {
        assessmentId: id,
        message: result.message,
      });
      noReportReason = "error";
    } else {
      // not_found / unauthorized — fall through to dashboard redirect safety
      redirect("/candidate/dashboard");
    }
  }

  // Transform to candidate-safe format
  const candidateResults = report
    ? transformToCandidateResults(report, {
        assessmentId: id,
        candidateName: user.name || "there",
        scenarioName: assessment.scenario.name,
        companyName: assessment.scenario.companyName,
        isSearchable: assessment.videoAssessment?.isSearchable ?? false,
        hasVideoAssessment: assessment.videoAssessment != null,
      })
    : null;

  const initialFeedback = assessment.candidateFeedback
    ? {
        rating: assessment.candidateFeedback.rating as "LIKE" | "DISLIKE",
        comment: assessment.candidateFeedback.comment ?? "",
      }
    : null;

  return (
    <div className="flex h-screen bg-white">
      <CandidateSidebar
        user={{ name: user.name ?? null, email: user.email ?? null }}
      />
      <main className="flex-1 overflow-y-auto bg-white">
        <CandidateResultsClient
          assessmentId={id}
          results={candidateResults}
          initialFeedback={initialFeedback}
          noReportReason={noReportReason}
        />
      </main>
    </div>
  );
}
