import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Redirect old simulation detail (candidate list) to assessments
 */
export default async function SimulationDetailRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/recruiter/assessments/${id}`);
}
