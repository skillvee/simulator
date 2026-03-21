"use client";

import { useState, useCallback } from "react";
import { createLogger } from "@/lib/core";
import { useVoiceBase } from "./use-voice-base";

const logger = createLogger("client:hooks:defense-call");
import type { VoiceConnectionState, VoiceBaseOptions } from "./types";
import type { AudioPermissionState } from "@/lib/media";
import type { TranscriptMessage } from "@/lib/ai";
import type { CategorizedError } from "@/lib/core";

export type { VoiceConnectionState as ConnectionState };

export interface UseDefenseCallOptions extends Omit<VoiceBaseOptions, "maxRetries"> {
  /** Endpoint to get the call token. Will be configured when integrated with Slack. */
  tokenEndpoint?: string;
  /** Endpoint to save the transcript. Will be configured when integrated with Slack. */
  transcriptEndpoint?: string;
  onCallEnded?: () => void;
}

export interface UseDefenseCallReturn {
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
  prUrl: string | null;
  retryCount: number;
  maxRetries: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  endCall: () => Promise<void>;
  retry: () => Promise<void>;
}

/**
 * Hook for PR defense voice calls with manager.
 * Uses the base voice hook with defense-specific configuration.
 *
 * Note: This hook is preserved for reuse in the Slack integration (RF-012).
 * The standalone defense page has been removed, and defense calls will
 * happen within the Slack chat interface.
 *
 * To use this hook in Slack integration:
 * 1. Configure the tokenEndpoint to point to the call token API
 * 2. Configure the transcriptEndpoint to save defense call transcripts
 */
export function useDefenseCall({
  assessmentId,
  tokenEndpoint = "/api/call/token", // Default to generic call endpoint
  transcriptEndpoint = "/api/call/transcript", // Default to generic transcript endpoint
  onTranscriptUpdate,
  onConnectionStateChange,
  onError,
  onCallEnded,
}: UseDefenseCallOptions): UseDefenseCallReturn {
  // Defense-specific state from token response
  const [managerName, setManagerName] = useState<string | null>(null);
  const [managerRole, setManagerRole] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  const base = useVoiceBase({
    assessmentId,
    onTranscriptUpdate,
    onConnectionStateChange,
    onError,
    config: {
      tokenEndpoint,
      initialGreeting: "Hi, I'm ready to walk you through my PR!",
      enableSessionRecovery: false,
    },
    onTokenResponse: (tokenData) => {
      setManagerName(tokenData.managerName as string | null);
      setManagerRole(tokenData.managerRole as string | null);
      setManagerId(tokenData.managerId as string | null);
      setPrUrl(tokenData.prUrl as string | null);
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
        await fetch(transcriptEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            managerId,
            transcript: base.transcriptRef.current,
          }),
        });
      } catch (err) {
        logger.error("Error saving transcript", { err });
      }
    }

    // Call the onCallEnded callback
    onCallEnded?.();
  }, [assessmentId, managerId, base, onCallEnded, transcriptEndpoint]);

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
    prUrl,
    retryCount: base.retryCount,
    maxRetries: base.maxRetries,
    connect: base.connect,
    disconnect: base.disconnect,
    endCall,
    retry: base.retry,
  };
}
