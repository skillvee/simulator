import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AssessmentTimelinePage from "./page";
import { AssessmentTimelineClient, formatDuration } from "./client";

// Mock next/navigation
const mockNotFound = vi.fn();
const mockRouterPush = vi.fn();
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NOT_FOUND");
  },
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock admin check - must match exact import path used by page.tsx
vi.mock("@/lib/core/admin", () => ({
  requireAdmin: vi.fn(),
}));

// Mock the database
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findUnique: vi.fn(),
    },
  },
}));

// Import after mock to get the mocked version
import { db } from "@/server/db";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockAssessment = {
  id: "assess-1",
  userId: "user-1",
  scenarioId: "scenario-1",
  status: "COMPLETED" as const,
  startedAt: new Date("2024-01-15T10:00:00Z"),
  completedAt: new Date("2024-01-15T11:30:00Z"),
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-01-15T11:30:00Z"),
  supersededBy: null,
  user: { id: "user-1", name: "John Doe", email: "john@example.com" },
  scenario: { id: "scenario-1", name: "Frontend Developer" },
  logs: [
    {
      id: "log-1",
      eventType: "STARTED" as const,
      timestamp: new Date("2024-01-15T10:00:00Z"),
      durationMs: null,
      metadata: null,
    },
    {
      id: "log-2",
      eventType: "PROMPT_SENT" as const,
      timestamp: new Date("2024-01-15T10:00:05Z"),
      durationMs: 5000,
      metadata: null,
    },
    {
      id: "log-3",
      eventType: "RESPONSE_RECEIVED" as const,
      timestamp: new Date("2024-01-15T10:00:07Z"),
      durationMs: 2000,
      metadata: null,
    },
    {
      id: "log-4",
      eventType: "COMPLETED" as const,
      timestamp: new Date("2024-01-15T11:30:00Z"),
      durationMs: 5400000,
      metadata: null,
    },
  ],
  apiCalls: [
    {
      id: "api-1",
      requestTimestamp: new Date("2024-01-15T10:00:06Z"),
      responseTimestamp: new Date("2024-01-15T10:00:07Z"),
      durationMs: 1000,
      modelVersion: "gemini-3-flash-preview",
      statusCode: 200,
      errorMessage: null,
      stackTrace: null,
      promptTokens: 100,
      responseTokens: 50,
      promptText: "You are a helpful assistant evaluating a candidate.",
      responseText: '{"result": "success", "score": 85}',
    },
  ],
  recordings: [
    {
      id: "rec-1",
      type: "screen",
      storageUrl: "https://storage.example.com/video.webm",
      startTime: new Date("2024-01-15T10:00:00Z"),
      endTime: new Date("2024-01-15T11:30:00Z"),
    },
  ],
};

const mockAssessmentWithError = {
  ...mockAssessment,
  id: "assess-2",
  status: "WORKING" as const,
  completedAt: null,
  logs: [
    {
      id: "log-1",
      eventType: "STARTED" as const,
      timestamp: new Date("2024-01-16T09:00:00Z"),
      durationMs: null,
      metadata: null,
    },
    {
      id: "log-2",
      eventType: "ERROR" as const,
      timestamp: new Date("2024-01-16T09:30:00Z"),
      durationMs: 1800000,
      metadata: { error: "Connection timeout" },
    },
  ],
  apiCalls: [
    {
      id: "api-2",
      requestTimestamp: new Date("2024-01-16T09:10:00Z"),
      responseTimestamp: null,
      durationMs: null,
      modelVersion: "gemini-3-flash-preview",
      statusCode: null,
      errorMessage: "Connection timeout",
      stackTrace: "Error: Connection timeout\n  at fetchData (api.js:42)",
      promptTokens: null,
      responseTokens: null,
      promptText: "You are a helpful assistant evaluating a candidate.",
      responseText: null,
    },
  ],
  recordings: [],
};

