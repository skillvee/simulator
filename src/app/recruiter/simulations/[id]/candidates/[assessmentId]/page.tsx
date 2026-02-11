import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string; assessmentId: string }>;
}

/**
 * Redirect old candidate detail to assessments
 */
export default async function CandidateDetailRedirect({ params }: PageProps) {
  const { id, assessmentId } = await params;
  redirect(`/recruiter/assessments/${id}/compare?ids=${assessmentId}`);
}
