"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface ErrorEntry {
  errorType: "UNHANDLED_EXCEPTION" | "CONSOLE_ERROR" | "CONSOLE_WARN" | "CONSOLE_LOG";
  message: string;
  stackTrace?: string;
  url: string;
  assessmentId?: string;
  metadata?: Record<string, unknown>;
}

function extractAssessmentId(pathname: string): string | undefined {
  const match = pathname.match(/\/assessments\/([^/]+)/);
  return match?.[1];
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === "string") return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

export function ErrorCaptureProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const bufferRef = useRef<ErrorEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep pathname ref in sync
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function getUrl(): string {
      return typeof window !== "undefined" ? window.location.href : "";
    }

    function enqueue(entry: ErrorEntry) {
      bufferRef.current.push(entry);

      if (!timerRef.current) {
        timerRef.current = setTimeout(flush, 1000);
      }
    }

    function flush() {
      timerRef.current = null;
      const entries = bufferRef.current.splice(0);
      if (entries.length === 0) return;

      for (const entry of entries) {
        // Fire-and-forget — non-blocking
        fetch("/api/errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        }).catch(() => {
          // Silently drop — avoid infinite error loops
        });
      }
    }

    function getAssessmentId(): string | undefined {
      return extractAssessmentId(pathnameRef.current);
    }

    // Monkey-patch console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.error = (...args: unknown[]) => {
      originalError.apply(console, args);
      enqueue({
        errorType: "CONSOLE_ERROR",
        message: stringifyArgs(args),
        url: getUrl(),
        assessmentId: getAssessmentId(),
      });
    };

    console.warn = (...args: unknown[]) => {
      originalWarn.apply(console, args);
      enqueue({
        errorType: "CONSOLE_WARN",
        message: stringifyArgs(args),
        url: getUrl(),
        assessmentId: getAssessmentId(),
      });
    };

    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      enqueue({
        errorType: "CONSOLE_LOG",
        message: stringifyArgs(args),
        url: getUrl(),
        assessmentId: getAssessmentId(),
      });
    };

    // Window error handlers
    const handleError = (event: ErrorEvent) => {
      enqueue({
        errorType: "UNHANDLED_EXCEPTION",
        message: event.message || "Unknown error",
        stackTrace: event.error?.stack,
        url: getUrl(),
        assessmentId: getAssessmentId(),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      enqueue({
        errorType: "UNHANDLED_EXCEPTION",
        message: reason instanceof Error ? reason.message : String(reason),
        stackTrace: reason instanceof Error ? reason.stack : undefined,
        url: getUrl(),
        assessmentId: getAssessmentId(),
        metadata: { type: "unhandledrejection" },
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      // Restore originals
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);

      // Flush remaining
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flush();
    };
  }, []); // Mount once

  return <>{children}</>;
}