describe("AssessmentTimelinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches assessment with correct includes", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockAssessment);

    await AssessmentTimelinePage({
      params: Promise.resolve({ id: "assess-1" }),
    });

    expect(db.assessment.findUnique).toHaveBeenCalledWith({
      where: { id: "assess-1" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        scenario: { select: { id: true, name: true } },
        logs: {
          orderBy: { timestamp: "asc" },
          select: {
            id: true,
            eventType: true,
            timestamp: true,
            durationMs: true,
            metadata: true,
          },
        },
        apiCalls: {
          orderBy: { requestTimestamp: "asc" },
          select: {
            id: true,
            requestTimestamp: true,
            responseTimestamp: true,
            durationMs: true,
            modelVersion: true,
            statusCode: true,
            errorMessage: true,
            stackTrace: true,
            promptTokens: true,
            responseTokens: true,
            promptText: true,
            responseText: true,
          },
        },
        recordings: {
          select: {
            id: true,
            type: true,
            storageUrl: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
  });

  it("calls notFound when assessment does not exist", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(null);

    await expect(
      AssessmentTimelinePage({
        params: Promise.resolve({ id: "nonexistent" }),
      })
    ).rejects.toThrow("NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("serializes dates to strings", async () => {
    (db.assessment.findUnique as Mock).mockResolvedValue(mockAssessment);

    const result = await AssessmentTimelinePage({
      params: Promise.resolve({ id: "assess-1" }),
    });

    const assessment = result.props.assessment;
    expect(typeof assessment.createdAt).toBe("string");
    expect(typeof assessment.startedAt).toBe("string");
    expect(typeof assessment.logs[0].timestamp).toBe("string");
    expect(typeof assessment.apiCalls[0].requestTimestamp).toBe("string");
    expect(typeof assessment.recordings[0].startTime).toBe("string");
  });
});

describe("AssessmentTimelineClient", () => {
  const serializedAssessment = {
    ...mockAssessment,
    startedAt: mockAssessment.startedAt.toISOString(),
    completedAt: mockAssessment.completedAt?.toISOString() ?? null,
    createdAt: mockAssessment.createdAt.toISOString(),
    updatedAt: mockAssessment.updatedAt.toISOString(),
    logs: mockAssessment.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    apiCalls: mockAssessment.apiCalls.map((call) => ({
      ...call,
      requestTimestamp: call.requestTimestamp.toISOString(),
      responseTimestamp: call.responseTimestamp?.toISOString() ?? null,
    })),
    recordings: mockAssessment.recordings.map((rec) => ({
      ...rec,
      startTime: rec.startTime.toISOString(),
      endTime: rec.endTime?.toISOString() ?? null,
    })),
  };

  const serializedErrorAssessment = {
    ...mockAssessmentWithError,
    startedAt: mockAssessmentWithError.startedAt.toISOString(),
    completedAt: null,
    createdAt: mockAssessmentWithError.createdAt.toISOString(),
    updatedAt: mockAssessmentWithError.updatedAt.toISOString(),
    logs: mockAssessmentWithError.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    apiCalls: mockAssessmentWithError.apiCalls.map((call) => ({
      ...call,
      requestTimestamp: call.requestTimestamp.toISOString(),
      responseTimestamp: null,
    })),
    recordings: [],
  };

  describe("Page Header", () => {
    it("renders the page title", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      expect(screen.getByText("Assessment Timeline")).toBeInTheDocument();
    });

    it("renders back link to assessments list", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      const backLink = screen.getByTestId("back-link");
      expect(backLink).toHaveAttribute("href", "/admin/assessments");
    });
  });

  describe("Candidate Info Section", () => {
    it("displays candidate name", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      expect(screen.getByTestId("candidate-name")).toHaveTextContent(
        "John Doe"
      );
    });

    it("displays candidate email", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      expect(screen.getByTestId("candidate-email")).toHaveTextContent(
        "john@example.com"
      );
    });

    it("displays completion date", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      const completionDate = screen.getByTestId("completion-date");
      expect(completionDate).toBeInTheDocument();
      expect(completionDate).not.toHaveTextContent("In Progress");
    });

    it("shows 'In Progress' when not completed", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );
      expect(screen.getByTestId("completion-date")).toHaveTextContent(
        "In Progress"
      );
    });

    it("shows 'Anonymous' when name is null", () => {
      const anonymousAssessment = {
        ...serializedAssessment,
        user: { ...serializedAssessment.user, name: null },
      };
      render(<AssessmentTimelineClient assessment={anonymousAssessment} />);
      expect(screen.getByTestId("candidate-name")).toHaveTextContent(
        "Anonymous"
      );
    });
  });

  describe("Total Duration Card", () => {
    it("displays total duration prominently", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      expect(screen.getByTestId("total-duration")).toHaveTextContent("90m");
    });

    it("shows 'In Progress' when no completion time", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );
      expect(screen.getByTestId("total-duration")).toHaveTextContent(
        "In Progress"
      );
    });

    it("displays status badge", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      expect(screen.getByTestId("status-badge")).toHaveTextContent("COMPLETED");
    });

    it("shows error indicator when assessment has errors", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );
      expect(screen.getByText("HAS ERRORS")).toBeInTheDocument();
    });

    it("has red styling when assessment has errors", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );
      const card = screen.getByTestId("total-duration-card");
      expect(card).toHaveClass("border-red-500");
    });
  });

  describe("Video Recording Link", () => {
    it("displays video recording link when recording exists", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      expect(screen.getByTestId("video-recording-link")).toBeInTheDocument();
    });

    it("has correct recording URL", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      const button = screen.getByTestId("view-recording-button");
      expect(button).toHaveAttribute(
        "href",
        "https://storage.example.com/video.webm"
      );
    });

    it("does not display recording link when no recording", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );
      expect(
        screen.queryByTestId("video-recording-link")
      ).not.toBeInTheDocument();
    });
  });

  describe("Assessment Info Section", () => {
    it("displays assessment ID", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      const info = screen.getByTestId("assessment-info");
      expect(within(info).getByText("assess-1")).toBeInTheDocument();
    });

    it("displays scenario name", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      const info = screen.getByTestId("assessment-info");
      expect(within(info).getByText("Frontend Developer")).toBeInTheDocument();
    });

    it("displays event count", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      const info = screen.getByTestId("assessment-info");
      // 4 logs + 1 API call = 5 events
      expect(within(info).getByText("5 total")).toBeInTheDocument();
    });
  });

  describe("Timeline Events", () => {
    it("renders all timeline events", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      const timeline = screen.getByTestId("timeline");
      // 4 logs + 1 API call = 5 events
      expect(
        within(timeline).getByText("Assessment Started")
      ).toBeInTheDocument();
      expect(within(timeline).getByText("Prompt Sent")).toBeInTheDocument();
      expect(
        within(timeline).getByText("Response Received")
      ).toBeInTheDocument();
      expect(
        within(timeline).getByText("Assessment Completed")
      ).toBeInTheDocument();
      expect(within(timeline).getByText("API Call")).toBeInTheDocument();
    });

    it("displays event times", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      // Events should have time displayed
      const event = screen.getByTestId("timeline-event-log-1");
      expect(event).toBeInTheDocument();
    });

    it("shows duration between events", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      // Duration markers should appear between events
      const durationMarker = screen.getByTestId("duration-marker-log-2");
      expect(durationMarker).toBeInTheDocument();
      expect(durationMarker).toHaveTextContent("+5.0s");
    });

    it("displays API call model version", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      expect(
        screen.getByText("Model: gemini-3-flash-preview")
      ).toBeInTheDocument();
    });

    it("displays API call token count", () => {
      render(<AssessmentTimelineClient assessment={serializedAssessment} />);
      // 100 + 50 = 150 tokens
      expect(screen.getByText("Tokens: 150")).toBeInTheDocument();
    });

    it("shows empty state when no events", () => {
      const emptyAssessment = {
        ...serializedAssessment,
        logs: [],
        apiCalls: [],
      };
      render(<AssessmentTimelineClient assessment={emptyAssessment} />);
      expect(
        screen.getByText("No events recorded for this assessment")
      ).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("highlights error events in red", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );
      // Check the error event container has red styling
      const errorEvent = screen.getByTestId("timeline-event-log-2");
      const redDiv = errorEvent.querySelector('[class*="bg-red-50"]');
      expect(redDiv).toBeInTheDocument();
    });

    it("shows error label in event title", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );
      // The ERROR event should show "Error" as its label
      const timeline = screen.getByTestId("timeline");
      expect(within(timeline).getAllByText("Error").length).toBeGreaterThan(0);
    });

    it("expands error details when clicked", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );

      // Click on the error log event (which has metadata)
      const errorEvent = screen.getByTestId("timeline-event-log-2");
      const clickableDiv = errorEvent.querySelector(
        '[class*="cursor-pointer"]'
      );
      expect(clickableDiv).toBeInTheDocument();
      fireEvent.click(clickableDiv!);

      // Error details should be visible
      expect(screen.getByTestId("error-details-log-2")).toBeInTheDocument();
    });

    it("displays error message in expanded view", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );

      // Click to expand the API call error (which has errorMessage)
      const apiCallEvent = screen.getByTestId("timeline-event-api-2");
      const clickableDiv = apiCallEvent.querySelector(
        '[class*="cursor-pointer"]'
      );
      fireEvent.click(clickableDiv!);

      expect(screen.getByText("Connection timeout")).toBeInTheDocument();
    });

    it("displays stack trace in expanded view", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );

      // Click to expand the API call error
      const apiCallEvent = screen.getByTestId("timeline-event-api-2");
      const clickableDiv = apiCallEvent.querySelector(
        '[class*="cursor-pointer"]'
      );
      fireEvent.click(clickableDiv!);

      expect(screen.getByText(/Error: Connection timeout/)).toBeInTheDocument();
    });

    it("collapses error details when clicked again", () => {
      render(
        <AssessmentTimelineClient assessment={serializedErrorAssessment} />
      );

      // For log events with errors, use error-details
      const logErrorEvent = screen.getByTestId("timeline-event-log-2");
      const logClickableDiv = logErrorEvent.querySelector(
        '[class*="cursor-pointer"]'
      );
      fireEvent.click(logClickableDiv!);
      expect(screen.getByTestId("error-details-log-2")).toBeInTheDocument();

      fireEvent.click(logClickableDiv!);
      expect(
        screen.queryByTestId("error-details-log-2")
      ).not.toBeInTheDocument();
    });

    it("highlights long durations in amber", () => {
      // Create an assessment with a long gap between events (>30 seconds)
      const longDurationAssessment = {
        ...serializedAssessment,
        logs: [
          {
            id: "log-1",
            eventType: "STARTED" as const,
            timestamp: "2024-01-15T10:00:00.000Z",
            durationMs: null,
            metadata: null,
          },
          {
            id: "log-2",
            eventType: "COMPLETED" as const,
            timestamp: "2024-01-15T10:01:00.000Z", // 60 seconds later
            durationMs: 60000,
            metadata: null,
          },
        ],
        apiCalls: [],
      };

      render(<AssessmentTimelineClient assessment={longDurationAssessment} />);

      const durationMarker = screen.getByTestId("duration-marker-log-2");
      expect(durationMarker.querySelector("span")).toHaveClass(
        "border-amber-500"
      );
    });
  });
});

