"use client";

import { useEffect, useRef, useCallback } from "react";
import { createLogger } from "@/lib/core";

const logger = createLogger("client:hooks:candidate-events");

const BUFFER_FLUSH_INTERVAL_MS = 5_000;
const IDLE_TIMEOUT_MS = 60_000;

interface CandidateEvent {
  eventType: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

function flushEvents(assessmentId: string, events: CandidateEvent[]) {
  if (events.length === 0) return;

  const body = JSON.stringify({ assessmentId, events });

  // Use sendBeacon for reliability (works during unload), fall back to fetch
  const sent = navigator.sendBeacon(
    "/api/events",
    new Blob([body], { type: "application/json" })
  );

  if (!sent) {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch((err) => {
      logger.error("Failed to flush candidate events", { err });
    });
  }
}

export function useCandidateEvents(assessmentId: string) {
  const bufferRef = useRef<CandidateEvent[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushEvent = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      bufferRef.current.push({
        eventType,
        timestamp: new Date().toISOString(),
        metadata,
      });
    },
    []
  );

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;
    const events = bufferRef.current;
    bufferRef.current = [];
    flushEvents(assessmentId, events);
  }, [assessmentId]);

  useEffect(() => {
    // --- Visibility change (tab switch / focus) ---
    const handleVisibility = () => {
      pushEvent(
        document.hidden ? "FOCUS_LOST" : "FOCUS_GAINED"
      );
    };

    // --- Paste (length only, no content) ---
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain") ?? "";
      pushEvent("PASTE", { pasteLength: text.length });
    };

    // --- Copy ---
    const handleCopy = () => {
      pushEvent("COPY");
    };

    // --- Idle detection ---
    const resetIdleTimer = () => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        pushEvent("IDLE_END");
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        pushEvent("IDLE_START");
      }, IDLE_TIMEOUT_MS);
    };

    // --- Flush on beforeunload ---
    const handleBeforeUnload = () => {
      flush();
    };

    // Register listeners
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("mousemove", resetIdleTimer);
    document.addEventListener("keydown", resetIdleTimer);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Start idle timer
    resetIdleTimer();

    // Start periodic flush
    flushIntervalRef.current = setInterval(flush, BUFFER_FLUSH_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("mousemove", resetIdleTimer);
      document.removeEventListener("keydown", resetIdleTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);

      // Flush remaining events on unmount
      flush();
    };
  }, [assessmentId, pushEvent, flush]);
}
