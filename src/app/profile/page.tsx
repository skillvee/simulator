import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma, UserRole, AssessmentStatus, VideoAssessmentStatus } from "@prisma/client";
import { ProfileCVSection } from "@/components/profile-cv-section";
import { ParsedProfileDisplay } from "@/components/parsed-profile-display";
import type { AssessmentReport } from "@/lib/assessment-aggregation";
import { profileFromPrismaJson } from "@/lib/cv-parser";
import { AdminNav } from "@/components/admin-nav";
import { DataDeletionSection } from "@/components/data-deletion-section";
import { AlertTriangle } from "lucide-react";

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

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  if (!completedAt) return "-";
  const durationMs = completedAt.getTime() - startedAt.getTime();
  const totalMinutes = Math.round(durationMs / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    exceptional: "text-secondary",
    strong: "text-green-600",
    adequate: "text-blue-600",
    developing: "text-yellow-600",
    needs_improvement: "text-red-600",
  };
  return colors[level] || "text-foreground";
}

interface AssessmentWithReport {
  id: string;
  status: AssessmentStatus;
  startedAt: Date;
  completedAt: Date | null;
  cvUrl: string | null;
  report: Prisma.JsonValue;
  scenario: {
    name: string;
    companyName: string;
  };
  videoAssessment: {
    status: VideoAssessmentStatus;
    retryCount: number;
    lastFailureReason: string | null;
  } | null;
}

function getReportData(report: Prisma.JsonValue): AssessmentReport | null {
  if (!report || typeof report !== "object") return null;
  return report as unknown as AssessmentReport;
}

function ScoreBar({ score }: { score: number }) {
  const segments = Array.from({ length: 5 }, (_, i) => i + 1);
  return (
    <div className="flex gap-0.5">
      {segments.map((segment) => (
        <div
          key={segment}
          className={`h-2 w-3 ${
            segment <= score ? "bg-secondary" : "bg-muted"
          } border border-foreground`}
        />
      ))}
    </div>
  );
}

interface TrendData {
  assessmentId: string;
  date: Date;
  score: number;
  level: string;
}

