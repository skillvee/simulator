import { db } from "@/server/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RunEvalButton } from "./run-eval-button";

function scoreColor(score: number | null): string {
  if (!score) return "text-muted-foreground";
  if (score >= 4.0) return "text-green-600";
  if (score >= 3.0) return "text-yellow-600";
  return "text-red-600";
}

function scoreBadge(score: number | null) {
  if (!score) return <Badge variant="secondary">—</Badge>;
  if (score >= 4.0) return <Badge className="bg-green-100 text-green-800">{score.toFixed(2)}</Badge>;
  if (score >= 3.0) return <Badge className="bg-yellow-100 text-yellow-800">{score.toFixed(2)}</Badge>;
  return <Badge className="bg-red-100 text-red-800">{score.toFixed(2)}</Badge>;
}

export default async function EvalsPage() {
  const runs = await db.evalRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { results: true } },
      results: {
        select: { flagged: true },
      },
    },
  });

  return (
    <div className="px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Prompt Evals</h1>
          <p className="mt-1 text-muted-foreground">
            Measure and compare simulation prompt quality
          </p>
        </div>
        <RunEvalButton />
      </div>

      {runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No eval runs yet. Run your first eval from the CLI:
            <br />
            <code className="mt-2 inline-block rounded bg-muted px-3 py-1">
              npx tsx scripts/run-evals.ts --name &quot;baseline&quot;
            </code>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const flaggedCount = run.results.filter((r) => r.flagged).length;
            return (
              <Link key={run.id} href={`/admin/evals/${run.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="flex items-center gap-6 py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{run.name}</span>
                        <Badge variant="outline">{run.promptVersion}</Badge>
                        <Badge variant={run.status === "completed" ? "default" : "secondary"}>
                          {run.status}
                        </Badge>
                        {flaggedCount > 0 && (
                          <Badge variant="destructive">{flaggedCount} flagged</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {run.scenarioCount} scenarios &middot; {run.model} &middot;{" "}
                        {new Date(run.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${scoreColor(run.overallScore)}`}>
                      {run.overallScore?.toFixed(2) || "—"}
                      <span className="text-sm font-normal text-muted-foreground">/5</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
