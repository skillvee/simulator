import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { UserRole, AssessmentStatus } from "@prisma/client";

interface ExtendedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
}

function getStatusLabel(status: AssessmentStatus): string {
  const labels: Record<AssessmentStatus, string> = {
    HR_INTERVIEW: "HR Interview",
    ONBOARDING: "Onboarding",
    WORKING: "Working",
    FINAL_DEFENSE: "Final Defense",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
  };
  return labels[status];
}

function getStatusColor(status: AssessmentStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-secondary text-secondary-foreground";
    case "PROCESSING":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-foreground text-background";
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const user = session.user as ExtendedUser;

  const dbUser = await db.user.findUnique({
    where: { id: user.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  const assessments = await db.assessment.findMany({
    where: { userId: user.id },
    include: {
      scenario: {
        select: {
          name: true,
          companyName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b-2 border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            Skillvee
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground font-mono text-sm"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <section className="mb-12">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-secondary border-2 border-foreground flex items-center justify-center">
              <span className="text-3xl font-bold text-secondary-foreground">
                {dbUser.name?.[0]?.toUpperCase() ||
                  dbUser.email?.[0]?.toUpperCase() ||
                  "?"}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-1">
                {dbUser.name || "Anonymous User"}
              </h1>
              <p className="text-muted-foreground font-mono">{dbUser.email}</p>
              <div className="mt-3 flex items-center gap-4">
                <span className="font-mono text-sm px-3 py-1 border-2 border-border">
                  {dbUser.role}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  Member since {formatDate(dbUser.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Assessments Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Past Assessments</h2>
            <span className="font-mono text-sm text-muted-foreground">
              {assessments.length} total
            </span>
          </div>

          {assessments.length === 0 ? (
            <div className="border-2 border-border p-12 text-center">
              <p className="text-muted-foreground mb-4">
                No assessments yet. Start your first one to begin practicing.
              </p>
              <Link
                href="/"
                className="inline-block bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
              >
                Start Practicing
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="border-2 border-border p-6 hover:border-foreground transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg">
                        {assessment.scenario.name}
                      </h3>
                      <p className="text-muted-foreground font-mono text-sm">
                        {assessment.scenario.companyName}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-xs px-3 py-1 ${getStatusColor(assessment.status)}`}
                    >
                      {getStatusLabel(assessment.status)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-6 font-mono text-sm text-muted-foreground">
                    <span>Started: {formatDate(assessment.startedAt)}</span>
                    {assessment.completedAt && (
                      <span>
                        Completed: {formatDate(assessment.completedAt)}
                      </span>
                    )}
                  </div>

                  {assessment.cvUrl && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <a
                        href={assessment.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-foreground hover:text-secondary border-b-2 border-secondary"
                      >
                        View Submitted CV
                      </a>
                    </div>
                  )}

                  {assessment.status === "COMPLETED" && assessment.report && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Link
                        href={`/assessment/${assessment.id}/report`}
                        className="font-mono text-sm text-foreground hover:text-secondary border-b-2 border-secondary"
                      >
                        View Report
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
