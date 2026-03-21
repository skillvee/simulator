import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { RecordingTab } from "./recording-tab";
import type {
  SerializedAssessment,
  SerializedClientError,
  SerializedCandidateEvent,
} from "./types";

const baseAssessment: SerializedAssessment = {
  id: "assess-1",
  userId: "user-1",
  scenarioId: "scenario-1",
  status: "COMPLETED",
  startedAt: "2024-01-15T10:00:00.000Z",
  completedAt: "2024-01-15T11:30:00.000Z",
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-15T11:30:00.000Z",
  supersededBy: null,
  user: { id: "user-1", name: "John Doe", email: "john@example.com" },
  scenario: { id: "scenario-1", name: "Frontend Developer" },
  logs: [],
  apiCalls: [
    {
      id: "api-1",
      requestTimestamp: "2024-01-15T10:05:00.000Z",
      responseTimestamp: "2024-01-15T10:05:02.000Z",
      durationMs: 2000,
      modelVersion: "gemini-3-flash",
      statusCode: 200,
      errorMessage: null,
      stackTrace: null,
      promptTokens: 100,
      responseTokens: 50,
      promptText: "Evaluate the candidate",
      responseText: '{"score": 85}',
      promptType: null,
      promptVersion: null,
      traceId: null,
    },
    {
      id: "api-2",
      requestTimestamp: "2024-01-15T10:10:00.000Z",
      responseTimestamp: null,
      durationMs: null,
      modelVersion: "gemini-3-flash",
      statusCode: 500,
      errorMessage: "Internal error",
      stackTrace: null,
      promptTokens: 50,
      responseTokens: null,
      promptText: "test",
      responseText: null,
      promptType: null,
      promptVersion: null,
      traceId: null,
    },
  ],
  recordings: [],
  conversations: [
    {
      id: "conv-1",
      coworkerId: "cw-1",
      type: "text",
      transcript: [],
      createdAt: "2024-01-15T10:02:00.000Z",
      updatedAt: "2024-01-15T10:02:00.000Z",
      coworker: { id: "cw-1", name: "Sarah HR", role: "HR" },
    },
  ],
  voiceSessions: [
    {
      id: "vs-1",
      coworkerId: "cw-2",
      startTime: "2024-01-15T10:15:00.000Z",
      endTime: "2024-01-15T10:25:00.000Z",
      durationMs: 600000,
      transcript: null,
      connectionEvents: null,
      tokenName: null,
      errorMessage: null,
      coworker: { id: "cw-2", name: "Mike Manager", role: "Manager" },
    },
  ],
};

const clientErrors: SerializedClientError[] = [
  {
    id: "err-1",
    errorType: "UNHANDLED_EXCEPTION",
    message: "Something failed",
    stackTrace: null,
    componentName: "TestComponent",
    url: "/test",
    timestamp: "2024-01-15T10:08:00.000Z",
    metadata: null,
  },
];

const candidateEvents: SerializedCandidateEvent[] = [];

