"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";
import type {
  ResourcePipelineMeta,
  ResourcePipelineStatus,
} from "@/types";

interface PipelineStatusProps {
  scenarioId: string;
  initialMeta: ResourcePipelineMeta | null;
  initialIsPublished: boolean;
}

interface PipelineStatusResponse {
  pipelineVersion: string;
  pipelineMeta: ResourcePipelineMeta | null;
  isPublished: boolean;
  docCount: number;
  dataFiles: Array<{
    id: string;
    filename: string;
    rowCount: number | null;
    byteSize: number | null;
  }>;
  repoUrl: string | null;
}

const TERMINAL_STATUSES: ResourcePipelineStatus[] = ["passed", "failed"];
const POLL_INTERVAL_MS = 3000;

const STATUS_LABELS: Record<ResourcePipelineStatus, string> = {
  planning: "Planning",
  markdown_ready: "Markdown ready",
  artifacts_generating: "Generating artifacts",
  validating: "Validating",
  judging: "Judging",
  passed: "Passed",
  failed: "Failed",
};

export function ResourcePipelineStatus({
  scenarioId,
  initialMeta,
  initialIsPublished,
}: PipelineStatusProps) {
  const [meta, setMeta] = useState<ResourcePipelineMeta | null>(initialMeta);
  const [isPublished, setIsPublished] = useState<boolean>(initialIsPublished);
  const [dataFiles, setDataFiles] = useState<PipelineStatusResponse["dataFiles"]>([]);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number>(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const status = meta?.status;
  const isTerminal = status ? TERMINAL_STATUSES.includes(status) : false;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/recruiter/simulations/${scenarioId}/resource-pipeline`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const json = await res.json();
      const data = (json.data || json) as PipelineStatusResponse;
      setMeta(data.pipelineMeta);
      setIsPublished(data.isPublished);
      setDataFiles(data.dataFiles ?? []);
      setRepoUrl(data.repoUrl ?? null);
      setDocCount(data.docCount ?? 0);
    } catch {
      // Silent — next interval will retry.
    }
  }, [scenarioId]);

  useEffect(() => {
    if (!meta || isTerminal) return;
    const handle = setInterval(refresh, POLL_INTERVAL_MS);
    refresh();
    return () => clearInterval(handle);
  }, [meta, isTerminal, refresh]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(
        `/api/recruiter/simulations/${scenarioId}/publish`,
        { method: "POST" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPublishError(json.error || `Publish failed (${res.status})`);
      } else {
        setIsPublished(true);
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPublishing(false);
    }
  };

  const badge = useMemo(() => {
    if (!status) return null;
    const label = STATUS_LABELS[status];
    if (status === "passed") {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" /> {label}
        </Badge>
      );
    }
    if (status === "failed") {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" /> {label}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> {label}
      </Badge>
    );
  }, [status]);

  if (!meta) return null;

  return (
    <Card className="mb-6 border-stone-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="flex items-center gap-2 text-stone-900">
            Resource pipeline {badge}
          </span>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={
              isPublished ||
              isPublishing ||
              status !== "passed"
            }
          >
            {isPublishing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1 h-4 w-4" />
            )}
            {isPublished ? "Published" : "Publish"}
          </Button>
        </CardTitle>
        {meta.judgeSummary && (
          <p className="text-sm text-stone-600">{meta.judgeSummary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-stone-700">
        <div className="flex flex-wrap gap-4">
          <span>
            <strong>{docCount}</strong> doc{docCount === 1 ? "" : "s"}
          </span>
          {dataFiles.length > 0 && (
            <span>
              <strong>{dataFiles.length}</strong> data file
              {dataFiles.length === 1 ? "" : "s"}
            </span>
          )}
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline-offset-2 hover:underline"
            >
              View repository
            </a>
          )}
          <span>
            Attempt <strong>{meta.attempts}</strong>
          </span>
        </div>

        {dataFiles.length > 0 && (
          <ul className="grid gap-1 text-xs text-stone-600">
            {dataFiles.map((f) => (
              <li key={f.id}>
                <code>{f.filename}</code> — {f.rowCount ?? "?"} rows
                {f.byteSize ? ` · ${(f.byteSize / 1024).toFixed(1)} KB` : ""}
              </li>
            ))}
          </ul>
        )}

        {status === "failed" && meta.blockingIssues && meta.blockingIssues.length > 0 && (
          <details className="rounded-md border border-red-200 bg-red-50 p-3">
            <summary className="cursor-pointer font-medium text-red-900">
              Blocking issues ({meta.blockingIssues.length})
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-red-800">
              {meta.blockingIssues.map((issue, i) => (
                <li key={i} className="list-disc pl-4">
                  {issue}
                </li>
              ))}
            </ul>
            {meta.lastError && (
              <p className="mt-2 text-xs text-red-700">
                <strong>Error:</strong> {meta.lastError}
              </p>
            )}
          </details>
        )}

        {status !== "passed" && (
          <p className="text-xs text-stone-500">
            Publish unlocks once the pipeline reaches <strong>passed</strong>.
          </p>
        )}

        {publishError && (
          <p className="text-xs text-red-700">Publish failed: {publishError}</p>
        )}
      </CardContent>
    </Card>
  );
}
