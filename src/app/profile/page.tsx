import { auth } from "@/auth";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type {
  Prisma,
  UserRole,
  AssessmentStatus,
  VideoAssessmentStatus,
} from "@prisma/client";
import type { AssessmentReport } from "@/types";
import { AdminNav, DataDeletionSection } from "@/components/admin";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ExtendedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: UserRole;
}

function getStatusLabel(status: AssessmentStatus): string {
  const labels: Record<AssessmentStatus, string> = {
    WELCOME: "Welcome",
    WORKING: "Working",
    COMPLETED: "Completed",
  };
  return labels[status];
}

function getStatusColor(status: AssessmentStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-500/10 text-green-600";
    default:
      return "bg-primary/10 text-primary";
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
    exceptional: "text-primary",
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
          className={`h-2 w-3 rounded-sm ${
            segment <= score ? "bg-primary" : "bg-muted"
          }`}
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

function ImprovementTrends({
  assessments,
}: {
  assessments: AssessmentWithReport[];
}) {
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
      <h2 className="mb-6 text-2xl font-semibold">Improvement Trends</h2>
      <Card>
        <CardContent className="p-6">
          {/* Summary */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {trendData.length} completed assessments
              </p>
              <p className="mt-1 text-lg font-semibold">
                {improvement > 0 ? (
                  <span className="text-green-600">
                    +{improvement.toFixed(1)} points (
                    {improvementPercentage > 0 ? "+" : ""}
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Latest Score
              </p>
              <p className="text-3xl font-semibold text-primary">{lastScore.toFixed(1)}/5</p>
            </div>
          </div>

          {/* Visual trend chart */}
          <div className="relative h-24 border-b border-l border-border">
            {/* Y-axis labels */}
            <div className="absolute -left-8 top-0 text-xs text-muted-foreground">
              {maxScore}
            </div>
            <div className="absolute -left-8 bottom-0 text-xs text-muted-foreground">
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
                        className="absolute h-px w-full bg-primary opacity-50"
                        style={{
                          bottom: `${((prevData.score - minScore) / (maxScore - minScore)) * 100}%`,
                          transform: `rotate(${Math.atan2(
                            (data.score - prevData.score) *
                              (100 / (maxScore - minScore)),
                            100 / trendData.length
                          )}rad)`,
                          transformOrigin: "left center",
                        }}
                      />
                    )}
                    {/* Data point */}
                    <div
                      className="absolute h-3 w-3 rounded-full bg-primary"
                      style={{
                        bottom: `${heightPercentage}%`,
                        transform: "translateY(50%)",
                      }}
                      title={`${data.score.toFixed(1)}/5 on ${formatDate(data.date)}`}
                    />
                    {/* Score label */}
                    <div
                      className="absolute text-xs font-medium"
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
          <div className="mt-2 flex justify-around px-4">
            {trendData.map((data) => (
              <div
                key={data.assessmentId}
                className="text-center text-xs text-muted-foreground"
              >
                {formatDate(data.date)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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

  return (
    <main className="min-h-screen animate-page-enter bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold">
            Skillvee
          </Link>
          <nav className="flex items-center gap-4">
            <AdminNav />
            <Link
              href="/settings"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Settings
            </Link>
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Profile Header */}
        <section className="mb-12">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary/10 text-3xl font-semibold text-primary">
                    {dbUser.name?.[0]?.toUpperCase() ||
                      dbUser.email?.[0]?.toUpperCase() ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="mb-1 text-3xl font-semibold">
                    {dbUser.name || "Anonymous User"}
                  </h1>
                  <p className="text-muted-foreground">{dbUser.email}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <Badge variant="outline" className="rounded-md">
                      {dbUser.role}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Member since {formatDate(dbUser.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data & Privacy Section */}
        <DataDeletionSection
          deletionRequestedAt={dbUser.dataDeleteRequestedAt}
        />

        {/* Improvement Trends Section - only shows with 2+ completed assessments */}
        <ImprovementTrends assessments={assessments} />

        {/* Assessments Section */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Past Assessments</h2>
            <span className="text-sm text-muted-foreground">
              {assessments.length} total
            </span>
          </div>

          {assessments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  No assessments yet. Start your first one to begin practicing.
                </p>
                <Button asChild>
                  <Link href="/">Start Practicing</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => {
                const report = getReportData(assessment.report);
                const timeSpent = formatDuration(
                  assessment.startedAt,
                  assessment.completedAt
                );

                return (
                  <Card
                    key={assessment.id}
                    className="transition-all duration-200 hover:shadow-md"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {assessment.scenario.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {assessment.scenario.companyName}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Overall Score - only for completed assessments with reports */}
                          {report && (
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <ScoreBar
                                  score={Math.round(report.overallScore)}
                                />
                                <span className="text-lg font-semibold">
                                  {report.overallScore.toFixed(1)}
                                </span>
                              </div>
                              <span
                                className={`text-xs ${getLevelColor(report.overallLevel)}`}
                              >
                                {report.overallLevel
                                  .replace(/_/g, " ")
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}
                          <Badge
                            variant="secondary"
                            className={`rounded-md ${getStatusColor(assessment.status)}`}
                          >
                            {getStatusLabel(assessment.status)}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
                        <span>Started: {formatDate(assessment.startedAt)}</span>
                        {assessment.completedAt && (
                          <span>
                            Completed: {formatDate(assessment.completedAt)}
                          </span>
                        )}
                        {assessment.completedAt && (
                          <Badge variant="outline" className="rounded-md">
                            Time: {timeSpent}
                          </Badge>
                        )}
                      </div>

                      {/* Report Summary - only for completed assessments */}
                      {report && (
                        <div className="mt-4 border-t border-border pt-4">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {report.narrative?.overallSummary?.substring(0, 200)}
                            {(report.narrative?.overallSummary?.length || 0) >
                              200 && "..."}
                          </p>
                        </div>
                      )}

                      {/* Assessment unavailable message - for failed video assessments */}
                      {assessment.videoAssessment?.status === "FAILED" && (
                        <div className="mt-4 border-t border-border pt-4">
                          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                            <div>
                              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                                Assessment unavailable
                              </p>
                              <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                                Video assessment could not be processed after{" "}
                                {assessment.videoAssessment.retryCount} attempt
                                {assessment.videoAssessment.retryCount !== 1
                                  ? "s"
                                  : ""}
                                .
                                {assessment.videoAssessment.lastFailureReason && (
                                  <span className="mt-1 block font-mono">
                                    Reason:{" "}
                                    {assessment.videoAssessment.lastFailureReason}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
                        {assessment.status === "COMPLETED" &&
                          assessment.report && (
                            <Link
                              href={`/assessments/${assessment.id}/results`}
                              className="text-sm text-primary transition-colors hover:text-primary/80"
                            >
                              View Full Report
                            </Link>
                          )}

                        {assessment.status !== "COMPLETED" && (
                          <Button size="sm" asChild>
                            <Link
                              href={`/assessments/${assessment.id}/work`}
                            >
                              Continue Assessment
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
