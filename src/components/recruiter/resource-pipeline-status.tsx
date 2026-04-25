"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/shared/markdown"; // eslint-disable-line no-restricted-imports -- inline doc preview viewer
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  FileSpreadsheet,
  GitBranch,
  Loader2,
} from "lucide-react";
import type {
  ResourcePipelineMeta,
  ResourcePipelineStatus,
  ResourcePlan,
  ScenarioDoc,
} from "@/types";

interface PipelineStatusProps {
  scenarioId: string;
  initialMeta: ResourcePipelineMeta | null;
  initialIsPublished: boolean;
  /** Branch the orchestrator runs — controls "CSVs" vs "repo" copy. */
  resourceType: "repo" | "data";
  /** Lifted up so the parent can swap the share-link card in/out. */
  onPublishedChange?: (published: boolean) => void;
}

interface PipelineStatusResponse {
  pipelineVersion: string;
  pipelineMeta: ResourcePipelineMeta | null;
  isPublished: boolean;
  plan: ResourcePlan | null;
  docs: ScenarioDoc[];
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

/**
 * Recruiter-facing status. Collapses internal pipeline phases (validating /
 * judging) into a single "Generating" stage — recruiters don't need to know
 * the orchestrator's internal step machine.
 */
type RecruiterStatus = "drafting" | "generating" | "ready" | "failed";

function toRecruiterStatus(s: ResourcePipelineStatus | undefined): RecruiterStatus | null {
  if (!s) return null;
  if (s === "planning") return "drafting";
  if (s === "passed") return "ready";
  if (s === "failed") return "failed";
  return "generating";
}

const STATUS_COPY: Record<
  RecruiterStatus,
  { label: string; description: (resourceType: "repo" | "data") => string }
> = {
  drafting: {
    label: "Drafting plan",
    description: (resourceType) =>
      resourceType === "repo"
        ? "Drafting the simulation plan and a kickoff note for the candidate. ~1–2 min."
        : "Drafting the simulation plan and 1–2 candidate-facing docs. ~1–2 min.",
  },
  generating: {
    label: "Generating",
    description: () =>
      "Generating files for the simulation. This usually takes ~5–8 min. Once it's done you'll get a link to share with the candidates.",
  },
  ready: {
    label: "Ready",
    description: () =>
      "All checks passed. The candidate link is live — copy it from below.",
  },
  failed: {
    label: "Failed",
    description: () =>
      "The bundle didn't pass quality checks. See the issues below and try regenerating.",
  },
};

interface FileItem {
  key: string;
  kind: "doc" | "csv" | "repo";
  filename: string;
  subtitle: string;
  state: "pending" | "ready";
  // For docs only — clicking opens the markdown modal.
  doc?: ScenarioDoc;
  // For repo only — opens GitHub in a new tab.
  url?: string;
}

export function ResourcePipelineStatus({
  scenarioId,
  initialMeta,
  initialIsPublished,
  resourceType,
  onPublishedChange,
}: PipelineStatusProps) {
  const [meta, setMeta] = useState<ResourcePipelineMeta | null>(initialMeta);
  const [, setIsPublished] = useState<boolean>(initialIsPublished);
  const [plan, setPlan] = useState<ResourcePlan | null>(null);
  const [docs, setDocs] = useState<ScenarioDoc[]>([]);
  const [dataFiles, setDataFiles] = useState<PipelineStatusResponse["dataFiles"]>([]);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<ScenarioDoc | null>(null);

  const status = meta?.status;
  const recruiterStatus = toRecruiterStatus(status);
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
      const next = data.isPublished;
      setIsPublished((prev) => {
        if (prev !== next) onPublishedChange?.(next);
        return next;
      });
      setPlan(data.plan ?? null);
      setDocs(data.docs ?? []);
      setDataFiles(data.dataFiles ?? []);
      setRepoUrl(data.repoUrl ?? null);
    } catch {
      // Silent — next interval will retry.
    }
  }, [scenarioId, onPublishedChange]);

  useEffect(() => {
    if (!meta) return;
    refresh();
    if (isTerminal) return;
    const handle = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [meta, isTerminal, refresh]);

  const badge = useMemo(() => {
    if (!recruiterStatus) return null;
    const label = STATUS_COPY[recruiterStatus].label;
    if (recruiterStatus === "ready") {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" /> {label}
        </Badge>
      );
    }
    if (recruiterStatus === "failed") {
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
  }, [recruiterStatus]);

  const items = useMemo<FileItem[]>(() => {
    const rows: FileItem[] = [];

    // Docs: planned (3 entries) → ready (when persisted on the scenario row).
    if (docs.length > 0) {
      for (const d of docs) {
        rows.push({
          key: `doc-${d.id || d.filename}`,
          kind: "doc",
          filename: d.name,
          subtitle: d.objective,
          state: "ready",
          doc: d,
        });
      }
    } else if (recruiterStatus === "drafting" || recruiterStatus === "generating") {
      // Pre-Step-1: list expected docs as pending. Repo archetype has 1 doc
      // (kickoff), data archetype has 1-2 (kickoff + optional dictionary).
      // Skip on `failed` — docs always exist by then; if they're not in state
      // yet, the next refresh will populate them. Showing placeholders on a
      // terminal status race-renders confusingly.
      const placeholders =
        resourceType === "repo"
          ? ["Kickoff note"]
          : ["Kickoff note", "Data dictionary (optional)"];
      for (let i = 0; i < placeholders.length; i++) {
        rows.push({
          key: `doc-pending-${i}`,
          kind: "doc",
          filename: placeholders[i]!,
          subtitle: "Generating…",
          state: "pending",
        });
      }
    }

    // Artifacts row(s).
    if (resourceType === "data") {
      // Use the plan's filenames as the canonical list. Mark each ready when
      // the actual ScenarioDataFile row exists.
      const planned = plan?.resources ?? [];
      const readyByFilename = new Map(dataFiles.map((f) => [f.filename, f]));
      for (const r of planned) {
        const ready = readyByFilename.get(r.filename);
        rows.push({
          key: `csv-${r.filename}`,
          kind: "csv",
          filename: r.filename,
          subtitle: ready
            ? `${ready.rowCount ?? "?"} rows${ready.byteSize ? ` · ${(ready.byteSize / 1024).toFixed(1)} KB` : ""}`
            : "Generating…",
          state: ready ? "ready" : "pending",
        });
      }
      // If we have data files but no plan (legacy/edge), still show them.
      if (planned.length === 0) {
        for (const f of dataFiles) {
          rows.push({
            key: `csv-${f.filename}`,
            kind: "csv",
            filename: f.filename,
            subtitle: `${f.rowCount ?? "?"} rows${f.byteSize ? ` · ${(f.byteSize / 1024).toFixed(1)} KB` : ""}`,
            state: "ready",
          });
        }
      }
    } else {
      // Repo branch: single entry.
      rows.push({
        key: "repo",
        kind: "repo",
        filename: "GitHub repository",
        subtitle: repoUrl
          ? repoUrl.replace(/^https?:\/\//, "")
          : "Generating…",
        state: repoUrl ? "ready" : "pending",
        url: repoUrl ?? undefined,
      });
    }

    return rows;
  }, [docs, plan, dataFiles, repoUrl, resourceType, recruiterStatus]);

  if (!meta) return null;

  const description = recruiterStatus
    ? STATUS_COPY[recruiterStatus].description(resourceType)
    : null;

  return (
    <>
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg text-stone-900">
            Resources {badge}
          </CardTitle>
          {description && (
            <p className="mt-1 text-sm text-stone-600">{description}</p>
          )}
          {recruiterStatus === "ready" && meta.judgeSummary && (
            <p className="mt-2 text-xs italic text-stone-500">
              {meta.judgeSummary}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-stone-700">
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <FileRow key={item.key} item={item} onView={setOpenDoc} />
            ))}
          </ul>

          {recruiterStatus === "failed" && meta.blockingIssues && meta.blockingIssues.length > 0 && (
            <details className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-red-900">
                Issues ({meta.blockingIssues.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-red-800">
                {meta.blockingIssues.map((issue, i) => (
                  <li key={i} className="list-disc pl-4">
                    {issue}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!openDoc} onOpenChange={(open) => !open && setOpenDoc(null)}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openDoc?.name}</DialogTitle>
            {openDoc?.objective && (
              <p className="text-sm text-stone-600">{openDoc.objective}</p>
            )}
          </DialogHeader>
          {openDoc && (
            <div className="prose prose-sm max-w-none text-stone-800">
              <Markdown>{openDoc.markdown}</Markdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FileRow({
  item,
  onView,
}: {
  item: FileItem;
  onView: (doc: ScenarioDoc) => void;
}) {
  const Icon =
    item.kind === "doc"
      ? FileText
      : item.kind === "csv"
        ? FileSpreadsheet
        : GitBranch;

  return (
    <li className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-3 py-2">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-stone-900">
            {item.filename}
          </p>
          <p className="truncate text-xs text-stone-500">{item.subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.state === "pending" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
        )}
        {item.state === "ready" && item.kind === "doc" && item.doc && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onView(item.doc!)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            View
          </Button>
        )}
        {item.state === "ready" && item.kind === "repo" && item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-blue-700 hover:bg-blue-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        )}
      </div>
    </li>
  );
}
