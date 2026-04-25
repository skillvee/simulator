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
} from "@/lib/media";
import {
  requestWebcamCapture,
  stopWebcamCapture,
  isWebcamStreamActive,
  onWebcamStreamEnded,
  captureBestWebcamSnapshot,
  requestMicrophoneAccess,
} from "@/lib/media";
import { CanvasCompositor } from "@/lib/media";
import { VideoRecorder, checkMediaRecorderSupport } from "@/lib/media";
import { createAudioMixer, type AudioMixer } from "@/lib/media/audio-mixer";
import {
  connectAudioStreamerToCapture,
  disconnectAudioStreamerFromCapture,
} from "@/lib/media";
import { shouldSkipScreenRecording, createLogger } from "@/lib/core";

const logger = createLogger("client:contexts:screen-recording");

export type ScreenRecordingState =
  | "idle"
  | "requesting"
  | "recording"
  | "stopped"
  | "error"
  | "ended";

export type WebcamState = "idle" | "requesting" | "active" | "denied" | "error";

/**
 * Describes the specific reason a camera/mic permission request failed,
 * which determines what instructions to show the user.
 *
 * - `site-block`: the browser has camera/mic set to "Block" for this origin
 *   (explicit deny or Chrome Settings). Fix: change the setting to Allow.
 * - `embargo`: Chrome silently auto-rejected the prompt after the user
 *   dismissed it 2-3 times. Site setting still shows "Ask" in the UI.
 *   Fix: Reset permissions to clear the embargo counter.
 * - `unknown`: the Permissions API didn't give us a useful answer (old
 *   browser, extension interference, etc.) — show generic instructions.
 */
export type PermissionBlock = {
  device: "camera" | "microphone";
  reason: "site-block" | "embargo" | "unknown";
} | null;

interface ScreenRecordingContextValue {
  state: ScreenRecordingState;
  permissionState: ScreenPermissionState;
  error: string | null;
  isSupported: boolean;
  isRecording: boolean;
  /** True between `flushFinalChunk` start and the next `stopRecording`/retry.
   *  Streams are still alive (so finalize can retry without re-prompting for
   *  consent), but the MediaRecorder has been stopped — UI affordances like
   *  the REC indicator should hide so the wrap-up screen reads as "done". */
  isFinalizing: boolean;
  chunkCount: number;
  screenshotCount: number;
  webcamState: WebcamState;
  webcamStream: MediaStream | null;
  sessionLoaded: boolean;
  /** Non-null when the last getUserMedia call rejected with NotAllowedError
   *  and the Permissions API lets us classify why. Guard uses this to pick
   *  the right remediation copy instead of the generic "Resume Recording"
   *  button, which can't recover from a browser-level block. */
  permissionBlock: PermissionBlock;
  /** AudioContext destination node for capturing system audio in the recording.
   *  Voice hooks should connect their audio output here (in addition to speakers)
   *  so that AI voice responses are included in the screen recording. */
  audioMixer: AudioMixer | null;
  /** Returns the live screen video track so other consumers (e.g. the Gemini
   *  Live walkthrough call) can sample frames without re-prompting the user
   *  with another `getDisplayMedia` permission dialog. Returns null until
   *  recording is active. */
  getScreenVideoTrack: () => MediaStreamTrack | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  retryRecording: () => Promise<boolean>;
  /** Stop the MediaRecorder and await all pending chunk uploads WITHOUT
   *  tearing down streams or marking the segment complete. Call before
   *  /api/assessment/finalize so the final chunk lands before the
   *  assessment flips to COMPLETED (which would reject the upload 400).
   *  Idempotent. */
  flushFinalChunk: () => Promise<void>;
}

/**
 * Classify why a getUserMedia call rejected with NotAllowedError.
 *
 * getUserMedia collapses distinct failure modes into one error. The
 * Permissions API lets us disambiguate: `denied` means site-level block,
 * `prompt` after a rejected request means embargo (Chrome silently
 * auto-rejecting after repeated dismissals). Returns "unknown" for
 * browsers/states where we can't tell.
 */
