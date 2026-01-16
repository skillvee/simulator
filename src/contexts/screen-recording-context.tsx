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
import {
  VideoRecorder,
  checkMediaRecorderSupport,
} from "@/lib/video-recorder";

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
  chunkCount: number;
  screenshotCount: number;
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

// Helper function to upload a chunk or screenshot
async function uploadRecordingData(
  assessmentId: string,
  file: Blob,
  type: "video" | "screenshot",
  chunkIndex?: number,
  timestamp?: number
): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assessmentId", assessmentId);
    formData.append("type", type);
    if (chunkIndex !== undefined) {
      formData.append("chunkIndex", chunkIndex.toString());
    }
    if (timestamp !== undefined) {
      formData.append("timestamp", timestamp.toString());
    }

    const response = await fetch("/api/recording", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Upload failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Upload error:", error);
    return false;
  }
}

export function ScreenRecordingProvider({
  children,
  assessmentId,
}: ScreenRecordingProviderProps) {
  const [state, setState] = useState<ScreenRecordingState>("idle");
  const [permissionState, setPermissionState] =
    useState<ScreenPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [screenshotCount, setScreenshotCount] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const videoRecorderRef = useRef<VideoRecorder | null>(null);
  const chunkIndexRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  const isSupported = checkScreenCaptureSupport() && checkMediaRecorderSupport();

  const handleStreamStopped = useCallback(() => {
    // Stop video recording and upload final chunk
    if (videoRecorderRef.current) {
      const finalBlob = videoRecorderRef.current.stop();
      if (finalBlob && finalBlob.size > 0) {
        uploadRecordingData(
          assessmentId,
          finalBlob,
          "video",
          chunkIndexRef.current,
          startTimeRef.current || Date.now()
        );
      }
      videoRecorderRef.current = null;
    }

    setState("stopped");
    setPermissionState("stopped");
    streamRef.current = null;
    // Clear session storage
    sessionStorage.removeItem(`screen-recording-${assessmentId}`);
  }, [assessmentId]);

  const cleanup = useCallback(() => {
    // Stop video recording
    if (videoRecorderRef.current) {
      videoRecorderRef.current.stop();
      videoRecorderRef.current = null;
    }

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (streamRef.current) {
      stopScreenCapture(streamRef.current);
      streamRef.current = null;
    }

    // Reset counters
    chunkIndexRef.current = 0;
    startTimeRef.current = null;
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
    setChunkCount(0);
    setScreenshotCount(0);

    try {
      const stream = await requestScreenCapture();
      streamRef.current = stream;
      cleanupRef.current = onStreamEnded(stream, handleStreamStopped);

      // Initialize start time
      startTimeRef.current = Date.now();

      // Create and start video recorder
      videoRecorderRef.current = new VideoRecorder(
        {
          videoBitsPerSecond: 1_000_000, // 1 Mbps
          timeslice: 10_000, // 10 second chunks
          screenshotIntervalMs: 30_000, // Screenshot every 30 seconds
        },
        {
          onDataAvailable: (chunk) => {
            // Upload each chunk as it becomes available
            const currentIndex = chunkIndexRef.current;
            chunkIndexRef.current += 1;
            setChunkCount((prev) => prev + 1);

            uploadRecordingData(
              assessmentId,
              chunk,
              "video",
              currentIndex,
              startTimeRef.current || Date.now()
            );
          },
          onScreenshot: (screenshot) => {
            // Upload screenshot
            setScreenshotCount((prev) => prev + 1);
            uploadRecordingData(
              assessmentId,
              screenshot,
              "screenshot",
              undefined,
              Date.now()
            );
          },
          onError: (err) => {
            console.error("Video recorder error:", err);
          },
        }
      );

      videoRecorderRef.current.start(stream);

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
    // Stop and upload final video chunk
    if (videoRecorderRef.current) {
      const finalBlob = videoRecorderRef.current.stop();
      if (finalBlob && finalBlob.size > 0) {
        uploadRecordingData(
          assessmentId,
          finalBlob,
          "video",
          chunkIndexRef.current,
          startTimeRef.current || Date.now()
        );
      }
      videoRecorderRef.current = null;
    }

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
    chunkCount,
    screenshotCount,
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
