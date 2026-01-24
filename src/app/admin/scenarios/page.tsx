import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileQuestion } from "lucide-react";

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
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-semibold">Scenarios</h1>
          <p className="text-muted-foreground">
            Manage assessment scenarios for candidates
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/scenarios/builder">Create with AI</Link>
        </Button>
      </header>

      {scenarios.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent className="p-0">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FileQuestion className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No scenarios yet</h2>
            <p className="mb-6 text-muted-foreground">
              Create your first scenario using the AI-powered builder
            </p>
            <Button asChild>
              <Link href="/admin/scenarios/builder">Create Scenario</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <Link key={scenario.id} href={`/admin/scenarios/${scenario.id}`}>
              <Card className="p-6 transition-all duration-200 hover:shadow-md hover:bg-muted/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h2 className="text-xl font-semibold">{scenario.name}</h2>
                      <Badge
                        variant="outline"
                        className={
                          scenario.isPublished
                            ? "border-green-600 bg-green-500/10 text-green-600"
                            : ""
                        }
                      >
                        {scenario.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {scenario.companyName}
                    </p>
                    <p className="mb-4 line-clamp-2 text-sm">
                      {scenario.taskDescription}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                      <div className="flex flex-wrap justify-end gap-1">
                        {scenario.techStack.slice(0, 4).map((tech, i) => (
                          <Badge key={i} variant="secondary">
                            {tech}
                          </Badge>
                        ))}
                        {scenario.techStack.length > 4 && (
                          <span className="px-2 py-0.5 text-xs text-muted-foreground">
                            +{scenario.techStack.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
