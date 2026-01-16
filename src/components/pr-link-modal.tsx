"use client";

import { useState } from "react";

interface PrLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prUrl: string) => Promise<void>;
  managerName: string;
}

export function PrLinkModal({
  isOpen,
  onClose,
  onSubmit,
  managerName,
}: PrLinkModalProps) {
  const [prUrl, setPrUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(null);

    if (!prUrl.trim()) {
      setError("Please enter a PR link");
      return;
    }

    // Basic URL validation
    try {
      new URL(prUrl);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    if (!prUrl.startsWith("https://")) {
      setError("URL must start with https://");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(prUrl.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit PR link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/80"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background border-4 border-foreground p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Ready to Submit?</h2>
          <p className="text-muted-foreground">
            Great work! Please share your PR link so {managerName} can review
            your code and schedule the final defense.
          </p>
        </div>

        {/* PR Link Input */}
        <div className="mb-6">
          <label
            htmlFor="prUrl"
            className="block font-bold mb-2 font-mono text-sm"
          >
            PR/MR Link
          </label>
          <input
            id="prUrl"
            type="url"
            value={prUrl}
            onChange={(e) => {
              setPrUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="https://github.com/org/repo/pull/123"
            disabled={isSubmitting}
            className="w-full px-4 py-3 border-2 border-foreground bg-background text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm font-mono text-red-600">{error}</p>
          )}
        </div>

        {/* Helpful hint */}
        <div className="mb-6 p-4 bg-secondary/20 border-2 border-foreground">
          <p className="text-sm">
            <span className="font-bold">Accepted formats:</span> GitHub PRs,
            GitLab MRs, or Bitbucket Pull Requests
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 border-2 border-foreground bg-background text-foreground font-bold hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !prUrl.trim()}
            className="flex-1 px-6 py-3 border-2 border-foreground bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit PR"}
          </button>
        </div>
      </div>
    </div>
  );
}
