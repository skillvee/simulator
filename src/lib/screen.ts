// Screen capture utilities for recording the assessment

export type ScreenPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unavailable"
  | "stopped";

// Check if browser supports screen capture APIs
export function checkScreenCaptureSupport(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function"
  );
}

// Request screen capture permission and return stream
export async function requestScreenCapture(): Promise<MediaStream> {
  if (!checkScreenCaptureSupport()) {
    throw new Error("Screen capture is not supported in this browser");
  }

  return navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: "monitor", // Prefer entire screen
      frameRate: { ideal: 5, max: 10 }, // Low frame rate for assessment
    },
    audio: false, // Audio captured separately via microphone
  });
}

// Stop screen capture stream
export function stopScreenCapture(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

// Check if screen capture stream is still active
export function isStreamActive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream.getTracks().some((track) => track.readyState === "live");
}

// Listen for when user stops sharing via browser UI
export function onStreamEnded(
  stream: MediaStream,
  callback: () => void
): () => void {
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) return () => {};

  const handleEnded = () => {
    callback();
  };

  videoTrack.addEventListener("ended", handleEnded);

  return () => {
    videoTrack.removeEventListener("ended", handleEnded);
  };
}