describe("RecordingTab", () => {
  it("shows empty state when no recording exists", () => {
    render(
      <RecordingTab
        assessment={baseAssessment}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    expect(screen.getByTestId("no-recording-state")).toBeInTheDocument();
    expect(screen.getByText("No recording available")).toBeInTheDocument();
  });

  it("renders video player when recording exists", () => {
    const assessmentWithRecording = {
      ...baseAssessment,
      recordings: [
        {
          id: "rec-1",
          type: "screen",
          storageUrl: "https://example.com/video.webm",
          startTime: "2024-01-15T10:00:00.000Z",
          endTime: "2024-01-15T11:30:00.000Z",
          segments: [],
        },
      ],
    };

    render(
      <RecordingTab
        assessment={assessmentWithRecording}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    expect(screen.getByTestId("recording-tab")).toBeInTheDocument();
    const video = screen.getByTestId("recording-video") as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.src).toBe("https://example.com/video.webm");
  });

  it("renders mini-timeline with legend", () => {
    const assessmentWithRecording = {
      ...baseAssessment,
      recordings: [
        {
          id: "rec-1",
          type: "screen",
          storageUrl: "https://example.com/video.webm",
          startTime: "2024-01-15T10:00:00.000Z",
          endTime: "2024-01-15T11:30:00.000Z",
          segments: [],
        },
      ],
    };

    render(
      <RecordingTab
        assessment={assessmentWithRecording}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    expect(screen.getByText("Event Timeline")).toBeInTheDocument();
    // Legend and summary both show these labels
    expect(screen.getAllByText("Errors").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Conversations").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("API Calls").length).toBeGreaterThanOrEqual(1);
  });

  it("shows correct marker counts in summary", () => {
    const assessmentWithRecording = {
      ...baseAssessment,
      recordings: [
        {
          id: "rec-1",
          type: "screen",
          storageUrl: "https://example.com/video.webm",
          startTime: "2024-01-15T10:00:00.000Z",
          endTime: "2024-01-15T11:30:00.000Z",
          segments: [],
        },
      ],
    };

    render(
      <RecordingTab
        assessment={assessmentWithRecording}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    // Summary section has three stat boxes
    const summaryTexts = screen.getByText("Event Summary")
      .closest("div")!;

    // Error count: 1 client error + 1 API error = 2
    // Conversation count: 1 conversation + 1 voice session = 2
    // API call count: 1 non-error API call = 1
    const allTwos = within(summaryTexts).getAllByText("2");
    expect(allTwos).toHaveLength(2); // errors and conversations

    const ones = within(summaryTexts).getAllByText("1");
    expect(ones).toHaveLength(1); // API calls
  });

  it("renders time indicator at 0 initially", () => {
    const assessmentWithRecording = {
      ...baseAssessment,
      recordings: [
        {
          id: "rec-1",
          type: "screen",
          storageUrl: "https://example.com/video.webm",
          startTime: "2024-01-15T10:00:00.000Z",
          endTime: "2024-01-15T11:30:00.000Z",
          segments: [],
        },
      ],
    };

    render(
      <RecordingTab
        assessment={assessmentWithRecording}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    expect(screen.getByTestId("time-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("current-time")).toHaveTextContent("0ms");
  });

  it("renders timeline bar that is clickable", () => {
    const assessmentWithRecording = {
      ...baseAssessment,
      recordings: [
        {
          id: "rec-1",
          type: "screen",
          storageUrl: "https://example.com/video.webm",
          startTime: "2024-01-15T10:00:00.000Z",
          endTime: "2024-01-15T11:30:00.000Z",
          segments: [],
        },
      ],
    };

    render(
      <RecordingTab
        assessment={assessmentWithRecording}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    const timelineBar = screen.getByTestId("timeline-bar");
    expect(timelineBar).toBeInTheDocument();
    expect(timelineBar).toHaveClass("cursor-pointer");
  });

  it("shows markers on timeline when video has loaded metadata", () => {
    const assessmentWithRecording = {
      ...baseAssessment,
      recordings: [
        {
          id: "rec-1",
          type: "screen",
          storageUrl: "https://example.com/video.webm",
          startTime: "2024-01-15T10:00:00.000Z",
          endTime: "2024-01-15T11:30:00.000Z",
          segments: [],
        },
      ],
    };

    render(
      <RecordingTab
        assessment={assessmentWithRecording}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    // Simulate video loading metadata by dispatching event
    const video = screen.getByTestId("recording-video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { value: 5400, writable: true });
    fireEvent.loadedMetadata(video);

    // Should have markers for: 1 client error, 1 API error, 1 conversation, 1 voice session, 1 API call
    const errorMarkers = screen.getAllByTestId("marker-error");
    expect(errorMarkers).toHaveLength(2); // 1 client error + 1 API error

    const conversationMarkers = screen.getAllByTestId("marker-conversation");
    expect(conversationMarkers).toHaveLength(2); // 1 text + 1 voice

    const apiMarkers = screen.getAllByTestId("marker-apiCall");
    expect(apiMarkers).toHaveLength(1); // 1 non-error API call
  });

  it("seeks video when marker is clicked", () => {
    const assessmentWithRecording = {
      ...baseAssessment,
      recordings: [
        {
          id: "rec-1",
          type: "screen",
          storageUrl: "https://example.com/video.webm",
          startTime: "2024-01-15T10:00:00.000Z",
          endTime: "2024-01-15T11:30:00.000Z",
          segments: [],
        },
      ],
    };

    render(
      <RecordingTab
        assessment={assessmentWithRecording}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    const video = screen.getByTestId("recording-video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { value: 5400, writable: true });
    let currentTime = 0;
    Object.defineProperty(video, "currentTime", {
      get: () => currentTime,
      set: (v: number) => { currentTime = v; },
    });
    fireEvent.loadedMetadata(video);

    // Click on the first error marker
    const errorMarkers = screen.getAllByTestId("marker-error");
    fireEvent.click(errorMarkers[0]);

    // Video current time should have been set
    expect(currentTime).toBeGreaterThan(0);
  });

  it("shows tooltip on marker hover", () => {
    const assessmentWithRecording = {
      ...baseAssessment,
      recordings: [
        {
          id: "rec-1",
          type: "screen",
          storageUrl: "https://example.com/video.webm",
          startTime: "2024-01-15T10:00:00.000Z",
          endTime: "2024-01-15T11:30:00.000Z",
          segments: [],
        },
      ],
    };

    render(
      <RecordingTab
        assessment={assessmentWithRecording}
        clientErrors={clientErrors}
        candidateEvents={candidateEvents}
      />
    );

    const video = screen.getByTestId("recording-video") as HTMLVideoElement;
    Object.defineProperty(video, "duration", { value: 5400, writable: true });
    fireEvent.loadedMetadata(video);

    const conversationMarkers = screen.getAllByTestId("marker-conversation");
    fireEvent.mouseEnter(conversationMarkers[0]);

    // Should show the coworker name in tooltip
    expect(screen.getByText("Sarah HR (HR)")).toBeInTheDocument();
  });
});
