"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type Session, type LiveServerMessage } from "@google/genai";
import {
  checkAudioSupport,
  checkMicrophonePermission,
  requestMicrophoneAccess,
  playAudioChunk,
  stopAudioPlayback,
  type AudioPermissionState,
} from "@/lib/media";
import type { TranscriptMessage } from "@/lib/ai";
import {
  connectLiveAudioSession,
  createOpeningTurnController,
  disconnectLiveAudioResources,
  fetchLiveToken,
  handleLiveServerMessage,
  initializeLiveAudioCapture,
} from "@/lib/ai/live-session";
import {
  categorizeError,
  calculateBackoffDelay,
  saveProgress,
  loadProgress,
  clearProgress,
  type CategorizedError,
} from "@/lib/core";
import { createLogger } from "@/lib/core";
import type {
  VoiceConnectionState,
  VoiceBaseOptions,
  VoiceBaseReturn,
  VoiceConfig,
} from "./types";

const logger = createLogger("client:hooks:voice-base");

const DEFAULT_MAX_RETRIES = 3;

export interface UseVoiceBaseOptions extends VoiceBaseOptions {
  config: VoiceConfig;
  /** Additional body parameters for the token request */
  tokenRequestBody?: Record<string, unknown>;
  /** Callback when token response is received (to extract additional data) */
  onTokenResponse?: (data: Record<string, unknown>) => void;
  /** Language of the assessment scenario */
  language?: string;
}

export interface ConnectionEvent {
  event: string;
  timestamp: string;
  details?: string;
}

export interface UseVoiceBaseReturn extends VoiceBaseReturn {
  /** The underlying Gemini session ref (for advanced use cases) */
  sessionRef: React.RefObject<Session | null>;
  /** The transcript ref (for access in callbacks) */
  transcriptRef: React.RefObject<TranscriptMessage[]>;
  /** Connection events accumulated during the session */
  connectionEventsRef: React.RefObject<ConnectionEvent[]>;
  /** The last error message from the Live API */
  lastErrorMessage: string | null;
  /** Update transcript manually */
  updateTranscript: (transcript: TranscriptMessage[]) => void;
  /** Add a message to the transcript */
  addToTranscript: (role: "user" | "model", text: string) => void;
  /** Whether there is a recoverable session saved */
  hasRecoverableSession: boolean;
  /** Recover a previously saved session */
  recoverSession: () => void;
  /** Clear saved progress */
  clearSavedProgress: () => void;
  /** When the call/session started */
  startedAt: Date | null;
  /** When the call/session ended */
  endedAt: Date | null;
  /** Set the ended time */
  setEndedAt: (date: Date | null) => void;
}

/**
 * Base hook for all voice conversation functionality.
 * Extracts common logic for connection management, audio handling,
 * transcript management, retry logic, and session recovery.
 * Shared Gemini Live transport/bootstrap details live in `@/lib/ai/live-session`.
 */
