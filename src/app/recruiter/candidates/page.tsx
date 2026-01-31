import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { RecruiterCandidatesClient } from "./client";

/**
 * Fetch all candidates who have taken assessments for the recruiter's scenarios
 */
async function getRecruiterCandidates(recruiterId: string) {
  // Get scenarios owned by this recruiter
  const scenarios = await db.scenario.findMany({
    where: { createdById: recruiterId },
    select: { id: true },
  });

  const scenarioIds = scenarios.map((s) => s.id);

  if (scenarioIds.length === 0) {
    return [];
  }

  // Get all assessments for recruiter's scenarios with user and scenario info
  const assessments = await db.assessment.findMany({
    where: { scenarioId: { in: scenarioIds } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { id: true, name: true } },
    },
  });

  return assessments.map((assessment) => ({
    id: assessment.id,
    status: assessment.status,
    createdAt: assessment.createdAt.toISOString(),
    completedAt: assessment.completedAt?.toISOString() ?? null,
    user: {
      name: assessment.user.name,
      email: assessment.user.email,
    },
    scenario: {
      id: assessment.scenario.id,
      name: assessment.scenario.name,
    },
  }));
}

/**
 * Get unique scenarios for filtering
 */
async function getRecruiterScenarioOptions(recruiterId: string) {
  const scenarios = await db.scenario.findMany({
    where: { createdById: recruiterId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return scenarios;
}

export default async function RecruiterCandidatesPage() {
  const user = await requireRecruiter();

  const [candidates, scenarioOptions] = await Promise.all([
    getRecruiterCandidates(user.id),
    getRecruiterScenarioOptions(user.id),
  ]);

  return (
    <RecruiterCandidatesClient
      candidates={candidates}
      scenarioOptions={scenarioOptions}
    />
  );
}
