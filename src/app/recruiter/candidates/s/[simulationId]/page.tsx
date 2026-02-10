import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ simulationId: string }>;
}

/**
 * Legacy scoped candidates page - redirects to new simulations route
 */
export default async function LegacyScopedCandidatesPage({ params }: PageProps) {
  const { simulationId } = await params;
  redirect(`/recruiter/simulations/${simulationId}`);
}
