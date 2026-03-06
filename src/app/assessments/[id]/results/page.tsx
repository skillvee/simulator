import { redirect } from "next/navigation";
import { requireCandidate } from "@/lib/core";
import { db } from "@/server/db";
import { transformToCandidateResults } from "@/lib/candidate/results-transformer";
import { CandidateSidebar } from "@/app/candidate/dashboard/components/sidebar";
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
    },
  });

  if (!assessment) {
    redirect("/candidate/dashboard");
  }

  // Only COMPLETED assessments can view results
  if (assessment.status !== "COMPLETED") {
    redirect(`/assessments/${id}/work`);
  }

  // If no report exists yet, try to generate one
  let report = assessment.report as AssessmentReport | null;

  if (!report) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/assessment/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `next-auth.session-token=${user.id}`,
        },
        body: JSON.stringify({ assessmentId: id }),
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        report = data.report;
      }
    } catch (error) {
      console.error("Error generating report on results page:", error);
    }
  }

  // Transform to candidate-safe format
  const candidateResults = report
    ? transformToCandidateResults(report, {
        assessmentId: id,
        candidateName: user.name || "there",
        scenarioName: assessment.scenario.name,
        companyName: assessment.scenario.companyName,
      })
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
        />
      </main>
    </div>
  );
}