async function classifyPermissionBlock(
  device: "camera" | "microphone"
): Promise<"site-block" | "embargo" | "unknown"> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      return "unknown";
    }
    const status = await navigator.permissions.query({
      name: device as PermissionName,
    });
    if (status.state === "denied") return "site-block";
    if (status.state === "prompt") return "embargo";
    return "unknown";
  } catch {
    return "unknown";
  }
}

const ScreenRecordingContext =
  createContext<ScreenRecordingContextValue | null>(null);

interface ScreenRecordingProviderProps {
  children: ReactNode;
  assessmentId: string;
  /** Server-computed flag: when true, take the same fake-session path as
   *  the E2E skip flag. Enables demoing the candidate flow in production
   *  without triggering getUserMedia. */
  bypassRecording?: boolean;
}

// Bounded retry for transient upload failures (network errors, 5xx). 4xx
// responses are terminal — retrying a 400 ("Assessment is completed") or 401
// would just hide the real bug, so we surface them on the first attempt.
const UPLOAD_MAX_ATTEMPTS = 3;
const UPLOAD_BACKOFF_MS = [1000, 2000];

function buildUploadFormData(
  assessmentId: string,
  file: Blob,
  type: "video" | "screenshot",
  chunkIndex?: number,
  timestamp?: number,
  segmentId?: string,
  snapshotId?: string
): FormData {
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
  if (segmentId) {
    formData.append("segmentId", segmentId);
  }
  if (snapshotId) {
    formData.append("snapshotId", snapshotId);
  }
  return formData;
}

// Helper function to upload a chunk or screenshot
async function uploadRecordingData(
  assessmentId: string,
  file: Blob,
  type: "video" | "screenshot",
  chunkIndex?: number,
  timestamp?: number,
  segmentId?: string,
  snapshotId?: string
): Promise<boolean> {
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt++) {
    const isLastAttempt = attempt === UPLOAD_MAX_ATTEMPTS;
    try {
      const response = await fetch("/api/recording", {
        method: "POST",
        body: buildUploadFormData(
          assessmentId,
          file,
          type,
          chunkIndex,
          timestamp,
          segmentId,
          snapshotId
        ),
      });

      if (response.ok) return true;

      // 4xx is terminal — don't retry, surface the real cause.
      if (response.status >= 400 && response.status < 500) {
        const body = await response.json().catch(() => null);
        const serverMessage = body?.error ?? "Unknown error";
        logger.error(
          `Upload failed: HTTP ${response.status} — ${serverMessage}`,
          { status: String(response.status), message: serverMessage, type }
        );
        return false;
      }

      // 5xx — retry if we have budget left.
      if (isLastAttempt) {
        const body = await response.json().catch(() => null);
        const serverMessage = body?.error ?? "Unknown error";
        logger.error(
          `Upload failed after ${attempt} attempts: HTTP ${response.status} — ${serverMessage}`,
          { status: String(response.status), message: serverMessage, type }
        );
        return false;
      }
      logger.warn(
        `Upload attempt ${attempt} failed (HTTP ${response.status}), retrying`,
        { type }
      );
    } catch (error) {
      // Network error (fetch threw). Retry if we have budget left.
      if (isLastAttempt) {
        logger.error(`Upload error after ${attempt} attempts`, {
          error: String(error),
          type,
        });
        return false;
      }
      logger.warn(`Upload attempt ${attempt} threw, retrying`, {
        error: String(error),
        type,
      });
    }

    await new Promise((resolve) =>
      setTimeout(resolve, UPLOAD_BACKOFF_MS[attempt - 1] ?? 2000)
    );
  }
  return false;
}

// Helper to manage recording sessions.
//
// Throws on failure instead of returning null so the caller can't silently
// proceed into active-recording state with a missing segment id — that
// masks the underlying failure and causes the next unrelated request to
// look like the culprit.
async function startRecordingSession(
  assessmentId: string
): Promise<{ segmentId: string; segmentIndex: number }> {
  const response = await fetch("/api/recording/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessmentId, action: "start" }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to start recording session (HTTP ${response.status}): ${body || response.statusText}`
    );
  }
  const data = await response.json();
  return { segmentId: data.data.segmentId, segmentIndex: data.data.segmentIndex };
}

