import { auth } from "@/auth";
import { db } from "@/server/db";
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

  // Fetch the assessment
  const assessment = await db.assessment.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      scenario: {
        select: {
          name: true,
          companyName: true,
          companyDescription: true,
        },
      },
      conversations: {
        where: {
          coworkerId: null,
          type: "voice",
        },
        select: {
          transcript: true,
        },
      },
    },
  });

  if (!assessment) {
    notFound();
  }

  // Check if interview was already completed
  const existingTranscript = assessment.conversations[0]?.transcript;
  const hasCompletedInterview = existingTranscript && Array.isArray(existingTranscript) && existingTranscript.length > 0;

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold text-xl">
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
              className="text-muted-foreground hover:text-foreground font-mono text-sm"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-secondary text-secondary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <span className="font-semibold">HR Interview</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 border-2 border-border flex items-center justify-center font-bold">
                2
              </div>
              <span>Manager Kickoff</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 border-2 border-border flex items-center justify-center font-bold">
                3
              </div>
              <span>Coding Task</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="w-8 h-8 border-2 border-border flex items-center justify-center font-bold">
                4
              </div>
              <span>PR Defense</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {hasCompletedInterview ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-secondary border-2 border-foreground flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">&#10003;</span>
              </div>
              <h2 className="text-2xl font-bold mb-4">Interview Completed</h2>
              <p className="text-muted-foreground mb-6">
                You&apos;ve already completed the HR interview for this assessment.
                Continue to the next phase.
              </p>
              <Link
                href={`/assessment/${id}/onboarding`}
                className="inline-block bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
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
