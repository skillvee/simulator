"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Coworker {
  id: string;
  name: string;
  role: string;
  personaStyle: string;
  knowledge: unknown;
}

interface Scenario {
  id: string;
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  repoUrl: string;
  techStack: string[];
  isPublished: boolean;
  coworkers: Coworker[];
}

interface RepoVerification {
  accessible: boolean;
  repoUrl: string;
  repoInfo?: {
    fullName: string;
    isPrivate: boolean;
    defaultBranch: string;
    description?: string;
  };
  hasReadme?: boolean;
  error?: string;
}

interface ScenarioDetailClientProps {
  scenario: Scenario;
}

export function ScenarioDetailClient({ scenario }: ScenarioDetailClientProps) {
  const router = useRouter();
  const [isPublished, setIsPublished] = useState(scenario.isPublished);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isVerifyingRepo, setIsVerifyingRepo] = useState(false);
  const [repoStatus, setRepoStatus] = useState<RepoVerification | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify repository access
  const verifyRepo = async () => {
    setIsVerifyingRepo(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/scenarios/${scenario.id}/verify-repo`);
      const data = await response.json();
      setRepoStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify repository");
    } finally {
      setIsVerifyingRepo(false);
    }
  };

  // Start preview (full flow from HR interview)
  const startPreview = async () => {
    setIsPreviewLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/scenarios/${scenario.id}/preview`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.previewUrl) {
        router.push(data.previewUrl);
      } else {
        setError("Failed to create preview assessment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start preview");
      setIsPreviewLoading(false);
    }
  };

  // Test coworkers (skip to working phase)
  const testCoworkers = async () => {
    setIsPreviewLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/scenarios/${scenario.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipTo: "coworkers" }),
      });
      const data = await response.json();
      if (data.previewUrl) {
        router.push(data.previewUrl);
      } else {
        setError("Failed to create test assessment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start coworker test");
      setIsPreviewLoading(false);
    }
  };

  // Toggle publish status
  const togglePublish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/scenarios/${scenario.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      if (response.ok) {
        setIsPublished(!isPublished);
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update scenario");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update scenario");
    } finally {
      setIsPublishing(false);
    }
  };

  // Parse knowledge to get item count
  const getKnowledgeCount = (knowledge: unknown): number => {
    if (Array.isArray(knowledge)) {
      return knowledge.length;
    }
    if (knowledge && typeof knowledge === "object" && "items" in knowledge) {
      const items = (knowledge as { items?: unknown[] }).items;
      return Array.isArray(items) ? items.length : 0;
    }
    return 0;
  };

  return (
    <div className="space-y-8">
      {/* Error display */}
      {error && (
        <div className="border-2 border-red-600 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Actions Section */}
      <section className="border-2 border-foreground p-6 bg-background">
        <h2 className="font-bold text-xl mb-4">Preview & Testing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preview Full Flow */}
          <button
            onClick={startPreview}
            disabled={isPreviewLoading}
            className="p-4 border-2 border-foreground bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="text-lg mb-1">Preview Full Flow</div>
            <p className="text-sm font-normal opacity-80">
              Test as a candidate would experience it (HR → Kickoff → Work → Defense)
            </p>
          </button>

          {/* Test Coworkers */}
          <button
            onClick={testCoworkers}
            disabled={isPreviewLoading || scenario.coworkers.length === 0}
            className="p-4 border-2 border-foreground bg-background font-bold hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="text-lg mb-1">Test Coworkers</div>
            <p className="text-sm font-normal text-muted-foreground">
              Jump directly to coworker chat/call testing
            </p>
          </button>

          {/* Verify Repo */}
          <button
            onClick={verifyRepo}
            disabled={isVerifyingRepo}
            className="p-4 border-2 border-foreground bg-background font-bold hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="text-lg mb-1">Verify Repository</div>
            <p className="text-sm font-normal text-muted-foreground">
              Check if the GitHub repo is accessible
            </p>
          </button>
        </div>

        {/* Repo verification result */}
        {repoStatus && (
          <div
            className={`mt-4 p-4 border-2 ${
              repoStatus.accessible
                ? "border-green-600 bg-green-50"
                : "border-red-600 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-3 h-3 ${
                  repoStatus.accessible ? "bg-green-600" : "bg-red-600"
                }`}
              />
              <span className="font-bold">
                {repoStatus.accessible ? "Repository Accessible" : "Repository Not Accessible"}
              </span>
            </div>
            {repoStatus.accessible && repoStatus.repoInfo && (
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-mono">{repoStatus.repoInfo.fullName}</span>
                  {repoStatus.repoInfo.isPrivate && (
                    <span className="ml-2 text-yellow-700">(Private)</span>
                  )}
                </p>
                <p>Default branch: {repoStatus.repoInfo.defaultBranch}</p>
                {repoStatus.hasReadme !== undefined && (
                  <p>README.md: {repoStatus.hasReadme ? "Found" : "Not found"}</p>
                )}
              </div>
            )}
            {repoStatus.error && (
              <p className="text-sm text-red-700">{repoStatus.error}</p>
            )}
          </div>
        )}
      </section>

      {/* Publish Section */}
      <section className="border-2 border-foreground p-6 bg-background">
        <h2 className="font-bold text-xl mb-4">Publication Status</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-2">
              {isPublished ? (
                <span className="text-green-700">
                  This scenario is <strong>published</strong> and visible to candidates.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  This scenario is a <strong>draft</strong> and not visible to candidates.
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {isPublished
                ? "Unpublishing will hide this scenario from new candidates (existing assessments will continue)."
                : "Publishing will make this scenario available for candidates to take."}
            </p>
          </div>
          <button
            onClick={togglePublish}
            disabled={isPublishing}
            className={`px-6 py-3 font-bold border-2 border-foreground disabled:opacity-50 disabled:cursor-not-allowed ${
              isPublished
                ? "bg-background hover:bg-muted"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isPublishing ? "Updating..." : isPublished ? "Unpublish" : "Publish Scenario"}
          </button>
        </div>
      </section>

      {/* Scenario Details */}
      <section className="border-2 border-foreground p-6 bg-background">
        <h2 className="font-bold text-xl mb-4">Scenario Details</h2>

        <div className="space-y-4">
          {/* Company Description */}
          <div>
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Company Description
            </h3>
            <p className="whitespace-pre-wrap">{scenario.companyDescription}</p>
          </div>

          {/* Task Description */}
          <div>
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Task Description
            </h3>
            <p className="whitespace-pre-wrap">{scenario.taskDescription}</p>
          </div>

          {/* Repository */}
          <div>
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Repository URL
            </h3>
            <a
              href={scenario.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-secondary-foreground bg-secondary px-2 py-1 hover:underline"
            >
              {scenario.repoUrl}
            </a>
          </div>

          {/* Tech Stack */}
          {scenario.techStack.length > 0 && (
            <div>
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {scenario.techStack.map((tech, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-sm font-mono border border-foreground bg-muted"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Coworkers Section */}
      <section className="border-2 border-foreground p-6 bg-background">
        <h2 className="font-bold text-xl mb-4">
          Coworkers ({scenario.coworkers.length})
        </h2>

        {scenario.coworkers.length === 0 ? (
          <p className="text-muted-foreground">
            No coworkers configured. Add coworkers to enable team collaboration testing.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenario.coworkers.map((coworker) => (
              <div
                key={coworker.id}
                className="p-4 border border-foreground"
              >
                <div className="flex items-center gap-3 mb-2">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-secondary border border-foreground flex items-center justify-center font-bold">
                    {coworker.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold">{coworker.name}</h3>
                    <p className="text-sm text-muted-foreground">{coworker.role}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Style: {coworker.personaStyle.slice(0, 100)}
                  {coworker.personaStyle.length > 100 && "..."}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {getKnowledgeCount(coworker.knowledge)} knowledge items
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
