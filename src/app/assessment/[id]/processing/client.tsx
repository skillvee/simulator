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
} from "lucide-react";
import type { ProcessingStats } from "./page";

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
  icon: React.ElementType;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border-2 border-foreground p-6 ${highlight ? "bg-secondary" : "bg-background"}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon
          className={`w-5 h-5 ${highlight ? "text-secondary-foreground" : "text-muted-foreground"}`}
        />
        <span
          className={`font-mono text-xs ${highlight ? "text-secondary-foreground" : "text-muted-foreground"}`}
        >
          {label}
        </span>
      </div>
      <div
        className={`text-3xl font-bold ${highlight ? "text-secondary-foreground" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
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
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 border-2 border-foreground flex items-center justify-center ${completed ? "bg-secondary" : "bg-muted"}`}
      >
        {completed && (
          <CheckCircle2 className="w-4 h-4 text-secondary-foreground" />
        )}
      </div>
      <span
        className={`font-mono text-sm ${completed ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}

export function ProcessingClient({ assessmentId, stats }: ProcessingClientProps) {
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
      <header className="border-b-2 border-foreground bg-background">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="inline-block bg-secondary text-secondary-foreground px-3 py-1 font-mono text-xs mb-2">
            {stats.companyName}
          </div>
          <h1 className="text-2xl font-bold">{stats.scenarioName}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Success message */}
        <section className="border-2 border-foreground p-8 mb-8 text-center">
          <div className="w-20 h-20 bg-secondary border-2 border-foreground mx-auto mb-6 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-secondary-foreground" />
          </div>

          <h2 className="text-3xl font-bold mb-4">
            Great work, {stats.userName}!
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your assessment is complete. We&apos;re analyzing your performance and
            generating your personalized report.
          </p>
        </section>

        {/* Quick stats */}
        <section className="mb-8">
          <h3 className="font-mono text-sm text-muted-foreground mb-4">
            SESSION SUMMARY
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              icon={Clock}
              label="TIME SPENT"
              value={`${stats.totalDurationMinutes} min`}
              highlight
            />
            <StatCard
              icon={Users}
              label="COWORKERS CONTACTED"
              value={stats.coworkersContacted}
            />
            <StatCard
              icon={MessageSquare}
              label="TOTAL MESSAGES"
              value={stats.totalMessages}
            />
          </div>
        </section>

        {/* Completion checklist */}
        <section className="mb-8 border-2 border-foreground p-6">
          <h3 className="font-mono text-sm text-muted-foreground mb-4">
            COMPLETED STAGES
          </h3>
          <div className="space-y-3">
            <CompletionBadge completed={stats.hasHRInterview} label="HR Interview" />
            <CompletionBadge completed label="Manager Kickoff" />
            <CompletionBadge completed={stats.coworkersContacted > 0} label="Team Collaboration" />
            <CompletionBadge completed label="Coding Task" />
            <CompletionBadge completed={stats.hasDefenseCall} label="PR Defense" />
          </div>
        </section>

        {/* Processing indicator */}
        <section className="border-2 border-foreground p-8 bg-muted">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
            <span className="text-lg font-bold">
              Generating your report{dots}
            </span>
          </div>
          <p className="text-center text-muted-foreground max-w-md mx-auto mb-6">
            Our AI is analyzing your interview responses, code quality, collaboration
            patterns, and presentation skills.
          </p>

          {/* Email notification */}
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground border-t border-border pt-6">
            <Mail className="w-4 h-4" />
            <span>
              We&apos;ll also send your full report to your email when it&apos;s ready.
            </span>
          </div>
        </section>

        {/* Decorative elements */}
        <div className="mt-12 flex justify-center gap-4">
          <div
            className="w-8 h-8 bg-secondary"
            style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
          />
          <div
            className="w-8 h-8 bg-foreground"
            style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
          />
          <div
            className="w-8 h-8 bg-secondary"
            style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
          />
        </div>
      </main>
    </div>
  );
}
