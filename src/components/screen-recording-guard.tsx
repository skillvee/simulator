"use client";

import { useEffect, useState } from "react";
import { Monitor, AlertTriangle } from "lucide-react";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";

interface ScreenRecordingGuardProps {
  children: React.ReactNode;
  assessmentId: string;
}

export function ScreenRecordingGuard({
  children,
  assessmentId,
}: ScreenRecordingGuardProps) {
  const { state, permissionState, isRecording, retryRecording } =
    useScreenRecordingContext();
  const [showModal, setShowModal] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Check if screen recording was previously active but has stopped
  useEffect(() => {
    const wasRecording = sessionStorage.getItem(
      `screen-recording-${assessmentId}`
    );

    if (wasRecording === "active" && state === "stopped") {
      setShowModal(true);
    } else if (state === "stopped" && permissionState === "stopped") {
      setShowModal(true);
    } else if (isRecording) {
      setShowModal(false);
    }
  }, [state, permissionState, isRecording, assessmentId]);

  const handleRetry = async () => {
    setIsRetrying(true);
    const success = await retryRecording();
    setIsRetrying(false);
    if (success) {
      setShowModal(false);
    }
  };

  if (showModal) {
    return (
      <>
        {/* Overlay */}
        <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            {/* Warning icon */}
            <div className="mb-6 text-center">
              <div className="inline-block bg-secondary border-4 border-foreground p-4">
                <AlertTriangle className="w-12 h-12 text-secondary-foreground" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center mb-4">
              Screen Recording Stopped
            </h2>

            {/* Message */}
            <div className="bg-muted border-2 border-foreground p-6 mb-6">
              <p className="text-muted-foreground mb-4">
                Your screen recording has stopped. To continue with the
                assessment, you need to share your screen again.
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                Screen recording is required to capture your work process and
                provide you with detailed feedback.
              </p>
            </div>

            {/* Retry button */}
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-foreground text-background px-6 py-4 text-lg font-bold border-4 border-foreground hover:bg-secondary hover:text-secondary-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isRetrying ? (
                <>
                  <div className="w-5 h-5 border-2 border-background border-t-transparent animate-spin" />
                  Requesting Permission...
                </>
              ) : (
                <>
                  <Monitor className="w-5 h-5" />
                  Resume Screen Sharing
                </>
              )}
            </button>

            <p className="mt-4 text-center text-sm text-muted-foreground font-mono">
              You cannot continue without screen sharing enabled
            </p>
          </div>
        </div>

        {/* Render children behind the overlay (hidden) */}
        <div className="blur-sm pointer-events-none">{children}</div>
      </>
    );
  }

  return <>{children}</>;
}
