"use client";

import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      data-testid="confirmation-dialog-overlay"
    >
      <Card
        className="mx-4 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        data-testid="confirmation-dialog"
      >
        <CardContent className="p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="mb-2 text-xl font-semibold">Retry Assessment</h2>
              <p className="text-muted-foreground">
                This will create a <strong>new assessment</strong> and mark this
                one as superseded. The original assessment data will be preserved
                for historical reference.
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Warning:</strong> A new assessment record will be created
              with fresh logs. This operation cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              data-testid="cancel-retry-button"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              data-testid="confirm-retry-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Confirm Retry
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
