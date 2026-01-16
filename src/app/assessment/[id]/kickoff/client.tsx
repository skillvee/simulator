"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import {
  useManagerKickoff,
  type ConnectionState,
} from "@/hooks/use-manager-kickoff";
import type { TranscriptMessage } from "@/lib/gemini";

interface KickoffClientProps {
  assessmentId: string;
  managerName: string;
  managerRole: string;
  companyName: string;
  userName: string;
}

function ConnectionStateIndicator({ state }: { state: ConnectionState }) {
  const stateConfig = {
    idle: { label: "Ready to call", color: "bg-muted" },
    "requesting-permission": {
      label: "Requesting microphone...",
      color: "bg-secondary",
    },
    connecting: { label: "Connecting...", color: "bg-secondary" },
    connected: { label: "In call", color: "bg-green-500" },
    error: { label: "Connection error", color: "bg-red-500" },
    ended: { label: "Call ended", color: "bg-muted" },
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
  managerName,
}: {
  messages: TranscriptMessage[];
  managerName: string;
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
              {message.role === "user" ? "You" : managerName}
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

export function KickoffClient({
  assessmentId,
  managerName,
  managerRole,
  companyName,
  userName,
}: KickoffClientProps) {
  const router = useRouter();

  const {
    connectionState,
    permissionState,
    transcript,
    error,
    isAudioSupported,
    isSpeaking,
    isListening,
    connect,
    endCall,
  } = useManagerKickoff({
    assessmentId,
    onTranscriptUpdate: () => {
      // Transcript updated
    },
  });

  const handleEndCall = async () => {
    await endCall();
  };

  const handleContinue = () => {
    // Navigate to chat page to talk to coworkers
    router.push(`/assessment/${assessmentId}/chat`);
  };

  // Browser not supported
  if (!isAudioSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="border-2 border-border p-8 text-center max-w-md">
          <div className="text-4xl mb-4">
            <MicOff className="w-12 h-12 mx-auto text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Browser Not Supported</h3>
          <p className="text-muted-foreground mb-4">
            Your browser doesn&apos;t support audio capture. Please use a modern
            browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permissionState === "denied" && connectionState === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="border-2 border-border p-8 text-center max-w-md">
          <div className="text-4xl mb-4">
            <MicOff className="w-12 h-12 mx-auto text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Microphone Access Required</h3>
          <p className="text-muted-foreground mb-4">
            Please enable microphone access in your browser settings to join the
            kickoff call.
          </p>
          <ol className="text-left text-sm text-muted-foreground space-y-2 max-w-md mx-auto mb-6">
            <li>1. Click the lock icon in your browser&apos;s address bar</li>
            <li>2. Find &quot;Microphone&quot; in the permissions list</li>
            <li>3. Change the setting to &quot;Allow&quot;</li>
            <li>4. Refresh this page</li>
          </ol>
          <button
            onClick={() => window.location.reload()}
            className="bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-foreground bg-background">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Manager avatar */}
            <div className="w-10 h-10 bg-secondary border-2 border-foreground flex items-center justify-center">
              <span className="font-bold text-secondary-foreground text-sm font-mono">
                {getInitials(managerName)}
              </span>
            </div>
            <div>
              <h1 className="font-bold text-lg">Kickoff Call with {managerName}</h1>
              <p className="text-sm text-muted-foreground">{managerRole} at {companyName}</p>
            </div>
          </div>
          <ConnectionStateIndicator state={connectionState} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex">
        {/* Transcript panel */}
        <div className="flex-1 border-r-2 border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-mono text-sm text-muted-foreground">TRANSCRIPT</h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <TranscriptView messages={transcript} managerName={managerName} />
          </div>
        </div>

        {/* Control panel */}
        <div className="w-96 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Avatar */}
            <div className="w-32 h-32 bg-secondary border-2 border-foreground flex items-center justify-center mb-6">
              <span className="text-5xl font-bold text-secondary-foreground">
                {getInitials(managerName)}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-1">{managerName}</h3>
            <p className="text-muted-foreground font-mono text-sm mb-6">
              {managerRole}
            </p>

            {/* Audio indicators */}
            {connectionState === "connected" && (
              <div className="flex items-center gap-4 mb-6">
                {isListening ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <Mic className="w-5 h-5" />
                    <span className="font-mono text-sm">Listening</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MicOff className="w-5 h-5" />
                    <span className="font-mono text-sm">Muted</span>
                  </div>
                )}
                {isSpeaking ? (
                  <div className="flex items-center gap-2 text-secondary">
                    <Volume2 className="w-5 h-5" />
                    <span className="font-mono text-sm">Speaking</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <VolumeX className="w-5 h-5" />
                    <span className="font-mono text-sm">Silent</span>
                  </div>
                )}
              </div>
            )}

            {/* Connection controls */}
            {connectionState === "idle" && (
              <div className="text-center">
                <p className="text-muted-foreground mb-6 max-w-xs">
                  Hey {userName}! {managerName} is ready to brief you on your first task.
                </p>
                <button
                  onClick={connect}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 font-semibold border-2 border-green-600 hover:bg-green-700 hover:border-green-700 mx-auto"
                >
                  <Phone className="w-5 h-5" />
                  Join Call
                </button>
              </div>
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

            {connectionState === "error" && error && (
              <div className="text-center">
                <p className="text-red-500 font-mono text-sm mb-4">{error}</p>
                <button
                  onClick={connect}
                  className="flex items-center gap-2 bg-foreground text-background px-6 py-3 font-semibold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary mx-auto"
                >
                  Try Again
                </button>
              </div>
            )}

            {connectionState === "ended" && (
              <div className="text-center">
                <p className="text-muted-foreground font-mono text-sm mb-2">
                  Call completed
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {transcript.length} messages recorded
                </p>
                <button
                  onClick={handleContinue}
                  className="bg-foreground text-background px-6 py-3 font-bold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
                >
                  Chat with Coworkers
                </button>
                <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                  Need more context? Reach out to your team members for details.
                </p>
              </div>
            )}
          </div>

          {/* Tips panel */}
          {connectionState === "idle" && (
            <div className="p-4 border-t-2 border-border bg-muted">
              <h4 className="font-mono text-xs text-muted-foreground mb-2">
                KICKOFF CALL TIPS
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>Listen carefully to the task briefing</li>
                <li>Ask clarifying questions if something is unclear</li>
                <li>Take note of who to ask for more details</li>
                <li>The transcript is saved for your reference</li>
              </ul>
            </div>
          )}

          {connectionState === "connected" && (
            <div className="p-4 border-t-2 border-border bg-muted">
              <h4 className="font-mono text-xs text-muted-foreground mb-2">
                IN CALL
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>Speak clearly and naturally</li>
                <li>Ask questions if requirements are vague</li>
                <li>It&apos;s okay to interrupt for clarification</li>
                <li>Take notes mentally - transcript is auto-saved</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
