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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  // Prevent concurrent connection attempts
  const isConnectingRef = useRef(false);

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
    // Prevent concurrent connection attempts
    if (isConnectingRef.current) {
      return;
    }
    if (callState !== "idle" && callState !== "error") {
      return;
    }
    isConnectingRef.current = true;

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

      const response = await tokenResponse.json();
      const { token } = response.data;

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

      // Close any existing session before assigning new one
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
      sessionRef.current = session;

      // Initialize audio capture
      await initializeAudioCapture(stream, session);
      isConnectingRef.current = false;

      // Start the conversation
      session.sendClientContent({
        turns: [
          { role: "user", parts: [{ text: "Hi, thanks for taking my call." }] },
        ],
        turnComplete: true,
      });
    } catch (err) {
      isConnectingRef.current = false;
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
      <div className="flex h-[78px] items-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg dark:border-red-800 dark:bg-red-950">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500">
              <PhoneOff size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                Call Failed
              </p>
              <p className="max-w-[150px] truncate text-xs text-red-600 dark:text-red-400">
                {error || "Connection error"}
              </p>
            </div>
          </div>
          <Button
            onClick={onCallEnd}
            variant="outline"
            size="sm"
          >
            Dismiss
          </Button>
        </div>
      </div>
    );
  }

  // Connecting state (matches chat footer height)
  if (callState === "requesting-permission" || callState === "connecting") {
    return (
      <div className="flex h-[78px] items-center rounded-xl border border-border bg-secondary/20 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary-foreground border-t-transparent" />
          </div>
          <div>
            <p className="text-sm font-semibold">{coworker.name}</p>
            <p className="text-xs text-muted-foreground">
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
      <div className="flex h-[78px] items-center rounded-xl border border-border bg-secondary/10 px-4 py-3 shadow-lg">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar with speaking indicator */}
            <div className="relative">
              <div className={isSpeaking ? "rounded-full ring-2 ring-secondary ring-offset-2" : ""}>
                <CoworkerAvatar name={coworker.name} size="md" />
              </div>
              {/* Speaking indicator - sound wave icon */}
              {isSpeaking && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary">
                  <Volume2 size={10} className="text-secondary-foreground" />
                </div>
              )}
              {/* Listening indicator - mic icon (when not speaking and not muted) */}
              {!isSpeaking && isListening && !isMuted && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground">
                  <Mic size={10} className="text-background" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{coworker.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isSpeaking ? (
                  <>
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
                    Speaking...
                  </>
                ) : isListening && !isMuted ? (
                  <Badge className="bg-green-500 px-1.5 py-0 text-[10px] text-white hover:bg-green-500">
                    In call
                  </Badge>
                ) : (
                  <>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Muted
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Call controls */}
          <div className="flex items-center gap-2">
            {/* Mute button */}
            <Button
              onClick={toggleMute}
              variant={isMuted ? "default" : "outline"}
              size="icon"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>

            {/* End call button */}
            <Button
              onClick={endCall}
              variant="destructive"
              size="icon"
              aria-label="End call"
            >
              <PhoneOff size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ended or idle state - don't render anything
  return null;
}
