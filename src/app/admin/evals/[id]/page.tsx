import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Judgment {
  judgeId: string;
  naturalness: number;
  roleAccuracy: number;
  brevity: number;
  contextAwareness: number;
  infoDiscipline: number;
  reasoning: string;
}

function scoreBar(score: number | null, max = 5) {
  if (!score) return null;
  const pct = ((score / max) * 100).toFixed(0);
  const color = score >= 4 ? "bg-green-500" : score >= 3 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-mono">{score.toFixed(1)}</span>
    </div>
  );
}

export default async function EvalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const run = await db.evalRun.findUnique({
    where: { id },
    include: {
      results: { orderBy: { scenarioId: "asc" } },
    },
  });

  if (!run) notFound();

  // Compute dimension averages
  const dims = ["naturalness", "roleAccuracy", "brevity", "contextAwareness", "infoDiscipline"] as const;
  const dimAvgs: Record<string, number> = {};
  for (const dim of dims) {
    const values = run.results.map((r) => (r[dim] as number) || 0);
    dimAvgs[dim] = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  // Group by category
  const categories = new Map<string, typeof run.results>();
  for (const r of run.results) {
    const cat = categories.get(r.category) || [];
    cat.push(r);
    categories.set(r.category, cat);
  }

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold">{run.name}</h1>
          <Badge variant={run.status === "completed" ? "default" : "secondary"}>
            {run.status}
          </Badge>
        </div>
        <p className="mt-1 text-muted-foreground">
          {run.scenarioCount} scenarios &middot; {run.model} &middot; {run.promptVersion} &middot;{" "}
          {run.completedAt
            ? new Date(run.completedAt).toLocaleString()
            : "In progress"}
        </p>
      </div>

      {/* Overall Score + Dimensions */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">
              {run.overallScore?.toFixed(2) || "—"}
              <span className="text-lg font-normal text-muted-foreground">/5.00</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dims.map((dim) => (
              <div key={dim} className="flex items-center justify-between">
                <span className="text-sm capitalize">{dim.replace(/([A-Z])/g, " $1").trim()}</span>
                {scoreBar(dimAvgs[dim])}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Results by Category */}
      {Array.from(categories.entries()).map(([category, results]) => (
        <div key={category} className="mb-8">
          <h2 className="mb-4 text-xl font-semibold capitalize">{category} Scenarios</h2>
          <div className="space-y-4">
            {results.map((result) => {
              const judgments = (result.judgments as unknown as Judgment[]) || [];
              return (
                <Card key={result.id} className={result.flagged ? "border-red-200" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{result.scenarioName}</CardTitle>
                        {result.flagged && <Badge variant="destructive">Flagged</Badge>}
                      </div>
                      <div className="text-lg font-bold font-mono">
                        {result.overallScore?.toFixed(1) || "—"}/5
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Scores */}
                    <div className="mb-4 flex flex-wrap gap-4">
                      {dims.map((dim) => (
                        <div key={dim} className="text-sm">
                          <span className="text-muted-foreground capitalize">
                            {dim.replace(/([A-Z])/g, " $1").trim()}:
                          </span>{" "}
                          <span className="font-mono font-medium">
                            {(result[dim] as number)?.toFixed(1) || "—"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* User Message */}
                    <div className="mb-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">User Message</div>
                      <div className="rounded bg-blue-50 p-3 text-sm">{result.userMessage}</div>
                    </div>

                    {/* Response */}
                    <div className="mb-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Response</div>
                      <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">
                        {result.response}
                      </div>
                    </div>

                    {/* Judge Reasoning */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        Judge reasoning ({judgments.length} judges) &middot; {result.generationMs}ms generation
                      </summary>
                      <div className="mt-2 space-y-2">
                        {judgments.map((j) => (
                          <div key={j.judgeId} className="rounded bg-muted/50 p-2 text-xs">
                            <span className="font-medium">{j.judgeId}:</span>{" "}
                            {j.reasoning}
                            <span className="ml-2 text-muted-foreground">
                              (N:{j.naturalness} R:{j.roleAccuracy} B:{j.brevity} C:{j.contextAwareness} I:{j.infoDiscipline})
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>

                    {/* Full Prompt (collapsible) */}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                        View full prompt
                      </summary>
                      <pre className="mt-2 max-h-60 overflow-auto rounded bg-muted/50 p-3 text-xs whitespace-pre-wrap">
                        {result.prompt}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Run ID for API access */}
      <div className="mt-8 rounded bg-muted p-4 text-sm text-muted-foreground">
        <div className="font-medium mb-1">API Access (for Claude Code sessions)</div>
        <code>GET /api/admin/evals/{run.id}</code>
        <div className="mt-1">Run ID: <code>{run.id}</code></div>
      </div>
    </div>
  );
}
