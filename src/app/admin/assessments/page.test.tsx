import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminAssessmentsPage from "./page";
import { AssessmentsClient } from "./client";

// Mock the database
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findMany: vi.fn(),
    },
  },
}));

// Import after mock to get the mocked version
import { db } from "@/server/db";

const mockAssessments = [
  {
    id: "assess-1",
    userId: "user-1",
    scenarioId: "scenario-1",
    status: "COMPLETED" as const,
    startedAt: new Date("2024-01-15T10:00:00Z"),
    completedAt: new Date("2024-01-15T11:30:00Z"),
    createdAt: new Date("2024-01-15T10:00:00Z"),
    updatedAt: new Date("2024-01-15T11:30:00Z"),
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
        eventType: "COMPLETED" as const,
        timestamp: new Date("2024-01-15T11:30:00Z"),
        durationMs: 5400000,
        metadata: null,
      },
    ],
    apiCalls: [
      {
        id: "api-1",
        requestTimestamp: new Date("2024-01-15T10:05:00Z"),
        responseTimestamp: new Date("2024-01-15T10:05:02Z"),
        durationMs: 2000,
        modelVersion: "gemini-3-flash-preview",
        statusCode: 200,
        errorMessage: null,
        promptTokens: 100,
        responseTokens: 50,
      },
    ],
  },
  {
    id: "assess-2",
    userId: "user-2",
    scenarioId: "scenario-1",
    status: "WORKING" as const,
    startedAt: new Date("2024-01-16T09:00:00Z"),
    completedAt: null,
    createdAt: new Date("2024-01-16T09:00:00Z"),
    updatedAt: new Date("2024-01-16T09:30:00Z"),
    user: { id: "user-2", name: "Jane Smith", email: "jane@example.com" },
    scenario: { id: "scenario-1", name: "Frontend Developer" },
    logs: [
      {
        id: "log-3",
        eventType: "STARTED" as const,
        timestamp: new Date("2024-01-16T09:00:00Z"),
        durationMs: null,
        metadata: null,
      },
      {
        id: "log-4",
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
        promptTokens: null,
        responseTokens: null,
      },
    ],
  },
  {
    id: "assess-3",
    userId: "user-3",
    scenarioId: "scenario-2",
    status: "HR_INTERVIEW" as const,
    startedAt: new Date("2024-01-17T08:00:00Z"),
    completedAt: null,
    createdAt: new Date("2024-01-17T08:00:00Z"),
    updatedAt: new Date("2024-01-17T08:00:00Z"),
    user: { id: "user-3", name: null, email: "anon@example.com" },
    scenario: { id: "scenario-2", name: "Backend Engineer" },
    logs: [],
    apiCalls: [],
  },
];

describe("AdminAssessmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.assessment.findMany as Mock).mockResolvedValue(mockAssessments);
  });

  it("fetches assessments with correct includes", async () => {
    await AdminAssessmentsPage();

    expect(db.assessment.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
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
            promptTokens: true,
            responseTokens: true,
          },
        },
      },
    });
  });

  it("calculates correct stats", async () => {
    const result = await AdminAssessmentsPage();
    // Stats should be: total=3, completed=1, failed=1 (with ERROR log), successRate=33%
    // The component receives serialized data with stats
    expect(result.props.stats.total).toBe(3);
    expect(result.props.stats.completed).toBe(1);
    expect(result.props.stats.failed).toBe(1);
    expect(result.props.stats.successRate).toBe(33);
  });

  it("serializes dates to strings", async () => {
    const result = await AdminAssessmentsPage();
    const assessments = result.props.assessments;

    // Check that dates are serialized as strings
    expect(typeof assessments[0].createdAt).toBe("string");
    expect(typeof assessments[0].startedAt).toBe("string");
    expect(typeof assessments[0].logs[0].timestamp).toBe("string");
    expect(typeof assessments[0].apiCalls[0].requestTimestamp).toBe("string");
  });

  it("handles null completedAt dates", async () => {
    const result = await AdminAssessmentsPage();
    const assessments = result.props.assessments;

    // Second and third assessment have null completedAt
    expect(assessments[1].completedAt).toBeNull();
    expect(assessments[2].completedAt).toBeNull();
  });

  it("calculates average duration only from completed assessments", async () => {
    const result = await AdminAssessmentsPage();
    // Only one completed assessment with duration of 90 minutes (5,400,000 ms)
    expect(result.props.stats.avgDurationMs).toBe(5400000);
  });
});

