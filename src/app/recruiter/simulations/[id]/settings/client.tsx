"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Copy,
  Check,
  Link as LinkIcon,
  Code,
  Calendar,
  Users,
  Briefcase,
  Mic,
  ExternalLink,
  CheckCircle2,
  X,
  GraduationCap,
} from "lucide-react";
import { CoworkerAvatar } from "@/components/chat/coworker-avatar"; // eslint-disable-line no-restricted-imports -- Component import for UI
import { LEVEL_EXPECTATIONS, type TargetLevel } from "@/lib/rubric/level-expectations";

interface Coworker {
  id: string;
  name: string;
  role: string;
  voiceName: string | null;
  avatarUrl: string | null;
}

interface ScenarioData {
  id: string;
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  repoUrl: string | null;
  techStack: string[];
  targetLevel: string;
  archetypeName: string | null;
  roleFamilyName: string | null;
  createdAt: string;
  coworkers: Coworker[];
  assessmentCount: number;
}

interface SimulationSettingsClientProps {
  scenario: ScenarioData;
}

export function SimulationSettingsClient({ scenario }: SimulationSettingsClientProps) {
  const [copied, setCopied] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [repoUrl, setRepoUrl] = useState(scenario.repoUrl);
  const [repoStatus, setRepoStatus] = useState<"loading" | "ready" | "failed">(
    scenario.repoUrl ? "ready" : "loading"
  );
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccessBanner(true);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("success");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [searchParams]);

  // Poll for repo URL if not yet available
  useEffect(() => {
    if (repoUrl) return;

    let attempts = 0;
    const maxAttempts = 24; // 2 minutes (24 * 5s)
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/recruiter/simulations/${scenario.id}`);
        if (res.ok) {
          const json = await res.json();
          const url = json.data?.repoUrl;
          if (url) {
            setRepoUrl(url);
            setRepoStatus("ready");
            clearInterval(interval);
          } else if (attempts >= maxAttempts) {
            setRepoStatus("failed");
            clearInterval(interval);
          }
        }
      } catch {
        // Network error, keep polling
      }
      if (attempts >= maxAttempts) {
        setRepoStatus("failed");
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [repoUrl, scenario.id]);

  const getShareableLink = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/invite/${scenario.id}`;
  };

  const handleCopyLink = async () => {
    const link = getShareableLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateString));
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Simulation created!</p>
              <p className="text-sm text-green-700">
                Share the link below with candidates to get started
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSuccessBanner(false)}
            className="text-green-700 hover:text-green-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/recruiter/simulations"
          className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Simulations
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-stone-900">
              {scenario.name}
            </h1>
            <p className="mt-1 text-lg text-stone-600">{scenario.companyName}</p>
          </div>
        </div>
      </div>

      {/* Shareable Link Section */}
      <Card className="mb-8 border-blue-200 bg-blue-50/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
            <LinkIcon className="h-5 w-5" />
            Shareable Link
          </CardTitle>
          <p className="text-sm text-blue-700">
            Share this link with candidates to start their assessment
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center rounded-lg border border-blue-200 bg-white px-4 py-3">
              <code className="text-sm text-stone-800 break-all">
                {getShareableLink()}
              </code>
            </div>
            <Button
              size="lg"
              onClick={handleCopyLink}
              className={`px-6 transition-colors ${
                copied
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-5 w-5" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Details */}
      <Card className="mb-6 border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Simulation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-stone-500 mb-2">
              Task Description
            </h3>
            <p className="text-stone-900 whitespace-pre-wrap">
              {scenario.taskDescription}
            </p>
          </div>

          {scenario.techStack.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-stone-500 mb-2">
                <Code className="h-4 w-4" />
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
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
            </div>
          )}

          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-stone-500 mb-2">
              <GraduationCap className="h-4 w-4" />
              Target Level
            </h3>
            {(() => {
              const level = LEVEL_EXPECTATIONS[(scenario.targetLevel || "mid") as TargetLevel];
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                    {level.label}
                  </Badge>
                  <span className="text-sm text-stone-500">{level.yearsRange} experience</span>
                  {scenario.archetypeName ? (
                    <>
                      <span className="text-sm text-stone-400">·</span>
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
                        {scenario.archetypeName}
                      </Badge>
                      {scenario.roleFamilyName && (
                        <span className="text-sm text-stone-400">({scenario.roleFamilyName})</span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-stone-400">· Expected score: {level.expectedScore}/4</span>
                  )}
                </div>
              );
            })()}
            {scenario.archetypeName && (
              <p className="text-xs text-stone-400 mt-1">
                Per-dimension scoring expectations are adjusted for this role archetype and seniority level
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-stone-500 mb-2">
              Repository
            </h3>
            {repoStatus === "ready" && repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
              >
                {repoUrl}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : repoStatus === "failed" ? (
              <span className="text-sm text-stone-400">
                Not available — check GITHUB_ORG_TOKEN configuration
              </span>
            ) : (
              <div className="flex items-center gap-2 text-stone-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-blue-600" />
                <span className="text-sm">Setting up...</span>
              </div>
            )}
          </div>

          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-stone-500 mb-2">
              <Calendar className="h-4 w-4" />
              Created
            </h3>
            <p className="text-stone-900">{formatDate(scenario.createdAt)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Coworkers Section */}
      <Card className="border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Coworkers ({scenario.coworkers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scenario.coworkers.length === 0 ? (
            <p className="text-stone-500 text-sm">No coworkers configured.</p>
          ) : (
            <div className="space-y-4">
              {scenario.coworkers.map((coworker) => (
                <div
                  key={coworker.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-stone-50 border border-stone-100"
                >
                  <CoworkerAvatar name={coworker.name} avatarUrl={coworker.avatarUrl} size="md" />
                  <div className="flex-1">
                    <p className="font-medium text-stone-900">{coworker.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {coworker.role}
                      </span>
                      {coworker.voiceName && (
                        <span className="flex items-center gap-1">
                          <Mic className="h-3.5 w-3.5" />
                          {coworker.voiceName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
