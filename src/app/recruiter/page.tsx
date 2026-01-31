import { redirect } from "next/navigation";

/**
 * Recruiter index page - redirects to dashboard
 */
export default function RecruiterPage() {
  redirect("/recruiter/dashboard");
}
