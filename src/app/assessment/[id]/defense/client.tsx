"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, ExternalLink } from "lucide-react";
import {
  useDefenseCall,
  type ConnectionState,
} from "@/hooks/use-defense-call";
import type { TranscriptMessage } from "@/lib/gemini";

interface DefenseClientProps {
  assessmentId: string;
  managerName: string;
  managerRole: string;
  companyName: string;
  userName: string;
  prUrl: string;
}

function ConnectionStateIndicator({ state }: { state: ConnectionState }) {
  const stateConfig = {
    idle: { label: "Ready to defend", color: "bg-muted" },
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

export function DefenseClient({
  assessmentId,
  managerName,
  managerRole,
  companyName,
  userName,
  prUrl,
}: DefenseClientProps) {
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
  } = useDefenseCall({
    assessmentId,
    onTranscriptUpdate: () => {
      // Transcript updated
    },
    onCallEnded: () => {
      // Finalize assessment after call ends
      finalizeAssessment();
    },
  });

  const finalizeAssessment = async () => {
    try {
      // Mark assessment as completed
      await fetch("/api/assessment/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
    } catch (err) {
      console.error("Error finalizing assessment:", err);
    }
  };

  const handleEndCall = async () => {
    await endCall();
  };

  const handleViewResults = () => {
    router.push(`/assessment/${assessmentId}/processing`);
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
            defense call.
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
              <h1 className="font-bold text-lg">Final Defense with {managerName}</h1>
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
            <p className="text-muted-foreground font-mono text-sm mb-2">
              {managerRole}
            </p>

            {/* PR Link */}
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-secondary hover:underline mb-6"
            >
              <ExternalLink className="w-4 h-4" />
              View Your PR
            </a>

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
                  Hey {userName}! {managerName} is ready to review your PR with you.
                  Walk them through your solution and explain your decisions.
                </p>
                <button
                  onClick={connect}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 font-semibold border-2 border-green-600 hover:bg-green-700 hover:border-green-700 mx-auto"
                >
                  <Phone className="w-5 h-5" />
                  Start Defense Call
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
                  Defense completed
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {transcript.length} messages recorded
                </p>
                <button
                  onClick={handleViewResults}
                  className="bg-foreground text-background px-6 py-3 font-bold border-2 border-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary"
                >
                  View Summary
                </button>
                <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                  Your assessment is complete. See your session summary while we generate your report.
                </p>
              </div>
            )}
          </div>

          {/* Tips panel */}
          {connectionState === "idle" && (
            <div className="p-4 border-t-2 border-border bg-muted">
              <h4 className="font-mono text-xs text-muted-foreground mb-2">
                DEFENSE CALL TIPS
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>Walk through your solution at a high level first</li>
                <li>Be prepared to explain your technical decisions</li>
                <li>Discuss trade-offs you considered</li>
                <li>Mention challenges and how you solved them</li>
                <li>Be honest about areas for improvement</li>
              </ul>
            </div>
          )}

          {connectionState === "connected" && (
            <div className="p-4 border-t-2 border-border bg-muted">
              <h4 className="font-mono text-xs text-muted-foreground mb-2">
                IN DEFENSE
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>Explain your reasoning clearly</li>
                <li>Reference specific code decisions</li>
                <li>It&apos;s okay to say &quot;I would do X differently&quot;</li>
                <li>Ask for clarification if needed</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
