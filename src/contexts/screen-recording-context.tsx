"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
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

interface ScreenRecordingContextValue {
  state: ScreenRecordingState;
  permissionState: ScreenPermissionState;
  error: string | null;
  isSupported: boolean;
  isRecording: boolean;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  retryRecording: () => Promise<boolean>;
}

const ScreenRecordingContext = createContext<ScreenRecordingContextValue | null>(
  null
);

interface ScreenRecordingProviderProps {
  children: ReactNode;
  assessmentId: string;
}

export function ScreenRecordingProvider({
  children,
  assessmentId,
}: ScreenRecordingProviderProps) {
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
    // Clear session storage
    sessionStorage.removeItem(`screen-recording-${assessmentId}`);
  }, [assessmentId]);

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
      return false;
    }

    cleanup();
    setState("requesting");
    setError(null);

    try {
      const stream = await requestScreenCapture();
      streamRef.current = stream;
      cleanupRef.current = onStreamEnded(stream, handleStreamStopped);

      setState("recording");
      setPermissionState("granted");
      sessionStorage.setItem(`screen-recording-${assessmentId}`, "active");
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start screen recording";

      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setPermissionState("denied");
        setError("Screen sharing permission was denied.");
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
      return false;
    }
  }, [isSupported, cleanup, handleStreamStopped, assessmentId]);

  const stopRecording = useCallback(() => {
    cleanup();
    setState("idle");
    sessionStorage.removeItem(`screen-recording-${assessmentId}`);
  }, [cleanup, assessmentId]);

  const retryRecording = useCallback(async (): Promise<boolean> => {
    setState("idle");
    setPermissionState("prompt");
    setError(null);
    return startRecording();
  }, [startRecording]);

  // Check stream status periodically
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

  const value: ScreenRecordingContextValue = {
    state,
    permissionState,
    error,
    isSupported,
    isRecording: state === "recording",
    startRecording,
    stopRecording,
    retryRecording,
  };

  return (
    <ScreenRecordingContext.Provider value={value}>
      {children}
    </ScreenRecordingContext.Provider>
  );
}

export function useScreenRecordingContext(): ScreenRecordingContextValue {
  const context = useContext(ScreenRecordingContext);
  if (!context) {
    throw new Error(
      "useScreenRecordingContext must be used within a ScreenRecordingProvider"
    );
  }
  return context;
}
