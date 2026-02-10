import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { CandidateDetailClient } from "./client";

interface PageProps {
  params: Promise<{ id: string; assessmentId: string }>;
}

export default async function CandidateDetailPage({ params }: PageProps) {
  await requireRecruiter();

  const { id: simulationId, assessmentId } = await params;

  if (!simulationId || !assessmentId) {
    notFound();
  }

  // Security check: Verify the assessment belongs to the given simulation
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      scenario: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!assessment) {
    notFound();
  }

  // Verify the assessment's scenario matches the simulationId
  if (assessment.scenario.id !== simulationId) {
    notFound();
  }

  // Mark as reviewed if not already (fire-and-forget)
  db.assessment.updateMany({
    where: { id: assessmentId, reviewedAt: null },
    data: { reviewedAt: new Date() },
  }).catch(() => {});

  // Pass assessmentId and simulationId to client component
  return <CandidateDetailClient assessmentId={assessmentId} simulationId={simulationId} />;
}
