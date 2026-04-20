import "server-only";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import {
  getRelativeStrength,
  type RelativeStrengthKey,
  type TargetLevel,
} from "@/lib/rubric/level-expectations";

export interface TopCandidate {
  name: string;
  score: number;
}

export interface AssessmentCardData {
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
  lastActivityType: string | null;
  lastActivityUserName: string | null;
  targetLevel: string;
  techStack: string[];
  avgScore: number | null;
  strengthLabel: RelativeStrengthKey | null;
}

export async function getSimulationsWithStats(
  recruiterId: string
): Promise<AssessmentCardData[]> {
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

    const needsReviewCount = assessments.filter(
      (a) =>
        a.status === "COMPLETED" &&
        !a.reviewedAt &&
        a.videoAssessment?.status === VideoAssessmentStatus.COMPLETED
    ).length;

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

    let lastActivityDate: Date | null = null;
    let lastActivityDescription: string | null = null;
    let lastActivityType: string | null = null;
    let lastActivityUserName: string | null = null;

    for (const a of assessments) {
      if (
        a.completedAt &&
        (!lastActivityDate || a.completedAt > lastActivityDate)
      ) {
        lastActivityDate = a.completedAt;
        lastActivityDescription = `${a.user.name ?? "Someone"} completed`;
        lastActivityType = "completed";
        lastActivityUserName = a.user.name;
      }
    }
    for (const a of assessments) {
      if (a.status === "WORKING") {
        const startDate = a.startedAt;
        if (!lastActivityDate || startDate > lastActivityDate) {
          lastActivityDate = startDate;
          lastActivityDescription = `${a.user.name ?? "Someone"} started`;
          lastActivityType = "started";
          lastActivityUserName = a.user.name;
        }
      }
    }
    for (const a of assessments) {
      if (a.status === "WELCOME") {
        const createdDate = a.createdAt;
        if (!lastActivityDate || createdDate > lastActivityDate) {
          lastActivityDate = createdDate;
          lastActivityDescription = `${a.user.name ?? "Someone"} signed up`;
          lastActivityType = "signedUp";
          lastActivityUserName = a.user.name;
        }
      }
    }

    let avgScore: number | null = null;
    if (completedWithScores.length > 0) {
      const allAvgs = completedWithScores.map((a) => {
        const scores = a.videoAssessment!.scores;
        return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
      });
      avgScore = allAvgs.reduce((sum, s) => sum + s, 0) / allAvgs.length;
    }

    const level = (scenario.targetLevel ?? "mid") as TargetLevel;
    const strengthLabel =
      avgScore !== null ? getRelativeStrength(avgScore, level) : null;

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
      lastActivityType,
      lastActivityUserName,
      targetLevel: level,
      techStack: scenario.techStack ?? [],
      avgScore,
      strengthLabel,
    };
  });
}
