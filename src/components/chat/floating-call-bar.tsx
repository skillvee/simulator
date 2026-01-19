"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
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
  createAudioWorkletBlobUrl,
  type AudioPermissionState,
} from "@/lib/media";
import type { TranscriptMessage } from "@/lib/ai";
import { CoworkerAvatar } from "./coworker-avatar";

export type CallState =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "connected"
  | "error"
  | "ended";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface FloatingCallBarProps {
  assessmentId: string;
  coworker: Coworker;
  callType: "coworker" | "kickoff" | "defense";
  onCallEnd: () => void;
  onError?: (error: string) => void;
}

/**
 * Slack huddles-style floating call bar that appears at the bottom of the sidebar.
 * Shows: coworker avatar, name, mute button, end call button.
 * No transcript - audio-only experience for realistic simulation.
 */
export function FloatingCallBar({
  assessmentId,
  coworker,
  callType,
  onCallEnd,
  onError,
}: FloatingCallBarProps) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [_permissionState, setPermissionState] =
    useState<AudioPermissionState>("prompt");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioSupported] = useState(() => checkAudioSupport());

  const sessionRef = useRef<Session | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);

  // Audio playback queue
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Determine which API endpoint to use based on call type
  const getTokenEndpoint = useCallback(() => {
    switch (callType) {
      case "kickoff":
        return "/api/kickoff/token";
      case "defense":
        return "/api/defense/token";
      default:
        return "/api/call/token";
    }
  }, [callType]);

  const getTranscriptEndpoint = useCallback(() => {
    switch (callType) {
      case "kickoff":
        return "/api/kickoff/transcript";
      case "defense":
        return "/api/defense/transcript";
      default:
        return "/api/call/transcript";
    }
  }, [callType]);

  // Add message to transcript (for saving, not display)
  const addToTranscript = useCallback(
    (role: "user" | "model", text: string) => {
      const message: TranscriptMessage = {
        role,
        text,
        timestamp: new Date().toISOString(),
      };
      transcriptRef.current = [...transcriptRef.current, message];
    },
    []
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

      // Handle input transcription (user speech) - save but don't display
      if (message.serverContent?.inputTranscription?.text) {
        const text = message.serverContent.inputTranscription.text;
        if (text.trim()) {
          addToTranscript("user", text);
        }
      }

      // Handle output transcription (model speech) - save but don't display
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
    if (callState !== "idle" && callState !== "error") {
      return;
    }

    setError(null);
    setCallState("requesting-permission");

    try {
      // Check and request microphone permission
      const permState = await checkMicrophonePermission();
      setPermissionState(permState);

      // Request microphone access
      const stream = await requestMicrophoneAccess();
      mediaStreamRef.current = stream;
      setPermissionState("granted");

      setCallState("connecting");

      // Get ephemeral token from server
      const tokenEndpoint = getTokenEndpoint();
      const body =
        callType === "coworker"
          ? JSON.stringify({ assessmentId, coworkerId: coworker.id })
          : JSON.stringify({ assessmentId });

      const tokenResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || "Failed to get call token");
      }

      const { token } = await tokenResponse.json();

      // Connect to Gemini Live
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: {
          apiVersion: "v1alpha",
          baseUrl: "https://generativelanguage.googleapis.com",
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
            setCallState("connected");
          },
          onmessage: handleServerMessage,
          onerror: (e: ErrorEvent) => {
            console.error("Gemini Live error:", e);
            setError(e.message || "Connection error");
            setCallState("error");
            onError?.(e.message || "Connection error");
          },
          onclose: () => {
            if (sessionConnected) {
              setCallState("ended");
            }
          },
        },
      });

      sessionRef.current = session;

      // Initialize audio capture
      await initializeAudioCapture(stream, session);

      // Start the conversation
      session.sendClientContent({
        turns: [
          { role: "user", parts: [{ text: "Hi, thanks for taking my call." }] },
        ],
        turnComplete: true,
      });
    } catch (err) {
      console.error("Connection error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Connection failed";
      setError(errorMessage);

      if (
        errorMessage.includes("permission") ||
        errorMessage.includes("NotAllowedError")
      ) {
        setPermissionState("denied");
      }

      setCallState("error");
      onError?.(errorMessage);
    }
  }, [
    callState,
    assessmentId,
    coworker.id,
    callType,
    getTokenEndpoint,
    handleServerMessage,
    initializeAudioCapture,
    onError,
  ]);

  // Disconnect from Gemini Live
  const disconnect = useCallback(() => {
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
    disconnect();
    setCallState("ended");

    // Save transcript to server
    if (transcriptRef.current.length > 0) {
      try {
        const transcriptEndpoint = getTranscriptEndpoint();
        const body =
          callType === "coworker"
            ? JSON.stringify({
                assessmentId,
                coworkerId: coworker.id,
                transcript: transcriptRef.current,
              })
            : JSON.stringify({
                assessmentId,
                transcript: transcriptRef.current,
              });

        await fetch(transcriptEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      } catch (err) {
        console.error("Error saving transcript:", err);
      }
    }

    onCallEnd();
  }, [
    assessmentId,
    coworker.id,
    callType,
    disconnect,
    getTranscriptEndpoint,
    onCallEnd,
  ]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        setIsListening(!isMuted);
      }
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Auto-connect when component mounts
  useEffect(() => {
    if (callState === "idle" && isAudioSupported) {
      connect();
    }
  }, [callState, isAudioSupported, connect]);

  // Error state (matches chat footer height)
  if (callState === "error") {
    return (
      <div className="flex h-[78px] items-center border-t-2 border-foreground bg-red-50 px-4 py-3 dark:bg-red-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-red-500">
              <PhoneOff size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">
                Call Failed
              </p>
              <p className="max-w-[150px] truncate text-xs text-red-600 dark:text-red-400">
                {error || "Connection error"}
              </p>
            </div>
          </div>
          <button
            onClick={onCallEnd}
            className="border-2 border-foreground bg-background px-2 py-1 text-xs hover:bg-accent"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Connecting state (matches chat footer height)
  if (callState === "requesting-permission" || callState === "connecting") {
    return (
      <div className="bg-secondary/20 flex h-[78px] items-center border-t-2 border-foreground px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-secondary">
            <div className="h-4 w-4 animate-spin border-2 border-secondary-foreground border-t-transparent" />
          </div>
          <div>
            <p className="text-sm font-bold">{coworker.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {callState === "requesting-permission"
                ? "Requesting mic..."
                : "Connecting..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected state - the main call bar UI (matches chat footer height)
  if (callState === "connected") {
    return (
      <div className="bg-secondary/10 flex h-[78px] items-center border-t-2 border-foreground px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar with speaking indicator */}
            <div className="relative">
              <div className={isSpeaking ? "ring-2 ring-secondary ring-offset-1" : ""}>
                <CoworkerAvatar name={coworker.name} size="md" />
              </div>
              {/* Speaking indicator - sound wave icon */}
              {isSpeaking && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center border border-foreground bg-secondary">
                  <Volume2 size={10} className="text-secondary-foreground" />
                </div>
              )}
              {/* Listening indicator - mic icon (when not speaking and not muted) */}
              {!isSpeaking && isListening && !isMuted && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center border border-foreground bg-foreground">
                  <Mic size={10} className="text-background" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{coworker.name}</p>
              <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                {isSpeaking ? (
                  <>
                    <span className="inline-block h-1.5 w-1.5 animate-pulse bg-secondary" />
                    Speaking...
                  </>
                ) : isListening && !isMuted ? (
                  <>
                    <span className="inline-block h-1.5 w-1.5 bg-foreground" />
                    In call
                  </>
                ) : (
                  <>
                    <span className="inline-block h-1.5 w-1.5 bg-muted-foreground" />
                    Muted
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Call controls */}
          <div className="flex items-center gap-2">
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`border-2 border-foreground px-3 py-3 ${
                isMuted
                  ? "bg-foreground text-background"
                  : "bg-background hover:bg-foreground hover:text-background"
              }`}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* End call button */}
            <button
              onClick={endCall}
              className="border-2 border-foreground bg-foreground px-3 py-3 text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
              aria-label="End call"
            >
              <PhoneOff size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ended or idle state - don't render anything
  return null;
}
