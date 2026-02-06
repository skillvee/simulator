import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { WelcomePageClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Welcome/instructions page for an assessment.
 * Candidates see this after being authenticated and before starting work.
 */
export default async function WelcomePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const assessment = await db.assessment.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      scenario: {
        select: {
          name: true,
          companyName: true,
          companyDescription: true,
          taskDescription: true,
          techStack: true,
        },
      },
    },
  });

  if (!assessment) {
    redirect("/profile");
  }

  // If already completed, go to results
  if (assessment.status === "COMPLETED") {
    redirect(`/assessments/${id}/results`);
  }

  return (
    <WelcomePageClient
      assessmentId={id}
      scenario={assessment.scenario}
    />
  );
}
