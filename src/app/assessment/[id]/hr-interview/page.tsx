import { auth } from "@/auth";
import { getAssessmentForHRInterview } from "@/server/queries/assessment";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { HRInterviewClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HRInterviewPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/assessment/${id}/hr-interview`);
  }

  const assessment = await getAssessmentForHRInterview(id, session.user.id);

  if (!assessment) {
    notFound();
  }

  // Check if CV was uploaded, redirect to CV upload page if not
  const hasCv = assessment.cvUrl || assessment.user.cvUrl;
  if (!hasCv) {
    redirect(`/assessment/${id}/cv-upload`);
  }

  // Check if interview was already completed
  const existingTranscript = assessment.conversations[0]?.transcript;
  const hasCompletedInterview =
    existingTranscript &&
    Array.isArray(existingTranscript) &&
    existingTranscript.length > 0;

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b-2 border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">
              Skillvee
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-sm text-muted-foreground">
              {assessment.scenario.name}
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/profile"
              className="font-mono text-sm text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="border-b-2 border-border">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center bg-secondary font-bold text-secondary-foreground">
                1
              </div>
              <span className="font-semibold">HR Interview</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="flex h-8 w-8 items-center justify-center border-2 border-border font-bold">
                2
              </div>
              <span>Manager Kickoff</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="flex h-8 w-8 items-center justify-center border-2 border-border font-bold">
                3
              </div>
              <span>Coding Task</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="flex h-8 w-8 items-center justify-center border-2 border-border font-bold">
                4
              </div>
              <span>PR Defense</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {hasCompletedInterview ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center border-2 border-foreground bg-secondary">
                <span className="text-3xl">&#10003;</span>
              </div>
              <h2 className="mb-4 text-2xl font-bold">Interview Completed</h2>
              <p className="mb-6 text-muted-foreground">
                You&apos;ve already completed the HR interview for this
                assessment. Continue to the next phase.
              </p>
              <Link
                href={`/assessment/${id}/onboarding`}
                className="inline-block border-2 border-foreground bg-foreground px-6 py-3 font-semibold text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
              >
                Continue to Onboarding
              </Link>
            </div>
          </div>
        ) : (
          <HRInterviewClient
            assessmentId={id}
            scenarioName={assessment.scenario.name}
            companyName={assessment.scenario.companyName}
          />
        )}
      </div>
    </main>
  );
}
