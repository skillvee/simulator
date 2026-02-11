import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

// V3 is now the default view — redirect to the main page
export default async function AssessmentDetailPageV3({ params }: PageProps) {
  const { id } = await params;
  redirect(`/recruiter/assessments/${id}`);
}
