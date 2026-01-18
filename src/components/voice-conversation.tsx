"use client";

import { useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import {
  useVoiceConversation,
  type VoiceConnectionState as ConnectionState,
} from "@/hooks/voice";
import type { TranscriptMessage } from "@/lib/gemini";
import {
  ErrorDisplay,
  SessionRecoveryPrompt,
} from "@/components/error-display";

interface VoiceConversationProps {
  assessmentId: string;
  onEnd?: (transcript: TranscriptMessage[]) => void;
  onFallbackToText?: () => void;
}

function ConnectionStateIndicator({ state }: { state: ConnectionState }) {
  const stateConfig = {
    idle: { label: "Ready to connect", color: "bg-muted" },
    "requesting-permission": {
      label: "Requesting microphone...",
      color: "bg-secondary",
    },
    connecting: { label: "Connecting...", color: "bg-secondary" },
    connected: { label: "Connected", color: "bg-green-500" },
    error: { label: "Connection error", color: "bg-red-500" },
    ended: { label: "Interview ended", color: "bg-muted" },
    retrying: { label: "Retrying...", color: "bg-secondary" },
  };

  const config = stateConfig[state];

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 ${config.color}`} />
      <span className="font-mono text-sm">{config.label}</span>
    </div>
  );
}

function TranscriptView({ messages }: { messages: TranscriptMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
        Conversation transcript will appear here
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full space-y-4 overflow-y-auto p-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] p-3 ${
              message.role === "user"
                ? "bg-foreground text-background"
                : "border-2 border-border bg-muted text-foreground"
            }`}
          >
            <div className="mb-1 font-mono text-xs opacity-70">
              {message.role === "user" ? "You" : "HR Interviewer"}
            </div>
            <p className="text-sm">{message.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function _AudioVisualizerBar({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1 bg-secondary transition-all duration-150 ${
            active ? "animate-pulse" : ""
          }`}
          style={{
            height: active ? `${Math.random() * 100}%` : "20%",
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function VoiceConversation({
  assessmentId,
  onEnd,
  onFallbackToText,
}: VoiceConversationProps) {
  const {
    connectionState,
    permissionState,
    transcript,
    error,
    categorizedError,
    isAudioSupported,
    isSpeaking,
    isListening,
    retryCount,
    maxRetries,
    connect,
    endInterview,
    retry,
    hasRecoverableSession,
    recoverSession,
  } = useVoiceConversation({
    assessmentId,
    onTranscriptUpdate: () => {
      // Transcript updated
    },
  });

  const handleEndInterview = async () => {
    const success = await endInterview();
    if (success) {
      onEnd?.(transcript);
    }
    // If save failed, don't redirect - user stays on page to retry
  };

  const isRetrying = connectionState === "retrying";

  // Browser not supported
  if (!isAudioSupported) {
    return (
      <div className="border-2 border-border p-8 text-center">
        <div className="mb-4 text-4xl">
          <MicOff className="mx-auto h-12 w-12 text-red-500" />
        </div>
        <h3 className="mb-2 text-xl font-bold">Browser Not Supported</h3>
        <p className="mb-4 text-muted-foreground">
          Your browser doesn&apos;t support audio capture. Please use a modern
          browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    );
  }

  // Permission denied
  if (permissionState === "denied" && connectionState === "error") {
    return (
      <div className="border-2 border-border p-8 text-center">
        <div className="mb-4 text-4xl">
          <MicOff className="mx-auto h-12 w-12 text-red-500" />
        </div>
        <h3 className="mb-2 text-xl font-bold">Microphone Access Required</h3>
        <p className="mb-4 text-muted-foreground">
          Please enable microphone access in your browser settings to continue
          with the voice interview.
        </p>
        <ol className="mx-auto mb-6 max-w-md space-y-2 text-left text-sm text-muted-foreground">
          <li>1. Click the lock icon in your browser&apos;s address bar</li>
          <li>2. Find &quot;Microphone&quot; in the permissions list</li>
          <li>3. Change the setting to &quot;Allow&quot;</li>
          <li>4. Refresh this page</li>
        </ol>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => window.location.reload()}
            className="border-2 border-foreground bg-foreground px-6 py-3 font-semibold text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
          >
            Refresh Page
          </button>
          {onFallbackToText && (
            <button
              onClick={onFallbackToText}
              className="flex items-center justify-center gap-2 border-2 border-secondary bg-secondary px-6 py-3 font-semibold text-secondary-foreground hover:border-foreground hover:bg-foreground hover:text-background"
            >
              <MessageSquare className="h-4 w-4" />
              Continue with Text
            </button>
          )}
        </div>
      </div>
    );
  }

  // Session recovery prompt
  if (hasRecoverableSession && connectionState === "idle") {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <SessionRecoveryPrompt
          onRecover={() => {
            recoverSession();
            connect();
          }}
          onStartFresh={connect}
          lastSaved={new Date().toISOString()}
          progressSummary={`${transcript.length} messages saved`}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-border p-4">
        <div>
          <h2 className="text-xl font-bold">HR Interview</h2>
          <ConnectionStateIndicator state={connectionState} />
        </div>

        <div className="flex items-center gap-4">
          {/* Audio indicators */}
          <div className="flex items-center gap-2">
            {isListening ? (
              <Mic className="h-5 w-5 text-green-500" />
            ) : (
              <MicOff className="h-5 w-5 text-muted-foreground" />
            )}
            {isSpeaking ? (
              <Volume2 className="h-5 w-5 text-secondary" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Transcript panel */}
        <div className="flex-1 border-r-2 border-border">
          <div className="flex h-full flex-col">
            <div className="border-b border-border p-4">
              <h3 className="font-mono text-sm text-muted-foreground">
                TRANSCRIPT
              </h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <TranscriptView messages={transcript} />
            </div>
          </div>
        </div>

        {/* Control panel */}
        <div className="flex w-80 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            {/* Avatar */}
            <div className="mb-6 flex h-32 w-32 items-center justify-center border-2 border-foreground bg-secondary">
              <span className="text-5xl font-bold text-secondary-foreground">
                SM
              </span>
            </div>
            <h3 className="mb-1 text-xl font-bold">Sarah Mitchell</h3>
            <p className="mb-6 font-mono text-sm text-muted-foreground">
              Senior Technical Recruiter
            </p>

            {/* Speaking indicator */}
            {connectionState === "connected" && (
              <div className="mb-6">
                {isSpeaking ? (
                  <div className="flex items-center gap-2 text-secondary">
                    <Volume2 className="h-5 w-5" />
                    <span className="font-mono text-sm">Speaking...</span>
                  </div>
                ) : isListening ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <Mic className="h-5 w-5" />
                    <span className="font-mono text-sm">Listening...</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Connection controls */}
            {connectionState === "idle" && (
              <button
                onClick={connect}
                className="flex items-center gap-2 border-2 border-green-600 bg-green-600 px-6 py-3 font-semibold text-white hover:border-green-700 hover:bg-green-700"
              >
                <Phone className="h-5 w-5" />
                Start Interview
              </button>
            )}

            {(connectionState === "requesting-permission" ||
              connectionState === "connecting") && (
              <div className="flex items-center gap-2 text-secondary">
                <div className="h-5 w-5 animate-spin border-2 border-secondary border-t-transparent" />
                <span className="font-mono text-sm">
                  {connectionState === "requesting-permission"
                    ? "Requesting microphone..."
                    : "Connecting..."}
                </span>
              </div>
            )}

            {connectionState === "connected" && (
              <button
                onClick={handleEndInterview}
                className="flex items-center gap-2 border-2 border-red-600 bg-red-600 px-6 py-3 font-semibold text-white hover:border-red-700 hover:bg-red-700"
              >
                <PhoneOff className="h-5 w-5" />
                End Interview
              </button>
            )}

            {(connectionState === "error" || connectionState === "retrying") &&
              categorizedError && (
                <ErrorDisplay
                  error={categorizedError}
                  onRetry={retry}
                  onFallback={onFallbackToText}
                  fallbackLabel="Continue with Text"
                  isRetrying={isRetrying}
                  retryCount={retryCount}
                  maxRetries={maxRetries}
                  showFallbackOption={!!onFallbackToText}
                />
              )}

            {connectionState === "error" && !categorizedError && error && (
              <div className="text-center">
                <p className="mb-4 font-mono text-sm text-red-500">{error}</p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    onClick={connect}
                    className="flex items-center gap-2 border-2 border-foreground bg-foreground px-6 py-3 font-semibold text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                  {onFallbackToText && (
                    <button
                      onClick={onFallbackToText}
                      className="flex items-center gap-2 border-2 border-secondary bg-secondary px-6 py-3 font-semibold text-secondary-foreground hover:border-foreground hover:bg-foreground hover:text-background"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Continue with Text
                    </button>
                  )}
                </div>
              </div>
            )}

            {connectionState === "ended" && (
              <div className="text-center">
                <p className="mb-4 font-mono text-sm text-muted-foreground">
                  Interview completed
                </p>
                <p className="text-sm text-muted-foreground">
                  {transcript.length} messages recorded
                </p>
              </div>
            )}
          </div>

          {/* Tips */}
          {connectionState === "idle" && (
            <div className="border-t-2 border-border bg-muted p-4">
              <h4 className="mb-2 font-mono text-xs text-muted-foreground">
                TIPS
              </h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>Speak clearly into your microphone</li>
                <li>Find a quiet environment</li>
                <li>Expected duration: ~20 minutes</li>
                <li>You can interrupt the interviewer</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
