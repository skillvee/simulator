import { requireCandidate } from "@/lib/core";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Prisma, AssessmentStatus, VideoAssessmentStatus } from "@prisma/client";
import type { AssessmentReport } from "@/types";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AccountDeletionSection } from "@/app/[locale]/settings/account-deletion-section";

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

  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getStatusLabel(status: AssessmentStatus): string {
  const labels: Record<AssessmentStatus, string> = {
    WELCOME: "Pending",
    WORKING: "In Progress",
    COMPLETED: "Completed",
  };
  return labels[status];
}

function getStatusColor(status: AssessmentStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-green-50 text-green-700 border-green-200";
    case "WORKING":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-stone-50 text-stone-600 border-stone-200";
  }
}

function getReportData(report: Prisma.JsonValue): AssessmentReport | null {
  if (!report || typeof report !== "object") return null;
  return report as unknown as AssessmentReport;
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    exceptional: "text-green-600",
    strong: "text-blue-600",
    adequate: "text-stone-600",
    developing: "text-amber-600",
    needs_improvement: "text-red-600",
  };
  return colors[level] || "text-stone-600";
}

function ScoreBar({ score }: { score: number }) {
  const segments = Array.from({ length: 5 }, (_, i) => i + 1);
  return (
    <div className="flex gap-0.5">
      {segments.map((segment) => (
        <div
          key={segment}
          className={`h-2 w-3 rounded-sm ${
            segment <= score ? "bg-blue-600" : "bg-stone-200"
          }`}
        />
      ))}
    </div>
  );
}

interface AssessmentWithReport {
  id: string;
  status: AssessmentStatus;
  startedAt: Date;
  completedAt: Date | null;
  report: Prisma.JsonValue;
  scenario: { name: string; companyName: string };
  videoAssessment: {
    status: VideoAssessmentStatus;
    retryCount: number;
    lastFailureReason: string | null;
  } | null;
}

interface TrendData {
  assessmentId: string;
  date: Date;
  score: number;
  level: string;
}

