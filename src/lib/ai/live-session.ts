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
    onmessage?: (message: LiveServerMessage) => void;
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
