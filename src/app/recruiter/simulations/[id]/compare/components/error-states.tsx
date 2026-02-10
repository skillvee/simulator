"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldAlert } from "lucide-react";

export function ForbiddenError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <ShieldAlert className="h-12 w-12 text-red-600" />
      </div>
      <h1 className="text-2xl font-semibold text-stone-900 mb-2">Access Denied</h1>
      <p className="text-stone-500 text-center mb-6 max-w-md">
        You don&apos;t have permission to view one or more of these candidates.
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/recruiter/simulations">Back to Candidates</Link>
      </Button>
    </div>
  );
}

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <AlertCircle className="h-12 w-12 text-stone-400 mb-4" />
      <h1 className="text-xl font-semibold text-stone-900 mb-2">Unable to load comparison</h1>
      <p className="text-stone-500 mb-6 text-center max-w-md">{error}</p>
      <Button asChild variant="outline">
        <Link href="/recruiter/simulations">Back to Candidates</Link>
      </Button>
    </div>
  );
}
