import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { InvitePageClient } from "./client";

interface PageProps {
  params: Promise<{ scenarioId: string }>;
}

/**
 * Fetch scenario for invite page (public access)
 * Returns scenario info for candidates to view before signing up
 */
async function getScenarioForInvite(scenarioId: string) {
  const scenario = await db.scenario.findUnique({
    where: { id: scenarioId },
    select: {
      id: true,
      name: true,
      companyName: true,
      companyDescription: true,
      taskDescription: true,
      techStack: true,
      isPublished: true,
    },
  });

  if (!scenario || !scenario.isPublished) {
    return null;
  }

  return {
    id: scenario.id,
    name: scenario.name,
    companyName: scenario.companyName,
    companyDescription: scenario.companyDescription,
    taskDescription: scenario.taskDescription,
    techStack: scenario.techStack,
  };
}

/**
 * Check if user has existing assessment for this scenario
 */
async function getExistingAssessment(userId: string, scenarioId: string) {
  const assessment = await db.assessment.findFirst({
    where: {
      userId,
      scenarioId,
    },
    select: {
      id: true,
      status: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return assessment;
}

/**
 * Invite page - public entry point for candidates
 * Recruiters share /invite/[scenarioId] links with candidates.
 *
 * If the candidate is already authenticated and has an assessment,
 * they're redirected to the appropriate page in the assessment flow.
 */
export default async function InvitePage({ params }: PageProps) {
  const { scenarioId } = await params;

  const scenario = await getScenarioForInvite(scenarioId);

  if (!scenario) {
    notFound();
  }

  // Check if user is logged in
  const session = await auth();
  const user = session?.user;

  // If logged in, check for existing assessment and redirect
  if (user?.id) {
    const existingAssessment = await getExistingAssessment(user.id, scenarioId);

    if (existingAssessment) {
      if (existingAssessment.status === "COMPLETED") {
        redirect(`/assessments/${existingAssessment.id}/results`);
      } else {
        redirect(`/assessments/${existingAssessment.id}/welcome`);
      }
    }
  }

  return (
    <InvitePageClient
      scenario={scenario}
      user={user?.id ? { id: user.id, email: user.email ?? undefined } : null}
    />
  );
}
