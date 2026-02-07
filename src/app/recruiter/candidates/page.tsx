import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import { RecruiterCandidatesClient } from "./client";

/**
 * Fetch simulation stats for the recruiter's scenarios
 */
async function getRecruiterSimulationStats(recruiterId: string) {
  // Get scenarios owned by this recruiter with their assessments
  const scenarios = await db.scenario.findMany({
    where: { createdById: recruiterId },
    include: {
      assessments: {
        include: {
          user: { select: { name: true } },
          videoAssessment: {
            include: {
              scores: {
                select: { score: true },
              },
            },
          },
        },
      },
    },
  });

  return scenarios.map((scenario) => {
    const assessments = scenario.assessments;
    const totalCount = assessments.length;
    const completedCount = assessments.filter((a) => a.status === "COMPLETED").length;
    const inProgressCount = assessments.filter((a) => a.status === "WORKING").length;

    // Calculate score range for completed video-assessed candidates
    const completedWithScores = assessments.filter(
      (a) =>
        a.status === "COMPLETED" &&
        a.videoAssessment?.status === VideoAssessmentStatus.COMPLETED &&
        a.videoAssessment.scores.length > 0
    );

    let minScore: number | null = null;
    let maxScore: number | null = null;
    let topCandidate: { name: string; score: number } | null = null;

    if (completedWithScores.length > 0) {
      const scoresWithNames = completedWithScores.map((a) => {
        const scores = a.videoAssessment!.scores;
        const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        return {
          name: a.user.name ?? "Anonymous",
          score: avgScore,
        };
      });

      const allScores = scoresWithNames.map((s) => s.score);
      minScore = Math.min(...allScores);
      maxScore = Math.max(...allScores);

      // Find top candidate
      const topEntry = scoresWithNames.reduce((max, current) =>
        current.score > max.score ? current : max
      );
      topCandidate = topEntry;
    }

    // Find last activity date (latest completedAt or createdAt)
    let lastActivityDate: Date | null = null;
    assessments.forEach((a) => {
      const activityDate = a.completedAt ?? a.createdAt;
      if (!lastActivityDate || activityDate > lastActivityDate) {
        lastActivityDate = activityDate;
      }
    });

    return {
      id: scenario.id,
      name: scenario.name,
      totalCount,
      completedCount,
      inProgressCount,
      minScore,
      maxScore,
      topCandidate,
      lastActivityDate: lastActivityDate?.toISOString() ?? null,
    };
  });
}

export default async function RecruiterCandidatesPage() {
  const user = await requireRecruiter();

  const simulationStats = await getRecruiterSimulationStats(user.id);

  return <RecruiterCandidatesClient simulationStats={simulationStats} />;
}
