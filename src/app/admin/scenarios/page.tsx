import { requireAdmin } from "@/lib/admin";
import { db } from "@/server/db";
import Link from "next/link";

export default async function ScenariosPage() {
  // Ensure only admins can access
  await requireAdmin();

  // Fetch all scenarios
  const scenarios = await db.scenario.findMany({
    include: {
      _count: {
        select: { coworkers: true, assessments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-bold text-3xl mb-2">Scenarios</h1>
          <p className="text-muted-foreground">
            Manage assessment scenarios for candidates
          </p>
        </div>
        <Link
          href="/admin/scenarios/builder"
          className="px-6 py-3 bg-secondary text-secondary-foreground font-bold border-2 border-foreground hover:bg-secondary/80"
        >
          Create with AI
        </Link>
      </header>

      {scenarios.length === 0 ? (
        <div className="border-2 border-foreground p-12 text-center">
          <div className="w-16 h-16 bg-muted border-2 border-foreground flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">?</span>
          </div>
          <h2 className="font-bold text-xl mb-2">No scenarios yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first scenario using the AI-powered builder
          </p>
          <Link
            href="/admin/scenarios/builder"
            className="px-6 py-3 bg-foreground text-background font-bold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground inline-block"
          >
            Create Scenario
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <Link
              key={scenario.id}
              href={`/admin/scenarios/${scenario.id}`}
              className="block border-2 border-foreground p-6 bg-background hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="font-bold text-xl">{scenario.name}</h2>
                    <span
                      className={`px-2 py-0.5 text-xs font-mono border ${
                        scenario.isPublished
                          ? "border-green-600 text-green-700 bg-green-50"
                          : "border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      {scenario.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {scenario.companyName}
                  </p>
                  <p className="text-sm line-clamp-2 mb-4">
                    {scenario.taskDescription}
                  </p>
                  <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
                    <span>{scenario._count.coworkers} coworkers</span>
                    <span>|</span>
                    <span>{scenario._count.assessments} assessments</span>
                    <span>|</span>
                    <span>
                      Created{" "}
                      {new Date(scenario.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {scenario.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {scenario.techStack.slice(0, 4).map((tech, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs font-mono border border-foreground bg-muted"
                        >
                          {tech}
                        </span>
                      ))}
                      {scenario.techStack.length > 4 && (
                        <span className="px-2 py-0.5 text-xs font-mono text-muted-foreground">
                          +{scenario.techStack.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
