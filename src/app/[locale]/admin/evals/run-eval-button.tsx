"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FlaskConical, Loader2 } from "lucide-react";

export function RunEvalButton() {
  const [running, setRunning] = useState(false);
  const router = useRouter();

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/evals/run", { method: "POST" });
      const data = await res.json();
      if (data.data?.id) {
        // Poll until completed
        const pollInterval = setInterval(async () => {
          const check = await fetch(`/api/admin/evals/${data.data.id}`);
          const result = await check.json();
          if (result.data?.status === "completed" || result.data?.status === "failed") {
            clearInterval(pollInterval);
            setRunning(false);
            router.refresh();
          }
        }, 5000);
      } else {
        setRunning(false);
      }
    } catch {
      setRunning(false);
    }
  };

  return (
    <Button onClick={handleRun} disabled={running}>
      {running ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Running Evals...
        </>
      ) : (
        <>
          <FlaskConical className="mr-2 h-4 w-4" />
          Run Evals
        </>
      )}
    </Button>
  );
}
