"use client";

import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostDefenseModalProps {
  onFinalize: () => void;
  onContinueWorking: () => void;
}

export function PostDefenseModal({
  onFinalize,
  onContinueWorking,
}: PostDefenseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl shadow-xl p-6 animate-in zoom-in-95 duration-200"
        style={{
          background: "hsl(var(--slack-bg-main))",
          border: "1px solid hsl(var(--slack-border))",
        }}
      >
        {/* Header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <h2
            className="text-xl font-bold"
            style={{ color: "hsl(var(--slack-text))" }}
          >
            Finalize your submission?
          </h2>
          <p
            className="text-sm mt-1.5"
            style={{ color: "hsl(var(--slack-text-muted))" }}
          >
            This will end your assessment. Your work and review call will be
            evaluated.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" size="sm" onClick={onContinueWorking}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Working
          </Button>
          <Button size="sm" onClick={onFinalize}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Finalize
          </Button>
        </div>
      </div>
    </div>
  );
}
