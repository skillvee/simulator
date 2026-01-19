import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { WelcomeClient } from "./client";
import { AssessmentScreenWrapper } from "@/components/assessment";

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
          coworkers: true,
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

  // Find the manager coworker or use default
  const manager = assessment.scenario.coworkers.find((c) =>
    c.role.toLowerCase().includes("manager")
  );

  const managerId = manager?.id || "default-manager";
  const managerName = manager?.name || "Alex Chen";
  const managerRole = manager?.role || "Engineering Manager";
  const managerAvatar = manager?.avatarUrl || null;

  // Get all coworkers for the sidebar
  const coworkers = assessment.scenario.coworkers.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    avatarUrl: c.avatarUrl,
  }));

  return (
    <AssessmentScreenWrapper
      assessmentId={id}
      companyName={assessment.scenario.companyName}
    >
      <WelcomeClient
        assessmentId={id}
        userName={userName}
        managerId={managerId}
        managerName={managerName}
        managerRole={managerRole}
        managerAvatar={managerAvatar}
        companyName={assessment.scenario.companyName}
        repoUrl={assessment.scenario.repoUrl}
        taskDescription={assessment.scenario.taskDescription}
        coworkers={coworkers}
      />
    </AssessmentScreenWrapper>
  );
}
