import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ simulationId: string }>;
  searchParams: Promise<{ ids?: string }>;
}

/**
 * Legacy compare page - redirects to new route
 */
export default async function LegacyComparePage({ params, searchParams }: PageProps) {
  const { simulationId } = await params;
  const { ids } = await searchParams;
  const query = ids ? `?ids=${ids}` : "";
  redirect(`/recruiter/assessments/${simulationId}/compare${query}`);
}
