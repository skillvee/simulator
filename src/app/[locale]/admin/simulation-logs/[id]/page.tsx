import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { GenerationStepDetail } from "./client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  STARTED: "bg-blue-500/10 text-blue-600 border-blue-600",
  GENERATING: "bg-yellow-500/10 text-yellow-600 border-yellow-600",
  SAVING: "bg-purple-500/10 text-purple-600 border-purple-600",
  COMPLETED: "bg-green-500/10 text-green-600 border-green-600",
  FAILED: "bg-red-500/10 text-red-600 border-red-600",
};

export default async function SimulationLogDetailPage({ params }: PageProps) {
  await requireAdmin();

  const { id } = await params;

  const log = await db.simulationCreationLog.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { id: true, name: true } },
      generationSteps: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!log) {
    notFound();
  }

  const totalDurationMs = log.generationSteps.reduce(
    (sum, s) => sum + (s.durationMs ?? 0),
    0
  );

  return (
    <div className="px-8 py-10">
      <nav className="mb-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/simulation-logs">
            <ArrowLeft className="h-4 w-4" />
            Back to Creation Logs
          </Link>
        </Button>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-3xl font-semibold">
            {log.roleTitle || "Untitled Simulation"}
          </h1>
          <Badge
            variant="outline"
            className={STATUS_COLORS[log.status] || ""}
          >
            {log.status}
          </Badge>
          <Badge variant="secondary">{log.source}</Badge>
        </div>
        <p className="text-muted-foreground">
          Created by {log.user.name || log.user.email || "Unknown"} on{" "}
          {new Date(log.createdAt).toLocaleString()}
          {log.completedAt && (
            <> — completed {new Date(log.completedAt).toLocaleString()}</>
          )}
        </p>
      </header>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {log.companyName || "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Seniority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {log.seniorityLevel || "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {totalDurationMs > 0
                ? `${(totalDurationMs / 1000).toFixed(1)}s`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {log.scenario ? (
              <Link
                href={`/admin/simulations/${log.scenario.id}`}
                className="text-lg font-semibold text-primary hover:underline"
              >
                {log.scenario.name}
              </Link>
            ) : log.errorMessage ? (
              <p className="text-sm text-red-600">{log.errorMessage}</p>
            ) : (
              <p className="text-lg font-semibold">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tech stack */}
      {log.techStack.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Tech Stack
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {log.techStack.map((tech, i) => (
              <Badge key={i} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Error details */}
      {log.failedStep && (
        <Card className="mb-8 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Failed at: {log.failedStep}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{log.errorMessage}</p>
            {log.errorDetails && (
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-red-100 p-3 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                {JSON.stringify(log.errorDetails, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generation steps */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Generation Steps</h2>
        {log.generationSteps.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No generation steps recorded.{" "}
              {log.createdAt < new Date("2026-04-01")
                ? "This simulation was created before step logging was added."
                : "Steps will appear for new simulations."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {log.generationSteps.map((step, index) => (
              <GenerationStepDetail
                key={step.id}
                step={step as unknown as Record<string, unknown>}
                stepNumber={index + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
