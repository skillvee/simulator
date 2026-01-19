"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/shared";
import { GEMINI_VOICES } from "@/lib/ai";

interface Coworker {
  id: string;
  name: string;
  role: string;
  personaStyle: string;
  knowledge: unknown;
  voiceName?: string | null;
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
  const [coworkers, setCoworkers] = useState(scenario.coworkers);
  const [updatingVoice, setUpdatingVoice] = useState<string | null>(null);

  // Verify repository access
  const verifyRepo = async () => {
    setIsVerifyingRepo(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/scenarios/${scenario.id}/verify-repo`
      );
      const data = await response.json();
      setRepoStatus(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify repository"
      );
    } finally {
      setIsVerifyingRepo(false);
    }
  };

  // Start preview (full flow from HR interview)
  const startPreview = async () => {
    setIsPreviewLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/scenarios/${scenario.id}/preview`,
        {
          method: "POST",
        }
      );
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
      const response = await fetch(
        `/api/admin/scenarios/${scenario.id}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skipTo: "coworkers" }),
        }
      );
      const data = await response.json();
      if (data.previewUrl) {
        router.push(data.previewUrl);
      } else {
        setError("Failed to create test assessment");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start coworker test"
      );
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
      setError(
        err instanceof Error ? err.message : "Failed to update scenario"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // Update coworker voice
  const updateCoworkerVoice = async (coworkerId: string, voiceName: string | null) => {
    setUpdatingVoice(coworkerId);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/scenarios/${scenario.id}/coworkers/${coworkerId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceName }),
        }
      );
      if (response.ok) {
        setCoworkers((prev) =>
          prev.map((c) => (c.id === coworkerId ? { ...c, voiceName } : c))
        );
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update voice");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update voice");
    } finally {
      setUpdatingVoice(null);
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
      <section className="border-2 border-foreground bg-background p-6">
        <h2 className="mb-4 text-xl font-bold">Preview & Testing</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Preview Full Flow */}
          <button
            onClick={startPreview}
            disabled={isPreviewLoading}
            className="hover:bg-secondary/80 border-2 border-foreground bg-secondary p-4 text-left font-bold text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="mb-1 text-lg">Preview Full Flow</div>
            <p className="text-sm font-normal opacity-80">
              Test as a candidate would experience it (HR → Kickoff → Work →
              Defense)
            </p>
          </button>

          {/* Test Coworkers */}
          <button
            onClick={testCoworkers}
            disabled={isPreviewLoading || scenario.coworkers.length === 0}
            className="border-2 border-foreground bg-background p-4 text-left font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="mb-1 text-lg">Test Coworkers</div>
            <p className="text-sm font-normal text-muted-foreground">
              Jump directly to coworker chat/call testing
            </p>
          </button>

          {/* Verify Repo */}
          <button
            onClick={verifyRepo}
            disabled={isVerifyingRepo}
            className="border-2 border-foreground bg-background p-4 text-left font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="mb-1 text-lg">Verify Repository</div>
            <p className="text-sm font-normal text-muted-foreground">
              Check if the GitHub repo is accessible
            </p>
          </button>
        </div>

        {/* Repo verification result */}
        {repoStatus && (
          <div
            className={`mt-4 border-2 p-4 ${
              repoStatus.accessible
                ? "border-green-600 bg-green-50"
                : "border-red-600 bg-red-50"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`h-3 w-3 ${
                  repoStatus.accessible ? "bg-green-600" : "bg-red-600"
                }`}
              />
              <span className="font-bold">
                {repoStatus.accessible
                  ? "Repository Accessible"
                  : "Repository Not Accessible"}
              </span>
            </div>
            {repoStatus.accessible && repoStatus.repoInfo && (
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-mono">
                    {repoStatus.repoInfo.fullName}
                  </span>
                  {repoStatus.repoInfo.isPrivate && (
                    <span className="ml-2 text-yellow-700">(Private)</span>
                  )}
                </p>
                <p>Default branch: {repoStatus.repoInfo.defaultBranch}</p>
                {repoStatus.hasReadme !== undefined && (
                  <p>
                    README.md: {repoStatus.hasReadme ? "Found" : "Not found"}
                  </p>
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
      <section className="border-2 border-foreground bg-background p-6">
        <h2 className="mb-4 text-xl font-bold">Publication Status</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-2">
              {isPublished ? (
                <span className="text-green-700">
                  This scenario is <strong>published</strong> and visible to
                  candidates.
                </span>
              ) : (
                <span className="text-muted-foreground">
                  This scenario is a <strong>draft</strong> and not visible to
                  candidates.
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
            className={`border-2 border-foreground px-6 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
              isPublished
                ? "bg-background hover:bg-muted"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isPublishing
              ? "Updating..."
              : isPublished
                ? "Unpublish"
                : "Publish Scenario"}
          </button>
        </div>
      </section>

      {/* Scenario Details */}
      <section className="border-2 border-foreground bg-background p-6">
        <h2 className="mb-4 text-xl font-bold">Scenario Details</h2>

        <div className="space-y-4">
          {/* Company Description */}
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Company Description
            </h3>
            <div className="border-foreground/20 bg-muted/10 border p-4">
              <Markdown>{scenario.companyDescription}</Markdown>
            </div>
          </div>

          {/* Task Description */}
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Task Description
            </h3>
            <div className="border-foreground/20 bg-muted/10 border p-4">
              <Markdown>{scenario.taskDescription}</Markdown>
            </div>
          </div>

          {/* Repository */}
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Repository URL
            </h3>
            <a
              href={scenario.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-secondary px-2 py-1 font-mono text-sm text-secondary-foreground hover:underline"
            >
              {scenario.repoUrl}
            </a>
          </div>

          {/* Tech Stack */}
          {scenario.techStack.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {scenario.techStack.map((tech, i) => (
                  <span
                    key={i}
                    className="border border-foreground bg-muted px-3 py-1 font-mono text-sm"
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
      <section className="border-2 border-foreground bg-background p-6">
        <h2 className="mb-4 text-xl font-bold">
          Coworkers ({coworkers.length})
        </h2>

        {coworkers.length === 0 ? (
          <p className="text-muted-foreground">
            No coworkers configured. Add coworkers to enable team collaboration
            testing.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {coworkers.map((coworker) => (
              <div key={coworker.id} className="border border-foreground p-4">
                <div className="mb-2 flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center border border-foreground bg-secondary font-bold">
                    {coworker.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold">{coworker.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {coworker.role}
                    </p>
                  </div>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Style: {coworker.personaStyle.slice(0, 100)}
                  {coworker.personaStyle.length > 100 && "..."}
                </p>
                {/* Voice selector */}
                <div className="mb-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Voice
                  </label>
                  <select
                    value={coworker.voiceName || ""}
                    onChange={(e) =>
                      updateCoworkerVoice(
                        coworker.id,
                        e.target.value || null
                      )
                    }
                    disabled={updatingVoice === coworker.id}
                    className="w-full border-2 border-foreground bg-background px-2 py-1 font-mono text-sm disabled:opacity-50"
                  >
                    <option value="">Default (Aoede - Female)</option>
                    <optgroup label="Male Voices">
                      {GEMINI_VOICES.male.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} - {v.description}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Female Voices">
                      {GEMINI_VOICES.female.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} - {v.description}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
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
