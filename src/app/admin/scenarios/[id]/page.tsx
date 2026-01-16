import { requireAdmin } from "@/lib/admin";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScenarioDetailClient } from "./client";

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
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/admin/scenarios"
          className="text-muted-foreground hover:text-foreground font-mono text-sm"
        >
          &larr; Back to Scenarios
        </Link>
      </nav>

      {/* Header */}
      <header className="flex items-start justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-bold text-3xl">{scenario.name}</h1>
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
          <p className="text-lg text-muted-foreground mb-1">
            {scenario.companyName}
          </p>
          <p className="text-sm text-muted-foreground font-mono">
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
