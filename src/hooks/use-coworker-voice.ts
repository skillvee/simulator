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

export type ConnectionState =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "connected"
  | "error"
  | "ended";

export interface UseCoworkerVoiceOptions {
  assessmentId: string;
  coworkerId: string;
  onTranscriptUpdate?: (transcript: TranscriptMessage[]) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: string) => void;
}

export interface UseCoworkerVoiceReturn {
  connectionState: ConnectionState;
  permissionState: AudioPermissionState;
  transcript: TranscriptMessage[];
  error: string | null;
  isAudioSupported: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  callStartedAt: Date | null;
  callEndedAt: Date | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  endCall: () => Promise<void>;
}

export function useCoworkerVoice({
  assessmentId,
  coworkerId,
  onTranscriptUpdate,
  onConnectionStateChange,
  onError,
}: UseCoworkerVoiceOptions): UseCoworkerVoiceReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [permissionState, setPermissionState] = useState<AudioPermissionState>("prompt");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAudioSupported] = useState(() => checkAudioSupport());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<Date | null>(null);
  const [callEndedAt, setCallEndedAt] = useState<Date | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);

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

  // Update transcript with callback
  const updateTranscript = useCallback(
    (newTranscript: TranscriptMessage[]) => {
      setTranscript(newTranscript);
      transcriptRef.current = newTranscript;
      onTranscriptUpdate?.(newTranscript);
    },
    [onTranscriptUpdate]
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

      // Get ephemeral token from server for coworker call
      const tokenResponse = await fetch("/api/call/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, coworkerId }),
      });

      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || "Failed to get call token");
      }

      const { token } = await tokenResponse.json();

      // Connect to Gemini Live using the ephemeral token as API key
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
            setCallStartedAt(new Date());
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
        turns: [{ role: "user", parts: [{ text: "Hi, thanks for taking my call." }] }],
        turnComplete: true,
      });
    } catch (err) {
      console.error("Connection error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect";

      // Handle permission denied specifically
      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        setPermissionState("denied");
        setError("Microphone access was denied. Please enable microphone access to continue.");
      } else {
        setError(errorMessage);
      }

      updateConnectionState("error");
      onError?.(errorMessage);
    }
  }, [
    connectionState,
    assessmentId,
    coworkerId,
    updateConnectionState,
    handleServerMessage,
    initializeAudioCapture,
    onError,
  ]);

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

  // End call and save transcript
  const endCall = useCallback(async () => {
    const endTime = new Date();
    setCallEndedAt(endTime);
    disconnect();
    updateConnectionState("ended");

    // Save transcript to server
    if (transcriptRef.current.length > 0) {
      try {
        await fetch("/api/call/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            coworkerId,
            transcript: transcriptRef.current,
          }),
        });
      } catch (err) {
        console.error("Error saving transcript:", err);
      }
    }
  }, [assessmentId, coworkerId, disconnect, updateConnectionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Check permission on mount
  useEffect(() => {
    if (isAudioSupported) {
      checkMicrophonePermission().then(setPermissionState);
    }
  }, [isAudioSupported]);

  return {
    connectionState,
    permissionState,
    transcript,
    error,
    isAudioSupported,
    isSpeaking,
    isListening,
    callStartedAt,
    callEndedAt,
    connect,
    disconnect,
    endCall,
  };
}
