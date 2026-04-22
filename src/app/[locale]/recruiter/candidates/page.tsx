import { redirect } from "next/navigation";

/**
 * Legacy candidates page - redirects to simulations
 */
export default function RecruiterCandidatesPage() {
  redirect("/recruiter/assessments");
}
