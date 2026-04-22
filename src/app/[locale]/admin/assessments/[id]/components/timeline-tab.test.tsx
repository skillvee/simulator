import { describe, it, expect } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { TimelineTab } from "./timeline-tab";
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
  logs: [
    {
      id: "log-1",
      eventType: "STARTED",
      timestamp: "2024-01-15T10:00:00.000Z",
      durationMs: null,
      metadata: null,
    },
    {
      id: "log-2",
      eventType: "COMPLETED",
      timestamp: "2024-01-15T11:30:00.000Z",
      durationMs: 5400000,
      metadata: null,
    },
  ],
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
  ],
  recordings: [],
  conversations: [
    {
      id: "conv-1",
      coworkerId: "coworker-1",
      type: "text",
      transcript: [
        { role: "user", parts: [{ text: "Hello" }], timestamp: "2024-01-15T10:10:00.000Z" },
        { role: "model", parts: [{ text: "Hi there" }], timestamp: "2024-01-15T10:10:05.000Z" },
      ],
      createdAt: "2024-01-15T10:10:00.000Z",
      updatedAt: "2024-01-15T10:10:05.000Z",
      coworker: { id: "coworker-1", name: "Sarah", role: "HR Manager" },
    },
  ],
  voiceSessions: [
    {
      id: "voice-1",
      coworkerId: "coworker-2",
      startTime: "2024-01-15T10:20:00.000Z",
      endTime: "2024-01-15T10:25:00.000Z",
      durationMs: 300000,
      transcript: [],
      connectionEvents: [],
      tokenName: null,
      errorMessage: null,
      coworker: { id: "coworker-2", name: "Mike", role: "Tech Lead" },
    },
  ],
};

const sampleClientErrors: SerializedClientError[] = [
  {
    id: "cerr-1",
    errorType: "UNHANDLED_EXCEPTION",
    message: "Cannot read property 'foo' of undefined",
    stackTrace: "TypeError: Cannot read property 'foo'\n  at bar.js:10",
    componentName: "CodeEditor",
    url: "/assessments/test/work",
    timestamp: "2024-01-15T10:15:00.000Z",
    metadata: null,
  },
];

const sampleCandidateEvents: SerializedCandidateEvent[] = [
  {
    id: "cevt-1",
    eventType: "TAB_SWITCH",
    timestamp: "2024-01-15T10:12:00.000Z",
    metadata: { from: "editor", to: "browser" },
  },
];

describe("TimelineTab", () => {
  it("renders all event types in chronological order", () => {
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={sampleClientErrors}
        candidateEvents={sampleCandidateEvents}
      />
    );

    const tab = screen.getByTestId("timeline-tab");
    // Should include all event sources
    expect(within(tab).getByText("Assessment Started")).toBeInTheDocument();
    expect(within(tab).getByText("Assessment Completed")).toBeInTheDocument();
    expect(within(tab).getByText(/API Call —/)).toBeInTheDocument();
    expect(within(tab).getByText(/Chat with Sarah/)).toBeInTheDocument();
    expect(within(tab).getByText(/Voice call with Mike/)).toBeInTheDocument();
    expect(within(tab).getByText(/Cannot read property/)).toBeInTheDocument();
    expect(within(tab).getByText("Tab Switch")).toBeInTheDocument();
  });

  it("shows event count summary", () => {
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={sampleClientErrors}
        candidateEvents={sampleCandidateEvents}
      />
    );

    // Total: 2 logs + 1 api + 1 conv + 1 voice + 1 error + 1 candidate = 7
    expect(screen.getByText("UNIFIED TIMELINE (7 events)")).toBeInTheDocument();
  });

  it("shows color-coded type badges", () => {
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={sampleClientErrors}
        candidateEvents={sampleCandidateEvents}
      />
    );

    const tab = screen.getByTestId("timeline-tab");
    // Check category badges in summary
    expect(within(tab).getByText("2 System")).toBeInTheDocument();
    expect(within(tab).getByText("2 Conversations")).toBeInTheDocument();
    expect(within(tab).getByText("1 API Calls")).toBeInTheDocument();
    expect(within(tab).getByText("1 Errors")).toBeInTheDocument();
    expect(within(tab).getByText("1 Candidate Events")).toBeInTheDocument();
  });

  it("shows elapsed time markers for long assessments", () => {
    // Assessment is 90 minutes, should have markers at 5, 10, 15, ... 85 min
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={[]}
        candidateEvents={[]}
      />
    );

    // Should have at least the 5 min marker
    expect(screen.getByText("5 min")).toBeInTheDocument();
  });

  it("shows duration gap markers for gaps > 30s", () => {
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={[]}
        candidateEvents={[]}
      />
    );

    // Between log-1 (10:00:00) and api-1 (10:05:00) there's a 5-minute gap
    const durationMarker = screen.getByTestId("duration-marker-api-1");
    expect(durationMarker).toBeInTheDocument();
    expect(durationMarker).toHaveTextContent("+5m");
  });

  it("expands client error details when clicked", () => {
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={sampleClientErrors}
        candidateEvents={[]}
      />
    );

    const errorEvent = screen.getByTestId("timeline-event-cerr-cerr-1");
    const clickableDiv = errorEvent.querySelector('[class*="cursor-pointer"]');
    expect(clickableDiv).toBeInTheDocument();
    fireEvent.click(clickableDiv!);

    expect(
      screen.getByTestId("client-error-details-cerr-cerr-1")
    ).toBeInTheDocument();
    expect(screen.getByText("UNHANDLED_EXCEPTION")).toBeInTheDocument();
    expect(screen.getByText("Component: CodeEditor")).toBeInTheDocument();
  });

  it("expands candidate event metadata when clicked", () => {
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={[]}
        candidateEvents={sampleCandidateEvents}
      />
    );

    const candEvent = screen.getByTestId("timeline-event-cevt-cevt-1");
    const clickableDiv = candEvent.querySelector('[class*="cursor-pointer"]');
    expect(clickableDiv).toBeInTheDocument();
    fireEvent.click(clickableDiv!);

    expect(
      screen.getByTestId("candidate-event-details-cevt-cevt-1")
    ).toBeInTheDocument();
  });

  it("shows empty state when no events exist", () => {
    const emptyAssessment = {
      ...baseAssessment,
      logs: [],
      apiCalls: [],
      conversations: [],
      voiceSessions: [],
    };
    render(
      <TimelineTab
        assessment={emptyAssessment}
        clientErrors={[]}
        candidateEvents={[]}
      />
    );

    expect(
      screen.getByText("No events recorded for this assessment")
    ).toBeInTheDocument();
  });

  it("shows conversation message count", () => {
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={[]}
        candidateEvents={[]}
      />
    );

    expect(screen.getByText(/Chat with Sarah.*2 messages/)).toBeInTheDocument();
  });

  it("shows voice session duration", () => {
    render(
      <TimelineTab
        assessment={baseAssessment}
        clientErrors={[]}
        candidateEvents={[]}
      />
    );

    // Voice session has 300000ms = 5m duration
    const voiceEvent = screen.getByTestId("timeline-event-voice-voice-1");
    expect(within(voiceEvent).getByText("5m")).toBeInTheDocument();
  });
});