describe("formatDuration utility", () => {
  it("formats milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats seconds", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(2500)).toBe("2.5s");
    expect(formatDuration(59999)).toBe("60.0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(3600000)).toBe("60m");
    expect(formatDuration(5400000)).toBe("90m");
  });
});

describe("API Call Details", () => {
  const serializedAssessment = {
    ...mockAssessment,
    startedAt: mockAssessment.startedAt.toISOString(),
    completedAt: mockAssessment.completedAt?.toISOString() ?? null,
    createdAt: mockAssessment.createdAt.toISOString(),
    updatedAt: mockAssessment.updatedAt.toISOString(),
    logs: mockAssessment.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    apiCalls: mockAssessment.apiCalls.map((call) => ({
      ...call,
      requestTimestamp: call.requestTimestamp.toISOString(),
      responseTimestamp: call.responseTimestamp?.toISOString() ?? null,
    })),
    recordings: mockAssessment.recordings.map((rec) => ({
      ...rec,
      startTime: rec.startTime.toISOString(),
      endTime: rec.endTime?.toISOString() ?? null,
    })),
  };

  it("shows API calls as expandable events", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    expect(apiEvent).toBeInTheDocument();
    // Should have cursor pointer because it has expandable content
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    expect(clickableDiv).toBeInTheDocument();
  });

  it("expands API call details when clicked", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    // Should show API call details
    expect(screen.getByTestId("api-call-details-api-1")).toBeInTheDocument();
  });

  it("displays model version in expanded details", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    const details = screen.getByTestId("api-call-details-api-1");
    expect(
      within(details).getByText("gemini-3-flash-preview")
    ).toBeInTheDocument();
  });

  it("displays status code in expanded details", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    const details = screen.getByTestId("api-call-details-api-1");
    expect(within(details).getByText("200")).toBeInTheDocument();
  });

  it("displays token counts in expanded details", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    const details = screen.getByTestId("api-call-details-api-1");
    expect(within(details).getByText(/100 prompt/)).toBeInTheDocument();
    expect(within(details).getByText(/50 response/)).toBeInTheDocument();
  });

  it("displays collapsible prompt section", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    // Should show prompt section header
    expect(screen.getByTestId("prompt-api-1-section")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-api-1-header")).toBeInTheDocument();
  });

  it("displays collapsible response section", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    // Should show response section header
    expect(screen.getByTestId("response-api-1-section")).toBeInTheDocument();
    expect(screen.getByTestId("response-api-1-header")).toBeInTheDocument();
  });

  it("shows copy button for prompt text", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    expect(screen.getByTestId("prompt-api-1-copy-button")).toBeInTheDocument();
  });

  it("shows copy button for response JSON", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    expect(
      screen.getByTestId("response-api-1-copy-button")
    ).toBeInTheDocument();
  });

  it("expands prompt text when header is clicked", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    // Click on prompt header to expand
    const promptHeader = screen.getByTestId("prompt-api-1-header");
    fireEvent.click(promptHeader);

    // Should show prompt content
    expect(screen.getByTestId("prompt-api-1-content")).toBeInTheDocument();
    expect(screen.getByText(/You are a helpful assistant/)).toBeInTheDocument();
  });

  it("expands response JSON when header is clicked", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    // Click on response header to expand
    const responseHeader = screen.getByTestId("response-api-1-header");
    fireEvent.click(responseHeader);

    // Should show response content with formatted JSON
    expect(screen.getByTestId("response-api-1-content")).toBeInTheDocument();
  });

  it("collapses API call details when clicked again", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');

    // Expand
    fireEvent.click(clickableDiv!);
    expect(screen.getByTestId("api-call-details-api-1")).toBeInTheDocument();

    // Collapse
    fireEvent.click(clickableDiv!);
    expect(
      screen.queryByTestId("api-call-details-api-1")
    ).not.toBeInTheDocument();
  });

  it("displays request and response timestamps", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    const details = screen.getByTestId("api-call-details-api-1");
    expect(within(details).getByText("REQUEST TIMESTAMP")).toBeInTheDocument();
    expect(within(details).getByText("RESPONSE TIMESTAMP")).toBeInTheDocument();
  });

  it("displays duration in expanded details", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    const details = screen.getByTestId("api-call-details-api-1");
    expect(within(details).getByText("1.0s")).toBeInTheDocument();
  });

  it("formats response as JSON with syntax highlighting", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    const apiEvent = screen.getByTestId("timeline-event-api-1");
    const clickableDiv = apiEvent.querySelector('[class*="cursor-pointer"]');
    fireEvent.click(clickableDiv!);

    const responseHeader = screen.getByTestId("response-api-1-header");
    fireEvent.click(responseHeader);

    // Should have language-json class for syntax highlighting
    const content = screen.getByTestId("response-api-1-content");
    expect(content.querySelector("code.language-json")).toBeInTheDocument();
  });
});

