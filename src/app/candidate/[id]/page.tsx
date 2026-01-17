import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import { CandidateProfileClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CandidateProfilePage({ params }: PageProps) {
  const { id } = await params;

  const videoAssessment = await db.videoAssessment.findUnique({
    where: { id },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      scores: true,
      summary: true,
      assessment: {
        select: {
          id: true,
        },
      },
    },
  });

  // Only show completed assessments
  if (!videoAssessment || videoAssessment.status !== VideoAssessmentStatus.COMPLETED) {
    notFound();
  }

  // Transform the data for the client component
  const clientData = {
    id: videoAssessment.id,
    videoUrl: videoAssessment.videoUrl,
    completedAt: videoAssessment.completedAt,
    isSearchable: videoAssessment.isSearchable,
    candidate: videoAssessment.candidate,
    scores: videoAssessment.scores.map((score) => ({
      id: score.id,
      dimension: score.dimension,
      score: score.score,
      observableBehaviors: score.observableBehaviors,
      trainableGap: score.trainableGap,
      timestamps: score.timestamps,
    })),
    summary: videoAssessment.summary,
    assessment: videoAssessment.assessment,
  };

  return <CandidateProfileClient data={clientData} />;
}
