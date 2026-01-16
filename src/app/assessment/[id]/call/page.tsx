import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { CallPageClient } from "./client";

interface CallPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coworkerId?: string }>;
}

export default async function CallPage({ params, searchParams }: CallPageProps) {
  const session = await auth();
  const { id: assessmentId } = await params;
  const { coworkerId } = await searchParams;

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Get the assessment
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
    include: {
      scenario: true,
    },
  });

  if (!assessment) {
    redirect("/");
  }

  // Get coworkers for this scenario
  const coworkers = await db.coworker.findMany({
    where: {
      scenarioId: assessment.scenarioId,
    },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
    },
  });

  return (
    <CallPageClient
      assessmentId={assessmentId}
      coworkers={coworkers}
      selectedCoworkerId={coworkerId || null}
    />
  );
}
