/**
 * ScreenRecordingGuard Tests
 *
 * Tests the guard's modal display logic based on recording state,
 * including auto-start behavior for interrupted sessions.
 *
 * @see Issue #306: US-002
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ScreenRecordingGuard } from "./screen-recording-guard";

// Mock shouldSkipScreenRecording
vi.mock("@/lib/core", () => ({
  shouldSkipScreenRecording: vi.fn(() => false),
}));

// Mock context values
const mockContextValue = {
  state: "idle" as const,
  permissionState: "prompt" as const,
  error: null as string | null,
  isSupported: true,
  isRecording: false,
  chunkCount: 0,
  screenshotCount: 0,
  webcamState: "idle" as const,
  webcamStream: null,
  sessionLoaded: true,
  startRecording: vi.fn().mockResolvedValue(true),
  stopRecording: vi.fn(),
  retryRecording: vi.fn().mockResolvedValue(true),
};

vi.mock("@/contexts/screen-recording-context", () => ({
  useScreenRecordingContext: () => mockContextValue,
}));

describe("ScreenRecordingGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to defaults
    mockContextValue.state = "idle";
    mockContextValue.permissionState = "prompt";
    mockContextValue.error = null;
    mockContextValue.isRecording = false;
    mockContextValue.sessionLoaded = true;
  });

  it("shows initial consent modal for fresh start (idle state)", () => {
    render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    expect(screen.getByText("Recording Notice")).toBeInTheDocument();
    expect(screen.getByText("Accept & Continue")).toBeInTheDocument();
  });

  it("shows stopped modal when state is stopped", () => {
    mockContextValue.state = "stopped";
    mockContextValue.permissionState = "stopped";

    render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    expect(screen.getByText("Recording Stopped")).toBeInTheDocument();
    expect(screen.getByText("Resume Recording")).toBeInTheDocument();
  });

  it("shows stopped modal when state is error (auto-start permission denied)", () => {
    mockContextValue.state = "error";
    mockContextValue.error = "Screen sharing permission was denied.";

    render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    expect(screen.getByText("Recording Stopped")).toBeInTheDocument();
    expect(screen.getByText("Resume Recording")).toBeInTheDocument();
  });

  it("hides all modals when state is requesting (auto-start in progress)", () => {
    mockContextValue.state = "requesting";

    render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    expect(screen.queryByText("Recording Notice")).not.toBeInTheDocument();
    expect(screen.queryByText("Recording Stopped")).not.toBeInTheDocument();
    expect(screen.getByText("Assessment Content")).toBeInTheDocument();
  });

  it("renders children when recording is active", () => {
    mockContextValue.state = "recording";
    mockContextValue.isRecording = true;

    render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    expect(screen.queryByText("Recording Notice")).not.toBeInTheDocument();
    expect(screen.queryByText("Recording Stopped")).not.toBeInTheDocument();
    expect(screen.getByText("Assessment Content")).toBeInTheDocument();
  });

  it("transitions from requesting to recording when auto-start succeeds", async () => {
    mockContextValue.state = "requesting";

    const { rerender } = render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    // No modal during requesting
    expect(screen.queryByText("Recording Notice")).not.toBeInTheDocument();
    expect(screen.queryByText("Recording Stopped")).not.toBeInTheDocument();

    // Simulate successful auto-start
    mockContextValue.state = "recording";
    mockContextValue.isRecording = true;

    rerender(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Assessment Content")).toBeInTheDocument();
      expect(screen.queryByText("Recording Stopped")).not.toBeInTheDocument();
    });
  });

  it("transitions from requesting to error shows retry modal", async () => {
    mockContextValue.state = "requesting";

    const { rerender } = render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    // Simulate permission denied
    mockContextValue.state = "error";
    mockContextValue.error = "Screen sharing permission was denied.";

    rerender(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Recording Stopped")).toBeInTheDocument();
      expect(screen.getByText("Resume Recording")).toBeInTheDocument();
    });
  });

  it("does not show any modal before session is loaded", () => {
    mockContextValue.sessionLoaded = false;

    render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    expect(screen.queryByText("Recording Notice")).not.toBeInTheDocument();
    expect(screen.queryByText("Recording Stopped")).not.toBeInTheDocument();
  });

  it("shows resume modal when DB has prior recording (simulates browser close + reopen)", () => {
    // After browser close, sessionStorage is cleared but DB state (via loadSession)
    // sets state to "stopped" — guard should show resume modal, not initial consent
    mockContextValue.state = "stopped";
    mockContextValue.permissionState = "stopped";
    mockContextValue.sessionLoaded = true;

    render(
      <ScreenRecordingGuard assessmentId="test-id">
        <div>Assessment Content</div>
      </ScreenRecordingGuard>
    );

    expect(screen.getByText("Recording Stopped")).toBeInTheDocument();
    expect(screen.getByText("Resume Recording")).toBeInTheDocument();
    expect(screen.queryByText("Recording Notice")).not.toBeInTheDocument();
  });
});
