import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string }>;
}

/**
 * Redirect old compare page to assessments
 */
export default async function CompareRedirect({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { ids } = await searchParams;
  const query = ids ? `?ids=${ids}` : "";
  redirect(`/recruiter/assessments/${id}/compare${query}`);
}
