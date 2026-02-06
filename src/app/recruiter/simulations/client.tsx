"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Users,
  Calendar,
} from "lucide-react";

interface ScenarioData {
  id: string;
  name: string;
  companyName: string;
  techStack: string[];
  createdAt: string;
  assessmentCount: number;
}

interface RecruiterScenariosClientProps {
  scenarios: ScenarioData[];
}

export function RecruiterScenariosClient({
  scenarios,
}: RecruiterScenariosClientProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getShareableLink = (scenarioId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/invite/${scenarioId}`;
  };

  const handleCopyLink = async (scenarioId: string) => {
    const link = getShareableLink(scenarioId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(scenarioId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(scenarioId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Simulations</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage your work simulations and share them with candidates
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/recruiter/simulations/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Simulation
          </Link>
        </Button>
      </div>

      {/* Scenarios List */}
      {scenarios.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <FileText className="mx-auto h-16 w-16 text-stone-300" />
            <h2 className="mt-6 text-xl font-semibold text-stone-900">
              No simulations yet
            </h2>
            <p className="mt-2 text-stone-500">
              Create your first simulation to start assessing candidates with
              AI-powered work simulations.
            </p>
            <Button
              asChild
              className="mt-6 bg-blue-600 hover:bg-blue-700"
            >
              <Link href="/recruiter/simulations/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Simulation
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {scenarios.map((scenario) => (
            <Card
              key={scenario.id}
              className="border-stone-200 bg-white transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-6">
                  {/* Scenario Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-stone-900 truncate">
                        {scenario.name}
                      </h3>
                      <Link
                        href={`/recruiter/simulations/${scenario.id}`}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="View simulation details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {scenario.companyName}
                    </p>

                    {/* Tech Stack Tags */}
                    {scenario.techStack.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {scenario.techStack.map((tech) => (
                          <Badge
                            key={tech}
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 hover:bg-blue-50"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="mt-4 flex items-center gap-6 text-sm text-stone-500">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>
                          {scenario.assessmentCount}{" "}
                          {scenario.assessmentCount === 1
                            ? "assessment"
                            : "assessments"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Created {formatDate(scenario.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shareable Link */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                        <code className="text-xs text-stone-600 max-w-[200px] truncate">
                          /invite/{scenario.id.slice(0, 8)}...
                        </code>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(scenario.id)}
                        className={`border-stone-200 transition-colors ${
                          copiedId === scenario.id
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : ""
                        }`}
                      >
                        {copiedId === scenario.id ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
