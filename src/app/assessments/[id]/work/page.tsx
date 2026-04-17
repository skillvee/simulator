import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAssessmentForChat } from "@/server/queries/assessment";
import { WorkPageClient } from "./client";
import { AssessmentScreenWrapper } from "@/components/assessment";
import { isAssessmentExpired, getDeadlineAt } from "@/lib/core/assessment-timer";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";
import type { ScenarioResource, SimulationDepth } from "@/types";

interface WorkPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coworkerId?: string }>;
}

export default async function WorkPage({
  params,
  searchParams,
}: WorkPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const { coworkerId: selectedCoworkerId } = await searchParams;

  const assessment = await getAssessmentForChat(id, session.user.id);
  if (!assessment) {
    redirect("/candidate/dashboard");
  }

  // If no workingStartedAt, candidate hasn't clicked "Start Simulation" yet
  if (!assessment.workingStartedAt) {
    redirect(`/assessments/${id}/welcome`);
  }

  // If already completed, go to results
  if (assessment.status === AssessmentStatus.COMPLETED) {
    redirect(`/assessments/${id}/results`);
  }

  const simulationDepth = (assessment.scenario.simulationDepth || "medium") as SimulationDepth;

  // If expired and still WORKING, auto-finalize server-side
  if (isAssessmentExpired(assessment.workingStartedAt, simulationDepth)) {
    await db.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
    redirect(`/assessments/${id}/results`);
  }

  const deadlineAt = getDeadlineAt(assessment.workingStartedAt, simulationDepth).toISOString();

  const coworkers = assessment.scenario.coworkers.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    avatarUrl: c.avatarUrl,
  }));

  // Default to the manager so the candidate lands on their chat
  // (the manager auto-starts the conversation with a welcome message)
  const manager = coworkers.find((c) =>
    c.role.toLowerCase().includes("manager")
  );
  const defaultCoworkerId = manager?.id || coworkers[0]?.id || null;

  const resources = (assessment.scenario.resources as unknown as ScenarioResource[]) || [];

  return (
    <AssessmentScreenWrapper assessmentId={id}>
      <WorkPageClient
        assessmentId={id}
        coworkers={coworkers}
        selectedCoworkerId={selectedCoworkerId || defaultCoworkerId}
        deadlineAt={deadlineAt}
        resources={resources}
      />
    </AssessmentScreenWrapper>
  );
}
