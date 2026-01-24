import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { CVUploadClient } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CVUploadPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/assessment/${id}/cv-upload`);
  }

  // Fetch the assessment and user data
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
        },
      },
      user: {
        select: {
          cvUrl: true,
        },
      },
    },
  });

  if (!assessment) {
    notFound();
  }

  // Check if user already has CV (from assessment or user profile)
  const hasCv = assessment.cvUrl || assessment.user.cvUrl;
  if (hasCv) {
    // Auto-skip to HR interview if CV already exists
    redirect(`/assessment/${id}/hr-interview`);
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-semibold">
              Skillvee
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">
              {assessment.scenario.name}
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/profile"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="font-semibold">CV Upload</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border font-semibold">
                1
              </div>
              <span>HR Interview</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border font-semibold">
                2
              </div>
              <span>Manager Kickoff</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border font-semibold">
                3
              </div>
              <span>Coding Task</span>
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className="flex items-center gap-2 opacity-40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border font-semibold">
                4
              </div>
              <span>PR Defense</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <CVUploadClient
          assessmentId={id}
          scenarioName={assessment.scenario.name}
          companyName={assessment.scenario.companyName}
        />
      </div>
    </main>
  );
}
