/**
 * Rejection Feedback Modal Component
 *
 * Modal for collecting feedback when rejecting a candidate from search results.
 * Allows hiring managers to explain why a candidate isn't a fit, which is used
 * to refine search criteria automatically.
 *
 * @since 2026-01-17
 * @see Issue #75: US-012b
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface RejectionFeedbackModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Name of the candidate being rejected */
  candidateName: string;
  /** Called when modal should close */
  onClose: () => void;
  /** Called when feedback is submitted */
  onSubmit: (feedback: string) => Promise<void> | void;
}

// ============================================================================
// Component
// ============================================================================

export function RejectionFeedbackModal({
  isOpen,
  candidateName,
  onClose,
  onSubmit,
}: RejectionFeedbackModalProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!feedback.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(feedback);
      setFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  }, [feedback, isSubmitting, onSubmit]);

  // Handle overlay click
  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle content click (stop propagation)
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-testid="rejection-feedback-modal"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Overlay */}
      <div
        data-testid="modal-overlay"
        className="absolute inset-0 bg-black/50"
        onClick={handleOverlayClick}
      />

      {/* Modal Content */}
      <div
        data-testid="modal-content"
        className="relative z-10 w-full max-w-lg mx-4 bg-background border-2 border-foreground p-6"
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">
              Not a fit: {candidateName}
            </h2>
            <p className="text-muted-foreground mt-1">
              Why isn&apos;t this candidate a fit?
            </p>
          </div>
          <button
            data-testid="close-modal-button"
            onClick={onClose}
            className="p-2 border-2 border-foreground hover:bg-accent"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Input */}
        <textarea
          data-testid="feedback-input"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder='e.g., "Need 8+ years, not 5" or "Looking for more frontend focus"'
          rows={4}
          className="w-full px-4 py-3 border-2 border-foreground bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary resize-none font-sans"
          disabled={isSubmitting}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            data-testid="cancel-button"
            onClick={onClose}
            className="px-4 py-2 border-2 border-foreground hover:bg-accent font-medium"
          >
            Cancel
          </button>
          <button
            data-testid="submit-feedback-button"
            onClick={handleSubmit}
            disabled={!feedback.trim() || isSubmitting}
            className="px-4 py-2 border-2 border-foreground bg-foreground text-background hover:bg-secondary hover:text-secondary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" data-testid="submit-loading" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
