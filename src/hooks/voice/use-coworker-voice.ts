"use client";

import { useCallback, useMemo } from "react";
import { buildTracedHeaders } from "@/lib/api/client";
import { createLogger } from "@/lib/core";
import { useVoiceBase } from "./use-voice-base";

const logger = createLogger("client:hooks:coworker-voice");
import type { VoiceConnectionState, VoiceBaseOptions } from "./types";
import type { AudioPermissionState } from "@/lib/media";
import type { TranscriptMessage } from "@/lib/ai";
import type { CategorizedError } from "@/lib/core";

export type { VoiceConnectionState as ConnectionState };

export interface UseCoworkerVoiceOptions extends VoiceBaseOptions {
  coworkerId: string;
}

export interface UseCoworkerVoiceReturn {
  connectionState: VoiceConnectionState;
  permissionState: AudioPermissionState;
  transcript: TranscriptMessage[];
  error: string | null;
  categorizedError: CategorizedError | null;
  isAudioSupported: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  callStartedAt: Date | null;
  callEndedAt: Date | null;
  retryCount: number;
  maxRetries: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  endCall: () => Promise<void>;
  retry: () => Promise<void>;
}

/**
 * Hook for coworker voice calls.
 * Uses the base voice hook with coworker-specific configuration.
 */
export function useCoworkerVoice({
  assessmentId,
  coworkerId,
  onTranscriptUpdate,
  onConnectionStateChange,
  onError,
  maxRetries,
}: UseCoworkerVoiceOptions): UseCoworkerVoiceReturn {
  // Progress storage key for this specific coworker call
  const progressKey = `coworker-call-${coworkerId}`;

  // Memoize token request body to prevent unnecessary re-renders
  const tokenRequestBody = useMemo(
    () => ({ coworkerId }),
    [coworkerId]
  );

  const base = useVoiceBase({
    assessmentId,
    onTranscriptUpdate,
    onConnectionStateChange,
    onError,
    maxRetries,
    config: {
      tokenEndpoint: "/api/call/token",
      initialGreeting: "Hi, thanks for taking my call.",
      progressType: progressKey,
      enableSessionRecovery: true,
    },
    tokenRequestBody,
  });

  // Fire-and-forget session log to /api/call/log
  const logSession = useCallback(
    (endTime: Date) => {
      const startTime = base.startedAt;
      if (!startTime) return;

      const durationMs = endTime.getTime() - startTime.getTime();

      fetch("/api/call/log", {
        method: "POST",
        headers: buildTracedHeaders(undefined, { "Content-Type": "application/json" }),
        body: JSON.stringify({
          assessmentId,
          coworkerId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          transcript: base.transcriptRef.current.map((m) => ({
            role: m.role,
            text: m.text,
            timestamp: m.timestamp,
          })),
          connectionEvents: base.connectionEventsRef.current,
          errorMessage: base.lastErrorMessage ?? undefined,
          durationMs,
        }),
      }).catch((err) => {
        logger.error("Error logging voice session", { err });
      });
    },
    [assessmentId, coworkerId, base]
  );

  // End call and save transcript
  const endCall = useCallback(async () => {
    const endTime = new Date();
    base.setEndedAt(endTime);
    base.disconnect();

    // Fire-and-forget: log session data for observability
    logSession(endTime);

    // Save transcript to server
    if (base.transcriptRef.current.length > 0) {
      try {
        await fetch("/api/call/transcript", {
          method: "POST",
          headers: buildTracedHeaders(undefined, { "Content-Type": "application/json" }),
          body: JSON.stringify({
            assessmentId,
            coworkerId,
            transcript: base.transcriptRef.current,
          }),
        });

        // Clear saved progress after successful completion
        base.clearSavedProgress();
      } catch (err) {
        logger.error("Error saving transcript", { err });
      }
    }
  }, [assessmentId, coworkerId, base, logSession]);

  return {
    connectionState: base.connectionState,
    permissionState: base.permissionState,
    transcript: base.transcript,
    error: base.error,
    categorizedError: base.categorizedError,
    isAudioSupported: base.isAudioSupported,
    isSpeaking: base.isSpeaking,
    isListening: base.isListening,
    callStartedAt: base.startedAt,
    callEndedAt: base.endedAt,
    retryCount: base.retryCount,
    maxRetries: base.maxRetries,
    connect: base.connect,
    disconnect: base.disconnect,
    endCall,
    retry: base.retry,
  };
}
