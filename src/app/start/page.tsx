import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";

/**
 * Smart redirect page that handles assessment start flow:
 * - If not authenticated → redirect to sign-in
 * - If authenticated with in-progress assessment → resume where they left off
 * - If authenticated with no in-progress assessment → create new assessment → redirect to consent
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
      scenario: true,
    },
  });

  // If user has an in-progress assessment, redirect to appropriate page
  if (existingAssessment) {
    const redirectUrl = getRedirectUrlForStatus(
      existingAssessment.id,
      existingAssessment.status,
      existingAssessment.consentGivenAt
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

  // Redirect to consent page for new assessment
  redirect(`/assessment/${newAssessment.id}/consent`);
}

/**
 * Determines the redirect URL based on assessment status and consent state
 */
function getRedirectUrlForStatus(
  assessmentId: string,
  status: AssessmentStatus,
  consentGivenAt: Date | null
): string {
  // If consent not given yet, always go to consent page first
  if (!consentGivenAt) {
    return `/assessment/${assessmentId}/consent`;
  }

  switch (status) {
    case AssessmentStatus.HR_INTERVIEW:
      return `/assessment/${assessmentId}/hr-interview`;
    case AssessmentStatus.ONBOARDING:
      return `/assessment/${assessmentId}/congratulations`;
    case AssessmentStatus.WORKING:
      return `/assessment/${assessmentId}/welcome`;
    case AssessmentStatus.FINAL_DEFENSE:
      return `/assessment/${assessmentId}/defense`;
    case AssessmentStatus.PROCESSING:
      return `/assessment/${assessmentId}/processing`;
    default:
      // Fallback to consent if unknown status
      return `/assessment/${assessmentId}/consent`;
  }
}

/**
 * Message displayed when no published scenarios are available
 */
function NoScenariosMessage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="border-2 border-border p-8">
          <div className="mb-6">
            <div
              className="w-16 h-16 bg-secondary mx-auto"
              style={{ clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }}
            />
          </div>
          <h1 className="text-2xl font-bold mb-4">No Assessments Available</h1>
          <p className="text-muted-foreground mb-6">
            We&apos;re working on preparing new assessment scenarios. Please check
            back soon.
          </p>
          <a
            href="/"
            className="inline-block bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
          >
            Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}
