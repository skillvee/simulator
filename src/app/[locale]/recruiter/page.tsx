import { redirect } from "next/navigation";

/**
 * Recruiter index page - redirects to assessments
 */
export default function RecruiterPage() {
  redirect("/recruiter/assessments");
}
