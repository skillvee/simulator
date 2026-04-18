import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string; assessmentId: string }>;
}

/**
 * Redirects to the unified compare page with a single candidate.
 * The compare page handles both single and multi-candidate views.
 */
export default async function CandidateDetailPage({ params }: PageProps) {
  const { id: simulationId, assessmentId } = await params;
  redirect(`/recruiter/assessments/${simulationId}/compare?ids=${assessmentId}`);
}
