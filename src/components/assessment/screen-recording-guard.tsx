"use client";

import { useEffect, useState } from "react";
import { Monitor, Mic, AlertTriangle, ArrowRight } from "lucide-react";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";
import { shouldSkipScreenRecording } from "@/lib/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  // In E2E test mode or when screen recording is skipped, bypass the guard entirely
  if (shouldSkipScreenRecording()) {
    return <>{children}</>;
  }

  return (
    <ScreenRecordingGuardInner
      assessmentId={assessmentId}
      companyName={companyName}
    >
      {children}
    </ScreenRecordingGuardInner>
  );
}

function ScreenRecordingGuardInner({
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
        <Dialog open={true}>
          <DialogContent
            className="max-w-lg"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              {/* Icons */}
              <div className="mb-4 flex justify-center">
                <div className="inline-flex items-center gap-4">
                  <div className="rounded-xl bg-primary/10 p-4">
                    <Monitor className="h-8 w-8 text-primary" />
                  </div>
                  <span className="text-xl font-semibold text-muted-foreground">
                    +
                  </span>
                  <div className="rounded-xl bg-primary/10 p-4">
                    <Mic className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl">
                Recording Notice
              </DialogTitle>
              <DialogDescription className="text-center">
                To provide you with detailed feedback on your work
              </DialogDescription>
            </DialogHeader>

            {/* Message */}
            <div className="rounded-lg bg-muted p-6">
              <p className="mb-4 text-foreground">
                We need to record the following:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1.5">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold">Screen Recording</span>
                    <p className="text-sm text-muted-foreground">
                      Your screen will be recorded during the coding task
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-1.5">
                    <Mic className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold">Voice Recording</span>
                    <p className="text-sm text-muted-foreground">
                      Voice conversations will be recorded and transcribed
                    </p>
                  </div>
                </li>
              </ul>
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                Your recordings are private and only used for assessment at{" "}
                {companyName}.
              </p>
            </div>

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              {/* Accept button */}
              <Button
                onClick={handleAcceptAndStart}
                disabled={isStarting}
                size="lg"
                className="w-full"
              >
                {isStarting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Starting Recording...
                  </>
                ) : (
                  <>
                    Accept & Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                You will be prompted to share your screen next
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Render children behind the overlay (hidden) */}
        <div className="pointer-events-none blur-sm">{children}</div>
      </>
    );
  }

  // Re-prompt modal (recording stopped)
  if (showStoppedModal) {
    return (
      <>
        <Dialog open={true}>
          <DialogContent
            className="max-w-md"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              {/* Warning icon */}
              <div className="mb-4 flex justify-center">
                <div className="rounded-xl bg-destructive/10 p-4">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>

              <DialogTitle className="text-center text-2xl">
                Screen Recording Stopped
              </DialogTitle>
              <DialogDescription className="text-center">
                Your screen recording has stopped
              </DialogDescription>
            </DialogHeader>

            {/* Message */}
            <div className="rounded-lg bg-muted p-6">
              <p className="mb-4 text-muted-foreground">
                To continue with the assessment, you need to share your screen
                again.
              </p>
              <p className="text-sm text-muted-foreground">
                Screen recording is required to capture your work process and
                provide you with detailed feedback.
              </p>
            </div>

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              {/* Retry button */}
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                size="lg"
                className="w-full"
              >
                {isRetrying ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Requesting Permission...
                  </>
                ) : (
                  <>
                    <Monitor className="h-4 w-4" />
                    Resume Screen Sharing
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                You cannot continue without screen sharing enabled
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Render children behind the overlay (hidden) */}
        <div className="pointer-events-none blur-sm">{children}</div>
      </>
    );
  }

  return <>{children}</>;
}
