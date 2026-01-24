"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Users,
  MessageSquare,
  CheckCircle2,
  Mail,
  Loader2,
  Video,
  AlertCircle,
  Check,
} from "lucide-react";
import { Card, CardContent, Badge } from "@/components/ui";
import type { ProcessingStats } from "./page";
import type { LucideIcon } from "lucide-react";

interface ProcessingClientProps {
  assessmentId: string;
  stats: ProcessingStats;
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "bg-primary/5 shadow-sm" : "shadow-sm"}>
      <CardContent className="p-6">
        <div className="mb-2 flex items-center gap-3">
          <Icon
            className={`h-5 w-5 ${highlight ? "text-primary" : "text-muted-foreground"}`}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <div
          className={`text-3xl font-semibold ${highlight ? "text-primary" : "text-foreground"}`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function CompletionBadge({
  completed,
  label,
}: {
  completed: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${completed ? "bg-green-500" : "bg-muted"}`}
      >
        {completed && <Check className="h-3 w-3 text-white" />}
      </div>
      <span
        className={`text-sm ${completed ? "font-medium text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}

export function ProcessingClient({
  assessmentId,
  stats,
}: ProcessingClientProps) {
  const router = useRouter();
  const [isPolling, setIsPolling] = useState(true);
  const [dots, setDots] = useState("");

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll for report completion
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/assessment/report?assessmentId=${assessmentId}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.report) {
            setIsPolling(false);
            router.push(`/assessment/${assessmentId}/results`);
          }
        }
      } catch (error) {
        console.error("Error polling for report:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [assessmentId, isPolling, router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <Badge variant="secondary" className="mb-2">
            {stats.companyName}
          </Badge>
          <h1 className="text-2xl font-semibold">{stats.scenarioName}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Success message */}
        <Card className="mb-8 shadow-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>

            <h2 className="mb-4 text-3xl font-semibold">
              Great work, {stats.userName}!
            </h2>
            <p className="mx-auto max-w-md text-lg text-muted-foreground">
              Your assessment is complete. We&apos;re analyzing your performance
              and generating your personalized report.
            </p>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <section className="mb-8">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Session Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard
              icon={Clock}
              label="Time Spent"
              value={`${stats.totalDurationMinutes} min`}
              highlight
            />
            <StatCard
              icon={Users}
              label="Coworkers Contacted"
              value={stats.coworkersContacted}
            />
            <StatCard
              icon={MessageSquare}
              label="Total Messages"
              value={stats.totalMessages}
            />
          </div>
        </section>

        {/* Completion checklist */}
        <Card className="mb-8 shadow-sm">
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Completed Stages
            </h3>
            <div className="space-y-3">
              <CompletionBadge
                completed={stats.hasHRInterview}
                label="HR Interview"
              />
              <CompletionBadge completed label="Manager Kickoff" />
              <CompletionBadge
                completed={stats.coworkersContacted > 0}
                label="Team Collaboration"
              />
              <CompletionBadge completed label="Coding Task" />
              <CompletionBadge
                completed={stats.hasDefenseCall}
                label="PR Defense"
              />
            </div>
          </CardContent>
        </Card>

        {/* Processing indicator */}
        <Card className="bg-muted/50 shadow-sm">
          <CardContent className="p-8">
            <div className="mb-4 flex items-center justify-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg font-semibold">
                Generating your report{dots}
              </span>
            </div>
            <p className="mx-auto mb-6 max-w-md text-center text-muted-foreground">
              Our AI is analyzing your interview responses, code quality,
              collaboration patterns, and presentation skills.
            </p>

            {/* Video Assessment Status */}
            {stats.videoAssessment && (
              <div className="mb-6 border-t border-border pt-6">
                <div className="flex items-center justify-center gap-3 text-sm">
                  {stats.videoAssessment.status === "PENDING" && (
                    <>
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Video assessment queued
                      </span>
                    </>
                  )}
                  {stats.videoAssessment.status === "PROCESSING" && (
                    <>
                      <div className="relative">
                        <Video className="h-4 w-4 text-primary" />
                        <Loader2 className="absolute -right-1 -top-1 h-3 w-3 animate-spin text-primary" />
                      </div>
                      <span className="font-medium text-foreground">
                        Video assessment in progress
                      </span>
                    </>
                  )}
                  {stats.videoAssessment.status === "COMPLETED" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">
                        Video assessment complete
                      </span>
                    </>
                  )}
                  {stats.videoAssessment.status === "FAILED" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">
                        Video assessment failed - will be retried
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Email notification */}
            <div className="flex items-center justify-center gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>
                We&apos;ll also send your full report to your email when
                it&apos;s ready.
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
