import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ simulationId: string; assessmentId: string }>;
}

/**
 * Legacy candidate detail - redirects to new route
 */
export default async function LegacyCandidateDetailPage({ params }: PageProps) {
  const { simulationId, assessmentId } = await params;
  redirect(`/recruiter/assessments/${simulationId}/candidates/${assessmentId}`);
}
