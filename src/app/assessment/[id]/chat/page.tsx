import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAssessmentForChat } from "@/server/queries/assessment";
import { ChatPageClient } from "./client";
import { AssessmentScreenWrapper } from "@/components/assessment-screen-wrapper";

interface ChatPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coworkerId?: string }>;
}

export default async function ChatPage({
  params,
  searchParams,
}: ChatPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const { coworkerId: selectedCoworkerId } = await searchParams;

  const assessment = await getAssessmentForChat(id, session.user.id);
  if (!assessment) {
    redirect("/profile");
  }

  const coworkers = assessment.scenario.coworkers.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    avatarUrl: c.avatarUrl,
  }));

  // If no coworker selected, default to first coworker
  const defaultCoworkerId = coworkers[0]?.id || null;

  return (
    <AssessmentScreenWrapper assessmentId={id}>
      <ChatPageClient
        assessmentId={id}
        coworkers={coworkers}
        selectedCoworkerId={selectedCoworkerId || defaultCoworkerId}
      />
    </AssessmentScreenWrapper>
  );
}
