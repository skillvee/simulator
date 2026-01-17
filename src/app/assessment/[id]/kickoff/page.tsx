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

  // Verify the assessment exists
  const assessment = await db.assessment.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!assessment) {
    redirect("/");
  }

  // Redirect to welcome page - user can start kickoff call from there
  redirect(`/assessment/${id}/welcome`);
}
