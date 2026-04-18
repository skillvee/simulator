import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSearch } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  STARTED: "bg-blue-500/10 text-blue-600 border-blue-600",
  GENERATING: "bg-yellow-500/10 text-yellow-600 border-yellow-600",
  SAVING: "bg-purple-500/10 text-purple-600 border-purple-600",
  COMPLETED: "bg-green-500/10 text-green-600 border-green-600",
  FAILED: "bg-red-500/10 text-red-600 border-red-600",
};

const STEP_LABELS: Record<string, string> = {
  parse_jd: "Parse JD",
  generate_tasks: "Tasks",
  generate_coworkers: "Coworkers",
  generate_resources: "Resources",
  provision_repo: "Repo",
};

export default async function SimulationLogsPage() {
  await requireAdmin();

  const logs = await db.simulationCreationLog.findMany({
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { id: true, name: true } },
      generationSteps: {
        select: {
          id: true,
          stepName: true,
          status: true,
          durationMs: true,
          attempts: true,
          errorMessage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="px-8 py-10">
      <nav className="mb-6">
        <Button
          variant="ghost"
          asChild
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/admin/simulations">
            <ArrowLeft className="h-4 w-4" />
            Back to Simulations
          </Link>
        </Button>
      </nav>

      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold">Creation Logs</h1>
        <p className="text-muted-foreground">
          Audit trail for simulation creation — see prompts, AI responses, and
          errors for each generation step.
        </p>
      </header>

      {logs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <FileSearch className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No creation logs yet</h2>
          <p className="text-muted-foreground">
            Logs will appear here after simulations are created.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const totalDurationMs = log.generationSteps.reduce(
              (sum, s) => sum + (s.durationMs ?? 0),
              0
            );
            const failedSteps = log.generationSteps.filter(
              (s) => s.status === "failed"
            );

            return (
              <Link
                key={log.id}
                href={`/admin/simulation-logs/${log.id}`}
              >
                <Card className="p-5 transition-all duration-200 hover:shadow-md hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex items-center gap-3">
                        <h2 className="text-lg font-semibold truncate">
                          {log.roleTitle || "Untitled"}
                          {log.companyName && (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              at {log.companyName}
                            </span>
                          )}
                        </h2>
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[log.status] || ""}
                        >
                          {log.status}
                        </Badge>
                        <Badge variant="secondary">{log.source}</Badge>
                      </div>

                      <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          by {log.user.name || log.user.email || "Unknown"}
                        </span>
                        <span>|</span>
                        <span>
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        {totalDurationMs > 0 && (
                          <>
                            <span>|</span>
                            <span>
                              {(totalDurationMs / 1000).toFixed(1)}s total
                            </span>
                          </>
                        )}
                        {log.scenario && (
                          <>
                            <span>|</span>
                            <span className="text-green-600">
                              &rarr; {log.scenario.name}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Step pipeline visualization */}
                      {log.generationSteps.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {log.generationSteps.map((step) => (
                            <div
                              key={step.id}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                step.status === "completed"
                                  ? "bg-green-500/10 text-green-600"
                                  : step.status === "failed"
                                    ? "bg-red-500/10 text-red-600"
                                    : "bg-blue-500/10 text-blue-600"
                              }`}
                            >
                              {STEP_LABELS[step.stepName] || step.stepName}
                              {step.durationMs != null && (
                                <span className="opacity-60">
                                  {(step.durationMs / 1000).toFixed(1)}s
                                </span>
                              )}
                              {step.attempts > 1 && (
                                <span className="opacity-60">
                                  ({step.attempts}x)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Error message */}
                      {(log.errorMessage || failedSteps.length > 0) && (
                        <p className="mt-2 text-sm text-red-600 truncate">
                          {log.errorMessage ||
                            failedSteps[0]?.errorMessage ||
                            "Generation step failed"}
                        </p>
                      )}
                    </div>

                    {/* Tech stack badges */}
                    {log.techStack.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1 shrink-0">
                        {log.techStack.slice(0, 3).map((tech, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {log.techStack.length > 3 && (
                          <span className="px-1.5 py-0.5 text-xs text-muted-foreground">
                            +{log.techStack.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
