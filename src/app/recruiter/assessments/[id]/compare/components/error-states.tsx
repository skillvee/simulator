"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldAlert } from "lucide-react";

export function ForbiddenError() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="mb-4 rounded-full bg-red-100 p-4">
        <ShieldAlert className="h-12 w-12 text-red-600" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-stone-900">
        Access Denied
      </h1>
      <p className="mb-6 max-w-md text-center text-stone-500">
        You don&apos;t have permission to view one or more of these candidates.
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/recruiter/assessments">Back to Candidates</Link>
      </Button>
    </div>
  );
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <AlertCircle className="mb-4 h-12 w-12 text-stone-400" />
      <h1 className="mb-2 text-xl font-semibold text-stone-900">
        Unable to load comparison
      </h1>
      <p className="mb-6 max-w-md text-center text-stone-500">{error}</p>
      <Button asChild variant="outline">
        <Link href="/recruiter/assessments">Back to Candidates</Link>
      </Button>
    </div>
  );
}
