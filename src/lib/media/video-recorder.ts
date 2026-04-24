// Video recording utilities for continuous screen capture

import { createLogger } from "@/lib/core";

const logger = createLogger("client:media:video-recorder");

export interface RecordingConfig {
  // Video bitrate in bits per second (default: 1Mbps for compressed video)
  videoBitsPerSecond?: number;
  // MIME type for recording (default: webm with VP9 codec for better compression)
  mimeType?: string;
  // Time slice in ms - how often to emit data chunks (default: 60s)
  timeslice?: number;
  // Screenshot interval in ms (default: 30s)
  screenshotIntervalMs?: number;
}

const DEFAULT_CONFIG: Required<RecordingConfig> = {
  videoBitsPerSecond: 1_000_000, // 1 Mbps for reasonable quality + compression
  mimeType: "video/webm;codecs=vp9", // VP9 codec for better compression
  timeslice: 60_000, // 60 seconds per chunk
  screenshotIntervalMs: 30_000, // Screenshot every 30 seconds
};

// Check if MediaRecorder is supported with the specified MIME type
export function checkMediaRecorderSupport(mimeType?: string): boolean {
  if (typeof window === "undefined" || !window.MediaRecorder) {
    return false;
  }
  const type = mimeType || DEFAULT_CONFIG.mimeType;
  return MediaRecorder.isTypeSupported(type);
}

// Get the best supported MIME type for video recording
export function getBestMimeType(): string {
  const mimeTypes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  // Fallback - let browser decide
  return "";
}

// Capture a screenshot from a MediaStream as a Blob
export async function captureScreenshot(
  stream: MediaStream,
  quality: number = 0.8
): Promise<Blob> {
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error("No video track available for screenshot");
  }

  // Get track settings for dimensions
  const settings = videoTrack.getSettings();
  const width = settings.width || 1920;
  const height = settings.height || 1080;

  // Create a video element to capture frame
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  // Wait for video to be ready
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.play().then(resolve).catch(reject);
    };
    video.onerror = () => reject(new Error("Failed to load video"));
    // Timeout after 5 seconds
    setTimeout(() => reject(new Error("Video load timeout")), 5000);
  });

  // Create canvas and draw the current frame
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  ctx.drawImage(video, 0, 0, width, height);

  // Cleanup video element
  video.pause();
  video.srcObject = null;

  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create screenshot blob"));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

export interface VideoRecorderCallbacks {
  onDataAvailable?: (chunk: Blob) => void;
  onScreenshot?: (screenshot: Blob) => void;
  onError?: (error: Error) => void;
  onStop?: () => void;
}

// Create and manage a MediaRecorder for video recording
export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private screenshotInterval: NodeJS.Timeout | null = null;
  private config: Required<RecordingConfig>;
  private callbacks: VideoRecorderCallbacks;
  private recordedChunks: Blob[] = [];
  private isRecording = false;

  constructor(config?: RecordingConfig, callbacks?: VideoRecorderCallbacks) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks || {};
  }

  // Start recording from a MediaStream
  start(stream: MediaStream): void {
    if (this.isRecording) {
      throw new Error("Recording already in progress");
    }

    this.stream = stream;

    // Determine best MIME type
    const mimeType = this.config.mimeType || getBestMimeType();

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: this.config.videoBitsPerSecond,
    });

    // Handle data available
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
        this.callbacks.onDataAvailable?.(event.data);
      }
    };

    // Handle errors
    this.mediaRecorder.onerror = (event) => {
      const error = new Error(`MediaRecorder error: ${event}`);
      this.callbacks.onError?.(error);
    };

    // Handle stop
    this.mediaRecorder.onstop = () => {
      this.isRecording = false;
      this.callbacks.onStop?.();
    };

    // Start recording with timeslice
    this.mediaRecorder.start(this.config.timeslice);
    this.isRecording = true;

    // Start periodic screenshots
    this.startScreenshotCapture();
  }

  // Stop recording
  stop(): Blob | null {
    this.stopScreenshotCapture();

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.isRecording = false;
    this.stream = null;

    // Return combined recording
    if (this.recordedChunks.length > 0) {
      const mimeType =
        this.mediaRecorder?.mimeType || this.config.mimeType || "video/webm";
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      this.recordedChunks = [];
      return blob;
    }

    return null;
  }

  // Stop recording and wait until the final `ondataavailable` + `onstop`
  // events have fired. Unlike `stop()`, the returned blob includes the
  // buffered data flushed by MediaRecorder.stop() — so callers who await
  // this can be sure the per-chunk upload fired by `onDataAvailable` has
  // been enqueued before they continue.
  stopAndWait(): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.stopScreenshotCapture();

      const mr = this.mediaRecorder;
      if (!mr || mr.state === "inactive") {
        const mimeType =
          mr?.mimeType || this.config.mimeType || "video/webm";
        const blob =
          this.recordedChunks.length > 0
            ? new Blob(this.recordedChunks, { type: mimeType })
            : null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.stream = null;
        resolve(blob);
        return;
      }

      // Chain onto the existing onstop handler set in start().
      const existingOnStop = mr.onstop;
      mr.onstop = (evt) => {
        if (existingOnStop) existingOnStop.call(mr, evt);
        const mimeType = mr.mimeType || this.config.mimeType || "video/webm";
        const blob =
          this.recordedChunks.length > 0
            ? new Blob(this.recordedChunks, { type: mimeType })
            : null;
        this.recordedChunks = [];
        resolve(blob);
      };

      mr.stop();
      this.isRecording = false;
      this.stream = null;
    });
  }

  // Pause recording
  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
    }
  }

  // Resume recording
  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
    }
  }

  // Check if currently recording
  getIsRecording(): boolean {
    return this.isRecording;
  }

  // Get current state
  getState(): RecordingState | null {
    return this.mediaRecorder?.state || null;
  }

  // Get recorded chunks count
  getChunksCount(): number {
    return this.recordedChunks.length;
  }

  // Start periodic screenshot capture
  private startScreenshotCapture(): void {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
    }

    // Take initial screenshot
    this.captureScreenshotNow();

    // Set up interval for periodic screenshots
    this.screenshotInterval = setInterval(() => {
      this.captureScreenshotNow();
    }, this.config.screenshotIntervalMs);
  }

  // Stop screenshot capture
  private stopScreenshotCapture(): void {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
  }

  // Capture a screenshot now
  private async captureScreenshotNow(): Promise<void> {
    if (!this.stream) return;

    try {
      const screenshot = await captureScreenshot(this.stream);
      this.callbacks.onScreenshot?.(screenshot);
    } catch (error) {
      // Don't fail the whole recording if screenshot fails
      logger.warn("Failed to capture screenshot", { error: error instanceof Error ? error.message : String(error) });
    }
  }
}

// Type for MediaRecorder state
type RecordingState = "inactive" | "recording" | "paused";
