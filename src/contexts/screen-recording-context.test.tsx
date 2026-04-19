import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  ScreenRecordingProvider,
  useScreenRecordingContext,
} from "./screen-recording-context";

const mocks = vi.hoisted(() => {
  const onScreenEndedCleanup = vi.fn();
  const onWebcamEndedCleanup = vi.fn();
  const micTrackStop = vi.fn();
  const audioMixerStop = vi.fn();

  return {
    shouldSkipScreenRecording: vi.fn(() => false),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    checkScreenCaptureSupport: vi.fn(() => true),
    checkMediaRecorderSupport: vi.fn(() => true),
    requestScreenCapture: vi.fn(),
    stopScreenCapture: vi.fn(),
    isStreamActive: vi.fn(() => true),
    onStreamEnded: vi.fn(),
    requestWebcamCapture: vi.fn(),
    stopWebcamCapture: vi.fn(),
    isWebcamStreamActive: vi.fn(() => true),
    onWebcamStreamEnded: vi.fn(),
    captureBestWebcamSnapshot: vi.fn(),
    requestMicrophoneAccess: vi.fn(),
    connectAudioStreamerToCapture: vi.fn(),
    disconnectAudioStreamerFromCapture: vi.fn(),
    createAudioMixer: vi.fn(),
    compositorCreateCompositeStream: vi.fn(),
    compositorStop: vi.fn(),
    videoRecorderStart: vi.fn(),
    videoRecorderStop: vi.fn(() => null),
    onScreenEndedCleanup,
    onWebcamEndedCleanup,
    micTrackStop,
    audioMixerStop,
    screenStream: { kind: "screen-stream" },
    webcamStream: { kind: "webcam-stream" },
    micStream: {
      getTracks: () => [{ stop: micTrackStop }],
    },
    compositeStream: {
      addTrack: vi.fn(),
    },
    audioMixer: {
      audioTrack: { kind: "mixed-audio" },
      systemAudioDestination: { kind: "destination" },
      stop: audioMixerStop,
    },
  };
});

vi.mock("@/lib/core", () => ({
  shouldSkipScreenRecording: mocks.shouldSkipScreenRecording,
  createLogger: () => mocks.logger,
}));

vi.mock("@/lib/media/audio-mixer", () => ({
  createAudioMixer: mocks.createAudioMixer,
}));

vi.mock("@/lib/media", () => {
  class MockCanvasCompositor {
    stop = mocks.compositorStop;
    createCompositeStream = mocks.compositorCreateCompositeStream;
  }

  class MockVideoRecorder {
    start = mocks.videoRecorderStart;
    stop = mocks.videoRecorderStop;
  }

  return {
    checkScreenCaptureSupport: mocks.checkScreenCaptureSupport,
    requestScreenCapture: mocks.requestScreenCapture,
    stopScreenCapture: mocks.stopScreenCapture,
    isStreamActive: mocks.isStreamActive,
    onStreamEnded: mocks.onStreamEnded,
    requestWebcamCapture: mocks.requestWebcamCapture,
    stopWebcamCapture: mocks.stopWebcamCapture,
    isWebcamStreamActive: mocks.isWebcamStreamActive,
    onWebcamStreamEnded: mocks.onWebcamStreamEnded,
    captureBestWebcamSnapshot: mocks.captureBestWebcamSnapshot,
    requestMicrophoneAccess: mocks.requestMicrophoneAccess,
    connectAudioStreamerToCapture: mocks.connectAudioStreamerToCapture,
    disconnectAudioStreamerFromCapture:
      mocks.disconnectAudioStreamerFromCapture,
    CanvasCompositor: MockCanvasCompositor,
    VideoRecorder: MockVideoRecorder,
    checkMediaRecorderSupport: mocks.checkMediaRecorderSupport,
  };
});

function TestConsumer() {
  const { startRecording, state, error } = useScreenRecordingContext();

  return (
    <>
      <button onClick={() => void startRecording()}>Start Recording</button>
      <div data-testid="state">{state}</div>
      <div data-testid="error">{error ?? ""}</div>
    </>
  );
}

describe("ScreenRecordingProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.shouldSkipScreenRecording.mockReturnValue(false);
    mocks.checkScreenCaptureSupport.mockReturnValue(true);
    mocks.checkMediaRecorderSupport.mockReturnValue(true);
    mocks.requestScreenCapture.mockResolvedValue(
      mocks.screenStream as unknown as MediaStream
    );
    mocks.requestWebcamCapture.mockResolvedValue(
      mocks.webcamStream as unknown as MediaStream
    );
    mocks.requestMicrophoneAccess.mockResolvedValue(
      mocks.micStream as unknown as MediaStream
    );
    mocks.createAudioMixer.mockReturnValue(mocks.audioMixer);
    mocks.connectAudioStreamerToCapture.mockResolvedValue(undefined);
    mocks.disconnectAudioStreamerFromCapture.mockResolvedValue(undefined);
    mocks.onStreamEnded.mockReturnValue(mocks.onScreenEndedCleanup);
    mocks.onWebcamStreamEnded.mockReturnValue(mocks.onWebcamEndedCleanup);
    mocks.compositorCreateCompositeStream.mockResolvedValue(
      mocks.compositeStream as unknown as MediaStream
    );
    mocks.captureBestWebcamSnapshot.mockResolvedValue(new Blob(["snapshot"]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cleans up acquired media when recording session startup fails", async () => {
    const fetchMock = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url.startsWith("/api/recording/session?")) {
          return {
            ok: true,
            json: async () => ({
              data: {
                hasRecording: false,
                activeSegment: null,
                totalChunks: 0,
                totalScreenshots: 0,
              },
            }),
          } as Response;
        }

        if (url === "/api/recording/session" && init?.method === "POST") {
          return {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            text: async () => "session failed",
          } as Response;
        }

        throw new Error(`Unexpected fetch: ${url}`);
      }
    );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <ScreenRecordingProvider assessmentId="assessment-1">
        <TestConsumer />
      </ScreenRecordingProvider>
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Start Recording" })
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("error");
    });

    expect(mocks.onScreenEndedCleanup).toHaveBeenCalledTimes(1);
    expect(mocks.onWebcamEndedCleanup).toHaveBeenCalledTimes(1);
    expect(mocks.stopScreenCapture).toHaveBeenCalledWith(mocks.screenStream);
    expect(mocks.stopWebcamCapture).toHaveBeenCalledWith(mocks.webcamStream);
    expect(mocks.disconnectAudioStreamerFromCapture).toHaveBeenCalledWith(
      mocks.audioMixer.systemAudioDestination
    );
    expect(mocks.audioMixerStop).toHaveBeenCalledTimes(1);
    expect(mocks.micTrackStop).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Failed to start recording session (HTTP 500): session failed"
    );
  });
});
