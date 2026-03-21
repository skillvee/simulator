"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createLogger } from "@/lib/core";

const logger = createLogger("client:admin:copy-button");

interface CopyButtonProps {
  text: string;
  label: string;
  testId: string;
}

export function CopyButton({ text, label, testId }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy", { err });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className={
        copied
          ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
          : ""
      }
      title={`Copy ${label}`}
      data-testid={testId}
    >
      {copied ? (
        <>
          <Check className="mr-1.5 h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-1.5 h-3 w-3" />
          Copy {label}
        </>
      )}
    </Button>
  );
}
