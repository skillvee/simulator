"use client";

import { ErrorBoundaryFallback } from "@/components/feedback";

function extractAssessmentId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const match = window.location.pathname.match(/\/assessments\/([^/]+)/);
  return match?.[1];
}

export default function AssessmentWorkError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundaryFallback
      error={error}
      reset={reset}
      context="assessment-work"
      assessmentId={extractAssessmentId()}
    />
  );
}
