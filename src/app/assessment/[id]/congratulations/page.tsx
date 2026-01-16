import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { CongratulationsClient } from "./client";

interface CongratulationsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CongratulationsPage({
  params,
}: CongratulationsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const assessment = await db.assessment.findUnique({
    where: { id },
    include: {
      scenario: true,
      hrAssessment: true,
    },
  });

  if (!assessment || assessment.userId !== session.user.id) {
    redirect("/profile");
  }

  // Only show congratulations if HR interview is complete
  if (assessment.status === "HR_INTERVIEW" && !assessment.hrAssessment) {
    redirect(`/assessment/${id}/hr-interview`);
  }

  const userName = session.user.name?.split(" ")[0] || "there";

  return (
    <CongratulationsClient
      assessmentId={id}
      userName={userName}
      companyName={assessment.scenario.companyName}
      scenarioName={assessment.scenario.name}
    />
  );
}
