"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
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
  callType: "coworker";
  onCallEnd: () => void;
  onDefenseComplete?: () => void;
  onError?: (error: string) => void;
}

// Defense calls are detected automatically when the token endpoint returns
// isDefenseCall: true. When a defense call ends, onDefenseComplete is called
// which triggers assessment finalization and navigation to results.

/**
 * Slack huddles-style floating call bar that appears at the bottom of the sidebar.
 * Shows: coworker avatar, name, mute button, end call button.
 * No transcript - audio-only experience for realistic simulation.
 */
export function FloatingCallBar({
  assessmentId,
  coworker,
  callType: _callType, // Currently only "coworker" type; kept for future extensibility
  onCallEnd,
  onDefenseComplete,
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
  const [_isDefenseCall, setIsDefenseCall] = useState(false);

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

  // Track defense call state for callback closure
  const isDefenseCallRef = useRef(false);

  // API endpoints for coworker calls
  // Note: Defense call endpoints were removed in RF-006. Defense calls
  // will be reintegrated in RF-012 with a different Slack-based flow.
  const getTokenEndpoint = useCallback(() => {
    return "/api/call/token";
  }, []);

  const getTranscriptEndpoint = useCallback(() => {
    return "/api/call/transcript";
  }, []);

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
      const tokenResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, coworkerId: coworker.id }),
      });

      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || "Failed to get call token");
      }

      const response = await tokenResponse.json();
      const { token, isDefenseCall: defenseMode } = response.data;

      // Track if this is a defense call for completion handling
      const isDefense = defenseMode === true;
      setIsDefenseCall(isDefense);
      isDefenseCallRef.current = isDefense;

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
        await fetch(transcriptEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId,
            coworkerId: coworker.id,
            transcript: transcriptRef.current,
          }),
        });
      } catch (err) {
        console.error("Error saving transcript:", err);
      }
    }

    // If this was a defense call, trigger the defense completion flow
    if (isDefenseCallRef.current && onDefenseComplete) {
      onDefenseComplete();
    } else {
      onCallEnd();
    }
  }, [
    assessmentId,
    coworker.id,
    disconnect,
    getTranscriptEndpoint,
    onCallEnd,
    onDefenseComplete,
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

  // Error state
  if (callState === "error") {
    return (
      <div className="relative">
        <div className="bg-[hsl(var(--slack-bg-surface))] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-destructive/30 overflow-hidden">
          <div className="h-1 bg-destructive" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive">
                  <PhoneOff size={16} className="text-destructive-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-destructive">Call Failed</p>
                  <p className="max-w-[150px] truncate text-xs text-[hsl(var(--slack-text-muted))]">
                    {error || "Connection error"}
                  </p>
                </div>
              </div>
              <Button onClick={onCallEnd} variant="outline" size="sm" className="rounded-full">
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connecting state
  if (callState === "requesting-permission" || callState === "connecting") {
    return (
      <div className="relative">
        <div className="absolute inset-x-0 bottom-0 top-0 bg-primary/5 blur-xl rounded-full" />
        <div className="relative bg-[hsl(var(--slack-bg-surface))] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[hsl(var(--slack-border))] overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-primary/60 animate-pulse" />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute -inset-1 rounded-full bg-primary/20 animate-pulse" />
                <CoworkerAvatar
                  name={coworker.name}
                  avatarUrl={coworker.avatarUrl}
                  size="md"
                  className="ring-2 ring-background"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-[hsl(var(--slack-text))]">{coworker.name}</p>
                <p className="text-xs text-[hsl(var(--slack-text-muted))]">
                  {callState === "requesting-permission"
                    ? "Requesting microphone..."
                    : "Connecting..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connected state - the main call bar UI
  if (callState === "connected") {
    return (
      <div className="relative">
        <div className="absolute inset-x-0 bottom-0 top-0 bg-primary/5 blur-xl rounded-full" />
        <div className="relative bg-[hsl(var(--slack-bg-surface))] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[hsl(var(--slack-border))] overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute -inset-1 rounded-full bg-green-500/20 animate-pulse" />
                  <CoworkerAvatar
                    name={coworker.name}
                    avatarUrl={coworker.avatarUrl}
                    size="md"
                    className={`ring-2 ring-background ${isSpeaking ? "ring-primary ring-offset-2" : ""}`}
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-[hsl(var(--slack-text))]">On Call</div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Connected
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                onClick={toggleMute}
                variant={isMuted ? "secondary" : "outline"}
                size="icon"
                className="h-10 w-10 rounded-full border-[hsl(var(--slack-border))]"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              {/* Waveform Visualization */}
              <div className="flex-1 flex justify-center items-center h-10 gap-0.5">
                {isSpeaking ? (
                  [...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary/40 rounded-full animate-pulse"
                      style={{
                        height: Math.random() * 20 + 4 + "px",
                        animationDelay: i * 0.1 + "s",
                      }}
                    />
                  ))
                ) : isListening && !isMuted ? (
                  [...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-muted-foreground/30 rounded-full"
                      style={{ height: "4px" }}
                    />
                  ))
                ) : (
                  <div className="h-1 w-full bg-[hsl(var(--slack-bg-hover))] rounded-full" />
                )}
              </div>

              <Button
                onClick={endCall}
                variant="destructive"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg shadow-destructive/20"
                aria-label="End call"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ended or idle state - don't render anything
  return null;
}
