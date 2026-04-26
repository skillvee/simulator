"use client";

import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { buildTracedHeaders } from "@/lib/api/client";
import { createAudioWorkletBlobUrl } from "@/lib/media";
import { LIVE_MODEL } from "./gemini-config";

export interface LiveTokenData extends Record<string, unknown> {
  token: string;
}

interface FetchLiveTokenOptions {
  endpoint: string;
  body: Record<string, unknown>;
}

interface ConnectLiveAudioSessionOptions {
  token: string;
  callbacks: {
    onopen?: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror?: (event: ErrorEvent) => void;
    onclose?: () => void;
  };
}

interface InitializeLiveAudioCaptureOptions {
  stream: MediaStream;
  session: Session;
  onVolume?: (volume: number) => void;
  onReady?: () => void;
  onError?: (context: string, err: unknown) => void;
}

interface InitializeLiveVideoCaptureOptions {
  /** Live screen track (ideally tapped from the existing recording stream so
   *  we don't re-prompt the user). The helper wraps it in a fresh
   *  `MediaStream` for an internal `<video>` element. */
  videoTrack: MediaStreamTrack;
  session: Session;
  /** Frames per second to send. Defaults to 1 fps — costs ~$0.005/min and is
   *  plenty for a narrated walkthrough. */
  fps?: number;
  /** Maximum width of the encoded JPEG. Wider screens get downscaled. */
  maxWidth?: number;
  /** JPEG quality, 0-1. */
  jpegQuality?: number;
  /** Hard cap on total frames sent in a single session. Used as a cost ceiling. */
  maxFrames?: number;
  /** Fired whenever a frame is sent to the Live API. */
  onFrameSent?: (count: number) => void;
  /** Fired if frame extraction or send fails (does NOT tear down the call). */
  onError?: (context: string, err: unknown) => void;
  /** Fired when the underlying screen track ends (user clicked "Stop sharing"
   *  in the browser bar). Lets the caller drop its controller ref so a new
   *  track can be attached on resume. */
  onEnded?: () => void;
}

export interface LiveVideoCaptureController {
  /** Stop sampling and tear down the offscreen video element. */
  stop: () => void;
  /** Total frames sent so far. */
  framesSent: () => number;
}

interface HandleLiveServerMessageOptions {
  onSetupComplete?: () => void;
  onAudioChunk?: (audioData: string) => void;
  onInputTranscription?: (text: string) => void;
  onOutputTranscription?: (text: string) => void;
  onTurnComplete?: () => void;
  onInterrupted?: () => void;
}

interface DisconnectLiveAudioResourcesOptions {
  workletNode: AudioWorkletNode | null;
  audioContext: AudioContext | null;
  mediaStream: MediaStream | null;
  session: Session | null;
  onPlaybackStopped?: () => void;
}

interface CreateOpeningTurnControllerOptions {
  getSession: () => Session | null;
  onOpeningTurnSent?: () => void;
  onError?: (context: string, err: unknown) => void;
}

export interface OpeningTurnController {
  markOpeningTurnPending: () => void;
  markSetupComplete: () => void;
  markAudioCaptureReady: () => void;
  reset: () => void;
}

async function parseResponseBody(
  response: Response
): Promise<Record<string, unknown>> {
  try {
    const data = (await response.json()) as Record<string, unknown>;
    return data;
  } catch {
    return {};
  }
}

export async function fetchLiveToken<T extends LiveTokenData>({
  endpoint,
  body,
}: FetchLiveTokenOptions): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: buildTracedHeaders(undefined, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    const error =
      typeof payload.error === "string" ? payload.error : "Failed to get token";
    throw new Error(error);
  }

  return payload.data as T;
}

export async function connectLiveAudioSession({
  token,
  callbacks,
}: ConnectLiveAudioSessionOptions): Promise<Session> {
  const ai = new GoogleGenAI({
    apiKey: token,
    httpOptions: {
      apiVersion: "v1alpha",
      baseUrl: "https://generativelanguage.googleapis.com",
    },
  });

  return ai.live.connect({
    model: LIVE_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
    callbacks,
  });
}

