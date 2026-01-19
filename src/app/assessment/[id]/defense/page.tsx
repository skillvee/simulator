import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAssessmentForDefense } from "@/server/queries/assessment";
import { DefenseClient } from "./client";
import { AssessmentScreenWrapper } from "@/components/assessment";

interface DefensePageProps {
  params: Promise<{ id: string }>;
}

export default async function DefensePage({ params }: DefensePageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const assessment = await getAssessmentForDefense(id, session.user.id);

  if (!assessment) {
    redirect("/");
  }

  // Check that assessment has a PR URL (means they completed the working phase)
  if (!assessment.prUrl) {
    redirect(`/assessment/${id}/chat`);
  }

  // Get manager info (or use default)
  const manager = assessment.scenario.coworkers[0] || {
    id: "default-manager",
    name: "Alex Chen",
    role: "Engineering Manager",
    avatarUrl: null,
  };

  return (
    <AssessmentScreenWrapper assessmentId={id}>
      <DefenseClient
        assessmentId={id}
        managerName={manager.name}
        managerRole={manager.role}
        companyName={assessment.scenario.companyName}
        userName={session.user.name || "there"}
        prUrl={assessment.prUrl}
      />
    </AssessmentScreenWrapper>
  );
}
