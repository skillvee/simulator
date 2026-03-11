/**
 * Media Mocks
 *
 * Provides mock implementations for MediaRecorder, AudioContext, and MediaStream.
 * Use these mocks when testing components that use browser media APIs.
 *
 * @see Issue #98: REF-008
 */

import { vi } from "vitest";

/**
 * Mock MediaStream Track
 */
export interface MockMediaStreamTrack {
  kind: "audio" | "video";
  enabled: boolean;
  id: string;
  stop: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
  getSettings: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock MediaStream track.
 */
export function createMockMediaStreamTrack(
  kind: "audio" | "video" = "audio"
): MockMediaStreamTrack {
  return {
    kind,
    enabled: true,
    id: `mock-${kind}-track-${Math.random().toString(36).slice(2)}`,
    stop: vi.fn(),
    clone: vi.fn(),
    getSettings: vi.fn().mockReturnValue({}),
  };
}

/**
 * Mock MediaStream
 */
export interface MockMediaStream {
  active: boolean;
  id: string;
  getTracks: ReturnType<typeof vi.fn>;
  getAudioTracks: ReturnType<typeof vi.fn>;
  getVideoTracks: ReturnType<typeof vi.fn>;
  addTrack: ReturnType<typeof vi.fn>;
  removeTrack: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock MediaStream.
 *
 * @example
 * const stream = createMockMediaStream();
 * expect(stream.active).toBe(true);
 */
export function createMockMediaStream(): MockMediaStream {
  const audioTrack = createMockMediaStreamTrack("audio");
  const videoTrack = createMockMediaStreamTrack("video");

  return {
    active: true,
    id: `mock-stream-${Math.random().toString(36).slice(2)}`,
    getTracks: vi.fn().mockReturnValue([audioTrack, videoTrack]),
    getAudioTracks: vi.fn().mockReturnValue([audioTrack]),
    getVideoTracks: vi.fn().mockReturnValue([videoTrack]),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
  };
}

/**
 * Mock MediaRecorder
 */
export interface MockMediaRecorder {
  state: "inactive" | "recording" | "paused";
  stream: MockMediaStream;
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: ((event: { error: Error }) => void) | null;
  onstart: (() => void) | null;
  onpause: (() => void) | null;
  onresume: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  requestData: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock MediaRecorder.
 *
 * @example
 * const recorder = createMockMediaRecorder();
 * recorder.start();
 * expect(recorder.start).toHaveBeenCalled();
 */
export function createMockMediaRecorder(
  stream?: MockMediaStream
): MockMediaRecorder {
  const mockStream = stream ?? createMockMediaStream();

  const mock: MockMediaRecorder = {
    state: "inactive",
    stream: mockStream,
    mimeType: "video/webm",
    ondataavailable: null,
    onstop: null,
    onerror: null,
    onstart: null,
    onpause: null,
    onresume: null,
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    requestData: vi.fn(),
  };

  return mock;
}

/**
 * Mock AudioNode
 */
export interface MockAudioNode {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock AudioNode.
 */
export function createMockAudioNode(): MockAudioNode {
  const node: MockAudioNode = {
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
  };
  return node;
}

/**
 * Mock AnalyserNode
 */
export interface MockAnalyserNode extends MockAudioNode {
  fftSize: number;
  frequencyBinCount: number;
  getByteFrequencyData: ReturnType<typeof vi.fn>;
  getFloatFrequencyData: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock AnalyserNode.
 */
export function createMockAnalyserNode(): MockAnalyserNode {
  return {
    ...createMockAudioNode(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    getFloatFrequencyData: vi.fn(),
  };
}

/**
 * Mock GainNode
 */
export interface MockGainNode extends MockAudioNode {
  gain: { value: number };
}

/**
 * Creates a mock GainNode.
 */
export function createMockGainNode(): MockGainNode {
  return {
    ...createMockAudioNode(),
    gain: { value: 1 },
  };
}

/**
 * Mock AudioContext
 */
export interface MockAudioContext {
  state: "running" | "suspended" | "closed";
  sampleRate: number;
  destination: MockAudioNode;
  currentTime: number;
  createMediaStreamSource: ReturnType<typeof vi.fn>;
  createAnalyser: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  createOscillator: ReturnType<typeof vi.fn>;
  createBufferSource: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  suspend: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock AudioContext.
 *
 * @example
 * const ctx = createMockAudioContext();
 * expect(ctx.sampleRate).toBe(44100);
 */
export function createMockAudioContext(): MockAudioContext {
  return {
    state: "running",
    sampleRate: 44100,
    destination: createMockAudioNode(),
    currentTime: 0,
    createMediaStreamSource: vi.fn().mockReturnValue(createMockAudioNode()),
    createAnalyser: vi.fn().mockReturnValue(createMockAnalyserNode()),
    createGain: vi.fn().mockReturnValue(createMockGainNode()),
    createOscillator: vi.fn().mockReturnValue(createMockAudioNode()),
    createBufferSource: vi.fn().mockReturnValue(createMockAudioNode()),
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Stored original globals for restoration.
 */
export interface MediaMocksState {
  originalMediaRecorder: typeof MediaRecorder | undefined;
  originalAudioContext: typeof AudioContext | undefined;
  originalMediaStream: typeof MediaStream | undefined;
}

/**
 * Sets up global media mocks (MediaRecorder, AudioContext, MediaStream).
 * Call teardownMediaMocks to restore originals.
 *
 * @example
 * beforeEach(() => {
 *   mocks = setupMediaMocks();
 * });
 * afterEach(() => {
 *   teardownMediaMocks(mocks);
 * });
 */
export function setupMediaMocks(): MediaMocksState {
  const state: MediaMocksState = {
    originalMediaRecorder: global.MediaRecorder,
    originalAudioContext: global.AudioContext,
    originalMediaStream: global.MediaStream,
  };

  // Mock MediaRecorder class
  class MockMediaRecorderClass {
    state: "inactive" | "recording" | "paused" = "inactive";
    stream: MockMediaStream;
    mimeType = "video/webm";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((event: { error: Error }) => void) | null = null;
    onstart: (() => void) | null = null;
    onpause: (() => void) | null = null;
    onresume: (() => void) | null = null;
    start = vi.fn();
    stop = vi.fn();
    pause = vi.fn();
    resume = vi.fn();
    requestData = vi.fn();

    static isTypeSupported = vi.fn().mockReturnValue(true);

    constructor(stream?: MockMediaStream) {
      this.stream = stream ?? createMockMediaStream();
    }
  }

  global.MediaRecorder =
    MockMediaRecorderClass as unknown as typeof MediaRecorder;

  // Mock AudioContext class
  class MockAudioContextClass {
    state: "running" | "suspended" | "closed" = "running";
    sampleRate = 44100;
    destination = createMockAudioNode();
    currentTime = 0;
    createMediaStreamSource = vi.fn().mockReturnValue(createMockAudioNode());
    createAnalyser = vi.fn().mockReturnValue(createMockAnalyserNode());
    createGain = vi.fn().mockReturnValue(createMockGainNode());
    createOscillator = vi.fn().mockReturnValue(createMockAudioNode());
    createBufferSource = vi.fn().mockReturnValue(createMockAudioNode());
    close = vi.fn().mockResolvedValue(undefined);
    resume = vi.fn().mockResolvedValue(undefined);
    suspend = vi.fn().mockResolvedValue(undefined);
  }

  global.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

  // Mock MediaStream class
  class MockMediaStreamClass {
    active = true;
    id = `mock-stream-${Math.random().toString(36).slice(2)}`;
    private audioTrack = createMockMediaStreamTrack("audio");
    private videoTrack = createMockMediaStreamTrack("video");
    getTracks = vi.fn().mockReturnValue([this.audioTrack, this.videoTrack]);
    getAudioTracks = vi.fn().mockReturnValue([this.audioTrack]);
    getVideoTracks = vi.fn().mockReturnValue([this.videoTrack]);
    addTrack = vi.fn();
    removeTrack = vi.fn();
  }

  global.MediaStream = MockMediaStreamClass as unknown as typeof MediaStream;

  return state;
}

/**
 * Tears down global media mocks and restores originals.
 */
export function teardownMediaMocks(state: MediaMocksState): void {
  if (state.originalMediaRecorder) {
    global.MediaRecorder = state.originalMediaRecorder;
  } else {
    // @ts-expect-error - cleaning up mock
    delete global.MediaRecorder;
  }

  if (state.originalAudioContext) {
    global.AudioContext = state.originalAudioContext;
  } else {
    // @ts-expect-error - cleaning up mock
    delete global.AudioContext;
  }

  if (state.originalMediaStream) {
    global.MediaStream = state.originalMediaStream;
  } else {
    // @ts-expect-error - cleaning up mock
    delete global.MediaStream;
  }
}