async function interruptRecordingSession(
  assessmentId: string,
  segmentId: string
): Promise<void> {
  try {
    await fetch("/api/recording/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId, action: "interrupt", segmentId }),
    });
  } catch {
    // Ignore errors during interrupt
  }
}

async function completeRecordingSession(
  assessmentId: string,
  segmentId: string
): Promise<void> {
  try {
    await fetch("/api/recording/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId, action: "complete", segmentId }),
    });
  } catch {
    // Ignore errors during complete
  }
}

interface SessionStatus {
  hasRecording: boolean;
  activeSegment: {
    id: string;
    segmentIndex: number;
    chunkCount: number;
  } | null;
  totalChunks: number;
  totalScreenshots: number;
}

async function getSessionStatus(
  assessmentId: string
): Promise<SessionStatus | null> {
  try {
    const response = await fetch(
      `/api/recording/session?assessmentId=${assessmentId}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.data;
  } catch {
    return null;
  }
}

// Helper to start a fake recording session for E2E tests.
// Same reasoning as startRecordingSession — throw so failures surface at
// the call site instead of being silently swallowed.
async function startFakeRecordingSession(
  assessmentId: string
): Promise<{ segmentId: string; segmentIndex: number }> {
  const response = await fetch("/api/recording/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessmentId, action: "start", testMode: true }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to start fake recording session (HTTP ${response.status}): ${body || response.statusText}`
    );
  }
  const data = await response.json();
  return { segmentId: data.data.segmentId, segmentIndex: data.data.segmentIndex };
}

