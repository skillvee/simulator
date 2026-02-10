import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { CandidateCompareClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string }>;
}

export default async function CandidateComparePage({ params, searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as { id: string; role?: string } | undefined;

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    redirect("/");
  }

  const { id: simulationId } = await params;
  const { ids } = await searchParams;

  if (!ids) {
    redirect(`/recruiter/simulations/${simulationId}`);
  }

  const assessmentIds = ids.split(",").map((id) => id.trim()).filter(Boolean);

  if (assessmentIds.length < 2 || assessmentIds.length > 4) {
    redirect(`/recruiter/simulations/${simulationId}`);
  }

  const simulation = await db.scenario.findUnique({
    where: { id: simulationId },
    select: {
      id: true,
      name: true,
      createdById: true,
    },
  });

  if (!simulation) {
    redirect("/recruiter/simulations");
  }

  if (user.role !== "ADMIN" && simulation.createdById !== user.id) {
    redirect("/recruiter/simulations");
  }

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
    redirect(`/recruiter/simulations/${simulationId}`);
  }

  return (
    <CandidateCompareClient
      simulationId={simulationId}
      simulationName={simulation.name}
      assessmentIds={assessmentIds}
    />
  );
}
