"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Toast } from "./types";

interface ToastNotificationProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function ToastNotification({ toast, onDismiss }: ToastNotificationProps) {
  const bgClass =
    toast.type === "success"
      ? "border-green-500 bg-green-50 dark:bg-green-950"
      : toast.type === "error"
        ? "border-destructive bg-destructive/10"
        : "border-primary bg-primary/10";

  const textClass =
    toast.type === "success"
      ? "text-green-800 dark:text-green-200"
      : toast.type === "error"
        ? "text-destructive"
        : "text-primary";

  return (
    <Card className={bgClass} data-testid={`toast-${toast.type}`}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className={`flex items-center gap-2 ${textClass}`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : toast.type === "error" ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm">{toast.message}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(toast.id)}
          className={textClass}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
