"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, Button } from "@/components/ui";
import { useTranslations } from "next-intl";

interface ErrorBoundaryFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  context?: string;
  assessmentId?: string;
}

function reportError(
  error: Error & { digest?: string },
  context?: string,
  assessmentId?: string
) {
  const payload: Record<string, unknown> = {
    errorType: "REACT_BOUNDARY",
    message: error.message,
    stackTrace: error.stack,
    url: typeof window !== "undefined" ? window.location.href : "",
    metadata: {
      digest: error.digest,
      context,
    },
  };

  if (assessmentId) {
    payload.assessmentId = assessmentId;
  }

  fetch("/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently drop to prevent infinite error loops
  });
}

export function ErrorBoundaryFallback({
  error,
  reset,
  context,
  assessmentId,
}: ErrorBoundaryFallbackProps) {
  const t = useTranslations("common.error");

  useEffect(() => {
    reportError(error, context, assessmentId);
  }, [error, context, assessmentId]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-destructive/20 shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>

            <h2 className="mb-2 text-xl font-semibold">
              {t("title")}
            </h2>

            <p className="mb-6 text-sm text-muted-foreground">
              {t("description")}
            </p>

            <Button onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              {t("tryAgain")}
            </Button>

            {process.env.NODE_ENV === "development" && (
              <details className="mt-6 w-full text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {t("errorDetails")}
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
