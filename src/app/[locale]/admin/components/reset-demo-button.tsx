"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Result =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; welcomeUrl: string; resultsUrl: string }
  | { kind: "err"; message: string };

export function ResetDemoButton() {
  const [state, setState] = useState<Result>({ kind: "idle" });

  const handleClick = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setState({
          kind: "err",
          message: body.error || `HTTP ${res.status}`,
        });
        return;
      }
      setState({
        kind: "ok",
        welcomeUrl: body.data.welcomeUrl,
        resultsUrl: body.data.resultsUrl,
      });
    } catch (e) {
      setState({ kind: "err", message: e instanceof Error ? e.message : "Failed" });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleClick}
        variant="outline"
        disabled={state.kind === "loading"}
        className="shadow-sm hover:shadow-md transition-shadow"
      >
        <RotateCcw className="h-4 w-4" />
        {state.kind === "loading" ? "Resetting…" : "Reset Demo"}
      </Button>

      {state.kind === "ok" && (
        <div className="flex flex-col gap-1 rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Demo reset — ready for a walkthrough
          </div>
          <div className="flex flex-col gap-0.5 pl-6 text-xs text-muted-foreground">
            <Link
              href={state.welcomeUrl}
              className="hover:text-primary hover:underline"
            >
              Fresh walkthrough → {state.welcomeUrl}
            </Link>
            <Link
              href={state.resultsUrl}
              className="hover:text-primary hover:underline"
            >
              Polished results → {state.resultsUrl}
            </Link>
          </div>
        </div>
      )}

      {state.kind === "err" && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {state.message}
        </div>
      )}
    </div>
  );
}
