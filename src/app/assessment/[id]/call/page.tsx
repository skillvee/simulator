import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";

interface CallPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coworkerId?: string }>;
}

/**
 * Redirects to chat page - calls now happen via the floating call bar in sidebar.
 * This maintains backwards compatibility for any direct links to /call.
 */
export default async function CallPage({ params, searchParams }: CallPageProps) {
  const session = await auth();
  const { id: assessmentId } = await params;
  const { coworkerId } = await searchParams;

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Verify the assessment exists
  const assessment = await db.assessment.findFirst({
    where: {
      id: assessmentId,
      userId: session.user.id,
    },
  });

  if (!assessment) {
    redirect("/");
  }

  // Redirect to chat page - user can start call from sidebar
  const chatUrl = coworkerId
    ? `/assessment/${assessmentId}/chat?coworkerId=${coworkerId}`
    : `/assessment/${assessmentId}/chat`;

  redirect(chatUrl);
}
