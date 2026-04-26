import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FloatingCallBar } from "./floating-call-bar";

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
      getAudioTracks: () => [{ enabled: true }],
    } as MediaStream),
  playAudioChunk: () => Promise.resolve(),
  stopAudioPlayback: () => {},
  createAudioWorkletBlobUrl: () => "blob:test",
  getOutputFrequencyData: () => new Uint8Array(0),
}));

vi.mock("@/lib/sounds", () => ({
  playCallRingSound: () => ({
    stop: vi.fn(),
  }),
}));

vi.mock("@/lib/core", () => ({
  createLogger: () => ({
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
  }),
}));

vi.mock("@/contexts/screen-recording-context", () => ({
  useScreenRecordingContext: () => ({
    getScreenVideoTrack: () => null,
    isRecording: false,
  }),
}));

describe("FloatingCallBar", () => {
  const originalAudioContext = global.AudioContext;
  const originalAudioWorkletNode = global.AudioWorkletNode;
  const originalFetch = global.fetch;

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
          isDefenseCall: false,
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
    global.fetch = originalFetch;

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

  it("sends a bare opening turn after setupComplete", async () => {
    render(
      <FloatingCallBar
        assessmentId="test-assessment"
        coworker={{
          id: "coworker-1",
          name: "Alex Chen",
          role: "Engineering Manager",
          avatarUrl: null,
        }}
        callType="coworker"
        onCallEnd={() => {}}
      />
    );

    await waitFor(() => {
      expect(liveMock.connect).toHaveBeenCalledTimes(1);
    });

    expect(liveMock.session.sendClientContent).not.toHaveBeenCalled();

    liveMock.callbacks?.onmessage?.({ setupComplete: {} });

    await waitFor(() => {
      expect(liveMock.session.sendClientContent).toHaveBeenCalledWith({
        turnComplete: true,
      });
    });
  });
});
