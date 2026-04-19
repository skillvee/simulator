"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { type Session, type LiveServerMessage } from "@google/genai";
import {
  checkAudioSupport,
  checkMicrophonePermission,
  requestMicrophoneAccess,
  playAudioChunk,
  getOutputFrequencyData,
  stopAudioPlayback,
  type AudioPermissionState,
} from "@/lib/media";
import {
  connectLiveAudioSession,
  createOpeningTurnController,
  disconnectLiveAudioResources,
  fetchLiveToken,
  handleLiveServerMessage,
  initializeLiveAudioCapture,
} from "@/lib/ai/live-session";
import { playCallRingSound } from "@/lib/sounds";
import type { TranscriptMessage } from "@/lib/ai";
import { createLogger } from "@/lib/core";
import { CoworkerAvatar } from "./coworker-avatar";
import { AudioWaveform } from "./audio-waveform";
import { Button } from "@/components/ui/button";

const logger = createLogger("client:chat:floating-call-bar");

export type CallState =
  | "idle"
  | "requesting-permission"
  | "connecting"
  | "connected"
  | "saving"
  | "error"
  | "ended";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  gender?: string | null;
}

interface FloatingCallBarProps {
  assessmentId: string;
  coworker: Coworker;
  callType: "coworker";
  onCallEnd: () => void;
  onDefenseComplete?: () => void;
  onError?: (error: string) => void;
  /** When true, signals to the server that this call follows work submission (defense call) */
  isPostSubmission?: boolean;
  /** Language of the assessment scenario */
  language?: string;
}

// Defense calls are detected automatically when the token endpoint returns
// isDefenseCall: true. When a defense call ends, onDefenseComplete is called
// which triggers assessment finalization and navigation to results.

