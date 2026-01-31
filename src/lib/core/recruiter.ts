import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getSessionWithRole } from "./admin";

/**
 * Extended session user with role information
 */
interface ExtendedSessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
}

/**
 * Check if the given user has recruiter role
 */
export function isRecruiter(user: ExtendedSessionUser | undefined | null): boolean {
  return user?.role === "RECRUITER";
}

/**
 * Check if the given user can access recruiter features (RECRUITER or ADMIN)
 */
export function canAccessRecruiterFeatures(user: ExtendedSessionUser | undefined | null): boolean {
  return user?.role === "RECRUITER" || user?.role === "ADMIN";
}

/**
 * Require recruiter (or admin) role for a page or API route
 * Redirects to sign-in if not authenticated, or home if wrong role
 * For use in server components and page handlers
 */
export async function requireRecruiter(): Promise<ExtendedSessionUser> {
  const session = await getSessionWithRole();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/recruiter/dashboard");
  }

  if (!canAccessRecruiterFeatures(session.user)) {
    redirect("/");
  }

  return session.user;
}

/**
 * Check if current user can access recruiter features
 * Returns boolean for conditional rendering
 * For use in server components
 */
export async function checkCanAccessRecruiter(): Promise<boolean> {
  const session = await getSessionWithRole();
  return canAccessRecruiterFeatures(session?.user);
}
