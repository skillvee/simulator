import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/core";
import { CandidateDetailClient } from "./client";

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function CandidateDetailPage({ params }: PageProps) {
  // Verify user is a recruiter (will redirect if not)
  await requireRecruiter();

  const { assessmentId } = await params;

  if (!assessmentId) {
    notFound();
  }

  // Pass assessmentId to client component, which will fetch data
  return <CandidateDetailClient assessmentId={assessmentId} />;
}