function ImprovementTrends({ assessments }: { assessments: AssessmentWithReport[] }) {
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

  const maxScore = 5;
  const minScore = 1;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-stone-900">Improvement Trends</h2>
      <Card className="border-stone-200">
        <CardContent className="p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">
                {trendData.length} completed assessments
              </p>
              <p className="mt-1 text-base font-semibold">
                {improvement > 0 ? (
                  <span className="text-green-600">
                    +{improvement.toFixed(1)} points ({improvementPercentage > 0 ? "+" : ""}{improvementPercentage}%)
                  </span>
                ) : improvement < 0 ? (
                  <span className="text-red-600">
                    {improvement.toFixed(1)} points ({improvementPercentage}%)
                  </span>
                ) : (
                  <span className="text-stone-500">No change</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500 uppercase tracking-wide">Latest Score</p>
              <p className="text-2xl font-semibold text-blue-600">{lastScore.toFixed(1)}/5</p>
            </div>
          </div>

          <div className="relative h-24 border-b border-l border-stone-200">
            <div className="absolute -left-8 top-0 text-xs text-stone-400">{maxScore}</div>
            <div className="absolute -left-8 bottom-0 text-xs text-stone-400">{minScore}</div>
            <div className="absolute inset-0 flex items-end justify-around px-4">
              {trendData.map((data, index) => {
                const heightPercentage = ((data.score - minScore) / (maxScore - minScore)) * 100;
                const prevData = index > 0 ? trendData[index - 1] : null;
                return (
                  <div key={data.assessmentId} className="relative flex flex-col items-center" style={{ height: "100%" }}>
                    {prevData && (
                      <div
                        className="absolute h-px w-full bg-blue-500 opacity-50"
                        style={{
                          bottom: `${((prevData.score - minScore) / (maxScore - minScore)) * 100}%`,
                          transform: `rotate(${Math.atan2((data.score - prevData.score) * (100 / (maxScore - minScore)), 100 / trendData.length)}rad)`,
                          transformOrigin: "left center",
                        }}
                      />
                    )}
                    <div
                      className="absolute h-3 w-3 rounded-full bg-blue-600"
                      style={{ bottom: `${heightPercentage}%`, transform: "translateY(50%)" }}
                      title={`${data.score.toFixed(1)}/5 on ${formatDate(data.date)}`}
                    />
                    <div
                      className="absolute text-xs font-medium text-stone-700"
                      style={{ bottom: `${heightPercentage}%`, transform: "translateY(-100%)" }}
                    >
                      {data.score.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex justify-around px-4">
            {trendData.map((data) => (
              <div key={data.assessmentId} className="text-center text-xs text-stone-400">
                {formatDate(data.date)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default async function CandidateProfilePage() {
  const sessionUser = await requireCandidate();

  const dbUser = await db.user.findUnique({
    where: { id: sessionUser.id, deletedAt: null },
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
    where: { userId: sessionUser.id },
    include: {
      scenario: { select: { name: true, companyName: true } },
      videoAssessment: {
        select: { status: true, retryCount: true, lastFailureReason: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Profile & Settings</h1>
      </div>

      {/* Profile Card */}
      <section className="mb-8">
        <Card className="border-stone-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-5">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-blue-50 text-2xl font-semibold text-blue-600">
                  {dbUser.name?.[0]?.toUpperCase() || dbUser.email?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-stone-900">
                  {dbUser.name || "Anonymous User"}
                </h2>
                <p className="text-sm text-stone-500">{dbUser.email}</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-xs text-stone-400">
                    Member since {formatDate(dbUser.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Account Information */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Account</h2>
        <Card className="border-stone-200">
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">Name</p>
                  <p className="text-xs text-stone-500">{dbUser.name || "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-b border-stone-100 py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">Email</p>
                  <p className="text-xs text-stone-500">{dbUser.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-stone-900">Member Since</p>
                  <p className="text-xs text-stone-500">
                    {new Intl.DateTimeFormat("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }).format(dbUser.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Privacy */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Privacy</h2>
        <Card className="border-stone-200">
          <CardContent className="p-0">
            <Link
              href="/privacy"
              className="group flex items-center justify-between p-5 transition-colors hover:bg-stone-50"
            >
              <div>
                <p className="text-sm font-medium text-stone-900 group-hover:text-blue-600">
                  Privacy Policy
                </p>
                <p className="text-xs text-stone-500">
                  Read how we handle your data
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-blue-600" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Improvement Trends */}
      <ImprovementTrends assessments={assessments} />

      {/* Past Assessments */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Past Assessments</h2>
          <span className="text-xs text-stone-400">{assessments.length} total</span>
        </div>

        {assessments.length === 0 ? (
          <Card className="border-stone-200">
            <CardContent className="p-10 text-center">
              <p className="text-stone-500">
                No assessments yet. You&apos;ll see your history here after completing a simulation.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {assessments.map((assessment) => {
              const report = getReportData(assessment.report);
              const timeSpent = formatDuration(assessment.startedAt, assessment.completedAt);

              return (
                <Card key={assessment.id} className="border-stone-200 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-stone-900">{assessment.scenario.name}</h3>
                        <p className="text-xs text-stone-400">{assessment.scenario.companyName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {report && (
                          <div className="text-right">
                            <div className="flex items-center gap-1.5">
                              <ScoreBar score={Math.round(report.overallScore)} />
                              <span className="text-sm font-semibold text-stone-900">
                                {report.overallScore.toFixed(1)}
                              </span>
                            </div>
                            <span className={`text-[10px] ${getLevelColor(report.overallLevel)}`}>
                              {report.overallLevel.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusColor(assessment.status)}`}>
                          {getStatusLabel(assessment.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-stone-400">
                      <span>Started {formatDate(assessment.startedAt)}</span>
                      {assessment.completedAt && (
                        <span>Completed {formatDate(assessment.completedAt)}</span>
                      )}
                      {assessment.completedAt && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-stone-400 border-stone-200">
                          {timeSpent}
                        </Badge>
                      )}
                    </div>

                    {report && (
                      <div className="mt-3 border-t border-stone-100 pt-3">
                        <p className="line-clamp-2 text-xs text-stone-500">
                          {report.narrative?.overallSummary?.substring(0, 200)}
                          {(report.narrative?.overallSummary?.length || 0) > 200 && "..."}
                        </p>
                      </div>
                    )}

                    {assessment.videoAssessment?.status === "FAILED" && (
                      <div className="mt-3 border-t border-stone-100 pt-3">
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
                          <div>
                            <p className="text-xs font-medium text-red-800">Assessment unavailable</p>
                            <p className="text-[10px] text-red-600">
                              Processing failed after {assessment.videoAssessment.retryCount} attempt{assessment.videoAssessment.retryCount !== 1 ? "s" : ""}.
                              {assessment.videoAssessment.lastFailureReason && (
                                <span className="block font-mono mt-0.5">
                                  {assessment.videoAssessment.lastFailureReason}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3 border-t border-stone-100 pt-3">
                      {assessment.status === "COMPLETED" && assessment.report && (
                        <Link
                          href={`/assessments/${assessment.id}/results`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          View Full Report
                        </Link>
                      )}
                      {assessment.status !== "COMPLETED" && (
                        <Button size="sm" asChild className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
                          <Link href={`/assessments/${assessment.id}/work`}>
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

      {/* Danger Zone - Account Deletion */}
      <AccountDeletionSection deletionRequestedAt={dbUser.dataDeleteRequestedAt} />
    </div>
  );
}
