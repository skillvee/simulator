"use client";

import { useCallback } from "react";
import { useVoiceBase } from "./use-voice-base";
import type { VoiceConnectionState, VoiceBaseOptions } from "./types";
import type { AudioPermissionState } from "@/lib/audio";
import type { TranscriptMessage } from "@/lib/gemini";
import type { CategorizedError } from "@/lib/error-recovery";

export type { VoiceConnectionState as ConnectionState };

export type UseVoiceConversationOptions = VoiceBaseOptions;

export interface UseVoiceConversationReturn {
  connectionState: VoiceConnectionState;
  permissionState: AudioPermissionState;
  transcript: TranscriptMessage[];
  error: string | null;
  categorizedError: CategorizedError | null;
  isAudioSupported: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  interviewStartedAt: Date | null;
  interviewEndedAt: Date | null;
  retryCount: number;
  maxRetries: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  endInterview: () => Promise<boolean>;
  retry: () => Promise<void>;
  hasRecoverableSession: boolean;
  recoverSession: () => void;
}

const PROGRESS_TYPE = "hr-interview";

/**
 * Hook for HR interview voice conversations.
 * Uses the base voice hook with HR-specific configuration.
 */
export function useVoiceConversation({
  assessmentId,
  onTranscriptUpdate,
  onConnectionStateChange,
  onError,
  maxRetries,
}: UseVoiceConversationOptions): UseVoiceConversationReturn {
  const base = useVoiceBase({
    assessmentId,
    onTranscriptUpdate,
    onConnectionStateChange,
    onError,
    maxRetries,
    config: {
      tokenEndpoint: "/api/interview/token",
      initialGreeting: "Hello, I'm ready for the interview.",
      progressType: PROGRESS_TYPE,
      enableSessionRecovery: true,
    },
  });

  // End interview and save transcript
  const endInterview = useCallback(async (): Promise<boolean> => {
    const endTime = new Date();
    base.setEndedAt(endTime);
    base.disconnect();

    // Always save transcript to server (even if empty, to create conversation record)
    try {
      const transcriptResponse = await fetch("/api/interview/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          transcript: base.transcriptRef.current,
        }),
      });

      if (!transcriptResponse.ok) {
        const errorData = await transcriptResponse.json().catch(() => ({}));
        console.error(
          "[HR Interview] Failed to save transcript:",
          transcriptResponse.status,
          errorData
        );
        return false;
      }

      // Trigger HR assessment analysis with timestamps (only if we have transcript content)
      if (base.transcriptRef.current.length > 0) {
        const assessmentResponse = await fetch("/api/interview/assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            interviewStartedAt: base.startedAt?.toISOString(),
            interviewEndedAt: endTime.toISOString(),
          }),
        });

        if (!assessmentResponse.ok) {
          console.error(
            "[HR Interview] Failed to generate HR assessment:",
            assessmentResponse.status
          );
          // Continue anyway - transcript was saved, assessment can be generated later
        }
      }

      // Clear saved progress after successful completion
      base.clearSavedProgress();
      return true;
    } catch (err) {
      console.error(
        "[HR Interview] Error saving transcript or generating assessment:",
        err
      );
      return false;
    }
  }, [assessmentId, base]);

  return {
    connectionState: base.connectionState,
    permissionState: base.permissionState,
    transcript: base.transcript,
    error: base.error,
    categorizedError: base.categorizedError,
    isAudioSupported: base.isAudioSupported,
    isSpeaking: base.isSpeaking,
    isListening: base.isListening,
    interviewStartedAt: base.startedAt,
    interviewEndedAt: base.endedAt,
    retryCount: base.retryCount,
    maxRetries: base.maxRetries,
    connect: base.connect,
    disconnect: base.disconnect,
    endInterview,
    retry: base.retry,
    hasRecoverableSession: base.hasRecoverableSession,
    recoverSession: base.recoverSession,
  };
}
