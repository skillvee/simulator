"use client";

import { ErrorBoundaryFallback } from "@/components/feedback";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} context="root" />;
}