export function ScreenRecordingProvider({
  children,
  assessmentId,
  bypassRecording,
}: ScreenRecordingProviderProps) {
  const [state, setState] = useState<ScreenRecordingState>("idle");
  const [permissionState, setPermissionState] =
    useState<ScreenPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [screenshotCount, setScreenshotCount] = useState(0);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [webcamState, setWebcamState] = useState<WebcamState>("idle");
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [permissionBlock, setPermissionBlock] = useState<PermissionBlock>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const compositorRef = useRef<CanvasCompositor | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const webcamCleanupRef = useRef<(() => void) | null>(null);
  const videoRecorderRef = useRef<VideoRecorder | null>(null);
  const audioMixerRef = useRef<AudioMixer | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunkIndexRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const segmentIdRef = useRef<string | null>(null);
  // Tracks in-flight upload promises so `flushFinalChunk` can await them all.
  const pendingUploadsRef = useRef<Set<Promise<unknown>>>(new Set());
  // Set once `flushFinalChunk` has stopped the recorder + awaited uploads, so
  // the subsequent `stopRecording()` teardown doesn't double-stop or re-upload.
  const flushedRef = useRef(false);

  // Wraps a fire-and-forget upload so `flushFinalChunk` can await all
  // in-flight uploads before finalize. Returns the same promise so callers
  // that do await still work.
  const trackUpload = useCallback(
    <T,>(promise: Promise<T>): Promise<T> => {
      pendingUploadsRef.current.add(promise);
      promise.finally(() => {
        pendingUploadsRef.current.delete(promise);
      });
      return promise;
    },
    []
  );

  const isSupported =
    checkScreenCaptureSupport() && checkMediaRecorderSupport();

  const handleStreamStopped = useCallback(() => {
    // Stop video recording and upload final chunk
    if (videoRecorderRef.current) {
      const finalBlob = videoRecorderRef.current.stop();
      if (finalBlob && finalBlob.size > 0) {
        trackUpload(
          uploadRecordingData(
            assessmentId,
            finalBlob,
            "video",
            chunkIndexRef.current,
            startTimeRef.current || Date.now(),
            segmentIdRef.current || undefined
          )
        );
      }
      videoRecorderRef.current = null;
    }

    // Stop compositor
    if (compositorRef.current) {
      compositorRef.current.stop();
      compositorRef.current = null;
    }

    // Stop audio mixer
    if (audioMixerRef.current) {
      disconnectAudioStreamerFromCapture(audioMixerRef.current.systemAudioInput).catch(() => {});
      audioMixerRef.current.stop();
      audioMixerRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    // Stop webcam stream
    if (webcamStreamRef.current) {
      stopWebcamCapture(webcamStreamRef.current);
      webcamStreamRef.current = null;
      setWebcamStream(null);
      setWebcamState("idle");
    }

    // Mark segment as interrupted in database
    if (segmentIdRef.current) {
      interruptRecordingSession(assessmentId, segmentIdRef.current);
      segmentIdRef.current = null;
    }

    setState("stopped");
    setPermissionState("stopped");
    streamRef.current = null;
    // Clear session storage
    sessionStorage.removeItem(`screen-recording-${assessmentId}`);
  }, [assessmentId, trackUpload]);

  const cleanup = useCallback(() => {
    // Stop video recording
    if (videoRecorderRef.current) {
      videoRecorderRef.current.stop();
      videoRecorderRef.current = null;
    }

    // Stop compositor
    if (compositorRef.current) {
      compositorRef.current.stop();
      compositorRef.current = null;
    }

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (webcamCleanupRef.current) {
      webcamCleanupRef.current();
      webcamCleanupRef.current = null;
    }
    if (streamRef.current) {
      stopScreenCapture(streamRef.current);
      streamRef.current = null;
    }
    if (webcamStreamRef.current) {
      stopWebcamCapture(webcamStreamRef.current);
      webcamStreamRef.current = null;
      setWebcamStream(null);
      setWebcamState("idle");
    }
    if (audioMixerRef.current) {
      disconnectAudioStreamerFromCapture(audioMixerRef.current.systemAudioInput).catch(() => {});
      audioMixerRef.current.stop();
      audioMixerRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
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
    setPermissionBlock(null);

    try {
      // Step 1: Request screen capture
      const screenStream = await requestScreenCapture();
      streamRef.current = screenStream;
      cleanupRef.current = onStreamEnded(screenStream, handleStreamStopped);

      // Step 2: Request webcam capture
      setWebcamState("requesting");
      let webcamMediaStream: MediaStream;
      try {
        webcamMediaStream = await requestWebcamCapture();
        webcamStreamRef.current = webcamMediaStream;
        setWebcamStream(webcamMediaStream);
        setWebcamState("active");

        // Listen for webcam disconnection
        webcamCleanupRef.current = onWebcamStreamEnded(
          webcamMediaStream,
          handleStreamStopped
        );
      } catch (webcamErr) {
        // Webcam is mandatory -- clean up screen stream and fail
        stopScreenCapture(screenStream);
        streamRef.current = null;

        // Diagnostic: the catch branch below collapses multiple distinct failure
        // modes (site block, OS block, Chrome embargo, dismissed prompt, extension
        // interference, device in use) into one "NotAllowedError" bucket. Log the
        // raw DOMException details so we can tell them apart.
        logger.error("Webcam request failed", {
          name: webcamErr instanceof DOMException ? webcamErr.name : "non-DOMException",
          message: webcamErr instanceof Error ? webcamErr.message : String(webcamErr),
          constructor: webcamErr?.constructor?.name ?? "unknown",
        });

        if (
          webcamErr instanceof DOMException &&
          (webcamErr.name === "NotAllowedError" ||
            webcamErr.name === "PermissionDeniedError")
        ) {
          setWebcamState("denied");
          setError("Webcam permission was denied. Both screen and webcam recording are required.");
          const reason = await classifyPermissionBlock("camera");
          setPermissionBlock({ device: "camera", reason });
        } else {
          setWebcamState("error");
          setError("Failed to access webcam. Please ensure your camera is connected and not in use by another application.");
        }
        setState("error");
        return false;
      }

      // Step 3: Request microphone for audio recording (mandatory)
      let mixer: AudioMixer | null = null;
      try {
        const micStream = await requestMicrophoneAccess();
        micStreamRef.current = micStream;
        mixer = createAudioMixer(micStream);
        audioMixerRef.current = mixer;
        // Route AI voice responses through the mixer so they're captured in recording.
        // Await so the streamer's analyser → mixer bus connection is live before
        // MediaRecorder starts; otherwise the first AI utterance can race the graph.
        try {
          await connectAudioStreamerToCapture(mixer.systemAudioInput);
        } catch (err) {
          logger.warn("Failed to connect audio streamer to mixer", { err: String(err) });
        }
        logger.info("Audio mixer initialized for recording");
      } catch (micErr) {
        // Microphone is mandatory — clean up screen and webcam streams and fail
        stopScreenCapture(screenStream);
        streamRef.current = null;
        stopWebcamCapture(webcamMediaStream);
        webcamStreamRef.current = null;
        setWebcamStream(null);
        setWebcamState("idle");

        // Same classification as the webcam catch — the error bucket for
        // "NotAllowedError" hides whether this is a site block, a Chrome
        // embargo, or something else, and each needs different copy.
        logger.error("Microphone request failed", {
          name: micErr instanceof DOMException ? micErr.name : "non-DOMException",
          message: micErr instanceof Error ? micErr.message : String(micErr),
          constructor: micErr?.constructor?.name ?? "unknown",
        });

        if (
          micErr instanceof DOMException &&
          (micErr.name === "NotAllowedError" ||
            micErr.name === "PermissionDeniedError")
        ) {
          setError("Microphone permission was denied. Screen, webcam, and microphone are all required.");
          const reason = await classifyPermissionBlock("microphone");
          setPermissionBlock({ device: "microphone", reason });
        } else {
          setError("Failed to access microphone. Please ensure your microphone is connected and not in use by another application.");
        }
        setState("error");
        return false;
      }

      // Step 4: Create composite stream via canvas compositor
      const compositor = new CanvasCompositor({
        webcamWidth: 320,
        webcamHeight: 240,
        padding: 20,
        borderRadius: 16,
        position: "bottom-right",
        frameRate: 5,
      });
      compositorRef.current = compositor;

      const compositeStream = await compositor.createCompositeStream(
        screenStream,
        webcamMediaStream
      );

      // Add audio track to composite stream if mixer is available
      if (mixer?.audioTrack) {
        compositeStream.addTrack(mixer.audioTrack);
        logger.info("Audio track added to composite stream");
      }

      // Initialize start time
      startTimeRef.current = Date.now();

      // Start a new recording segment in the database. If this throws, the
      // outer catch will surface it as a recording error — we deliberately
      // don't continue into active recording without a segment id, because
      // subsequent uploads would be orphaned and the failure would look like
      // it came from the next unrelated request (e.g. /api/call/token).
      const sessionResult = await startRecordingSession(assessmentId);
      segmentIdRef.current = sessionResult.segmentId;
      chunkIndexRef.current = 0;
      setChunkCount(0);
      setScreenshotCount(0);

      // Step 4: Capture best webcam snapshot for profile photo (5 frames over 2s, picks sharpest)
      captureBestWebcamSnapshot(webcamMediaStream, 0.9)
        .then((snapshot) => {
          trackUpload(
            uploadRecordingData(
              assessmentId,
              snapshot,
              "screenshot",
              undefined,
              Date.now(),
              segmentIdRef.current || undefined,
              "webcam-profile"
            )
          );
        })
        .catch((err) => {
          logger.warn("Failed to capture webcam profile snapshot", { err });
        });

      // Step 5: Create and start video recorder with the composite stream
      videoRecorderRef.current = new VideoRecorder(
        {
          videoBitsPerSecond: 1_000_000, // 1 Mbps
          timeslice: 60_000, // 60 second chunks
          screenshotIntervalMs: 30_000, // Screenshot every 30 seconds
        },
        {
          onDataAvailable: (chunk) => {
            // Upload each chunk as it becomes available
            const currentIndex = chunkIndexRef.current;
            chunkIndexRef.current += 1;
            setChunkCount((prev) => prev + 1);

            trackUpload(
              uploadRecordingData(
                assessmentId,
                chunk,
                "video",
                currentIndex,
                startTimeRef.current || Date.now(),
                segmentIdRef.current || undefined
              )
            );
          },
          onScreenshot: (screenshot) => {
            // Upload screenshot
            setScreenshotCount((prev) => prev + 1);
            trackUpload(
              uploadRecordingData(
                assessmentId,
                screenshot,
                "screenshot",
                undefined,
                Date.now(),
                segmentIdRef.current || undefined
              )
            );
          },
          onError: (err) => {
            logger.error("Video recorder error", { err });
          },
        }
      );

      videoRecorderRef.current.start(compositeStream);

      setState("recording");
      setPermissionState("granted");
      sessionStorage.setItem(`screen-recording-${assessmentId}`, "active");
      return true;
    } catch (err) {
      cleanup();

      const errorMessage =
        err instanceof Error ? err.message : "Failed to start screen recording";

      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setPermissionState("denied");
        setError("Screen sharing permission was denied.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setPermissionState("unavailable");
        setError("No screen available to share.");
      } else {
        setError(errorMessage);
      }

      setState("error");
      return false;
    }
  }, [isSupported, cleanup, handleStreamStopped, assessmentId, trackUpload]);

  // Stop the MediaRecorder and await all pending chunk uploads WITHOUT
  // tearing down streams or marking the segment complete. This must run
  // before /api/assessment/finalize — once that endpoint flips status to
  // COMPLETED, /api/recording rejects further uploads with a 400, which
  // drops the final in-flight video chunk (the last seconds of the defense
  // call). Teardown is left for stopRecording() so the caller can leave
  // the streams alive and retry finalize on failure without re-prompting
  // for screen-share consent.
  const flushFinalChunk = useCallback(async (): Promise<void> => {
    if (flushedRef.current) return;
    flushedRef.current = true;
    setIsFinalizing(true);

    const recorder = videoRecorderRef.current;
    if (recorder) {
      // stopAndWait resolves after the final ondataavailable + onstop have
      // fired — so the per-chunk upload (via the onDataAvailable callback)
      // has been enqueued into pendingUploadsRef by the time this awaits.
      const finalBlob = await recorder.stopAndWait();
      videoRecorderRef.current = null;

      if (finalBlob && finalBlob.size > 0) {
        trackUpload(
          uploadRecordingData(
            assessmentId,
            finalBlob,
            "video",
            chunkIndexRef.current,
            startTimeRef.current || Date.now(),
            segmentIdRef.current || undefined
          )
        );
      }
    }

    // Await all in-flight uploads (final chunk + any still-pending earlier
    // chunks/screenshots). allSettled so a single failed upload doesn't
    // reject and block finalize — failures are already logged by uploadRecordingData.
    await Promise.allSettled([...pendingUploadsRef.current]);
  }, [assessmentId, trackUpload]);

  const stopRecording = useCallback(() => {
    // Skip the stop+upload path if flushFinalChunk already ran. This keeps
    // the public API unchanged for callers who call stopRecording on its
    // own (e.g. error paths), but avoids double-stop after flushFinalChunk.
    if (!flushedRef.current && videoRecorderRef.current) {
      const finalBlob = videoRecorderRef.current.stop();
      if (finalBlob && finalBlob.size > 0) {
        trackUpload(
          uploadRecordingData(
            assessmentId,
            finalBlob,
            "video",
            chunkIndexRef.current,
            startTimeRef.current || Date.now(),
            segmentIdRef.current || undefined
          )
        );
      }
      videoRecorderRef.current = null;
    }
    flushedRef.current = false;

    // Mark segment as completed in database
    if (segmentIdRef.current) {
      completeRecordingSession(assessmentId, segmentIdRef.current);
      segmentIdRef.current = null;
    }

    cleanup();
    // "ended" signals deliberate finalization — distinct from "idle" (never started)
    // so the guard doesn't re-prompt for recording consent while the user is
    // navigating away to /results.
    setState("ended");
    setIsFinalizing(false);
    sessionStorage.removeItem(`screen-recording-${assessmentId}`);
  }, [cleanup, assessmentId, trackUpload]);

  const retryRecording = useCallback(async (): Promise<boolean> => {
    setState("idle");
    setPermissionState("prompt");
    setWebcamState("idle");
    setError(null);
    setPermissionBlock(null);
    setIsFinalizing(false);
    return startRecording();
  }, [startRecording]);

  // Check stream status periodically (both screen and webcam)
  useEffect(() => {
    if (state !== "recording") return;

    const interval = setInterval(() => {
      const screenActive = isStreamActive(streamRef.current);
      const webcamActive = isWebcamStreamActive(webcamStreamRef.current);

      if (!screenActive || !webcamActive) {
        handleStreamStopped();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state, handleStreamStopped]);

  // Load session status on mount (for persistence across page reloads/laptop close).
  // Guarded so React Strict Mode's dev-only double-invoke doesn't fire two
  // concurrent POSTs to /api/recording/session — those race on the Recording
  // row's FOR UPDATE lock and the second one crashes with a Prisma transaction
  // timeout, which destabilized the dev server during adjacent /api/call/token
  // requests and caused the first voice call to fail.
  const sessionLoadStartedRef = useRef(false);
  useEffect(() => {
    if (sessionLoadStartedRef.current) return;
    sessionLoadStartedRef.current = true;

    async function loadSession() {
      // In E2E test mode, when screen recording is skipped, or for the
      // designated demo user, auto-start a fake recording session.
      if (bypassRecording || shouldSkipScreenRecording()) {
        try {
          const sessionResult = await startFakeRecordingSession(assessmentId);
          segmentIdRef.current = sessionResult.segmentId;
        } catch (err) {
          logger.error("Failed to start fake recording session", { err: String(err) });
          setError(err instanceof Error ? err.message : "Failed to start fake recording session");
          setState("error");
          setSessionLoaded(true);
          return;
        }
        setState("recording");
        setPermissionState("granted");
        setWebcamState("active");
        sessionStorage.setItem(`screen-recording-${assessmentId}`, "active");
        setSessionLoaded(true);
        return;
      }

      // Primary signal: DB state via getSessionStatus()
      // This is reliable across browser close, crash, incognito, etc.
      const status = await getSessionStatus(assessmentId);
      if (status?.hasRecording) {
        // Update counts from database
        setChunkCount(status.totalChunks);
        setScreenshotCount(status.totalScreenshots);

        // If there was an active segment (recording interrupted mid-stream),
        // mark it as interrupted in the DB then auto-trigger recording.
        if (status.activeSegment) {
          await interruptRecordingSession(
            assessmentId,
            status.activeSegment.id
          );

          // Auto-trigger recording — browser permission dialogs appear immediately
          setState("requesting");
          setSessionLoaded(true);
          const success = await startRecording();
          if (!success) {
            // Permission denied or error — show retry modal via "stopped" state
            setState("stopped");
            setPermissionState("stopped");
          }
          return;
        }

        // DB has a prior completed recording but no interrupted segment —
        // mark as stopped so the guard shows the re-prompt.
        setState("stopped");
        setPermissionState("stopped");
        setSessionLoaded(true);
        return;
      }

      // Fallback: sessionStorage for quick same-session detection
      // Only reached when DB has no prior recording segments.
      // Covers the edge case where recording started but no chunks were
      // uploaded before the stream was lost (so DB has no record yet).
      const wasRecording = sessionStorage.getItem(
        `screen-recording-${assessmentId}`
      );
      if (wasRecording === "active" && state === "idle") {
        setState("stopped");
        setPermissionState("stopped");
      }

      setSessionLoaded(true);
    }

    loadSession();
  }, [assessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const getScreenVideoTrack = useCallback((): MediaStreamTrack | null => {
    const stream = streamRef.current;
    if (!stream) return null;
    const track = stream.getVideoTracks()[0];
    return track && track.readyState === "live" ? track : null;
  }, []);

  const value: ScreenRecordingContextValue = {
    state,
    permissionState,
    error,
    isSupported,
    isRecording: state === "recording",
    isFinalizing,
    chunkCount,
    screenshotCount,
    webcamState,
    webcamStream,
    sessionLoaded,
    permissionBlock,
    audioMixer: audioMixerRef.current,
    getScreenVideoTrack,
    startRecording,
    stopRecording,
    retryRecording,
    flushFinalChunk,
  };

  // Don't render children until session is loaded to avoid flash of content
  if (!sessionLoaded && isSupported) {
    return null;
  }

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