describe("AssessmentsClient", () => {
  const serializedAssessments = mockAssessments.map((a) => ({
    ...a,
    startedAt: a.startedAt.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    logs: a.logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    apiCalls: a.apiCalls.map((call) => ({
      ...call,
      requestTimestamp: call.requestTimestamp.toISOString(),
      responseTimestamp: call.responseTimestamp?.toISOString() ?? null,
    })),
  }));

  const defaultStats = {
    total: 3,
    completed: 1,
    failed: 1,
    successRate: 33,
    avgDurationMs: 5400000,
  };

  it("renders the page title", () => {
    render(
      <AssessmentsClient
        assessments={serializedAssessments}
        stats={defaultStats}
      />
    );
    expect(screen.getByText("Assessment Diagnostics")).toBeInTheDocument();
  });

  it("displays aggregate stats", () => {
    render(
      <AssessmentsClient
        assessments={serializedAssessments}
        stats={defaultStats}
      />
    );

    const statsGrid = screen.getByTestId("stats-grid");
    expect(
      within(statsGrid).getByText("TOTAL ASSESSMENTS")
    ).toBeInTheDocument();
    expect(within(statsGrid).getByText("3")).toBeInTheDocument();
    expect(within(statsGrid).getByText("SUCCESS RATE")).toBeInTheDocument();
    expect(within(statsGrid).getByText("33%")).toBeInTheDocument();
    expect(within(statsGrid).getByText("AVG DURATION")).toBeInTheDocument();
    expect(within(statsGrid).getByText("90m 0s")).toBeInTheDocument();
    expect(within(statsGrid).getByText("FAILED")).toBeInTheDocument();
    expect(within(statsGrid).getByText("1")).toBeInTheDocument();
  });

  it("displays all assessments in the table", () => {
    render(
      <AssessmentsClient
        assessments={serializedAssessments}
        stats={defaultStats}
      />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Anonymous")).toBeInTheDocument(); // User with null name
  });

  it("shows error indicator for assessments with errors", () => {
    render(
      <AssessmentsClient
        assessments={serializedAssessments}
        stats={defaultStats}
      />
    );

    // Jane's assessment has an ERROR log
    const errorBadges = screen.getAllByText("ERROR");
    expect(errorBadges.length).toBeGreaterThan(0);
  });

  it("shows status badges with correct styling", () => {
    render(
      <AssessmentsClient
        assessments={serializedAssessments}
        stats={defaultStats}
      />
    );

    // Use getAllByText since status badges may appear in both row and expanded details
    const completedBadges = screen.getAllByText("COMPLETED");
    const workingBadges = screen.getAllByText("WORKING");
    const interviewBadges = screen.getAllByText("HR_INTERVIEW");

    expect(completedBadges.length).toBeGreaterThan(0);
    expect(workingBadges.length).toBeGreaterThan(0);
    expect(interviewBadges.length).toBeGreaterThan(0);
  });

  describe("Search functionality", () => {
    it("filters by candidate name", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "John" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(
        screen.getByText("Showing 1 of 3 assessments")
      ).toBeInTheDocument();
    });

    it("filters by email", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "jane@" } });

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("filters by assessment ID", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "assess-3" } });

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.getByText("Anonymous")).toBeInTheDocument();
    });

    it("clears search when X button is clicked", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "John" } });

      const clearButton = screen.getByLabelText("Clear search");
      fireEvent.click(clearButton);

      expect((searchInput as HTMLInputElement).value).toBe("");
      expect(
        screen.getByText("Showing 3 of 3 assessments")
      ).toBeInTheDocument();
    });
  });

  describe("Status filter", () => {
    it("filters by status when selected", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const statusFilter = screen.getByTestId("status-filter");
      fireEvent.change(statusFilter, { target: { value: "COMPLETED" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(
        screen.getByText("Showing 1 of 3 assessments")
      ).toBeInTheDocument();
    });

    it("shows all statuses when 'All Status' is selected", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const statusFilter = screen.getByTestId("status-filter");
      fireEvent.change(statusFilter, { target: { value: "WORKING" } });
      fireEvent.change(statusFilter, { target: { value: "all" } });

      expect(
        screen.getByText("Showing 3 of 3 assessments")
      ).toBeInTheDocument();
    });
  });

  describe("Date range filter", () => {
    it("has all date range options", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      expect(screen.getByText("Last 24h")).toBeInTheDocument();
      expect(screen.getByText("Last 7 days")).toBeInTheDocument();
      expect(screen.getByText("Last 30 days")).toBeInTheDocument();
      expect(screen.getByText("All time")).toBeInTheDocument();
    });

    it("defaults to all time", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const allTimeButton = screen.getByText("All time");
      expect(allTimeButton).toHaveClass("bg-primary");
    });

    it("changes active state when date range is selected", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const last7DaysButton = screen.getByText("Last 7 days");
      fireEvent.click(last7DaysButton);

      expect(last7DaysButton).toHaveClass("bg-primary");
      expect(screen.getByText("All time")).not.toHaveClass("bg-primary");
    });
  });

  describe("Expandable row functionality", () => {
    it("expands row when clicked", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);

      expect(screen.getByTestId("details-assess-1")).toBeInTheDocument();
    });

    it("shows assessment info in expanded view", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);

      const details = screen.getByTestId("details-assess-1");
      expect(within(details).getByText("assess-1")).toBeInTheDocument();
      expect(
        within(details).getByText("Frontend Developer")
      ).toBeInTheDocument();
    });

    it("shows event logs in expanded view", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);

      const details = screen.getByTestId("details-assess-1");
      expect(
        within(details).getByText("EVENT LOG (2 events)")
      ).toBeInTheDocument();
      expect(within(details).getByText("STARTED")).toBeInTheDocument();
    });

    it("shows API calls in expanded view", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);

      const details = screen.getByTestId("details-assess-1");
      expect(
        within(details).getByText("API CALLS (1 calls)")
      ).toBeInTheDocument();
      expect(
        within(details).getByText("gemini-3-flash-preview")
      ).toBeInTheDocument();
    });

    it("collapses row when clicked again", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);
      fireEvent.click(firstRow);

      expect(screen.queryByTestId("details-assess-1")).not.toBeInTheDocument();
    });

    it("only one row expanded at a time", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      const secondRow = screen.getByTestId("assessment-row-assess-2");

      fireEvent.click(firstRow);
      expect(screen.getByTestId("details-assess-1")).toBeInTheDocument();

      fireEvent.click(secondRow);
      expect(screen.queryByTestId("details-assess-1")).not.toBeInTheDocument();
      expect(screen.getByTestId("details-assess-2")).toBeInTheDocument();
    });
  });

  describe("Empty states", () => {
    it("shows message when no assessments match filters", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      expect(
        screen.getByText("No assessments found matching your criteria")
      ).toBeInTheDocument();
    });

    it("shows empty log message in expanded view when no logs", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      // Third assessment has no logs
      const thirdRow = screen.getByTestId("assessment-row-assess-3");
      fireEvent.click(thirdRow);

      const details = screen.getByTestId("details-assess-3");
      expect(
        within(details).getByText("No events recorded")
      ).toBeInTheDocument();
    });

    it("shows empty API calls message in expanded view when no calls", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      // Third assessment has no API calls
      const thirdRow = screen.getByTestId("assessment-row-assess-3");
      fireEvent.click(thirdRow);

      const details = screen.getByTestId("details-assess-3");
      expect(
        within(details).getByText("No API calls recorded")
      ).toBeInTheDocument();
    });
  });

  describe("Duration formatting", () => {
    it("formats milliseconds correctly", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      // Average duration of 90 minutes appears in both stats card and table row
      const durations = screen.getAllByText("90m 0s");
      expect(durations.length).toBeGreaterThanOrEqual(1);
    });

    it("shows dash when no duration available", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={{ ...defaultStats, avgDurationMs: null }}
        />
      );

      const avgDurationCard = screen.getByText("AVG DURATION").closest("div");
      expect(avgDurationCard).toHaveTextContent("-");
    });
  });

  describe("Error display in expanded view", () => {
    it("highlights error logs with red background", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const secondRow = screen.getByTestId("assessment-row-assess-2");
      fireEvent.click(secondRow);

      // The ERROR log should have destructive styling
      const details = screen.getByTestId("details-assess-2");
      const errorLog = within(details).getAllByText("ERROR")[0];
      // The Badge with variant="destructive" has bg-destructive class
      expect(errorLog).toHaveClass("bg-destructive");
    });

    it("shows error status in API calls table", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      const secondRow = screen.getByTestId("assessment-row-assess-2");
      fireEvent.click(secondRow);

      const details = screen.getByTestId("details-assess-2");
      expect(within(details).getByText("Error")).toBeInTheDocument();
    });
  });

  describe("Combined filters", () => {
    it("applies multiple filters together", () => {
      render(
        <AssessmentsClient
          assessments={serializedAssessments}
          stats={defaultStats}
        />
      );

      // Filter by status and search
      const statusFilter = screen.getByTestId("status-filter");
      fireEvent.change(statusFilter, { target: { value: "COMPLETED" } });

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "John" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(
        screen.getByText("Showing 1 of 3 assessments")
      ).toBeInTheDocument();
    });
  });
});
