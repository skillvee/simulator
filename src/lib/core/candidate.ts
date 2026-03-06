import { redirect } from "next/navigation";
import { getSessionWithRole } from "./admin";

/**
 * Extended session user with role information
 */
interface ExtendedSessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: "USER" | "RECRUITER" | "ADMIN";
}

/**
 * Require authenticated user for candidate pages.
 * Any authenticated user can access candidate features (USER, RECRUITER, ADMIN).
 * Redirects to sign-in if not authenticated.
 */
export async function requireCandidate(): Promise<ExtendedSessionUser> {
  const session = await getSessionWithRole();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/candidate/dashboard");
  }

  return session.user;
}