describe("AssessmentTimelineClient - Retry Assessment", () => {
  const serializedAssessment = {
    ...mockAssessment,
    startedAt: mockAssessment.startedAt.toISOString(),
    completedAt: mockAssessment.completedAt?.toISOString() ?? null,
    createdAt: mockAssessment.createdAt.toISOString(),
    updatedAt: mockAssessment.updatedAt.toISOString(),
    logs: mockAssessment.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    apiCalls: mockAssessment.apiCalls.map((call) => ({
      ...call,
      requestTimestamp: call.requestTimestamp.toISOString(),
      responseTimestamp: call.responseTimestamp?.toISOString() ?? null,
    })),
    recordings: mockAssessment.recordings.map((rec) => ({
      ...rec,
      startTime: rec.startTime.toISOString(),
      endTime: rec.endTime?.toISOString() ?? null,
    })),
  };

  const serializedAssessmentWithError = {
    ...mockAssessmentWithError,
    startedAt: mockAssessmentWithError.startedAt.toISOString(),
    completedAt: null,
    createdAt: mockAssessmentWithError.createdAt.toISOString(),
    updatedAt: mockAssessmentWithError.updatedAt.toISOString(),
    logs: mockAssessmentWithError.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    apiCalls: mockAssessmentWithError.apiCalls.map((call) => ({
      ...call,
      requestTimestamp: call.requestTimestamp.toISOString(),
      responseTimestamp: null, // mockAssessmentWithError has null responseTimestamp
    })),
    recordings: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows retry assessment button for completed assessment", () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);
    expect(screen.getByTestId("retry-assessment-card")).toBeInTheDocument();
    expect(screen.getByTestId("retry-assessment-button")).toBeInTheDocument();
  });

  it("shows retry assessment button for assessment with errors", () => {
    render(
      <AssessmentTimelineClient assessment={serializedAssessmentWithError} />
    );
    expect(screen.getByTestId("retry-assessment-card")).toBeInTheDocument();
  });

  it("does not show retry button when assessment is superseded", () => {
    const supersededAssessment = {
      ...serializedAssessment,
      supersededBy: "assess-3",
    };
    render(<AssessmentTimelineClient assessment={supersededAssessment} />);
    expect(
      screen.queryByTestId("retry-assessment-card")
    ).not.toBeInTheDocument();
  });

  it("shows superseded notice when assessment is superseded", () => {
    const supersededAssessment = {
      ...serializedAssessment,
      supersededBy: "assess-3",
    };
    render(<AssessmentTimelineClient assessment={supersededAssessment} />);
    expect(screen.getByTestId("superseded-notice")).toBeInTheDocument();
    expect(screen.getByText("View new assessment")).toBeInTheDocument();
  });

  it("opens confirmation dialog when retry button is clicked", async () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);

    const retryButton = screen.getByTestId("retry-assessment-button");
    fireEvent.click(retryButton);

    const dialog = screen.getByTestId("confirmation-dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Retry Assessment")).toBeInTheDocument();
    expect(within(dialog).getByText(/This will create a/)).toBeInTheDocument();
  });

  it("closes confirmation dialog when cancel is clicked", async () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);

    const retryButton = screen.getByTestId("retry-assessment-button");
    fireEvent.click(retryButton);

    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();

    const cancelButton = screen.getByTestId("cancel-retry-button");
    fireEvent.click(cancelButton);

    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
  });

  it("closes confirmation dialog when overlay is clicked", async () => {
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);

    const retryButton = screen.getByTestId("retry-assessment-button");
    fireEvent.click(retryButton);

    const overlay = screen.getByTestId("confirmation-dialog-overlay");
    fireEvent.click(overlay);

    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
  });

  it("shows loading state when retrying", async () => {
    (global.fetch as Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AssessmentTimelineClient assessment={serializedAssessment} />);

    const retryButton = screen.getByTestId("retry-assessment-button");
    fireEvent.click(retryButton);

    const confirmButton = screen.getByTestId("confirm-retry-button");
    fireEvent.click(confirmButton);

    // Look for "Processing..." within the confirmation dialog
    const dialog = screen.getByTestId("confirmation-dialog");
    expect(within(dialog).getByText("Processing...")).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
  });

  it("shows success toast on successful retry", async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          newAssessmentId: "assess-2",
          oldAssessmentId: "assess-1",
          message: "Reassessment queued successfully",
        }),
    });

    render(<AssessmentTimelineClient assessment={serializedAssessment} />);

    const retryButton = screen.getByTestId("retry-assessment-button");
    fireEvent.click(retryButton);

    const confirmButton = screen.getByTestId("confirm-retry-button");
    fireEvent.click(confirmButton);

    // Wait for the toast to appear
    await vi.waitFor(() => {
      expect(screen.getByTestId("toast-success")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Reassessment queued successfully")
    ).toBeInTheDocument();
  });

  it("shows error toast on failed retry", async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          success: false,
          message: "Assessment not found",
        }),
    });

    render(<AssessmentTimelineClient assessment={serializedAssessment} />);

    const retryButton = screen.getByTestId("retry-assessment-button");
    fireEvent.click(retryButton);

    const confirmButton = screen.getByTestId("confirm-retry-button");
    fireEvent.click(confirmButton);

    await vi.waitFor(() => {
      expect(screen.getByTestId("toast-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Assessment not found")).toBeInTheDocument();
  });

  it("navigates to new assessment after successful retry", async () => {
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          newAssessmentId: "assess-2",
          oldAssessmentId: "assess-1",
          message: "Reassessment queued successfully",
        }),
    });

    vi.useFakeTimers();
    render(<AssessmentTimelineClient assessment={serializedAssessment} />);

    const retryButton = screen.getByTestId("retry-assessment-button");
    fireEvent.click(retryButton);

    const confirmButton = screen.getByTestId("confirm-retry-button");
    await fireEvent.click(confirmButton);

    // Wait for the fetch to complete
    await vi.waitFor(() => {
      expect(screen.getByTestId("toast-success")).toBeInTheDocument();
    });

    // Advance timers to trigger navigation
    await vi.advanceTimersByTimeAsync(1500);

    expect(mockRouterPush).toHaveBeenCalledWith("/admin/assessments/assess-2");
    vi.useRealTimers();
  });
});
