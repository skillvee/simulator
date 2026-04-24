import { redirect } from "next/navigation";
import { requireCandidate } from "@/lib/core";
import { db } from "@/server/db";
import { transformToCandidateResults } from "@/lib/candidate/results-transformer";
import { CandidateSidebar } from "@/app/[locale]/candidate/dashboard/components/sidebar";
import { CandidateResultsClient } from "./client";
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

  // The RSC is intentionally non-blocking: if the report isn't persisted
  // yet, we render the waiting state and let the client poll
  // /api/assessment/report-status. That endpoint is self-healing — it
  // re-triggers evaluation, recovers from stuck PROCESSING, and finalizes
  // COMPLETED-but-no-report cases — all without the candidate having to
  // click anything.
  const report = assessment.report as AssessmentReport | null;

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
        />
      </main>
    </div>
  );
}
