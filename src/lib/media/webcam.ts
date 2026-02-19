// Webcam capture utilities for recording the candidate during assessment

export type WebcamPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unavailable";

// Check if browser supports webcam capture APIs
export function checkWebcamSupport(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

// Request webcam capture permission and return stream
export async function requestWebcamCapture(): Promise<MediaStream> {
  if (!checkWebcamSupport()) {
    throw new Error("Webcam capture is not supported in this browser");
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640, max: 640 },
      height: { ideal: 480, max: 480 },
      frameRate: { ideal: 5, max: 10 },
      facingMode: "user",
    },
    audio: false, // Audio captured separately via microphone
  });
}

// Stop webcam capture stream
export function stopWebcamCapture(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

// Check if webcam capture stream is still active
export function isWebcamStreamActive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream.getTracks().some((track) => track.readyState === "live");
}

// Listen for when webcam stream ends (e.g., device disconnected)
export function onWebcamStreamEnded(
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

// Capture a single snapshot from the webcam stream as a Blob
export async function captureWebcamSnapshot(
  stream: MediaStream,
  quality: number = 0.9
): Promise<Blob> {
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error("No video track available for webcam snapshot");
  }

  const settings = videoTrack.getSettings();
  const width = settings.width || 640;
  const height = settings.height || 480;

  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.play().then(resolve).catch(reject);
    };
    video.onerror = () => reject(new Error("Failed to load webcam video"));
    setTimeout(() => reject(new Error("Webcam video load timeout")), 5000);
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  ctx.drawImage(video, 0, 0, width, height);

  video.pause();
  video.srcObject = null;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create webcam snapshot blob"));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Capture multiple webcam frames over a short window and return the best one.
 *
 * Takes several snapshots spaced apart to avoid blinks and bad expressions.
 * Picks the largest JPEG blob — closed eyes and motion blur compress smaller,
 * so the largest file is typically the sharpest frame with eyes open.
 */
export async function captureBestWebcamSnapshot(
  stream: MediaStream,
  quality: number = 0.9,
  frameCount: number = 5,
  intervalMs: number = 400
): Promise<Blob> {
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error("No video track available for webcam snapshot");
  }

  const settings = videoTrack.getSettings();
  const width = settings.width || 640;
  const height = settings.height || 480;

  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.play().then(resolve).catch(reject);
    };
    video.onerror = () => reject(new Error("Failed to load webcam video"));
    setTimeout(() => reject(new Error("Webcam video load timeout")), 5000);
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const captureFrame = (): Promise<Blob> =>
    new Promise((resolve, reject) => {
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No blob"))),
        "image/jpeg",
        quality
      );
    });

  const frames: Blob[] = [];
  for (let i = 0; i < frameCount; i++) {
    try {
      frames.push(await captureFrame());
    } catch {
      // Skip failed frames
    }
    if (i < frameCount - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  video.pause();
  video.srcObject = null;

  if (frames.length === 0) {
    throw new Error("Failed to capture any webcam frames");
  }

  // Pick the largest blob — sharp, eyes-open frames have more detail and compress larger
  return frames.reduce((best, frame) =>
    frame.size > best.size ? frame : best
  );
}
