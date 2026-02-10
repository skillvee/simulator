import { redirect } from "next/navigation";

/**
 * Recruiter index page - redirects to simulations
 */
export default function RecruiterPage() {
  redirect("/recruiter/simulations");
}
