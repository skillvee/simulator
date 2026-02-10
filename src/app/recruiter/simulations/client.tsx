"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Copy,
  Check,
  Users,
  Clock,
  FolderOpen,
  Pencil,
  Eye,
  Settings,
  Trash2,
  Link as LinkIcon,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type { SimulationCardData } from "./page";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

interface SimulationsListClientProps {
  simulations: SimulationCardData[];
}

export function SimulationsListClient({
  simulations,
}: SimulationsListClientProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SimulationCardData | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyLink = async (
    e: React.MouseEvent,
    simulationId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const link = `${baseUrl}/invite/${simulationId}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopiedId(simulationId);
    toast.success("Shareable simulation link copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/recruiter/simulations/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete simulation");
        return;
      }
      toast.success("Simulation deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete simulation");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const totalCandidates = simulations.reduce(
    (sum, s) => sum + s.totalCandidates,
    0
  );
  const totalCompleted = simulations.reduce(
    (sum, s) => sum + s.completedCount,
    0
  );
  const totalInProgress = simulations.reduce(
    (sum, s) => sum + s.inProgressCount,
    0
  );
  const totalNeedsReview = simulations.reduce(
    (sum, s) => sum + s.needsReviewCount,
    0
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Simulations
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {simulations.length > 0
              ? `${simulations.length} simulation${simulations.length !== 1 ? "s" : ""} · ${totalCandidates} candidate${totalCandidates !== 1 ? "s" : ""} · ${totalCompleted} completed · ${totalInProgress} in progress${totalNeedsReview > 0 ? ` · ${totalNeedsReview} to review` : ""}`
              : "Create your first simulation to start assessing candidates"}
          </p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/recruiter/simulations/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Simulation
          </Link>
        </Button>
      </div>

      {/* Simulations Grid */}
      {simulations.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <FolderOpen className="mx-auto h-16 w-16 text-stone-300" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {simulations.map((sim) => {
            const hasUnreviewed = sim.needsReviewCount > 0;
            const hasCandidates = sim.totalCandidates > 0;

            // Compute avg score from top candidates as proxy
            const avgScore =
              sim.topCandidates.length > 0
                ? sim.topCandidates.reduce((s, c) => s + c.score, 0) /
                  sim.topCandidates.length
                : null;

            return (
              <Link
                key={sim.id}
                href={`/recruiter/simulations/${sim.id}`}
                className="block group"
              >
                <Card
                  className={`bg-white shadow-sm hover:shadow-md transition-all h-full flex flex-col ${
                    hasUnreviewed
                      ? "border-t-2 border-t-blue-500 border-l-stone-200 border-r-stone-200 border-b-stone-200 hover:border-l-blue-300 hover:border-r-blue-300 hover:border-b-blue-300"
                      : "border-stone-200 hover:border-blue-300"
                  }`}
                >
                  <CardContent className="p-4 flex flex-col flex-1">
                    {/* Header: title + actions */}
                    <div className="flex items-start justify-between mb-0.5">
                      <h3 className="text-sm font-semibold text-stone-900 group-hover:text-blue-600 transition-colors leading-tight line-clamp-2">
                        {sim.name}
                      </h3>
                      <div className="flex items-center gap-0.5 flex-shrink-0 ml-1 -mt-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleCopyLink(e, sim.id)}
                          className={`h-6 w-6 p-0 ${
                            copiedId === sim.id
                              ? "text-blue-700"
                              : "text-stone-300 hover:text-stone-500"
                          }`}
                        >
                          {copiedId === sim.id ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className="text-stone-300 hover:text-stone-500 transition-colors p-0.5"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/recruiter/simulations/${sim.id}/settings`
                                )
                              }
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setDeleteTarget(sim)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete simulation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Company + status */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="text-xs text-stone-400 truncate">
                        {sim.companyName}
                      </span>
                      <span className="text-stone-200">·</span>
                      {sim.isPublished ? (
                        <span className="flex items-center gap-1 text-[11px] text-green-600 flex-shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Open
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-400 flex-shrink-0">
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Primary CTA for unreviewed */}
                    {hasUnreviewed && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-md px-2.5 py-1.5 mb-3">
                        <Eye className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="font-medium">
                          {sim.needsReviewCount} to review
                        </span>
                        <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}

                    {/* Pipeline — with labeled legend */}
                    {hasCandidates ? (
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Users className="h-3.5 w-3.5 text-stone-400" />
                          <span className="text-xs text-stone-600">
                            <span className="font-medium text-stone-900">
                              {sim.totalCandidates}
                            </span>{" "}
                            candidate{sim.totalCandidates !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-stone-100 mb-2">
                          {sim.completedCount > 0 && (
                            <div
                              className="bg-green-500"
                              style={{
                                width: `${(sim.completedCount / sim.totalCandidates) * 100}%`,
                              }}
                            />
                          )}
                          {sim.inProgressCount > 0 && (
                            <div
                              className="bg-blue-500"
                              style={{
                                width: `${(sim.inProgressCount / sim.totalCandidates) * 100}%`,
                              }}
                            />
                          )}
                          {sim.pendingCount > 0 && (
                            <div
                              className="bg-stone-300"
                              style={{
                                width: `${(sim.pendingCount / sim.totalCandidates) * 100}%`,
                              }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-stone-500">
                          {sim.completedCount > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              {sim.completedCount} completed
                            </span>
                          )}
                          {sim.inProgressCount > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              {sim.inProgressCount} active
                            </span>
                          )}
                          {sim.pendingCount > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
                              {sim.pendingCount} pending
                            </span>
                          )}
                        </div>

                        {/* Aggregate stats */}
                        {avgScore !== null && (
                          <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-3 text-[11px] text-stone-500">
                            <span>
                              Avg score{" "}
                              <span className="font-medium text-stone-700">
                                {avgScore.toFixed(1)}
                              </span>
                            </span>
                            {sim.completedCount > 0 && (
                              <span>
                                Completed{" "}
                                <span className="font-medium text-stone-700">
                                  {Math.round(
                                    (sim.completedCount / sim.totalCandidates) *
                                      100
                                  )}
                                  %
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty state for 0 candidates */
                      <div className="mb-3 rounded-md border border-dashed border-stone-200 bg-stone-50/50 px-3 py-3">
                        <p className="text-xs text-stone-400 mb-2">
                          No candidates yet
                        </p>
                        <button
                          onClick={(e) => handleCopyLink(e, sim.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <LinkIcon className="h-3 w-3" />
                          Copy invite link
                        </button>
                      </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Last activity */}
                    {sim.lastActivityDate && (
                      <div className="pt-2 border-t border-stone-100">
                        <div className="flex items-center gap-1 text-[11px] text-stone-400">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {sim.lastActivityDescription
                              ? `${sim.lastActivityDescription} ${formatRelativeTime(sim.lastActivityDate)}`
                              : formatRelativeTime(sim.lastActivityDate)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete simulation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-stone-700">
                {deleteTarget?.name}
              </span>{" "}
              and all associated candidate results, recordings, and scores.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