export async function initializeLiveAudioCapture({
  stream,
  session,
  onVolume,
  onReady,
  onError,
}: InitializeLiveAudioCaptureOptions): Promise<{
  audioContext: AudioContext;
  workletNode: AudioWorkletNode;
}> {
  const audioContext = new AudioContext({ sampleRate: 16000 });

  const workletUrl = createAudioWorkletBlobUrl();
  await audioContext.audioWorklet.addModule(workletUrl);
  URL.revokeObjectURL(workletUrl);

  const source = audioContext.createMediaStreamSource(stream);
  const workletNode = new AudioWorkletNode(audioContext, "audio-processor");

  workletNode.port.onmessage = (event) => {
    if (event.data.type === "volume") {
      onVolume?.(event.data.volume as number);
      return;
    }

    if (event.data.type !== "audio") {
      return;
    }

    const audioData = new Uint8Array(event.data.data as ArrayBuffer);
    const base64 = btoa(String.fromCharCode(...audioData));

    try {
      session.sendRealtimeInput({
        audio: {
          data: base64,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (err) {
      onError?.("Error sending audio", err);
    }
  };

  source.connect(workletNode);
  workletNode.connect(audioContext.destination);

  onReady?.();

  return { audioContext, workletNode };
}

/**
 * Stream the candidate's screen frames to the Gemini Live session at low fps
 * during the walkthrough call. The model sees the screen and can ask
 * screen-anchored questions ("what's that file?", "scroll to line 40").
 *
 * Implementation notes:
 *   - Frames go out at `fps` Hz (default 1 fps). Higher rates are wasteful at
 *     this resolution and balloon costs without improving coherence.
 *   - The video track is wrapped in a fresh `MediaStream` so a stale ref
 *     doesn't bleed in. The `<video>` element is appended to the DOM
 *     off-screen because some browsers won't decode frames otherwise.
 *   - JPEG was picked over PNG: image content (UI, code, slides) compresses
 *     well and bandwidth matters more than perfect fidelity. Quality 0.7 is
 *     visually fine for code/charts.
 *   - Errors are swallowed (only logged via `onError`) — the audio call must
 *     keep flowing if a single frame fails. Callers should treat video
 *     dropping as a soft degrade, not a session kill.
 */
export async function initializeLiveVideoCapture({
  videoTrack,
  session,
  fps = 1,
  maxWidth = 1280,
  jpegQuality = 0.7,
  maxFrames = 1500,
  onFrameSent,
  onError,
  onEnded,
}: InitializeLiveVideoCaptureOptions): Promise<LiveVideoCaptureController> {
  if (typeof document === "undefined") {
    throw new Error("initializeLiveVideoCapture requires a DOM environment");
  }

  const stream = new MediaStream([videoTrack]);

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;
  // Position off-screen but in the DOM — Safari pauses decoding on detached
  // elements, which would freeze frame capture.
  video.style.position = "fixed";
  video.style.left = "-10000px";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.pointerEvents = "none";
  video.setAttribute("aria-hidden", "true");
  document.body.appendChild(video);

  // Wait for the first frame so videoWidth/Height are populated.
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (ok: boolean, err?: unknown) => {
      if (settled) return;
      settled = true;
      if (ok) resolve();
      else reject(err ?? new Error("Video failed to load"));
    };
    video.onloadedmetadata = () => {
      void video.play().then(() => finish(true)).catch((err) => finish(false, err));
    };
    video.onerror = (err) => finish(false, err);
    // Safety timeout — if metadata never fires, give up rather than hang.
    setTimeout(() => finish(false, new Error("video metadata timeout")), 5000);
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    document.body.removeChild(video);
    throw new Error("Canvas 2D context unavailable");
  }

  let framesSent = 0;
  let stopped = false;
  let inFlight = false;

  const captureAndSend = async () => {
    if (stopped || inFlight) return;
    if (framesSent >= maxFrames) {
      onError?.("frame cap reached", new Error(`Hit maxFrames=${maxFrames}`));
      stop();
      return;
    }
    if (video.readyState < 2 /* HAVE_CURRENT_DATA */) return;

    inFlight = true;
    try {
      const sourceWidth = video.videoWidth || maxWidth;
      const sourceHeight = video.videoHeight || Math.round(maxWidth * 0.625);
      const scale = Math.min(1, maxWidth / sourceWidth);
      const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
      const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

      if (canvas.width !== targetWidth) canvas.width = targetWidth;
      if (canvas.height !== targetHeight) canvas.height = targetHeight;

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
      // dataUrl format: "data:image/jpeg;base64,XXXX..." — Gemini Live wants
      // the base64 chunk on its own.
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx === -1) {
        throw new Error("Unexpected dataURL format");
      }
      const base64 = dataUrl.slice(commaIdx + 1);

      session.sendRealtimeInput({
        video: { data: base64, mimeType: "image/jpeg" },
      });

      framesSent += 1;
      onFrameSent?.(framesSent);
    } catch (err) {
      onError?.("Error sending video frame", err);
    } finally {
      inFlight = false;
    }
  };

  const intervalMs = Math.max(100, Math.round(1000 / fps));
  const handle = setInterval(() => {
    void captureAndSend();
  }, intervalMs);

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(handle);
    try {
      video.pause();
    } catch {
      /* no-op */
    }
    video.srcObject = null;
    if (video.parentNode) video.parentNode.removeChild(video);
  }

  // If the underlying screen-share stops (user clicks "Stop sharing" in the
  // browser bar), kill capture immediately so we don't keep blasting blank
  // frames. The audio session is unaffected.
  videoTrack.addEventListener("ended", () => {
    stop();
    onEnded?.();
  });

  return {
    stop,
    framesSent: () => framesSent,
  };
}

export function handleLiveServerMessage(
  message: LiveServerMessage,
  {
    onSetupComplete,
    onAudioChunk,
    onInputTranscription,
    onOutputTranscription,
    onTurnComplete,
    onInterrupted,
  }: HandleLiveServerMessageOptions
): void {
  if (message.setupComplete) {
    onSetupComplete?.();
  }

  const modelParts = message.serverContent?.modelTurn?.parts;
  if (modelParts) {
    for (const part of modelParts) {
      if (part.inlineData?.data) {
        onAudioChunk?.(part.inlineData.data);
      }
    }
  }

  const inputText = message.serverContent?.inputTranscription?.text;
  if (inputText?.trim()) {
    onInputTranscription?.(inputText);
  }

  const outputText = message.serverContent?.outputTranscription?.text;
  if (outputText?.trim()) {
    onOutputTranscription?.(outputText);
  }

  if (message.serverContent?.turnComplete) {
    onTurnComplete?.();
  }

  if (message.serverContent?.interrupted) {
    onInterrupted?.();
  }
}

export function disconnectLiveAudioResources({
  workletNode,
  audioContext,
  mediaStream,
  session,
  onPlaybackStopped,
}: DisconnectLiveAudioResourcesOptions): void {
  workletNode?.disconnect();
  void audioContext?.close();
  mediaStream?.getTracks().forEach((track) => track.stop());
  session?.close();
  onPlaybackStopped?.();
}

export function createOpeningTurnController({
  getSession,
  onOpeningTurnSent,
  onError,
}: CreateOpeningTurnControllerOptions): OpeningTurnController {
  let openingTurnPending = false;
  let sessionSetupComplete = false;
  let audioCaptureReady = false;

  const maybeStartOpeningTurn = () => {
    if (!openingTurnPending || !sessionSetupComplete || !audioCaptureReady) {
      return;
    }

    const session = getSession();
    if (!session) {
      return;
    }

    openingTurnPending = false;
    onOpeningTurnSent?.();

    try {
      session.sendClientContent({ turnComplete: true });
    } catch (err) {
      openingTurnPending = true;
      onError?.("Error sending opening turn", err);
    }
  };

  return {
    markOpeningTurnPending() {
      openingTurnPending = true;
      sessionSetupComplete = false;
      audioCaptureReady = false;
    },
    markSetupComplete() {
      sessionSetupComplete = true;
      maybeStartOpeningTurn();
    },
    markAudioCaptureReady() {
      audioCaptureReady = true;
      maybeStartOpeningTurn();
    },
    reset() {
      openingTurnPending = false;
      sessionSetupComplete = false;
      audioCaptureReady = false;
    },
  };
}
