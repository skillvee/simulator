import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import { SimulationsListClient } from "./client";

export interface TopCandidate {
  name: string;
  score: number;
}

export interface SimulationCardData {
  id: string;
  name: string;
  companyName: string;
  createdAt: string;
  isPublished: boolean;
  totalCandidates: number;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  needsReviewCount: number;
  topCandidates: TopCandidate[];
  lastActivityDate: string | null;
  lastActivityDescription: string | null;
}

/**
 * Fetch simulations with candidate pipeline stats for the recruiter
 */
async function getSimulationsWithStats(
  recruiterId: string
): Promise<SimulationCardData[]> {
  const scenarios = await db.scenario.findMany({
    where: { createdById: recruiterId },
    orderBy: { createdAt: "desc" },
    include: {
      assessments: {
        include: {
          user: { select: { name: true } },
          videoAssessment: {
            include: {
              scores: { select: { score: true } },
            },
          },
        },
      },
    },
  });

  return scenarios.map((scenario) => {
    const assessments = scenario.assessments;
    const totalCandidates = assessments.length;
    const completedCount = assessments.filter(
      (a) => a.status === "COMPLETED"
    ).length;
    const inProgressCount = assessments.filter(
      (a) => a.status === "WORKING"
    ).length;
    const pendingCount = assessments.filter(
      (a) => a.status === "WELCOME"
    ).length;

    // Needs review: completed but not yet reviewed by recruiter
    const needsReviewCount = assessments.filter(
      (a) =>
        a.status === "COMPLETED" &&
        !a.reviewedAt &&
        a.videoAssessment?.status === VideoAssessmentStatus.COMPLETED
    ).length;

    // Top 3 candidates by score
    const completedWithScores = assessments.filter(
      (a) =>
        a.status === "COMPLETED" &&
        a.videoAssessment?.status === VideoAssessmentStatus.COMPLETED &&
        a.videoAssessment.scores.length > 0
    );

    let topCandidates: TopCandidate[] = [];

    if (completedWithScores.length > 0) {
      const scoresWithNames = completedWithScores.map((a) => {
        const scores = a.videoAssessment!.scores;
        const avg =
          scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        return { name: a.user.name ?? "Anonymous", score: avg };
      });

      topCandidates = scoresWithNames
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    }

    // Find last activity with description
    let lastActivityDate: Date | null = null;
    let lastActivityDescription: string | null = null;

    for (const a of assessments) {
      if (a.completedAt && (!lastActivityDate || a.completedAt > lastActivityDate)) {
        lastActivityDate = a.completedAt;
        lastActivityDescription = `${a.user.name ?? "Someone"} completed`;
      }
    }
    for (const a of assessments) {
      if (a.status === "WORKING") {
        const startDate = a.startedAt;
        if (!lastActivityDate || startDate > lastActivityDate) {
          lastActivityDate = startDate;
          lastActivityDescription = `${a.user.name ?? "Someone"} started`;
        }
      }
    }
    for (const a of assessments) {
      if (a.status === "WELCOME") {
        const createdDate = a.createdAt;
        if (!lastActivityDate || createdDate > lastActivityDate) {
          lastActivityDate = createdDate;
          lastActivityDescription = `${a.user.name ?? "Someone"} signed up`;
        }
      }
    }

    return {
      id: scenario.id,
      name: scenario.name,
      companyName: scenario.companyName,
      createdAt: scenario.createdAt.toISOString(),
      isPublished: scenario.isPublished,
      totalCandidates,
      completedCount,
      inProgressCount,
      pendingCount,
      needsReviewCount,
      topCandidates,
      lastActivityDate: lastActivityDate?.toISOString() ?? null,
      lastActivityDescription,
    };
  });
}

export default async function RecruiterSimulationsPage() {
  const user = await requireRecruiter();
  const simulations = await getSimulationsWithStats(user.id);

  return <SimulationsListClient simulations={simulations} />;
}
