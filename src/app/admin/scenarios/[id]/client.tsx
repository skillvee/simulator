"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "@/components/shared";
import { GEMINI_VOICES } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  repoUrl: string | null;
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
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview & Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Preview Full Flow */}
            <Button
              variant="default"
              onClick={startPreview}
              disabled={isPreviewLoading}
              className="h-auto flex-col items-start gap-1 p-4 text-left"
            >
              <div className="text-lg font-semibold">Preview Full Flow</div>
              <p className="text-sm font-normal opacity-80">
                Test as a candidate would experience it (HR → Kickoff → Work →
                Defense)
              </p>
            </Button>

            {/* Test Coworkers */}
            <Button
              variant="outline"
              onClick={testCoworkers}
              disabled={isPreviewLoading || scenario.coworkers.length === 0}
              className="h-auto flex-col items-start gap-1 p-4 text-left"
            >
              <div className="text-lg font-semibold">Test Coworkers</div>
              <p className="text-sm font-normal text-muted-foreground">
                Jump directly to coworker chat/call testing
              </p>
            </Button>

            {/* Verify Repo */}
            <Button
              variant="outline"
              onClick={verifyRepo}
              disabled={isVerifyingRepo}
              className="h-auto flex-col items-start gap-1 p-4 text-left"
            >
              <div className="text-lg font-semibold">Verify Repository</div>
              <p className="text-sm font-normal text-muted-foreground">
                Check if the GitHub repo is accessible
              </p>
            </Button>
          </div>

          {/* Repo verification result */}
          {repoStatus && (
            <div
              className={`mt-4 rounded-lg p-4 ${
                repoStatus.accessible
                  ? "bg-green-500/10"
                  : "bg-destructive/10"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    repoStatus.accessible ? "bg-green-600" : "bg-destructive"
                  }`}
                />
                <span className="font-semibold">
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
                <p className="text-sm text-destructive">{repoStatus.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish Section */}
      <Card>
        <CardHeader>
          <CardTitle>Publication Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2">
                {isPublished ? (
                  <span className="text-green-600">
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
            <Button
              onClick={togglePublish}
              disabled={isPublishing}
              variant={isPublished ? "outline" : "default"}
              className={!isPublished ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isPublishing
                ? "Updating..."
                : isPublished
                  ? "Unpublish"
                  : "Publish Scenario"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Details */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Description */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Company Description
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4">
              <Markdown>{scenario.companyDescription}</Markdown>
            </div>
          </div>

          {/* Task Description */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Task Description
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4">
              <Markdown>{scenario.taskDescription}</Markdown>
            </div>
          </div>

          {/* Repository */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Repository URL
            </h3>
            <a
              href={scenario.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-primary/10 px-3 py-1 font-mono text-sm text-primary transition-colors hover:bg-primary/20"
            >
              {scenario.repoUrl}
            </a>
          </div>

          {/* Tech Stack */}
          {scenario.techStack.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {scenario.techStack.map((tech, i) => (
                  <Badge key={i} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coworkers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Coworkers ({coworkers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coworkers.length === 0 ? (
            <p className="text-muted-foreground">
              No coworkers configured. Add coworkers to enable team collaboration
              testing.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {coworkers.map((coworker) => (
                <Card key={coworker.id} className="p-4">
                  <div className="mb-3 flex items-center gap-3">
                    {/* Avatar */}
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {coworker.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{coworker.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {coworker.role}
                      </p>
                    </div>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Style: {coworker.personaStyle.slice(0, 100)}
                    {coworker.personaStyle.length > 100 && "..."}
                  </p>
                  {/* Voice selector */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
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
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
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
                  <p className="text-xs text-muted-foreground">
                    {getKnowledgeCount(coworker.knowledge)} knowledge items
                  </p>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
