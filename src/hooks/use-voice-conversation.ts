"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import {
  checkAudioSupport,
  checkMicrophonePermission,
  requestMicrophoneAccess,
  playAudioChunk,
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

export type ConnectionState =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "connected"
  | "error"
  | "ended"
  | "retrying";

export interface UseVoiceConversationOptions {
  assessmentId: string;
  onTranscriptUpdate?: (transcript: TranscriptMessage[]) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: string) => void;
  maxRetries?: number;
}

export interface UseVoiceConversationReturn {
  connectionState: ConnectionState;
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
  endInterview: () => Promise<void>;
  retry: () => Promise<void>;
  hasRecoverableSession: boolean;
  recoverSession: () => void;
}

const PROGRESS_TYPE = "hr-interview";
const DEFAULT_MAX_RETRIES = 3;

export function useVoiceConversation({
  assessmentId,
  onTranscriptUpdate,
  onConnectionStateChange,
  onError,
  maxRetries = DEFAULT_MAX_RETRIES,
}: UseVoiceConversationOptions): UseVoiceConversationReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [permissionState, setPermissionState] = useState<AudioPermissionState>("prompt");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categorizedError, setCategorizedError] = useState<CategorizedError | null>(null);
  const [isAudioSupported] = useState(() => checkAudioSupport());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interviewStartedAt, setInterviewStartedAt] = useState<Date | null>(null);
  const [interviewEndedAt, setInterviewEndedAt] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasRecoverableSession, setHasRecoverableSession] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Update connection state with callback
  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
      onConnectionStateChange?.(state);
    },
    [onConnectionStateChange]
  );

  // Update transcript with callback and save progress
  const updateTranscript = useCallback(
    (newTranscript: TranscriptMessage[]) => {
      setTranscript(newTranscript);
      transcriptRef.current = newTranscript;
      onTranscriptUpdate?.(newTranscript);

      // Save progress for session recovery
      saveProgress(assessmentId, PROGRESS_TYPE, {
        transcript: newTranscript,
        interviewStartedAt: interviewStartedAt?.toISOString(),
      });
    },
    [onTranscriptUpdate, assessmentId, interviewStartedAt]
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
        setIsSpeaking(false);
      }
    },
    [addToTranscript, playNextAudio]
  );

  // Initialize audio capture
  const initializeAudioCapture = useCallback(async (stream: MediaStream, session: Session) => {
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
  }, []);

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    if (connectionState !== "idle" && connectionState !== "error") {
      return;
    }

    setError(null);
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
      const tokenResponse = await fetch("/api/interview/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });

      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || "Failed to get interview token");
      }

      const { token } = await tokenResponse.json();

      // Connect to Gemini Live using the ephemeral token as API key
      // See: https://ai.google.dev/gemini-api/docs/live
      const ai = new GoogleGenAI({
        apiKey: token,
      });

      let sessionConnected = false;
      const session = await ai.live.connect({
        model: "gemini-live-2.5-flash-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            sessionConnected = true;
            setInterviewStartedAt(new Date());
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
        turns: [{ role: "user", parts: [{ text: "Hello, I'm ready for the interview." }] }],
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
    updateConnectionState,
    handleServerMessage,
    initializeAudioCapture,
    onError,
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
    const progress = loadProgress(assessmentId, PROGRESS_TYPE);
    if (progress && progress.data.transcript) {
      const savedTranscript = progress.data.transcript as TranscriptMessage[];
      setTranscript(savedTranscript);
      transcriptRef.current = savedTranscript;

      if (progress.data.interviewStartedAt) {
        setInterviewStartedAt(new Date(progress.data.interviewStartedAt as string));
      }

      setHasRecoverableSession(false);
    }
  }, [assessmentId]);

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

  // End interview and save transcript
  const endInterview = useCallback(async () => {
    const endTime = new Date();
    setInterviewEndedAt(endTime);
    disconnect();
    updateConnectionState("ended");

    // Save transcript to server
    if (transcriptRef.current.length > 0) {
      try {
        await fetch("/api/interview/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            transcript: transcriptRef.current,
          }),
        });

        // Trigger HR assessment analysis with timestamps
        await fetch("/api/interview/assessment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            interviewStartedAt: interviewStartedAt?.toISOString(),
            interviewEndedAt: endTime.toISOString(),
          }),
        });

        // Clear saved progress after successful completion
        clearProgress(assessmentId, PROGRESS_TYPE);
      } catch (err) {
        console.error("Error saving transcript or generating assessment:", err);
      }
    }
  }, [assessmentId, disconnect, updateConnectionState, interviewStartedAt]);

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
    const progress = loadProgress(assessmentId, PROGRESS_TYPE);
    if (progress && progress.data.transcript) {
      const transcriptData = progress.data.transcript as TranscriptMessage[];
      if (transcriptData.length > 0) {
        setHasRecoverableSession(true);
      }
    }
  }, [assessmentId]);

  return {
    connectionState,
    permissionState,
    transcript,
    error,
    categorizedError,
    isAudioSupported,
    isSpeaking,
    isListening,
    interviewStartedAt,
    interviewEndedAt,
    retryCount,
    maxRetries,
    connect,
    disconnect,
    endInterview,
    retry,
    hasRecoverableSession,
    recoverSession,
  };
}
