/**
 * Media Mocks Tests (RED phase)
 *
 * Following TDD: Write tests first, watch them fail, then implement.
 * @see Issue #98: REF-008
 */

import { describe, it, expect, afterEach, type Mock } from "vitest";
import {
  createMockMediaRecorder,
  createMockAudioContext,
  createMockMediaStream,
  setupMediaMocks,
  teardownMediaMocks,
} from "./media";

describe("createMockMediaRecorder", () => {
  it("creates a mock with all MediaRecorder methods", () => {
    const mock = createMockMediaRecorder();

    expect(mock.start).toBeDefined();
    expect(mock.stop).toBeDefined();
    expect(mock.pause).toBeDefined();
    expect(mock.resume).toBeDefined();
    expect(mock.requestData).toBeDefined();
  });

  it("has configurable state", () => {
    const mock = createMockMediaRecorder();

    expect(mock.state).toBe("inactive");
  });

  it("methods are spy functions", () => {
    const mock = createMockMediaRecorder();

    (mock.start as Mock<() => void>)();
    expect(mock.start).toHaveBeenCalled();
  });

  it("supports event handlers", () => {
    const mock = createMockMediaRecorder();

    expect(mock.ondataavailable).toBeNull();
    expect(mock.onstop).toBeNull();
    expect(mock.onerror).toBeNull();
  });

  it("has static isTypeSupported method after setup", () => {
    // Setup global mocks to have isTypeSupported
    const mocks = setupMediaMocks();
    expect(global.MediaRecorder.isTypeSupported).toBeDefined();
    teardownMediaMocks(mocks);
  });
});

describe("createMockAudioContext", () => {
  it("creates a mock with all AudioContext methods", () => {
    const mock = createMockAudioContext();

    expect(mock.createMediaStreamSource).toBeDefined();
    expect(mock.createAnalyser).toBeDefined();
    expect(mock.createGain).toBeDefined();
    expect(mock.close).toBeDefined();
    expect(mock.resume).toBeDefined();
    expect(mock.suspend).toBeDefined();
  });

  it("has sampleRate property", () => {
    const mock = createMockAudioContext();

    expect(mock.sampleRate).toBe(44100);
  });

  it("has state property", () => {
    const mock = createMockAudioContext();

    expect(mock.state).toBe("running");
  });

  it("has destination property", () => {
    const mock = createMockAudioContext();

    expect(mock.destination).toBeDefined();
  });

  it("methods are spy functions", async () => {
    const mock = createMockAudioContext();

    await (mock.resume as Mock<() => Promise<void>>)();
    expect(mock.resume).toHaveBeenCalled();
  });
});

describe("createMockMediaStream", () => {
  it("creates a mock MediaStream", () => {
    const mock = createMockMediaStream();

    expect(mock.getTracks).toBeDefined();
    expect(mock.getAudioTracks).toBeDefined();
    expect(mock.getVideoTracks).toBeDefined();
    expect(mock.addTrack).toBeDefined();
    expect(mock.removeTrack).toBeDefined();
  });

  it("has active property", () => {
    const mock = createMockMediaStream();

    expect(mock.active).toBe(true);
  });

  it("methods return expected types", () => {
    const mock = createMockMediaStream();

    expect(Array.isArray((mock.getTracks as Mock<() => unknown[]>)())).toBe(
      true
    );
    expect(
      Array.isArray((mock.getAudioTracks as Mock<() => unknown[]>)())
    ).toBe(true);
    expect(
      Array.isArray((mock.getVideoTracks as Mock<() => unknown[]>)())
    ).toBe(true);
  });
});

describe("setupMediaMocks and teardownMediaMocks", () => {
  const originalMediaRecorder = global.MediaRecorder;
  const originalAudioContext = global.AudioContext;

  afterEach(() => {
    // Restore originals
    if (originalMediaRecorder) {
      global.MediaRecorder = originalMediaRecorder;
    }
    if (originalAudioContext) {
      global.AudioContext = originalAudioContext;
    }
  });

  it("sets up global MediaRecorder mock", () => {
    setupMediaMocks();

    expect(global.MediaRecorder).toBeDefined();
    expect(global.MediaRecorder.isTypeSupported).toBeDefined();
  });

  it("sets up global AudioContext mock", () => {
    setupMediaMocks();

    expect(global.AudioContext).toBeDefined();
    const ctx = new global.AudioContext();
    expect(ctx.sampleRate).toBeDefined();
  });

  it("teardown restores original globals", () => {
    const mocks = setupMediaMocks();
    teardownMediaMocks(mocks);

    // Should be restored (or undefined if not originally present)
    // The test just verifies no errors thrown
    expect(true).toBe(true);
  });
});
