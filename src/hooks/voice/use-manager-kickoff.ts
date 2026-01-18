"use client";

import { useState, useCallback } from "react";
import { useVoiceBase } from "./use-voice-base";
import type { VoiceConnectionState, VoiceBaseOptions } from "./types";
import type { AudioPermissionState } from "@/lib/audio";
import type { TranscriptMessage } from "@/lib/gemini";
import type { CategorizedError } from "@/lib/error-recovery";

export type { VoiceConnectionState as ConnectionState };

export type UseManagerKickoffOptions = VoiceBaseOptions;

export interface UseManagerKickoffReturn {
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
  managerName: string | null;
  managerRole: string | null;
  retryCount: number;
  maxRetries: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  endCall: () => Promise<void>;
  retry: () => Promise<void>;
}

/**
 * Hook for manager kickoff voice calls.
 * Uses the base voice hook with kickoff-specific configuration.
 * Now includes retry support with "retrying" state.
 */
export function useManagerKickoff({
  assessmentId,
  onTranscriptUpdate,
  onConnectionStateChange,
  onError,
  maxRetries,
}: UseManagerKickoffOptions): UseManagerKickoffReturn {
  // Kickoff-specific state from token response
  const [managerName, setManagerName] = useState<string | null>(null);
  const [managerRole, setManagerRole] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);

  const base = useVoiceBase({
    assessmentId,
    onTranscriptUpdate,
    onConnectionStateChange,
    onError,
    maxRetries,
    config: {
      tokenEndpoint: "/api/kickoff/token",
      initialGreeting: "Hi, I'm here for the kickoff!",
      enableSessionRecovery: false,
    },
    onTokenResponse: (tokenData) => {
      setManagerName(tokenData.managerName as string | null);
      setManagerRole(tokenData.managerRole as string | null);
      setManagerId(tokenData.managerId as string | null);
    },
  });

  // End call and save transcript
  const endCall = useCallback(async () => {
    const endTime = new Date();
    base.setEndedAt(endTime);
    base.disconnect();

    // Save transcript to server
    if (base.transcriptRef.current.length > 0) {
      try {
        await fetch("/api/kickoff/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            managerId,
            transcript: base.transcriptRef.current,
          }),
        });
      } catch (err) {
        console.error("Error saving transcript:", err);
      }
    }
  }, [assessmentId, managerId, base]);

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
    managerName,
    managerRole,
    retryCount: base.retryCount,
    maxRetries: base.maxRetries,
    connect: base.connect,
    disconnect: base.disconnect,
    endCall,
    retry: base.retry,
  };
}
