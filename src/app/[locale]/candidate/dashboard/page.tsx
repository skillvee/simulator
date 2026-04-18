import { requireCandidate } from "@/lib/core";
import { db } from "@/server/db";
import type { AssessmentStatus, VideoAssessmentStatus, Prisma } from "@prisma/client";
import type { AssessmentReport } from "@/types";
import { CandidateDashboardClient } from "./client";

export interface CandidateAssessmentData {
  id: string;
  status: AssessmentStatus;
  scenarioName: string;
  companyName: string;
  techStack: string[];
  targetLevel: string;
  startedAt: string;
  completedAt: string | null;
  overallScore: number | null;
  overallLevel: string | null;
  narrativeSummary: string | null;
  videoStatus: VideoAssessmentStatus | null;
}

function getReportData(report: Prisma.JsonValue): AssessmentReport | null {
  if (!report || typeof report !== "object") return null;
  return report as unknown as AssessmentReport;
}

async function getCandidateAssessments(
  userId: string
): Promise<CandidateAssessmentData[]> {
  const assessments = await db.assessment.findMany({
    where: { userId },
    include: {
      scenario: {
        select: {
          name: true,
          companyName: true,
          techStack: true,
          targetLevel: true,
        },
      },
      videoAssessment: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return assessments.map((a) => {
    const report = getReportData(a.report);
    return {
      id: a.id,
      status: a.status,
      scenarioName: a.scenario.name,
      companyName: a.scenario.companyName,
      techStack: a.scenario.techStack ?? [],
      targetLevel: a.targetLevel ?? a.scenario.targetLevel ?? "mid",
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      overallScore: report?.overallScore ?? null,
      overallLevel: report?.overallLevel ?? null,
      narrativeSummary: report?.narrative?.overallSummary ?? null,
      videoStatus: a.videoAssessment?.status ?? null,
    };
  });
}

export default async function CandidateDashboardPage() {
  const user = await requireCandidate();
  const assessments = await getCandidateAssessments(user.id);

  return <CandidateDashboardClient assessments={assessments} userName={user.name ?? null} />;
}
