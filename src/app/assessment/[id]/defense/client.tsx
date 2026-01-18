"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  ExternalLink,
} from "lucide-react";
import { useDefenseCall, type VoiceConnectionState as ConnectionState } from "@/hooks/voice";
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
      <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">
        Call transcript will appear here
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
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md border-2 border-border p-8 text-center">
          <div className="mb-4 text-4xl">
            <MicOff className="mx-auto h-12 w-12 text-red-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold">Browser Not Supported</h3>
          <p className="mb-4 text-muted-foreground">
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
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md border-2 border-border p-8 text-center">
          <div className="mb-4 text-4xl">
            <MicOff className="mx-auto h-12 w-12 text-red-500" />
          </div>
          <h3 className="mb-2 text-xl font-bold">Microphone Access Required</h3>
          <p className="mb-4 text-muted-foreground">
            Please enable microphone access in your browser settings to join the
            defense call.
          </p>
          <ol className="mx-auto mb-6 max-w-md space-y-2 text-left text-sm text-muted-foreground">
            <li>1. Click the lock icon in your browser&apos;s address bar</li>
            <li>2. Find &quot;Microphone&quot; in the permissions list</li>
            <li>3. Change the setting to &quot;Allow&quot;</li>
            <li>4. Refresh this page</li>
          </ol>
          <button
            onClick={() => window.location.reload()}
            className="border-2 border-foreground bg-foreground px-6 py-3 font-semibold text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Manager avatar */}
            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-secondary">
              <span className="font-mono text-sm font-bold text-secondary-foreground">
                {getInitials(managerName)}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold">
                Final Defense with {managerName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {managerRole} at {companyName}
              </p>
            </div>
          </div>
          <ConnectionStateIndicator state={connectionState} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1">
        {/* Transcript panel */}
        <div className="flex flex-1 flex-col border-r-2 border-border">
          <div className="border-b border-border p-4">
            <h3 className="font-mono text-sm text-muted-foreground">
              TRANSCRIPT
            </h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <TranscriptView messages={transcript} managerName={managerName} />
          </div>
        </div>

        {/* Control panel */}
        <div className="flex w-96 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            {/* Avatar */}
            <div className="mb-6 flex h-32 w-32 items-center justify-center border-2 border-foreground bg-secondary">
              <span className="text-5xl font-bold text-secondary-foreground">
                {getInitials(managerName)}
              </span>
            </div>
            <h3 className="mb-1 text-xl font-bold">{managerName}</h3>
            <p className="mb-2 font-mono text-sm text-muted-foreground">
              {managerRole}
            </p>

            {/* PR Link */}
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 flex items-center gap-1 text-sm text-secondary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              View Your PR
            </a>

            {/* Audio indicators */}
            {connectionState === "connected" && (
              <div className="mb-6 flex items-center gap-4">
                {isListening ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <Mic className="h-5 w-5" />
                    <span className="font-mono text-sm">Listening</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MicOff className="h-5 w-5" />
                    <span className="font-mono text-sm">Muted</span>
                  </div>
                )}
                {isSpeaking ? (
                  <div className="flex items-center gap-2 text-secondary">
                    <Volume2 className="h-5 w-5" />
                    <span className="font-mono text-sm">Speaking</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <VolumeX className="h-5 w-5" />
                    <span className="font-mono text-sm">Silent</span>
                  </div>
                )}
              </div>
            )}

            {/* Connection controls */}
            {connectionState === "idle" && (
              <div className="text-center">
                <p className="mb-6 max-w-xs text-muted-foreground">
                  Hey {userName}! {managerName} is ready to review your PR with
                  you. Walk them through your solution and explain your
                  decisions.
                </p>
                <button
                  onClick={connect}
                  className="mx-auto flex items-center gap-2 border-2 border-green-600 bg-green-600 px-6 py-3 font-semibold text-white hover:border-green-700 hover:bg-green-700"
                >
                  <Phone className="h-5 w-5" />
                  Start Defense Call
                </button>
              </div>
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
                onClick={handleEndCall}
                className="flex items-center gap-2 border-2 border-red-600 bg-red-600 px-6 py-3 font-semibold text-white hover:border-red-700 hover:bg-red-700"
              >
                <PhoneOff className="h-5 w-5" />
                End Call
              </button>
            )}

            {connectionState === "error" && error && (
              <div className="text-center">
                <p className="mb-4 font-mono text-sm text-red-500">{error}</p>
                <button
                  onClick={connect}
                  className="mx-auto flex items-center gap-2 border-2 border-foreground bg-foreground px-6 py-3 font-semibold text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  Try Again
                </button>
              </div>
            )}

            {connectionState === "ended" && (
              <div className="text-center">
                <p className="mb-2 font-mono text-sm text-muted-foreground">
                  Defense completed
                </p>
                <p className="mb-6 text-sm text-muted-foreground">
                  {transcript.length} messages recorded
                </p>
                <button
                  onClick={handleViewResults}
                  className="border-2 border-foreground bg-foreground px-6 py-3 font-bold text-background hover:border-secondary hover:bg-secondary hover:text-secondary-foreground"
                >
                  View Summary
                </button>
                <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                  Your assessment is complete. See your session summary while we
                  generate your report.
                </p>
              </div>
            )}
          </div>

          {/* Tips panel */}
          {connectionState === "idle" && (
            <div className="border-t-2 border-border bg-muted p-4">
              <h4 className="mb-2 font-mono text-xs text-muted-foreground">
                DEFENSE CALL TIPS
              </h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>Walk through your solution at a high level first</li>
                <li>Be prepared to explain your technical decisions</li>
                <li>Discuss trade-offs you considered</li>
                <li>Mention challenges and how you solved them</li>
                <li>Be honest about areas for improvement</li>
              </ul>
            </div>
          )}

          {connectionState === "connected" && (
            <div className="border-t-2 border-border bg-muted p-4">
              <h4 className="mb-2 font-mono text-xs text-muted-foreground">
                IN DEFENSE
              </h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>Explain your reasoning clearly</li>
                <li>Reference specific code decisions</li>
                <li>
                  It&apos;s okay to say &quot;I would do X differently&quot;
                </li>
                <li>Ask for clarification if needed</li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
