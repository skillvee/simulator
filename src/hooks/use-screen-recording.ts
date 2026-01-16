"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  checkScreenCaptureSupport,
  requestScreenCapture,
  stopScreenCapture,
  isStreamActive,
  onStreamEnded,
  type ScreenPermissionState,
} from "@/lib/screen";

export type ScreenRecordingState =
  | "idle"
  | "requesting"
  | "recording"
  | "stopped"
  | "error";

interface UseScreenRecordingOptions {
  onStopped?: () => void;
  onError?: (error: string) => void;
}

interface UseScreenRecordingReturn {
  state: ScreenRecordingState;
  permissionState: ScreenPermissionState;
  error: string | null;
  isSupported: boolean;
  stream: MediaStream | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  retryRecording: () => Promise<boolean>;
}

export function useScreenRecording(
  options: UseScreenRecordingOptions = {}
): UseScreenRecordingReturn {
  const { onStopped, onError } = options;

  const [state, setState] = useState<ScreenRecordingState>("idle");
  const [permissionState, setPermissionState] =
    useState<ScreenPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const isSupported = checkScreenCaptureSupport();

  const handleStreamStopped = useCallback(() => {
    setState("stopped");
    setPermissionState("stopped");
    streamRef.current = null;
    onStopped?.();
  }, [onStopped]);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (streamRef.current) {
      stopScreenCapture(streamRef.current);
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Screen capture is not supported in this browser");
      setState("error");
      setPermissionState("unavailable");
      onError?.("Screen capture is not supported in this browser");
      return false;
    }

    // Clean up any existing stream
    cleanup();

    setState("requesting");
    setError(null);

    try {
      const stream = await requestScreenCapture();
      streamRef.current = stream;

      // Set up listener for when user stops sharing via browser UI
      cleanupRef.current = onStreamEnded(stream, handleStreamStopped);

      setState("recording");
      setPermissionState("granted");
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start screen recording";

      // Detect permission denied
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setPermissionState("denied");
        setError(
          "Screen sharing permission was denied. Please allow screen sharing to continue."
        );
      } else if (
        err instanceof DOMException &&
        err.name === "NotFoundError"
      ) {
        setPermissionState("unavailable");
        setError("No screen available to share.");
      } else {
        setError(errorMessage);
      }

      setState("error");
      onError?.(errorMessage);
      return false;
    }
  }, [isSupported, cleanup, handleStreamStopped, onError]);

  const stopRecording = useCallback(() => {
    cleanup();
    setState("idle");
  }, [cleanup]);

  const retryRecording = useCallback(async (): Promise<boolean> => {
    // Reset state before retrying
    setState("idle");
    setPermissionState("prompt");
    setError(null);
    return startRecording();
  }, [startRecording]);

  // Check if stream is still active periodically
  useEffect(() => {
    if (state !== "recording") return;

    const interval = setInterval(() => {
      if (!isStreamActive(streamRef.current)) {
        handleStreamStopped();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state, handleStreamStopped]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state,
    permissionState,
    error,
    isSupported,
    stream: streamRef.current,
    startRecording,
    stopRecording,
    retryRecording,
  };
}
