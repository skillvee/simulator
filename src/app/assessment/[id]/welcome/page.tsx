import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";

interface WelcomePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Backwards compatibility redirect - the welcome page now redirects to /chat.
 * This maintains backwards compatibility for any direct links to /welcome.
 */
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
    },
  });

  if (!assessment || assessment.userId !== session.user.id) {
    redirect("/profile");
  }

  // Find manager coworker
  const manager = assessment.scenario.coworkers.find((c) =>
    c.role.toLowerCase().includes("manager")
  );

  // Redirect to chat with manager, or fallback to profile
  if (manager) {
    redirect(`/assessment/${id}/chat?coworkerId=${manager.id}`);
  } else {
    // Fallback if no manager found - shouldn't happen in normal flow
    redirect("/profile");
  }
}
