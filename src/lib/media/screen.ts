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

// Request screen capture permission and return stream.
// Enforces entire-screen capture — tabs and windows are rejected.
export async function requestScreenCapture(): Promise<MediaStream> {
  if (!checkScreenCaptureSupport()) {
    throw new Error("Screen capture is not supported in this browser");
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: "monitor", // Prefer entire screen
      frameRate: { ideal: 5, max: 10 }, // Low frame rate for assessment
    },
    audio: false, // Audio captured via mic + AudioStreamer mixer in screen-recording-context
    // @ts-expect-error -- newer Screen Capture API options, not yet in all TS libs
    selfBrowserSurface: "exclude", // Hide "this tab" option
    monitorTypeSurfaces: "include", // Ensure monitors are shown
    preferCurrentTab: false, // Don't default to current tab
    surfaceSwitching: "exclude", // Prevent switching to a different surface mid-session
  });

  // Validate the user actually selected an entire screen, not a tab or window
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    const settings = videoTrack.getSettings();
    const surface = (settings as Record<string, unknown>).displaySurface;

    if (surface && surface !== "monitor") {
      // User selected a tab or window — stop the stream and reject
      stream.getTracks().forEach((track) => track.stop());
      throw new ScreenSurfaceError(
        `You must share your entire screen, not a ${surface === "browser" ? "tab" : "window"}. Please try again and select a full screen.`
      );
    }
  }

  return stream;
}

/**
 * Error thrown when the user selects a tab or window instead of their entire screen.
 * The guard component uses this to show a specific error message.
 */
export class ScreenSurfaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreenSurfaceError";
  }
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
