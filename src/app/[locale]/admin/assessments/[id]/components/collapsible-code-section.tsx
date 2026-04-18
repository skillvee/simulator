"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CopyButton } from "./copy-button";

interface CollapsibleCodeSectionProps {
  title: string;
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
  copyLabel: string;
  testIdPrefix: string;
}

export function CollapsibleCodeSection({
  title,
  content,
  isExpanded,
  onToggle,
  copyLabel,
  testIdPrefix,
}: CollapsibleCodeSectionProps) {
  // Format JSON if possible
  let displayContent = content;
  let language = "text";
  try {
    const parsed = JSON.parse(content);
    displayContent = JSON.stringify(parsed, null, 2);
    language = "json";
  } catch {
    // Not valid JSON, display as-is
  }

  return (
    <Card data-testid={`${testIdPrefix}-section`}>
      <div
        className="flex cursor-pointer items-center justify-between rounded-t-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        data-testid={`${testIdPrefix}-header`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">
            ({content.length.toLocaleString()} chars)
          </span>
        </div>
        <CopyButton
          text={content}
          label={copyLabel}
          testId={`${testIdPrefix}-copy-button`}
        />
      </div>
      {isExpanded && (
        <div
          className="max-h-96 overflow-auto"
          data-testid={`${testIdPrefix}-content`}
        >
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-b-xl bg-foreground p-4 font-mono text-xs text-background">
            <code className={`language-${language}`}>{displayContent}</code>
          </pre>
        </div>
      )}
    </Card>
  );
}
