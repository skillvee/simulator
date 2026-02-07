import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { CandidateCompareClient } from "./client";

interface PageProps {
  params: Promise<{ simulationId: string }>;
  searchParams: Promise<{ ids?: string }>;
}

/**
 * Apple-style candidate comparison page (server component)
 *
 * Validates:
 * - User is authenticated as recruiter/admin
 * - Recruiter owns the simulation
 * - ids query param contains 2-4 comma-separated assessment IDs
 * - All candidates belong to the same simulation
 */
export default async function CandidateComparePage({ params, searchParams }: PageProps) {
  // Auth check
  const session = await auth();
  const user = session?.user as { id: string; role?: string } | undefined;

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    redirect("/");
  }

  // Get params
  const { simulationId } = await params;
  const { ids } = await searchParams;

  // Validate query params
  if (!ids) {
    redirect(`/recruiter/candidates/s/${simulationId}`);
  }

  const assessmentIds = ids.split(",").map((id) => id.trim()).filter(Boolean);

  if (assessmentIds.length < 2 || assessmentIds.length > 4) {
    redirect(`/recruiter/candidates/s/${simulationId}`);
  }

  // Verify simulation exists and recruiter owns it (unless admin)
  const simulation = await db.scenario.findUnique({
    where: { id: simulationId },
    select: {
      id: true,
      name: true,
      createdById: true,
    },
  });

  if (!simulation) {
    redirect("/recruiter/candidates");
  }

  if (user.role !== "ADMIN" && simulation.createdById !== user.id) {
    redirect("/recruiter/candidates");
  }

  // Verify all assessments belong to this simulation
  const assessments = await db.assessment.findMany({
    where: {
      id: { in: assessmentIds },
      scenarioId: simulationId,
    },
    select: {
      id: true,
    },
  });

  if (assessments.length !== assessmentIds.length) {
    redirect(`/recruiter/candidates/s/${simulationId}`);
  }

  // Pass validated data to client
  return (
    <CandidateCompareClient
      simulationId={simulationId}
      simulationName={simulation.name}
      assessmentIds={assessmentIds}
    />
  );
}
