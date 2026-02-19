import { redirect } from "next/navigation";

/**
 * Legacy dashboard page - redirects to assessments
 */
export default function RecruiterDashboardPage() {
  redirect("/recruiter/assessments");
}
