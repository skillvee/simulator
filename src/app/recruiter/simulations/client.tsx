"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  FolderOpen,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { SimulationManageData } from "./page";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

type SortKey = "name" | "company" | "candidates" | "created" | "level";
type SortDir = "asc" | "desc";

interface Props {
  simulations: SimulationManageData[];
}

export function SimulationsTableClient({ simulations }: Props) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<SimulationManageData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const copyLink = async (e: React.MouseEvent, simulationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const link = `${baseUrl}/invite/${simulationId}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const t = document.createElement("textarea");
      t.value = link;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopiedId(simulationId);
    toast.success("Invite link copied");
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
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Simulation deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const sorted = useMemo(() => {
    const arr = [...simulations];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "company":
          cmp = a.companyName.localeCompare(b.companyName);
          break;
        case "candidates":
          cmp = a.candidateCount - b.candidateCount;
          break;
        case "created":
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "level":
          cmp = a.targetLevel.localeCompare(b.targetLevel);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [simulations, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-1 text-blue-600" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1 text-blue-600" />
    );
  };

  const levelLabel = (level: string) => {
    const map: Record<string, string> = {
      junior: "Junior",
      mid: "Mid",
      senior: "Senior",
      lead: "Lead",
    };
    return map[level] ?? level;
  };

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
              ? `${simulations.length} simulation${simulations.length !== 1 ? "s" : ""}`
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

      {simulations.length === 0 ? (
        <Card className="border-stone-200 bg-white">
          <CardContent className="p-12 text-center">
            <FolderOpen className="mx-auto h-16 w-16 text-stone-300" />
            <h2 className="mt-6 text-xl font-semibold text-stone-900">
              No simulations yet
            </h2>
            <p className="mt-2 text-stone-500">
              Create your first work simulation to start assessing candidates.
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
        <Card className="shadow-sm border-stone-200 overflow-hidden rounded-xl">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-stone-200">
                <TableHead className="pl-4">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    Simulation
                    <SortIcon col="name" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => toggleSort("company")}
                    className="flex items-center text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    Company
                    <SortIcon col="company" />
                  </button>
                </TableHead>
                <TableHead className="w-[80px]">
                  <span className="text-xs font-medium text-stone-500">
                    Status
                  </span>
                </TableHead>
                <TableHead className="w-[80px]">
                  <button
                    onClick={() => toggleSort("level")}
                    className="flex items-center text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    Level
                    <SortIcon col="level" />
                  </button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <button
                    onClick={() => toggleSort("candidates")}
                    className="flex items-center text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    Candidates
                    <SortIcon col="candidates" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => toggleSort("created")}
                    className="flex items-center text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    Created
                    <SortIcon col="created" />
                  </button>
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((sim) => (
                <TableRow
                  key={sim.id}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors group"
                  onClick={() =>
                    router.push(
                      `/recruiter/simulations/${sim.id}/settings`
                    )
                  }
                >
                  {/* Name */}
                  <TableCell className="pl-4">
                    <span className="font-medium text-sm text-stone-900 group-hover:text-blue-600 transition-colors">
                      {sim.name}
                    </span>
                  </TableCell>

                  {/* Company */}
                  <TableCell>
                    <span className="text-sm text-stone-500">
                      {sim.companyName}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {sim.isPublished ? (
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 border-0 text-[11px] font-medium"
                      >
                        Open
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-stone-100 text-stone-500 border-0 text-[11px]"
                      >
                        Draft
                      </Badge>
                    )}
                  </TableCell>

                  {/* Level */}
                  <TableCell>
                    <span className="text-xs text-stone-600 capitalize">
                      {levelLabel(sim.targetLevel)}
                    </span>
                  </TableCell>

                  {/* Candidates */}
                  <TableCell>
                    <span className="text-sm font-mono text-stone-700">
                      {sim.candidateCount}
                    </span>
                  </TableCell>

                  {/* Created */}
                  <TableCell>
                    <span className="text-xs text-stone-500 font-mono">
                      {formatDate(sim.createdAt)}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => copyLink(e, sim.id)}
                        className={`p-1.5 rounded-md transition-colors ${
                          copiedId === sim.id
                            ? "text-blue-600"
                            : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                        }`}
                      >
                        {copiedId === sim.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteTarget(sim);
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-stone-100 rounded-md transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Dialog */}
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
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
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
