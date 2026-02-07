"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { FileText, ArrowRight, Loader2 } from "lucide-react";

type Step = "entry" | "guided" | "generating" | "preview";

export function RecruiterScenarioBuilderClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("entry");
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!jobDescription.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recruiter/simulations/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jobDescription.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze job description");
      }

      const data = await response.json();

      // TODO: Navigate to preview step with parsed data (US-004)
      // For now, just log success
      console.log("Parsed data:", data);

      // Placeholder: would navigate to preview with data
      // router.push(`/recruiter/simulations/new/preview?data=${encodeURIComponent(JSON.stringify(data))}`);

    } catch (err) {
      console.error("Failed to parse job description:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze job description");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Cmd/Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  };

  const handleGuidedPath = () => {
    // TODO: Navigate to guided questionnaire (US-003)
    setStep("guided");
  };

  const handleTryAgain = () => {
    setError(null);
  };

  if (step === "entry") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-3xl space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold">Create a New Simulation</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Start with a job description or answer a few questions
            </p>
          </div>

          {/* Primary Path: Job Description */}
          <Card className="p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Paste a Job Description</h2>
                <p className="text-sm text-muted-foreground">
                  Recommended — we'll extract everything automatically
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste your job description here...

Example:
Senior Frontend Engineer at Acme Corp

We're looking for an experienced frontend developer to join our team. You'll be working on our React-based dashboard, building new features for our analytics platform..."
                className="min-h-[300px] resize-y"
                disabled={isLoading}
              />

              {error && (
                <div className="flex items-center justify-between rounded-lg border border-destructive bg-destructive/10 p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      {error}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTryAgain}
                    className="text-destructive hover:text-destructive"
                  >
                    Try again
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Tip: Press{" "}
                  <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                    {typeof navigator !== "undefined" &&
                    navigator.platform.toLowerCase().includes("mac")
                      ? "⌘"
                      : "Ctrl"}
                    +Enter
                  </kbd>{" "}
                  to continue
                </p>
                <Button
                  onClick={handleContinue}
                  disabled={!jobDescription.trim() || isLoading}
                  size="lg"
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing your job description...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Secondary Path: Guided */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have a job description?{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={handleGuidedPath}
                disabled={isLoading}
              >
                Answer a few questions instead
              </Button>
            </p>
          </div>

          {/* Cancel Link */}
          <div className="text-center">
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link href="/recruiter/simulations">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "guided") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-3xl space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Guided Setup</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Answer a few questions to create your simulation
            </p>
          </div>

          <Card className="p-8">
            <div className="space-y-6">
              <p className="text-muted-foreground">
                This guided questionnaire will be implemented in US-003.
              </p>
              <Button
                variant="ghost"
                onClick={() => setStep("entry")}
                className="gap-2"
              >
                Back to job description
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Placeholder for other steps
  return null;
}