function ImprovementTrends({ assessments }: { assessments: AssessmentWithReport[] }) {
  // Filter completed assessments with reports and build trend data
  const trendData: TrendData[] = assessments
    .filter((a) => a.status === "COMPLETED" && a.report)
    .map((a) => {
      const report = getReportData(a.report);
      return {
        assessmentId: a.id,
        date: a.completedAt || a.startedAt,
        score: report?.overallScore || 0,
        level: report?.overallLevel || "unknown",
      };
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (trendData.length < 2) return null;

  const firstScore = trendData[0].score;
  const lastScore = trendData[trendData.length - 1].score;
  const improvement = lastScore - firstScore;
  const improvementPercentage = Math.round((improvement / firstScore) * 100);

  // Calculate max and min for the chart
  const maxScore = 5;
  const minScore = 1;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6">Improvement Trends</h2>
      <div className="border-2 border-foreground p-6">
        {/* Summary */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-muted-foreground font-mono text-sm">
              {trendData.length} completed assessments
            </p>
            <p className="text-lg font-bold mt-1">
              {improvement > 0 ? (
                <span className="text-green-600">
                  +{improvement.toFixed(1)} points ({improvementPercentage > 0 ? "+" : ""}
                  {improvementPercentage}%)
                </span>
              ) : improvement < 0 ? (
                <span className="text-red-600">
                  {improvement.toFixed(1)} points ({improvementPercentage}%)
                </span>
              ) : (
                <span className="text-muted-foreground">No change</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs text-muted-foreground">LATEST SCORE</p>
            <p className="text-3xl font-bold">{lastScore.toFixed(1)}/5</p>
          </div>
        </div>

        {/* Visual trend chart */}
        <div className="relative h-24 border-l-2 border-b-2 border-border">
          {/* Y-axis labels */}
          <div className="absolute -left-8 top-0 font-mono text-xs text-muted-foreground">
            {maxScore}
          </div>
          <div className="absolute -left-8 bottom-0 font-mono text-xs text-muted-foreground">
            {minScore}
          </div>

          {/* Data points and lines */}
          <div className="absolute inset-0 flex items-end justify-around px-4">
            {trendData.map((data, index) => {
              const heightPercentage =
                ((data.score - minScore) / (maxScore - minScore)) * 100;
              const prevData = index > 0 ? trendData[index - 1] : null;

              return (
                <div
                  key={data.assessmentId}
                  className="relative flex flex-col items-center"
                  style={{ height: "100%" }}
                >
                  {/* Trend line connector */}
                  {prevData && (
                    <div
                      className="absolute w-full h-px bg-secondary opacity-50"
                      style={{
                        bottom: `${((prevData.score - minScore) / (maxScore - minScore)) * 100}%`,
                        transform: `rotate(${Math.atan2(
                          (data.score - prevData.score) * (100 / (maxScore - minScore)),
                          100 / trendData.length
                        )}rad)`,
                        transformOrigin: "left center",
                      }}
                    />
                  )}
                  {/* Data point */}
                  <div
                    className="absolute w-3 h-3 bg-secondary border-2 border-foreground"
                    style={{
                      bottom: `${heightPercentage}%`,
                      transform: "translateY(50%)",
                    }}
                    title={`${data.score.toFixed(1)}/5 on ${formatDate(data.date)}`}
                  />
                  {/* Score label */}
                  <div
                    className="absolute font-mono text-xs font-bold"
                    style={{
                      bottom: `${heightPercentage}%`,
                      transform: "translateY(-100%)",
                    }}
                  >
                    {data.score.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-axis dates */}
        <div className="flex justify-around mt-2 px-4">
          {trendData.map((data) => (
            <div
              key={data.assessmentId}
              className="font-mono text-xs text-muted-foreground text-center"
            >
              {formatDate(data.date)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
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
      dataDeleteRequestedAt: true,
      cvUrl: true,
      parsedProfile: true,
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
      videoAssessment: {
        select: {
          status: true,
          retryCount: true,
          lastFailureReason: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get parsed profile from User (not Assessment)
  const parsedProfile = dbUser.parsedProfile
    ? profileFromPrismaJson(dbUser.parsedProfile)
    : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b-2 border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            Skillvee
          </Link>
          <nav className="flex items-center gap-4">
            <AdminNav />
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground font-mono text-sm"
            >
              Settings
            </Link>
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

        {/* CV Upload Section */}
        <ProfileCVSection
          initialCvUrl={dbUser.cvUrl}
        />

        {/* Parsed Profile Display - shows when profile exists */}
        <ParsedProfileDisplay profile={parsedProfile} />

        {/* Data & Privacy Section */}
        <DataDeletionSection
          deletionRequestedAt={dbUser.dataDeleteRequestedAt}
        />

        {/* Improvement Trends Section - only shows with 2+ completed assessments */}
        <ImprovementTrends assessments={assessments} />

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
              {assessments.map((assessment) => {
                const report = getReportData(assessment.report);
                const timeSpent = formatDuration(
                  assessment.startedAt,
                  assessment.completedAt
                );

                return (
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
                      <div className="flex items-center gap-3">
                        {/* Overall Score - only for completed assessments with reports */}
                        {report && (
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <ScoreBar score={Math.round(report.overallScore)} />
                              <span className="font-bold text-lg">
                                {report.overallScore.toFixed(1)}
                              </span>
                            </div>
                            <span
                              className={`font-mono text-xs ${getLevelColor(report.overallLevel)}`}
                            >
                              {report.overallLevel.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span
                          className={`font-mono text-xs px-3 py-1 ${getStatusColor(assessment.status)}`}
                        >
                          {getStatusLabel(assessment.status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-6 font-mono text-sm text-muted-foreground">
                      <span>Started: {formatDate(assessment.startedAt)}</span>
                      {assessment.completedAt && (
                        <span>
                          Completed: {formatDate(assessment.completedAt)}
                        </span>
                      )}
                      {assessment.completedAt && (
                        <span className="bg-muted px-2 py-0.5 border border-border">
                          Time: {timeSpent}
                        </span>
                      )}
                    </div>

                    {/* Report Summary - only for completed assessments */}
                    {report && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.narrative?.overallSummary?.substring(0, 200)}
                          {(report.narrative?.overallSummary?.length || 0) > 200 && "..."}
                        </p>
                      </div>
                    )}

                    {/* Assessment unavailable message - for failed video assessments */}
                    {assessment.videoAssessment?.status === "FAILED" && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-3 p-3 bg-red-50 border-2 border-red-200 dark:bg-red-950 dark:border-red-800">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                              Assessment unavailable
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                              Video assessment could not be processed after {assessment.videoAssessment.retryCount} attempt{assessment.videoAssessment.retryCount !== 1 ? "s" : ""}.
                              {assessment.videoAssessment.lastFailureReason && (
                                <span className="block mt-1 font-mono">
                                  Reason: {assessment.videoAssessment.lastFailureReason}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
                      {assessment.cvUrl && (
                        <a
                          href={assessment.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-foreground hover:text-secondary border-b-2 border-secondary"
                        >
                          View Submitted CV
                        </a>
                      )}

                      {assessment.status === "COMPLETED" && assessment.report && (
                        <Link
                          href={`/assessment/${assessment.id}/results`}
                          className="font-mono text-sm text-foreground hover:text-secondary border-b-2 border-secondary"
                        >
                          View Full Report
                        </Link>
                      )}

                      {assessment.status !== "COMPLETED" && (
                        <Link
                          href={`/assessment/${assessment.id}/hr-interview`}
                          className="font-mono text-sm bg-foreground text-background px-3 py-1 hover:bg-secondary hover:text-secondary-foreground"
                        >
                          Continue Assessment
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
