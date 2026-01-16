import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { WelcomeClient } from "./client";
import { AssessmentScreenWrapper } from "@/components/assessment-screen-wrapper";

interface WelcomePageProps {
  params: Promise<{ id: string }>;
}

export default async function WelcomePage({ params }: WelcomePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      scenario: {
        include: {
          coworkers: {
            where: {
              role: { contains: "Manager", mode: "insensitive" },
            },
            take: 1,
          },
        },
      },
      hrAssessment: true,
    },
  });

  if (!assessment || assessment.userId !== session.user.id) {
    redirect("/profile");
  }

  // Only show welcome if HR interview is complete
  if (assessment.status === "HR_INTERVIEW" && !assessment.hrAssessment) {
    redirect(`/assessment/${id}/hr-interview`);
  }

  const userName = session.user.name?.split(" ")[0] || "there";

  // Get manager or use default
  const manager = assessment.scenario.coworkers[0] || {
    name: "Alex Chen",
    role: "Engineering Manager",
    avatarUrl: null,
  };

  return (
    <AssessmentScreenWrapper assessmentId={id}>
      <WelcomeClient
        assessmentId={id}
        userName={userName}
        managerName={manager.name}
        managerRole={manager.role}
        managerAvatar={manager.avatarUrl}
        companyName={assessment.scenario.companyName}
        repoUrl={assessment.scenario.repoUrl}
        taskDescription={assessment.scenario.taskDescription}
      />
    </AssessmentScreenWrapper>
  );
}
