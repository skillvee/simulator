"use client";

import { useEffect, useState } from "react";
import { Monitor, Mic, AlertTriangle, ArrowRight } from "lucide-react";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";

interface ScreenRecordingGuardProps {
  children: React.ReactNode;
  assessmentId: string;
  companyName?: string;
}

export function ScreenRecordingGuard({
  children,
  assessmentId,
  companyName = "the company",
}: ScreenRecordingGuardProps) {
  const {
    state,
    permissionState,
    isRecording,
    startRecording,
    retryRecording,
  } = useScreenRecordingContext();
  const [showStoppedModal, setShowStoppedModal] = useState(false);
  const [showInitialModal, setShowInitialModal] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Check if this is a fresh start or if recording was interrupted
  useEffect(() => {
    const wasRecording = sessionStorage.getItem(
      `screen-recording-${assessmentId}`
    );

    if (wasRecording === "active" && state === "stopped") {
      // Recording was active but stopped (user closed screen share)
      setShowStoppedModal(true);
      setShowInitialModal(false);
    } else if (state === "stopped" && permissionState === "stopped") {
      // Recording stopped after being active
      setShowStoppedModal(true);
      setShowInitialModal(false);
    } else if (isRecording) {
      // Recording is active
      setShowStoppedModal(false);
      setShowInitialModal(false);
    } else if (state === "idle" && !wasRecording) {
      // Fresh start - show initial consent modal
      setShowInitialModal(true);
      setShowStoppedModal(false);
    }
  }, [state, permissionState, isRecording, assessmentId]);

  const handleRetry = async () => {
    setIsRetrying(true);
    const success = await retryRecording();
    setIsRetrying(false);
    if (success) {
      setShowStoppedModal(false);
    }
  };

  const handleAcceptAndStart = async () => {
    setIsStarting(true);
    const success = await startRecording();
    setIsStarting(false);
    if (success) {
      setShowInitialModal(false);
    }
  };

  // Initial consent modal (before recording starts)
  if (showInitialModal) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-lg">
            {/* Icons */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-4">
                <div className="border-4 border-foreground bg-secondary p-4">
                  <Monitor className="h-8 w-8 text-secondary-foreground" />
                </div>
                <span className="text-2xl font-bold">+</span>
                <div className="border-4 border-foreground bg-secondary p-4">
                  <Mic className="h-8 w-8 text-secondary-foreground" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-4 text-center text-2xl font-bold">
              Recording Notice
            </h2>

            {/* Message */}
            <div className="mb-6 border-2 border-foreground bg-muted p-6">
              <p className="mb-4 text-foreground">
                To provide you with detailed feedback on your work, we need to
                record:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Monitor className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Screen Recording</span>
                    <p className="text-sm text-muted-foreground">
                      Your screen will be recorded during the coding task
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mic className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Voice Recording</span>
                    <p className="text-sm text-muted-foreground">
                      Voice conversations will be recorded and transcribed
                    </p>
                  </div>
                </li>
              </ul>
              <p className="mt-4 border-t border-border pt-4 font-mono text-sm text-muted-foreground">
                Your recordings are private and only used for assessment at{" "}
                {companyName}.
              </p>
            </div>

            {/* Accept button */}
            <button
              onClick={handleAcceptAndStart}
              disabled={isStarting}
              className="flex w-full items-center justify-center gap-3 border-4 border-foreground bg-foreground px-6 py-4 text-lg font-bold text-background hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <div className="h-5 w-5 animate-spin border-2 border-background border-t-transparent" />
                  Starting Recording...
                </>
              ) : (
                <>
                  Accept & Continue
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            <p className="mt-4 text-center font-mono text-sm text-muted-foreground">
              You will be prompted to share your screen next
            </p>
          </div>
        </div>

        {/* Render children behind the overlay (hidden) */}
        <div className="pointer-events-none blur-sm">{children}</div>
      </>
    );
  }

  // Re-prompt modal (recording stopped)
  if (showStoppedModal) {
    return (
      <>
        {/* Overlay */}
        <div className="bg-background/95 fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Warning icon */}
            <div className="mb-6 text-center">
              <div className="inline-block border-4 border-foreground bg-secondary p-4">
                <AlertTriangle className="h-12 w-12 text-secondary-foreground" />
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-4 text-center text-2xl font-bold">
              Screen Recording Stopped
            </h2>

            {/* Message */}
            <div className="mb-6 border-2 border-foreground bg-muted p-6">
              <p className="mb-4 text-muted-foreground">
                Your screen recording has stopped. To continue with the
                assessment, you need to share your screen again.
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                Screen recording is required to capture your work process and
                provide you with detailed feedback.
              </p>
            </div>

            {/* Retry button */}
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex w-full items-center justify-center gap-3 border-4 border-foreground bg-foreground px-6 py-4 text-lg font-bold text-background hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRetrying ? (
                <>
                  <div className="h-5 w-5 animate-spin border-2 border-background border-t-transparent" />
                  Requesting Permission...
                </>
              ) : (
                <>
                  <Monitor className="h-5 w-5" />
                  Resume Screen Sharing
                </>
              )}
            </button>

            <p className="mt-4 text-center font-mono text-sm text-muted-foreground">
              You cannot continue without screen sharing enabled
            </p>
          </div>
        </div>

        {/* Render children behind the overlay (hidden) */}
        <div className="pointer-events-none blur-sm">{children}</div>
      </>
    );
  }

  return <>{children}</>;
}
