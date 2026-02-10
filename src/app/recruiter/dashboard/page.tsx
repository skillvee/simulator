import { redirect } from "next/navigation";

/**
 * Legacy dashboard page - redirects to simulations
 */
export default function RecruiterDashboardPage() {
  redirect("/recruiter/simulations");
}