/**
 * Slack huddles-style floating call bar that appears at the bottom of the sidebar.
 * This is the real Gemini Live call path for the assessment work page.
 * Shared Live protocol/bootstrap details live in `@/lib/ai/live-session`.
 *
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
  isPostSubmission,
  language,
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

  // Audio level tracking for waveform visualization
  const micVolumeRef = useRef(0);

  // Prevent concurrent connection attempts
  const isConnectingRef = useRef(false);

  // Track defense call state for callback closure
  const isDefenseCallRef = useRef(false);

  const openingTurnControllerRef = useRef<ReturnType<
    typeof createOpeningTurnController
  > | null>(null);

  if (!openingTurnControllerRef.current) {
    openingTurnControllerRef.current = createOpeningTurnController({
      getSession: () => sessionRef.current,
      onError: (context, err) => {
        logger.error(context, { err });
      },
    });
  }

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
    [addToTranscript, playNextAudio]
  );

  // Initialize audio capture
  const initializeAudioCapture = useCallback(
    async (stream: MediaStream, session: Session) => {
      const { audioContext, workletNode } = await initializeLiveAudioCapture({
        stream,
        session,
        onVolume: (volume) => {
          micVolumeRef.current = volume;
        },
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

    let ringSound: { stop: () => void } | null = null;

    try {
      // Run mic access and token fetch in parallel — they're independent
      const tokenEndpoint = getTokenEndpoint();
      const tokenPromise = fetchLiveToken<{
        token: string;
        isDefenseCall?: boolean;
      }>({
        endpoint: tokenEndpoint,
        body: {
          assessmentId,
          coworkerId: coworker.id,
          isPostSubmission,
          ...(language ? { language } : {}),
        },
      });
      void tokenPromise.catch(() => {});

      // Check and request microphone permission
      const permState = await checkMicrophonePermission();
      setPermissionState(permState);

      // Request microphone access
      const stream = await requestMicrophoneAccess();
      mediaStreamRef.current = stream;
      setPermissionState("granted");

      setCallState("connecting");

      // Start playing ring sound
      ringSound = playCallRingSound();

      // Wait for token (likely already done since mic access takes user interaction)
      const { token, isDefenseCall: defenseMode } = await tokenPromise;

      // Track if this is a defense call for completion handling
      const isDefense = defenseMode === true;
      setIsDefenseCall(isDefense);
      isDefenseCallRef.current = isDefense;

      openingTurnControllerRef.current?.markOpeningTurnPending();

      let sessionConnected = false;
      const session = await connectLiveAudioSession({
        token,
        callbacks: {
          onopen: () => {
            sessionConnected = true;
            setCallState("connected");
            // Stop ring sound when connected
            if (ringSound) ringSound.stop();
          },
          onmessage: handleServerMessage,
          onerror: (e: ErrorEvent) => {
            logger.error("Gemini Live error", { error: e });
            setError(e.message || "Connection error");
            setCallState("error");
            // Stop ring sound on error
            if (ringSound) ringSound.stop();
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
    } catch (err) {
      isConnectingRef.current = false;
      logger.error("Connection error", { err });
      openingTurnControllerRef.current?.reset();
      const errorMessage =
        err instanceof Error ? err.message : "Connection failed";
      setError(errorMessage);

      // Stop ring sound on error (if it was started)
      if (ringSound) {
        ringSound.stop();
      }

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
    isPostSubmission,
    language,
    onError,
  ]);

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

  // End call and save transcript (transcript must be persisted BEFORE
  // signaling "ended" so downstream handlers have voice context in the DB)
  const endCall = useCallback(async () => {
    disconnect();
    setCallState("saving");

    // Save transcript to server BEFORE signaling ended
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
        logger.error("Error saving transcript", { err });
      }
    }

    setCallState("ended");

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
        <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-destructive/30 overflow-hidden" style={{background: "hsl(var(--slack-bg-surface))"}}>
          <div className="h-1 bg-destructive" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive">
                  <PhoneOff size={16} className="text-destructive-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-destructive">Call Failed</p>
                  <p className="max-w-[150px] truncate text-xs" style={{color: "hsl(var(--slack-text-muted))"}}>
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
        <div className="relative rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden" style={{background: "hsl(var(--slack-bg-surface))", border: "1px solid hsl(var(--slack-border))"}}>
          <div className="h-1 bg-gradient-to-r from-primary to-primary/60 animate-pulse" />
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute -inset-1 rounded-full bg-primary/20 animate-pulse" />
                <CoworkerAvatar
                  name={coworker.name}
                  avatarUrl={coworker.avatarUrl}
                  gender={coworker.gender}
                  size="md"
                  className="ring-2 [--tw-ring-color:hsl(var(--slack-bg-sidebar))]"
                />
              </div>
              <div>
                <p className="text-sm font-bold" style={{color: "hsl(var(--slack-text))"}}>{coworker.name}</p>
                <p className="text-xs" style={{color: "hsl(var(--slack-text-muted))"}}>
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
        <div className="relative rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden" style={{background: "hsl(var(--slack-bg-surface))", border: "1px solid hsl(var(--slack-border))"}}>
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute -inset-1 rounded-full bg-green-500/20 animate-pulse" />
                  <CoworkerAvatar
                    name={coworker.name}
                    avatarUrl={coworker.avatarUrl}
                    gender={coworker.gender}
                    size="md"
                    className={`ring-2 [--tw-ring-color:hsl(var(--slack-bg-sidebar))] [--tw-ring-offset-color:hsl(var(--slack-bg-surface))] ${isSpeaking ? "ring-primary ring-offset-2" : ""}`}
                  />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{color: "hsl(var(--slack-text))"}}>On Call</div>
                  <div className="text-xs text-green-400 font-medium flex items-center gap-1">
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
                className="h-10 w-10 rounded-full"
                style={{borderColor: "hsl(var(--slack-border))"}}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              {/* Waveform Visualization */}
              <AudioWaveform
                isSpeaking={isSpeaking}
                isListening={isListening}
                isMuted={isMuted}
                micVolumeRef={micVolumeRef}
                getOutputFrequencyData={getOutputFrequencyData}
              />

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

  // Saving state - brief transitional state while transcript is persisted
  if (callState === "saving") {
    return (
      <div className="relative">
        <div className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-border/50 overflow-hidden" style={{background: "hsl(var(--slack-bg-surface))"}}>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <CoworkerAvatar name={coworker.name} avatarUrl={coworker.avatarUrl} gender={coworker.gender} size="md" />
              <div>
                <p className="text-sm font-bold" style={{color: "hsl(var(--slack-text))"}}>Call ended</p>
                <p className="text-xs" style={{color: "hsl(var(--slack-text-muted))"}}>Saving conversation...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ended or idle state - don't render anything
  return null;
}
