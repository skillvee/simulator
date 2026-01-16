"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, RefreshCw, MessageSquare } from "lucide-react";
import {
  useCoworkerVoice,
  type ConnectionState,
} from "@/hooks/use-coworker-voice";
import type { TranscriptMessage } from "@/lib/gemini";
import { ErrorDisplay } from "@/components/error-display";

interface Coworker {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

interface CoworkerVoiceCallProps {
  assessmentId: string;
  coworker: Coworker;
  onEnd?: () => void;
  onFallbackToText?: () => void;
}

function ConnectionStateIndicator({ state }: { state: ConnectionState }) {
  const stateConfig = {
    idle: { label: "Ready to call", color: "bg-muted" },
    "requesting-permission": { label: "Requesting microphone...", color: "bg-secondary" },
    connecting: { label: "Connecting...", color: "bg-secondary" },
    connected: { label: "Connected", color: "bg-green-500" },
    error: { label: "Connection error", color: "bg-red-500" },
    ended: { label: "Call ended", color: "bg-muted" },
    retrying: { label: "Retrying...", color: "bg-secondary" },
  };

  const config = stateConfig[state];

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 ${config.color}`} />
      <span className="font-mono text-sm">{config.label}</span>
    </div>
  );
}

function TranscriptView({
  messages,
  coworkerName,
}: {
  messages: TranscriptMessage[];
  coworkerName: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm">
        Call transcript will appear here
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto space-y-4 p-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] p-3 ${
              message.role === "user"
                ? "bg-foreground text-background"
                : "bg-muted text-foreground border-2 border-border"
            }`}
          >
            <div className="font-mono text-xs mb-1 opacity-70">
              {message.role === "user" ? "You" : coworkerName}
            </div>
            <p className="text-sm">{message.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CoworkerVoiceCall({
  assessmentId,
  coworker,
  onEnd,
  onFallbackToText,
}: CoworkerVoiceCallProps) {
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
    endCall,
    retry,
  } = useCoworkerVoice({
    assessmentId,
    coworkerId: coworker.id,
    onTranscriptUpdate: () => {
      // Transcript updated
    },
  });

  const handleEndCall = async () => {
    await endCall();
    onEnd?.();
  };

  const isRetrying = connectionState === "retrying";

  // Browser not supported
  if (!isAudioSupported) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="border-2 border-border p-8 text-center max-w-md">
          <div className="text-4xl mb-4">
            <MicOff className="w-12 h-12 mx-auto text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Browser Not Supported</h3>
          <p className="text-muted-foreground mb-4">
            Your browser doesn&apos;t support audio capture. Please use a modern browser
            like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permissionState === "denied" && connectionState === "error") {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="border-2 border-border p-8 text-center max-w-md">
          <div className="text-4xl mb-4">
            <MicOff className="w-12 h-12 mx-auto text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Microphone Access Required</h3>
          <p className="text-muted-foreground mb-4">
            Please enable microphone access in your browser settings to start a
            voice call.
          </p>
          <ol className="text-left text-sm text-muted-foreground space-y-2 max-w-md mx-auto mb-6">
            <li>1. Click the lock icon in your browser&apos;s address bar</li>
            <li>2. Find &quot;Microphone&quot; in the permissions list</li>
            <li>3. Change the setting to &quot;Allow&quot;</li>
            <li>4. Refresh this page</li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
            >
              Refresh Page
            </button>
            {onFallbackToText && (
              <button
                onClick={onFallbackToText}
                className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 font-semibold border-2 border-secondary hover:bg-foreground hover:text-background hover:border-foreground"
              >
                <MessageSquare className="w-4 h-4" />
                Chat Instead
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b-2 border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Voice Call with {coworker.name}</h2>
          <ConnectionStateIndicator state={connectionState} />
        </div>

        <div className="flex items-center gap-4">
          {/* Audio indicators */}
          <div className="flex items-center gap-2">
            {isListening ? (
              <Mic className="w-5 h-5 text-green-500" />
            ) : (
              <MicOff className="w-5 h-5 text-muted-foreground" />
            )}
            {isSpeaking ? (
              <Volume2 className="w-5 h-5 text-secondary" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Transcript panel */}
        <div className="flex-1 border-r-2 border-border">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-mono text-sm text-muted-foreground">TRANSCRIPT</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <TranscriptView messages={transcript} coworkerName={coworker.name} />
            </div>
          </div>
        </div>

        {/* Control panel */}
        <div className="w-80 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Avatar */}
            <div className="w-32 h-32 bg-secondary border-2 border-foreground flex items-center justify-center mb-6">
              <span className="text-5xl font-bold text-secondary-foreground">
                {getInitials(coworker.name)}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-1">{coworker.name}</h3>
            <p className="text-muted-foreground font-mono text-sm mb-6">{coworker.role}</p>

            {/* Speaking indicator */}
            {connectionState === "connected" && (
              <div className="mb-6">
                {isSpeaking ? (
                  <div className="flex items-center gap-2 text-secondary">
                    <Volume2 className="w-5 h-5" />
                    <span className="font-mono text-sm">Speaking...</span>
                  </div>
                ) : isListening ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <Mic className="w-5 h-5" />
                    <span className="font-mono text-sm">Listening...</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Connection controls */}
            {connectionState === "idle" && (
              <button
                onClick={connect}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 font-semibold border-2 border-green-600 hover:bg-green-700 hover:border-green-700"
              >
                <Phone className="w-5 h-5" />
                Start Call
              </button>
            )}

            {(connectionState === "requesting-permission" ||
              connectionState === "connecting") && (
              <div className="flex items-center gap-2 text-secondary">
                <div className="w-5 h-5 border-2 border-secondary border-t-transparent animate-spin" />
                <span className="font-mono text-sm">
                  {connectionState === "requesting-permission"
                    ? "Requesting microphone..."
                    : "Connecting..."}
                </span>
              </div>
            )}

            {connectionState === "connected" && (
              <button
                onClick={handleEndCall}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 font-semibold border-2 border-red-600 hover:bg-red-700 hover:border-red-700"
              >
                <PhoneOff className="w-5 h-5" />
                End Call
              </button>
            )}

            {(connectionState === "error" || connectionState === "retrying") && categorizedError && (
              <ErrorDisplay
                error={categorizedError}
                onRetry={retry}
                onFallback={onFallbackToText}
                fallbackLabel="Chat Instead"
                isRetrying={isRetrying}
                retryCount={retryCount}
                maxRetries={maxRetries}
                showFallbackOption={!!onFallbackToText}
              />
            )}

            {connectionState === "error" && !categorizedError && error && (
              <div className="text-center">
                <p className="text-red-500 font-mono text-sm mb-4">{error}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={connect}
                    className="flex items-center gap-2 bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  {onFallbackToText && (
                    <button
                      onClick={onFallbackToText}
                      className="flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 font-semibold border-2 border-secondary hover:bg-foreground hover:text-background hover:border-foreground"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat Instead
                    </button>
                  )}
                </div>
              </div>
            )}

            {connectionState === "ended" && (
              <div className="text-center">
                <p className="text-muted-foreground font-mono text-sm mb-4">
                  Call completed
                </p>
                <p className="text-sm text-muted-foreground">
                  {transcript.length} messages recorded
                </p>
              </div>
            )}
          </div>

          {/* Tips */}
          {connectionState === "idle" && (
            <div className="p-4 border-t-2 border-border bg-muted">
              <h4 className="font-mono text-xs text-muted-foreground mb-2">TIPS</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>Speak clearly into your microphone</li>
                <li>Find a quiet environment</li>
                <li>You can interrupt at any time</li>
                <li>Call transcript is saved automatically</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