export function useVoiceBase({
  assessmentId,
  onTranscriptUpdate,
  onConnectionStateChange,
  onError,
  maxRetries = DEFAULT_MAX_RETRIES,
  config,
  tokenRequestBody = {},
  onTokenResponse,
  language,
}: UseVoiceBaseOptions): UseVoiceBaseReturn {
  // Connection state
  const [connectionState, setConnectionState] =
    useState<VoiceConnectionState>("idle");
  const [permissionState, setPermissionState] =
    useState<AudioPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [categorizedError, setCategorizedError] =
    useState<CategorizedError | null>(null);
  const [isAudioSupported] = useState(() => checkAudioSupport());

  // Audio state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const transcriptRef = useRef<TranscriptMessage[]>([]);

  // Timing state
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [endedAt, setEndedAt] = useState<Date | null>(null);

  // Retry state
  const [retryCount, setRetryCount] = useState(0);
  const [hasRecoverableSession, setHasRecoverableSession] = useState(false);

  // Session logging state
  const connectionEventsRef = useRef<ConnectionEvent[]>([]);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  // Refs for WebSocket and audio handling
  const sessionRef = useRef<Session | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Record a connection event for session logging
  const recordConnectionEvent = useCallback(
    (event: string, details?: string) => {
      connectionEventsRef.current.push({
        event,
        timestamp: new Date().toISOString(),
        details,
      });
    },
    []
  );

  const openingTurnControllerRef = useRef<ReturnType<
    typeof createOpeningTurnController
  > | null>(null);

  if (!openingTurnControllerRef.current) {
    openingTurnControllerRef.current = createOpeningTurnController({
      getSession: () => sessionRef.current,
      onOpeningTurnSent: () => {
        recordConnectionEvent("opening-turn-sent");
      },
      onError: (context, err) => {
        logger.error(context, { err });
      },
    });
  }

  // Update connection state with callback and event tracking
  const updateConnectionState = useCallback(
    (state: VoiceConnectionState, details?: string) => {
      setConnectionState(state);
      recordConnectionEvent(state, details);
      onConnectionStateChange?.(state);
    },
    [onConnectionStateChange, recordConnectionEvent]
  );

  // Update transcript with callback and optionally save progress
  const updateTranscript = useCallback(
    (newTranscript: TranscriptMessage[]) => {
      setTranscript(newTranscript);
      transcriptRef.current = newTranscript;
      onTranscriptUpdate?.(newTranscript);

      // Save progress for session recovery if enabled
      if (config.enableSessionRecovery && config.progressType) {
        saveProgress(assessmentId, config.progressType, {
          transcript: newTranscript,
          startedAt: startedAt?.toISOString(),
        });
      }
    },
    [
      onTranscriptUpdate,
      assessmentId,
      config.enableSessionRecovery,
      config.progressType,
      startedAt,
    ]
  );

  // Add message to transcript, merging consecutive chunks from the same role
  const addToTranscript = useCallback(
    (role: "user" | "model", text: string) => {
      const current = transcriptRef.current;
      const lastMessage = current[current.length - 1];

      // If the last message is from the same role, append to it
      if (lastMessage && lastMessage.role === role) {
        const merged = [...current];
        merged[merged.length - 1] = {
          ...lastMessage,
          text: lastMessage.text + " " + text,
        };
        updateTranscript(merged);
      } else {
        const message: TranscriptMessage = {
          role,
          text,
          timestamp: new Date().toISOString(),
        };
        updateTranscript([...current, message]);
      }
    },
    [updateTranscript]
  );

  // Play audio from queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (audioData) {
        try {
          await playAudioChunk(audioData);
        } catch (err) {
          logger.error("Error playing audio", { err });
        }
      }
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // Handle incoming messages from Gemini
  const handleServerMessage = useCallback(
    (message: LiveServerMessage) => {
      handleLiveServerMessage(message, {
        onSetupComplete: () => {
          recordConnectionEvent("setup-complete");
          openingTurnControllerRef.current?.markSetupComplete();
        },
        onAudioChunk: (audioData) => {
          audioQueueRef.current.push(audioData);
          playNextAudio();
        },
        onInputTranscription: (text) => {
          addToTranscript("user", text);
        },
        onOutputTranscription: (text) => {
          addToTranscript("model", text);
        },
        onTurnComplete: () => {
          setIsSpeaking(false);
        },
        onInterrupted: () => {
          audioQueueRef.current = [];
          stopAudioPlayback();
          setIsSpeaking(false);
        },
      });
    },
    [addToTranscript, playNextAudio, recordConnectionEvent]
  );

  // Initialize audio capture
  const initializeAudioCapture = useCallback(
    async (stream: MediaStream, session: Session) => {
      const { audioContext, workletNode } = await initializeLiveAudioCapture({
        stream,
        session,
        onReady: () => {
          openingTurnControllerRef.current?.markAudioCaptureReady();
        },
        onError: (context, err) => {
          logger.error(context, { err });
        },
      });

      audioContextRef.current = audioContext;
      workletNodeRef.current = workletNode;
      setIsListening(true);
    },
    []
  );

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    if (connectionState !== "idle" && connectionState !== "error") {
      return;
    }

    setError(null);
    setCategorizedError(null);
    updateConnectionState("requesting-permission");

    try {
      // Check and request microphone permission
      const permState = await checkMicrophonePermission();
      setPermissionState(permState);

      // Request microphone access
      const stream = await requestMicrophoneAccess();
      mediaStreamRef.current = stream;
      setPermissionState("granted");

      updateConnectionState("connecting");

      const tokenData = await fetchLiveToken({
        endpoint: config.tokenEndpoint,
        body: {
          assessmentId,
          ...tokenRequestBody,
          ...(language ? { language } : {}),
        },
      });

      // Let caller extract additional data from token response
      onTokenResponse?.(tokenData);

      openingTurnControllerRef.current?.markOpeningTurnPending();

      let sessionConnected = false;
      const session = await connectLiveAudioSession({
        token: tokenData.token,
        callbacks: {
          onopen: () => {
            sessionConnected = true;
            setStartedAt(new Date());
            updateConnectionState("connected");
          },
          onmessage: handleServerMessage,
          onerror: (e: ErrorEvent) => {
            logger.error("Gemini Live error", { error: e });
            const errMsg = e.message || "Connection error";
            setError(errMsg);
            setLastErrorMessage(errMsg);
            updateConnectionState("error", errMsg);
            onError?.(errMsg);
          },
          onclose: () => {
            if (sessionConnected) {
              updateConnectionState("ended");
            }
          },
        },
      });

      if (sessionRef.current) {
        sessionRef.current.close();
      }
      sessionRef.current = session;

      // Initialize audio capture
      await initializeAudioCapture(stream, session);
    } catch (err) {
      logger.error("Connection error", { err });
      openingTurnControllerRef.current?.reset();
      const catError = categorizeError(err);
      setCategorizedError(catError);
      setError(catError.userMessage);
      setLastErrorMessage(catError.userMessage);

      // Handle permission denied specifically
      if (catError.category === "permission") {
        setPermissionState("denied");
      }

      updateConnectionState("error", catError.userMessage);
      onError?.(catError.userMessage);
    }
  }, [
    connectionState,
    assessmentId,
    config.tokenEndpoint,
    tokenRequestBody,
    language,
    updateConnectionState,
    handleServerMessage,
    initializeAudioCapture,
    onError,
    onTokenResponse,
  ]);

  // Retry connection with exponential backoff
  const retry = useCallback(async () => {
    if (!categorizedError?.isRetryable) {
      return;
    }

    if (retryCount >= maxRetries) {
      setError("Maximum retry attempts reached. Please try again later.");
      return;
    }

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    const attempt = retryCount + 1;
    setRetryCount(attempt);
    updateConnectionState("retrying");

    // Calculate backoff delay
    const delay = calculateBackoffDelay(retryCount);

    // Wait for backoff delay then retry
    await new Promise<void>((resolve) => {
      retryTimeoutRef.current = setTimeout(resolve, delay);
    });

    // Reset error state for retry
    setError(null);
    setCategorizedError(null);
    updateConnectionState("idle");

    // Attempt reconnection
    await connect();
  }, [categorizedError, retryCount, maxRetries, updateConnectionState, connect]);

  // Recover session from saved progress
  const recoverSession = useCallback(() => {
    if (!config.enableSessionRecovery || !config.progressType) {
      return;
    }

    const progress = loadProgress(assessmentId, config.progressType);
    if (progress && progress.data.transcript) {
      const savedTranscript = progress.data.transcript as TranscriptMessage[];
      setTranscript(savedTranscript);
      transcriptRef.current = savedTranscript;

      if (progress.data.startedAt) {
        setStartedAt(new Date(progress.data.startedAt as string));
      }

      setHasRecoverableSession(false);
    }
  }, [assessmentId, config.enableSessionRecovery, config.progressType]);

  // Clear saved progress
  const clearSavedProgress = useCallback(() => {
    if (config.progressType) {
      clearProgress(assessmentId, config.progressType);
    }
  }, [assessmentId, config.progressType]);

  // Disconnect from Gemini Live
  const disconnect = useCallback(() => {
    disconnectLiveAudioResources({
      workletNode: workletNodeRef.current,
      audioContext: audioContextRef.current,
      mediaStream: mediaStreamRef.current,
      session: sessionRef.current,
      onPlaybackStopped: stopAudioPlayback,
    });

    workletNodeRef.current = null;
    audioContextRef.current = null;
    mediaStreamRef.current = null;
    sessionRef.current = null;
    openingTurnControllerRef.current?.reset();
    setIsListening(false);
    setIsSpeaking(false);
    audioQueueRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      // Clear any pending retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [disconnect]);

  // Check permission on mount
  useEffect(() => {
    if (isAudioSupported) {
      checkMicrophonePermission().then(setPermissionState);
    }
  }, [isAudioSupported]);

  // Check for recoverable session on mount
  useEffect(() => {
    if (config.enableSessionRecovery && config.progressType) {
      const progress = loadProgress(assessmentId, config.progressType);
      if (progress && progress.data.transcript) {
        const transcriptData = progress.data.transcript as TranscriptMessage[];
        if (transcriptData.length > 0) {
          setHasRecoverableSession(true);
        }
      }
    }
  }, [assessmentId, config.enableSessionRecovery, config.progressType]);

  return {
    // Connection state
    connectionState,
    permissionState,
    error,
    categorizedError,
    isAudioSupported,

    // Audio state
    isSpeaking,
    isListening,

    // Transcript
    transcript,
    transcriptRef,
    updateTranscript,
    addToTranscript,

    // Session logging
    connectionEventsRef,
    lastErrorMessage,

    // Timing
    startedAt,
    endedAt,
    setEndedAt,

    // Retry
    retryCount,
    maxRetries,
    retry,

    // Session recovery
    hasRecoverableSession,
    recoverSession,
    clearSavedProgress,

    // Actions
    connect,
    disconnect,

    // Advanced
    sessionRef,
  };
}
