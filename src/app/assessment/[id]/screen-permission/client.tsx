"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Monitor, MonitorOff, ArrowRight, AlertCircle } from "lucide-react";
import { useScreenRecording } from "@/hooks/use-screen-recording";

interface ScreenPermissionClientProps {
  assessmentId: string;
  userName: string;
  companyName: string;
}

export function ScreenPermissionClient({
  assessmentId,
  userName,
  companyName,
}: ScreenPermissionClientProps) {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const {
    state,
    permissionState,
    error,
    isSupported,
    startRecording,
    retryRecording,
  } = useScreenRecording({
    onStopped: () => {
      // Screen sharing stopped - will be handled by state
    },
  });

  // Animation sequence
  useEffect(() => {
    const timers = [
      setTimeout(() => setShowContent(true), 100),
      setTimeout(() => setShowExplanation(true), 400),
      setTimeout(() => setShowButton(true), 700),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Redirect to welcome when recording starts
  useEffect(() => {
    if (state === "recording") {
      // Store recording state in sessionStorage so it persists across pages
      sessionStorage.setItem(`screen-recording-${assessmentId}`, "active");
      router.push(`/assessment/${assessmentId}/welcome`);
    }
  }, [state, assessmentId, router]);

  const handleRequestPermission = async () => {
    await startRecording();
  };

  const handleRetry = async () => {
    await retryRecording();
  };

  // Browser not supported
  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <div className="mb-6">
            <MonitorOff className="w-16 h-16 mx-auto text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Browser Not Supported</h1>
          <p className="text-muted-foreground mb-6">
            Your browser doesn&apos;t support screen recording. Please use a
            modern browser like Chrome, Firefox, or Edge to continue.
          </p>
          <div className="bg-muted border-2 border-foreground p-4 text-sm font-mono">
            <p className="text-muted-foreground">Recommended browsers:</p>
            <ul className="mt-2 space-y-1">
              <li>Google Chrome 72+</li>
              <li>Mozilla Firefox 66+</li>
              <li>Microsoft Edge 79+</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Permission denied state
  if (permissionState === "denied" || (state === "error" && error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {/* Decorative shapes */}
        <div
          className="absolute top-0 right-0 w-24 h-24 bg-red-500"
          style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-20 h-20 bg-red-500"
          style={{ clipPath: "polygon(0 0, 100% 100%, 0 100%)" }}
        />

        <div className="max-w-md text-center relative z-10">
          <div className="mb-6">
            <div className="inline-block bg-red-100 border-4 border-red-500 p-4">
              <MonitorOff className="w-12 h-12 text-red-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">Screen Sharing Required</h1>

          <p className="text-muted-foreground mb-6">
            {error ||
              "Screen sharing permission was denied. We need to record your screen to assess your work process."}
          </p>

          <div className="bg-muted border-2 border-foreground p-4 text-left mb-6">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              How to enable screen sharing:
            </h3>
            <ol className="text-sm text-muted-foreground space-y-2 font-mono">
              <li>1. Click the lock icon in your browser&apos;s address bar</li>
              <li>2. Find &quot;Screen sharing&quot; or site settings</li>
              <li>3. Allow screen capture for this site</li>
              <li>4. Click &quot;Try Again&quot; below</li>
            </ol>
          </div>

          <button
            onClick={handleRetry}
            className="bg-foreground text-background px-8 py-4 text-lg font-bold border-4 border-foreground hover:bg-secondary hover:text-secondary-foreground"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main permission request view
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Decorative geometric shapes - neo-brutalist style */}
      <div
        className="absolute top-0 left-0 w-32 h-32 bg-secondary border-2 border-foreground"
        style={{
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
          opacity: showContent ? 1 : 0,
        }}
      />
      <div
        className="absolute top-0 right-0 w-24 h-24 bg-foreground"
        style={{
          clipPath: "polygon(100% 0, 100% 100%, 0 0)",
          opacity: showContent ? 1 : 0,
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-40 h-40 bg-secondary border-2 border-foreground"
        style={{
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          opacity: showContent ? 1 : 0,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-20 h-20 bg-foreground"
        style={{
          clipPath: "polygon(0 0, 100% 100%, 0 100%)",
          opacity: showContent ? 1 : 0,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 text-center max-w-xl">
        {/* Icon */}
        <div
          className="mb-8"
          style={{
            opacity: showContent ? 1 : 0,
          }}
        >
          <div className="inline-block bg-secondary border-4 border-foreground p-6">
            <Monitor className="w-12 h-12 text-secondary-foreground" />
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            opacity: showContent ? 1 : 0,
          }}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            One More Step, {userName}
          </h1>
          <p className="text-xl mb-2">
            <span className="text-secondary bg-foreground px-3 py-1 inline-block">
              Enable Screen Recording
            </span>
          </p>
        </div>

        {/* Explanation */}
        <div
          className="mt-8 mb-8"
          style={{
            opacity: showExplanation ? 1 : 0,
          }}
        >
          <div className="bg-muted border-2 border-foreground p-6 text-left">
            <h3 className="font-bold mb-4 text-lg">Why we need this:</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-secondary border border-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </span>
                <span>
                  <strong className="text-foreground">
                    Assess your work process
                  </strong>{" "}
                  - We evaluate HOW you work, not just the final result
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-secondary border border-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </span>
                <span>
                  <strong className="text-foreground">
                    Provide feedback
                  </strong>{" "}
                  - Your recording helps us give you detailed, actionable
                  feedback
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 bg-secondary border border-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </span>
                <span>
                  <strong className="text-foreground">Realistic scenario</strong>{" "}
                  - Just like a real remote job, your screen activity is part of
                  the assessment
                </span>
              </li>
            </ul>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm font-mono text-muted-foreground">
                Your recording is private and only used for assessment purposes
                at {companyName}.
              </p>
            </div>
          </div>
        </div>

        {/* Button */}
        <div
          style={{
            opacity: showButton ? 1 : 0,
          }}
        >
          <button
            onClick={handleRequestPermission}
            disabled={state === "requesting"}
            className="bg-foreground text-background px-8 py-4 text-lg font-bold border-4 border-foreground hover:bg-secondary hover:text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
          >
            {state === "requesting" ? (
              <>
                <div className="w-5 h-5 border-2 border-background border-t-transparent animate-spin" />
                Requesting Permission...
              </>
            ) : (
              <>
                Share Your Screen
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="mt-4 text-sm text-muted-foreground font-mono">
            Select &quot;Entire Screen&quot; for the best experience
          </p>
        </div>
      </div>
    </div>
  );
}
