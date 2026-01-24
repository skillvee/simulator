import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScenarioDetailClient } from "./client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScenarioDetailPage({ params }: PageProps) {
  // Ensure only admins can access
  await requireAdmin();

  const { id } = await params;

  // Fetch the scenario with coworkers
  const scenario = await db.scenario.findUnique({
    where: { id },
    include: {
      coworkers: {
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { assessments: true },
      },
    },
  });

  if (!scenario) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/admin/scenarios">
            <ArrowLeft className="h-4 w-4" />
            Back to Scenarios
          </Link>
        </Button>
      </nav>

      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-semibold">{scenario.name}</h1>
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
          <p className="mb-1 text-lg text-muted-foreground">
            {scenario.companyName}
          </p>
          <p className="text-sm text-muted-foreground">
            {scenario._count.assessments} assessments | Created{" "}
            {new Date(scenario.createdAt).toLocaleDateString()}
          </p>
        </div>
      </header>

      {/* Client component for interactive features */}
      <ScenarioDetailClient scenario={scenario} />
    </div>
  );
}
