"use client";

import { useState } from "react";
import { Monitor, Mic, Camera, AlertTriangle, ArrowRight, RotateCw } from "lucide-react";
import { useScreenRecordingContext } from "@/contexts/screen-recording-context";
import type { PermissionBlock } from "@/contexts/screen-recording-context";
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
  bypassRecording?: boolean;
}

export function ScreenRecordingGuard({
  children,
  assessmentId,
  companyName = "the company",
  bypassRecording,
}: ScreenRecordingGuardProps) {
  // Bypass the guard for E2E test mode, dev skip flag, or demo-user prod path.
  if (bypassRecording || shouldSkipScreenRecording()) {
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
  assessmentId: _assessmentId,
  companyName = "the company",
}: ScreenRecordingGuardProps) {
  const {
    state,
    error,
    isRecording,
    sessionLoaded,
    permissionBlock,
    startRecording,
    retryRecording,
  } = useScreenRecordingContext();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Derive blocking state directly from recording state — no useEffect race condition.
  // Recording is mandatory: block access until actively recording.
  const isStoppedOrError = state === "stopped" || state === "error";
  const isRequesting = state === "requesting";
  const shouldBlock = !isRecording && !isRequesting;

  const handleRetry = async () => {
    setIsRetrying(true);
    await retryRecording();
    setIsRetrying(false);
  };

  const handleAcceptAndStart = async () => {
    setIsStarting(true);
    await startRecording();
    setIsStarting(false);
  };

  // While session is loading, show nothing (provider also gates on this)
  if (!sessionLoaded) {
    return null;
  }

  // Assessment was deliberately finalized — pass through while navigation to
  // /results is in flight. Without this, stopRecording() would flip the guard
  // into showing the initial consent modal again.
  if (state === "ended") {
    return <>{children}</>;
  }

  // Recording is active or browser permission dialogs are showing — allow access
  if (!shouldBlock) {
    return <>{children}</>;
  }

  // Browser-level block (site setting or Chrome embargo) — "Resume Recording"
  // can't fix this because the browser won't show another prompt. Show the
  // device-specific instructions modal instead.
  if (permissionBlock) {
    return (
      <>
        <BlockedPermissionModal block={permissionBlock} />
        <div className="pointer-events-none blur-sm">{children}</div>
      </>
    );
  }

  // Recording stopped or errored — show retry modal
  if (isStoppedOrError) {
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
                Recording Stopped
              </DialogTitle>
              <DialogDescription className="text-center">
                Your screen, webcam, or microphone recording has stopped
              </DialogDescription>
            </DialogHeader>

            {/* Message */}
            <div className="rounded-lg bg-muted p-6">
              {error && (
                <p className="mb-4 font-medium text-destructive">{error}</p>
              )}
              <p className="mb-4 text-muted-foreground">
                To continue with the assessment, you need to share your{" "}
                <strong>entire screen</strong>, enable your <strong>webcam</strong>, and allow <strong>microphone</strong> access.
              </p>
              <p className="text-sm text-muted-foreground">
                Sharing a single tab or window is not allowed. Full screen,
                webcam, and microphone recording are all required to capture your work process.
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
                    Resume Recording
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                You cannot continue without screen, webcam, and microphone recording enabled
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Render children behind the overlay (hidden) */}
        <div className="pointer-events-none blur-sm">{children}</div>
      </>
    );
  }

  // Default: initial consent modal (state === "idle" — fresh start, no prior recording)
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
                  <Camera className="h-8 w-8 text-primary" />
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
                  <span className="font-semibold">Entire Screen Recording</span>
                  <p className="text-sm text-muted-foreground">
                    Your full screen will be recorded — tab or window sharing
                    is not accepted
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="font-semibold">Webcam Recording</span>
                  <p className="text-sm text-muted-foreground">
                    Your webcam will be recorded for identity verification
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
              You will be prompted to share your entire screen and enable
              your webcam
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render children behind the overlay (hidden) */}
      <div className="pointer-events-none blur-sm">{children}</div>
    </>
  );
}

function BlockedPermissionModal({ block }: { block: NonNullable<PermissionBlock> }) {
  const deviceLabel = block.device === "camera" ? "Camera" : "Microphone";
  const DeviceIcon = block.device === "camera" ? Camera : Mic;

  // Both remediation paths end in "reload the page" because neither a changed
  // site setting nor a cleared embargo takes effect until the next navigation.
  const handleReload = () => {
    window.location.reload();
  };

  // Copy differs by cause — embargo needs "Reset permissions", site block
  // needs "change to Allow". Generic fallback covers cases where the
  // Permissions API couldn't classify.
  const instructions =
    block.reason === "site-block" ? (
      <>
        <p className="mb-3 font-medium text-foreground">
          Your browser is blocking {deviceLabel.toLowerCase()} access for this site.
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">1.</strong> Click the tune icon
            (⚙︎) or lock icon to the left of the URL at the top of your browser.
          </li>
          <li>
            <strong className="text-foreground">2.</strong> Find{" "}
            <strong>{deviceLabel}</strong> in the list and change it from{" "}
            <strong>Block</strong> to <strong>Allow</strong>.
          </li>
          <li>
            <strong className="text-foreground">3.</strong> Reload this page
            using the button below.
          </li>
        </ol>
      </>
    ) : block.reason === "embargo" ? (
      <>
        <p className="mb-3 font-medium text-foreground">
          Your browser auto-rejected the {deviceLabel.toLowerCase()} prompt
          after it was dismissed a few times.
        </p>
        <p className="mb-3 text-sm text-muted-foreground">
          This is a privacy feature — the site setting still shows{" "}
          <strong>Ask</strong>, but the browser won&apos;t show the prompt
          again until you reset it.
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">1.</strong> Click the tune icon
            (⚙︎) or lock icon to the left of the URL at the top of your browser.
          </li>
          <li>
            <strong className="text-foreground">2.</strong> Click{" "}
            <strong>Reset permissions</strong>.
          </li>
          <li>
            <strong className="text-foreground">3.</strong> Reload this page —
            the {deviceLabel.toLowerCase()} prompt will appear again.
          </li>
        </ol>
      </>
    ) : (
      <>
        <p className="mb-3 font-medium text-foreground">
          Your browser blocked {deviceLabel.toLowerCase()} access for this site.
        </p>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">1.</strong> Click the tune icon
            (⚙︎) or lock icon to the left of the URL at the top of your browser.
          </li>
          <li>
            <strong className="text-foreground">2.</strong> Set{" "}
            <strong>{deviceLabel}</strong> to <strong>Allow</strong>, or click{" "}
            <strong>Reset permissions</strong>.
          </li>
          <li>
            <strong className="text-foreground">3.</strong> Reload this page
            using the button below.
          </li>
        </ol>
      </>
    );

  return (
    <Dialog open={true}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-4 flex justify-center">
            <div className="rounded-xl bg-destructive/10 p-4">
              <DeviceIcon className="h-12 w-12 text-destructive" />
            </div>
          </div>

          <DialogTitle className="text-center text-2xl">
            Allow {deviceLabel} Access
          </DialogTitle>
          <DialogDescription className="text-center">
            We need {deviceLabel.toLowerCase()} access to continue the assessment
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted p-6">{instructions}</div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <Button onClick={handleReload} size="lg" className="w-full">
            <RotateCw className="h-4 w-4" />
            Reload Page
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Still stuck? On macOS, also check System Settings → Privacy &
            Security → {deviceLabel} and make sure your browser is enabled.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
