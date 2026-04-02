"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

const STEP_LABELS: Record<string, string> = {
  parse_jd: "Parse Job Description",
  generate_tasks: "Generate Tasks",
  generate_coworkers: "Generate Coworkers",
  generate_resources: "Generate Resources",
  provision_repo: "Provision Repository",
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  parse_jd: "Extracts structured data (role, company, tech stack, responsibilities) from a pasted job description.",
  generate_tasks: "Generates 2-3 realistic work challenge options calibrated to the role and seniority level.",
  generate_coworkers: "Creates 2-3 AI coworker personas with knowledge items and personalities.",
  generate_resources: "Produces 1-4 reference documents (repos, dashboards, PRDs, etc.) for the candidate.",
  provision_repo: "Sets up a GitHub repository for the candidate's coding task.",
};

interface GenerationStepDetailProps {
  step: Record<string, unknown>;
  stepNumber: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 gap-1 px-2 text-xs"
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CollapsibleSection({
  title,
  content,
  defaultOpen = false,
  variant = "default",
}: {
  title: string;
  content: string;
  defaultOpen?: boolean;
  variant?: "default" | "error";
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const bgClass =
    variant === "error"
      ? "bg-red-50 dark:bg-red-950/30"
      : "bg-muted/50";

  return (
    <div className="rounded-lg border">
      <div className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-1 items-center gap-2 hover:text-foreground"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span>{title}</span>
        </button>
        {isOpen && <CopyButton text={content} />}
      </div>
      {isOpen && (
        <div className={`border-t px-4 py-3 ${bgClass}`}>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

export function GenerationStepDetail({
  step,
  stepNumber,
}: GenerationStepDetailProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stepName = step.stepName as string;
  const status = step.status as string;
  const durationMs = step.durationMs as number | null;
  const attempts = step.attempts as number;
  const modelUsed = step.modelUsed as string | null;
  const promptVersion = step.promptVersion as string | null;
  const promptText = step.promptText as string | null;
  const responseText = step.responseText as string | null;
  const inputData = step.inputData as Record<string, unknown> | null;
  const outputData = step.outputData as Record<string, unknown> | null;
  const errorMessage = step.errorMessage as string | null;
  const errorDetails = step.errorDetails as Record<string, unknown> | null;
  const createdAt = step.createdAt as string;

  const statusColor =
    status === "completed"
      ? "bg-green-500/10 text-green-600 border-green-600"
      : status === "failed"
        ? "bg-red-500/10 text-red-600 border-red-600"
        : "bg-blue-500/10 text-blue-600 border-blue-600";

  return (
    <Card
      className={
        status === "failed"
          ? "border-red-200 dark:border-red-900"
          : ""
      }
    >
      <CardHeader
        className="cursor-pointer pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
              {stepNumber}
            </span>
            <CardTitle className="text-base">
              {STEP_LABELS[stepName] || stepName}
            </CardTitle>
            <Badge variant="outline" className={statusColor}>
              {status}
            </Badge>
            {attempts > 1 && (
              <Badge variant="secondary" className="text-xs">
                {attempts} attempts
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {modelUsed && <span>{modelUsed}</span>}
            {promptVersion && <span>v{promptVersion}</span>}
            {durationMs != null && (
              <span className="font-medium">
                {(durationMs / 1000).toFixed(1)}s
              </span>
            )}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </div>
        <p className="ml-10 text-sm text-muted-foreground">
          {STEP_DESCRIPTIONS[stepName] || ""}
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Metadata */}
          <div className="ml-10 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              Started: {new Date(createdAt).toLocaleString()}
            </span>
            {typeof step.completedAt === "string" && (
              <span>
                Completed:{" "}
                {new Date(step.completedAt).toLocaleString()}
              </span>
            )}
          </div>

          <div className="ml-10 space-y-3">
            {/* Input data */}
            {inputData && (
              <CollapsibleSection
                title="Input Data"
                content={JSON.stringify(inputData, null, 2)}
              />
            )}

            {/* Prompt */}
            {promptText && (
              <CollapsibleSection
                title="Prompt Sent to AI"
                content={promptText}
              />
            )}

            {/* Response */}
            {responseText && (
              <CollapsibleSection
                title="AI Response"
                content={responseText}
              />
            )}

            {/* Parsed output */}
            {outputData && (
              <CollapsibleSection
                title="Parsed Output"
                content={JSON.stringify(outputData, null, 2)}
              />
            )}

            {/* Error */}
            {errorMessage && (
              <CollapsibleSection
                title="Error"
                content={
                  errorMessage +
                  (errorDetails
                    ? "\n\n" + JSON.stringify(errorDetails, null, 2)
                    : "")
                }
                defaultOpen={true}
                variant="error"
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
