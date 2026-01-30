import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";

interface KickoffPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Redirects to welcome page - kickoff calls now happen via the floating call bar.
 * This maintains backwards compatibility for any direct links to /kickoff.
 */
export default async function KickoffPage({ params }: KickoffPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Verify the assessment exists and get coworkers
  const assessment = await db.assessment.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      scenario: {
        include: {
          coworkers: true,
        },
      },
    },
  });

  if (!assessment) {
    redirect("/");
  }

  // Find manager for redirect
  const manager = assessment.scenario.coworkers.find((c) =>
    c.role.toLowerCase().includes("manager")
  );

  // Redirect to chat with manager, or fallback to welcome page
  if (manager) {
    redirect(`/assessment/${id}/chat?coworkerId=${manager.id}`);
  } else {
    redirect(`/assessment/${id}/welcome`);
  }
}
