"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleGenAI,
  Modality,
  type Session,
  type LiveServerMessage,
} from "@google/genai";
import {
  checkAudioSupport,
  checkMicrophonePermission,
  requestMicrophoneAccess,
  playAudioChunk,
  stopAudioPlayback,
  createAudioWorkletBlobUrl,
  type AudioPermissionState,
} from "@/lib/audio";
import type { TranscriptMessage } from "@/lib/gemini";
import {
  categorizeError,
  calculateBackoffDelay,
  saveProgress,
  loadProgress,
  clearProgress,
  type CategorizedError,
} from "@/lib/error-recovery";
import type {
  VoiceConnectionState,
  VoiceBaseOptions,
  VoiceBaseReturn,
  VoiceConfig,
} from "./types";

const DEFAULT_MAX_RETRIES = 3;

export interface UseVoiceBaseOptions extends VoiceBaseOptions {
  config: VoiceConfig;
  /** Additional body parameters for the token request */
  tokenRequestBody?: Record<string, unknown>;
  /** Callback when token response is received (to extract additional data) */
  onTokenResponse?: (data: Record<string, unknown>) => void;
}

export interface UseVoiceBaseReturn extends VoiceBaseReturn {
  /** The underlying Gemini session ref (for advanced use cases) */
  sessionRef: React.RefObject<Session | null>;
  /** The transcript ref (for access in callbacks) */
  transcriptRef: React.RefObject<TranscriptMessage[]>;
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

  // Refs for WebSocket and audio handling
  const sessionRef = useRef<Session | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Update connection state with callback
  const updateConnectionState = useCallback(
    (state: VoiceConnectionState) => {
      setConnectionState(state);
      onConnectionStateChange?.(state);
    },
    [onConnectionStateChange]
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

  // Add message to transcript
  const addToTranscript = useCallback(
    (role: "user" | "model", text: string) => {
      const message: TranscriptMessage = {
        role,
        text,
        timestamp: new Date().toISOString(),
      };
      const newTranscript = [...transcriptRef.current, message];
      updateTranscript(newTranscript);
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
          console.error("Error playing audio:", err);
        }
      }
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // Handle incoming messages from Gemini
  const handleServerMessage = useCallback(
    (message: LiveServerMessage) => {
      // Handle audio data
      if (message.serverContent?.modelTurn?.parts) {
        for (const part of message.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            audioQueueRef.current.push(part.inlineData.data);
            playNextAudio();
          }
        }
      }

      // Handle input transcription (user speech)
      if (message.serverContent?.inputTranscription?.text) {
        const text = message.serverContent.inputTranscription.text;
        if (text.trim()) {
          addToTranscript("user", text);
        }
      }

      // Handle output transcription (model speech)
      if (message.serverContent?.outputTranscription?.text) {
        const text = message.serverContent.outputTranscription.text;
        if (text.trim()) {
          addToTranscript("model", text);
        }
      }

      // Handle turn complete
      if (message.serverContent?.turnComplete) {
        setIsSpeaking(false);
      }

      // Handle interruption
      if (message.serverContent?.interrupted) {
        audioQueueRef.current = [];
        stopAudioPlayback();
        setIsSpeaking(false);
      }
    },
    [addToTranscript, playNextAudio]
  );

  // Initialize audio capture
  const initializeAudioCapture = useCallback(
    async (stream: MediaStream, session: Session) => {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Create audio worklet
      const workletUrl = createAudioWorkletBlobUrl();
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, "audio-processor");
      workletNodeRef.current = workletNode;

      // Handle audio data from worklet
      workletNode.port.onmessage = (event) => {
        if (event.data.type === "audio" && session) {
          const audioData = new Uint8Array(event.data.data);
          const base64 = btoa(String.fromCharCode(...audioData));

          try {
            session.sendRealtimeInput({
              audio: {
                data: base64,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          } catch (err) {
            console.error("Error sending audio:", err);
          }
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

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

      // Get ephemeral token from server
      const tokenResponse = await fetch(config.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, ...tokenRequestBody }),
      });

      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || "Failed to get token");
      }

      const tokenData = await tokenResponse.json();

      // Let caller extract additional data from token response
      onTokenResponse?.(tokenData);

      // Connect to Gemini Live using the ephemeral token as API key
      // Note: Must use httpOptions.baseUrl WITHOUT trailing slash to avoid double slash bug in SDK
      const ai = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: {
          apiVersion: "v1alpha",
          baseUrl: "https://generativelanguage.googleapis.com", // No trailing slash!
        },
      });

      let sessionConnected = false;
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-latest",
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            sessionConnected = true;
            setStartedAt(new Date());
            updateConnectionState("connected");
          },
          onmessage: handleServerMessage,
          onerror: (e: ErrorEvent) => {
            console.error("Gemini Live error:", e);
            setError(e.message || "Connection error");
            updateConnectionState("error");
            onError?.(e.message || "Connection error");
          },
          onclose: () => {
            if (sessionConnected) {
              updateConnectionState("ended");
            }
          },
        },
      });

      sessionRef.current = session;

      // Initialize audio capture
      await initializeAudioCapture(stream, session);

      // Start the conversation by sending a greeting trigger
      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: config.initialGreeting }] }],
        turnComplete: true,
      });
    } catch (err) {
      console.error("Connection error:", err);
      const catError = categorizeError(err);
      setCategorizedError(catError);
      setError(catError.userMessage);

      // Handle permission denied specifically
      if (catError.category === "permission") {
        setPermissionState("denied");
      }

      updateConnectionState("error");
      onError?.(catError.userMessage);
    }
  }, [
    connectionState,
    assessmentId,
    config.tokenEndpoint,
    config.initialGreeting,
    tokenRequestBody,
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
    // Stop audio capture
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Close Gemini session
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

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
