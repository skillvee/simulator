import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useVoiceBase } from "./use-voice-base";

const liveMock = vi.hoisted(() => ({
  connect: vi.fn(),
  session: {
    sendClientContent: vi.fn(),
    sendRealtimeInput: vi.fn(),
    close: vi.fn(),
  },
  callbacks: null as null | {
    onopen?: () => void;
    onmessage?: (message: Record<string, unknown>) => void;
  },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    live = {
      connect: liveMock.connect,
    };
  },
  Modality: { AUDIO: "AUDIO" },
}));

vi.mock("@/lib/media", () => ({
  checkAudioSupport: () => true,
  checkMicrophonePermission: () => Promise.resolve("prompt" as const),
  requestMicrophoneAccess: () =>
    Promise.resolve({
      getTracks: () => [{ stop: () => {} }],
    } as MediaStream),
  playAudioChunk: () => Promise.resolve(),
  stopAudioPlayback: () => {},
  createAudioWorkletBlobUrl: () => "blob:test",
}));

vi.mock("@/lib/api/client", () => ({
  buildTracedHeaders: () => ({ "X-Test": "test" }),
}));

vi.mock("@/lib/core", () => ({
  categorizeError: (err: unknown) => ({
    category: "connection",
    userMessage: err instanceof Error ? err.message : String(err),
    isRetryable: false,
    originalError: err,
  }),
  calculateBackoffDelay: () => 1000,
  saveProgress: () => {},
  loadProgress: () => null,
  clearProgress: () => {},
  createLogger: () => ({
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
  }),
}));

describe("useVoiceBase — opening turn", () => {
  const originalAudioContext = global.AudioContext;
  const originalAudioWorkletNode = global.AudioWorkletNode;

  beforeEach(() => {
    vi.clearAllMocks();

    liveMock.callbacks = null;
    liveMock.connect.mockImplementation(async ({ callbacks }) => {
      liveMock.callbacks = callbacks;
      callbacks.onopen?.();
      return liveMock.session;
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          token: "test-token",
        },
      }),
    }) as unknown as typeof fetch;

    class MockAudioContext {
      audioWorklet = {
        addModule: vi.fn().mockResolvedValue(undefined),
      };
      destination = {};
      createMediaStreamSource = vi.fn().mockReturnValue({
        connect: vi.fn(),
      });
      close = vi.fn().mockResolvedValue(undefined);

      constructor(_options?: unknown) {}
    }

    class MockAudioWorkletNode {
      port = { onmessage: null as ((event: MessageEvent) => void) | null };
      connect = vi.fn();
      disconnect = vi.fn();

      constructor(_context: AudioContext, _name: string) {}
    }

    global.AudioContext = MockAudioContext as unknown as typeof AudioContext;
    global.AudioWorkletNode =
      MockAudioWorkletNode as unknown as typeof AudioWorkletNode;
  });

  afterEach(() => {
    if (originalAudioContext) {
      global.AudioContext = originalAudioContext;
    } else {
      // @ts-expect-error test cleanup
      delete global.AudioContext;
    }

    if (originalAudioWorkletNode) {
      global.AudioWorkletNode = originalAudioWorkletNode;
    } else {
      // @ts-expect-error test cleanup
      delete global.AudioWorkletNode;
    }
  });

  it("waits for setupComplete and sends a bare turnComplete opener", async () => {
    const { result } = renderHook(() =>
      useVoiceBase({
        assessmentId: "test-assessment",
        config: {
          tokenEndpoint: "/api/call/token",
          enableSessionRecovery: false,
        },
      })
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(liveMock.session.sendClientContent).not.toHaveBeenCalled();

    await act(async () => {
      liveMock.callbacks?.onmessage?.({ setupComplete: {} });
    });

    expect(liveMock.session.sendClientContent).toHaveBeenCalledTimes(1);
    expect(liveMock.session.sendClientContent).toHaveBeenCalledWith({
      turnComplete: true,
    });
  });
});
