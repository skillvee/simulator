"use client";

import { useCallback, useMemo } from "react";
import { useVoiceBase } from "./use-voice-base";
import type { VoiceConnectionState, VoiceBaseOptions } from "./types";
import type { AudioPermissionState } from "@/lib/audio";
import type { TranscriptMessage } from "@/lib/gemini";
import type { CategorizedError } from "@/lib/error-recovery";

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

  // End call and save transcript
  const endCall = useCallback(async () => {
    const endTime = new Date();
    base.setEndedAt(endTime);
    base.disconnect();

    // Save transcript to server
    if (base.transcriptRef.current.length > 0) {
      try {
        await fetch("/api/call/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            coworkerId,
            transcript: base.transcriptRef.current,
          }),
        });

        // Clear saved progress after successful completion
        base.clearSavedProgress();
      } catch (err) {
        console.error("Error saving transcript:", err);
      }
    }
  }, [assessmentId, coworkerId, base]);

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
