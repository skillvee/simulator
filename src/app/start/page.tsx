import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

/**
 * Smart redirect page that handles assessment start flow:
 * - If not authenticated → redirect to sign-in
 * - If authenticated with in-progress assessment → resume where they left off
 * - If authenticated with no in-progress assessment → create new assessment → redirect to CV upload
 * - If no published scenarios exist → show message
 */
export default async function StartPage() {
  const session = await auth();

  // If not authenticated, redirect to sign-in with callback to /start
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/start");
  }

  const userId = session.user.id;

  // Find most recent in-progress assessment (any status except COMPLETED)
  const existingAssessment = await db.assessment.findFirst({
    where: {
      userId,
      status: {
        not: AssessmentStatus.COMPLETED,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      scenario: {
        include: {
          coworkers: true,
        },
      },
    },
  });

  // If user has an in-progress assessment, redirect to appropriate page
  if (existingAssessment) {
    // Find manager for WORKING status redirect
    const manager = existingAssessment.scenario.coworkers.find((c) =>
      c.role.toLowerCase().includes("manager")
    );
    const redirectUrl = getRedirectUrlForStatus(
      existingAssessment.id,
      existingAssessment.status,
      manager?.id
    );
    redirect(redirectUrl);
  }

  // No in-progress assessment - find the default published scenario
  const publishedScenario = await db.scenario.findFirst({
    where: {
      isPublished: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // If no published scenarios exist, show message
  if (!publishedScenario) {
    return <NoScenariosMessage />;
  }

  // Create new assessment for the published scenario
  const newAssessment = await db.assessment.create({
    data: {
      userId,
      scenarioId: publishedScenario.id,
      status: AssessmentStatus.HR_INTERVIEW,
    },
  });

  // Redirect to CV upload page for new assessment
  redirect(`/assessment/${newAssessment.id}/cv-upload`);
}

/**
 * Determines the redirect URL based on assessment status
 */
function getRedirectUrlForStatus(
  assessmentId: string,
  status: AssessmentStatus,
  managerId?: string
): string {
  switch (status) {
    case AssessmentStatus.HR_INTERVIEW:
      // Route to cv-upload which will auto-skip to hr-interview if CV exists
      return `/assessment/${assessmentId}/cv-upload`;
    case AssessmentStatus.ONBOARDING:
      return `/assessment/${assessmentId}/congratulations`;
    case AssessmentStatus.WORKING:
      // Redirect to chat with manager if managerId available, otherwise fallback to welcome
      return managerId
        ? `/assessment/${assessmentId}/chat?coworkerId=${managerId}`
        : `/assessment/${assessmentId}/welcome`;
    case AssessmentStatus.FINAL_DEFENSE:
      return `/assessment/${assessmentId}/defense`;
    case AssessmentStatus.PROCESSING:
      return `/assessment/${assessmentId}/processing`;
    default:
      // Fallback to CV upload if unknown status
      return `/assessment/${assessmentId}/cv-upload`;
  }
}

/**
 * Message displayed when no published scenarios are available
 */
function NoScenariosMessage() {
  return (
    <main className="flex min-h-screen animate-page-enter items-center justify-center bg-background px-6 text-foreground">
      <Card className="max-w-md shadow-md">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <FileQuestion className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-4 text-2xl font-semibold">
            No Assessments Available
          </h1>
          <p className="mb-6 text-muted-foreground">
            We&apos;re working on preparing new assessment scenarios. Please
            check back soon.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
