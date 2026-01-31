import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { RecruiterDashboardClient } from "./client";

/**
 * Fetch dashboard statistics for a recruiter
 */
async function getRecruiterStats(recruiterId: string) {
  // Get scenarios owned by this recruiter
  const scenarios = await db.scenario.findMany({
    where: { createdById: recruiterId },
    select: { id: true },
  });

  const scenarioIds = scenarios.map((s) => s.id);
  const scenarioCount = scenarios.length;

  // If no scenarios, return zeros
  if (scenarioIds.length === 0) {
    return {
      scenarioCount: 0,
      candidateCount: 0,
      completedCount: 0,
      completionRate: 0,
    };
  }

  // Get assessments for recruiter's scenarios
  const assessments = await db.assessment.findMany({
    where: { scenarioId: { in: scenarioIds } },
    select: {
      id: true,
      status: true,
      userId: true,
    },
  });

  // Count unique candidates
  const uniqueCandidates = new Set(assessments.map((a) => a.userId));
  const candidateCount = uniqueCandidates.size;

  // Count completed assessments
  const completedCount = assessments.filter(
    (a) => a.status === "COMPLETED"
  ).length;

  // Calculate completion rate
  const totalAssessments = assessments.length;
  const completionRate =
    totalAssessments > 0
      ? Math.round((completedCount / totalAssessments) * 100)
      : 0;

  return {
    scenarioCount,
    candidateCount,
    completedCount,
    completionRate,
  };
}

/**
 * Fetch recent assessments for recruiter's scenarios
 */
async function getRecentAssessments(recruiterId: string, limit = 5) {
  // Get scenarios owned by this recruiter
  const scenarios = await db.scenario.findMany({
    where: { createdById: recruiterId },
    select: { id: true },
  });

  const scenarioIds = scenarios.map((s) => s.id);

  if (scenarioIds.length === 0) {
    return [];
  }

  // Get recent assessments
  const assessments = await db.assessment.findMany({
    where: { scenarioId: { in: scenarioIds } },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { name: true } },
    },
  });

  return assessments;
}

export default async function RecruiterDashboardPage() {
  const user = await requireRecruiter();

  const [stats, recentAssessments] = await Promise.all([
    getRecruiterStats(user.id),
    getRecentAssessments(user.id),
  ]);

  return (
    <RecruiterDashboardClient
      stats={stats}
      recentAssessments={recentAssessments.map((a) => ({
        id: a.id,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        user: {
          name: a.user.name,
          email: a.user.email,
        },
        scenario: {
          name: a.scenario.name,
        },
      }))}
    />
  );
}
