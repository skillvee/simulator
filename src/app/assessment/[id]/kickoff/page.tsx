import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { KickoffClient } from "./client";
import { AssessmentScreenWrapper } from "@/components/assessment-screen-wrapper";

interface KickoffPageProps {
  params: Promise<{ id: string }>;
}

export default async function KickoffPage({ params }: KickoffPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Fetch the assessment and verify ownership
  const assessment = await db.assessment.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      scenario: {
        include: {
          coworkers: {
            where: {
              role: {
                contains: "Manager",
                mode: "insensitive",
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!assessment) {
    redirect("/");
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
      <KickoffClient
        assessmentId={id}
        managerName={manager.name}
        managerRole={manager.role}
        companyName={assessment.scenario.companyName}
        userName={session.user.name || "there"}
      />
    </AssessmentScreenWrapper>
  );
}
