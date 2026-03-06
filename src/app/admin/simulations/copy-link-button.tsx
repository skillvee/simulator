"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ scenarioId }: { scenarioId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();
    const link = `${window.location.origin}/invite/${scenarioId}`;
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={
        copied
          ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
          : ""
      }
      title="Copy invitation link"
    >
      {copied ? (
        <>
          <Check className="mr-1.5 h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="mr-1.5 h-3 w-3" />
          Copy Link
        </>
      )}
    </Button>
  );
}
