import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import AdminAssessmentsPage from "./page";
import { AssessmentsClient } from "./client";

// Mock next/navigation
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/admin/assessments",
  useSearchParams: () => mockSearchParams,
}));

// Mock the database
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findMany: vi.fn(),
    },
    scenario: {
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
    _count: { clientErrors: 0 },
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
    _count: { clientErrors: 2 },
  },
  {
    id: "assess-3",
    userId: "user-3",
    scenarioId: "scenario-2",
    status: "WELCOME" as const,
    startedAt: new Date("2024-01-17T08:00:00Z"),
    completedAt: null,
    createdAt: new Date("2024-01-17T08:00:00Z"),
    updatedAt: new Date("2024-01-17T08:00:00Z"),
    user: { id: "user-3", name: null, email: "anon@example.com" },
    scenario: { id: "scenario-2", name: "Backend Engineer" },
    logs: [],
    apiCalls: [],
    _count: { clientErrors: 0 },
  },
];

const mockScenarios = [
  { id: "scenario-2", name: "Backend Engineer" },
  { id: "scenario-1", name: "Frontend Developer" },
];

describe("AdminAssessmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.assessment.findMany as Mock).mockResolvedValue(mockAssessments);
    (db.scenario.findMany as Mock).mockResolvedValue(mockScenarios);
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
        _count: {
          select: { clientErrors: true },
        },
      },
    });
  });

  it("fetches scenarios", async () => {
    await AdminAssessmentsPage();

    expect(db.scenario.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  });

  it("calculates correct stats", async () => {
    const result = await AdminAssessmentsPage();
    expect(result.props.stats.total).toBe(3);
    expect(result.props.stats.completed).toBe(1);
    expect(result.props.stats.failed).toBe(1);
    expect(result.props.stats.successRate).toBe(33);
  });

  it("calculates error counts from apiCalls and clientErrors", async () => {
    const result = await AdminAssessmentsPage();
    const assessments = result.props.assessments;

    // assess-1: 0 api errors + 0 client errors = 0
    expect(assessments[0].errorCount).toBe(0);
    // assess-2: 1 api error + 2 client errors = 3
    expect(assessments[1].errorCount).toBe(3);
    // assess-3: 0 api errors + 0 client errors = 0
    expect(assessments[2].errorCount).toBe(0);
  });

  it("serializes dates to strings", async () => {
    const result = await AdminAssessmentsPage();
    const assessments = result.props.assessments;

    expect(typeof assessments[0].createdAt).toBe("string");
    expect(typeof assessments[0].startedAt).toBe("string");
    expect(typeof assessments[0].logs[0].timestamp).toBe("string");
    expect(typeof assessments[0].apiCalls[0].requestTimestamp).toBe("string");
  });

  it("handles null completedAt dates", async () => {
    const result = await AdminAssessmentsPage();
    const assessments = result.props.assessments;

    expect(assessments[1].completedAt).toBeNull();
    expect(assessments[2].completedAt).toBeNull();
  });

  it("calculates average duration only from completed assessments", async () => {
    const result = await AdminAssessmentsPage();
    expect(result.props.stats.avgDurationMs).toBe(5400000);
  });

  it("passes scenarios list to client", async () => {
    const result = await AdminAssessmentsPage();
    expect(result.props.scenarios).toEqual(mockScenarios);
  });
});

describe("AssessmentsClient", () => {
  const serializedAssessments = mockAssessments.map((a) => {
    const apiErrorCount = a.apiCalls.filter(
      (call) => call.errorMessage !== null
    ).length;
    return {
      ...a,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      errorCount: apiErrorCount + a._count.clientErrors,
      logs: a.logs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      apiCalls: a.apiCalls.map((call) => ({
        ...call,
        requestTimestamp: call.requestTimestamp.toISOString(),
        responseTimestamp: call.responseTimestamp?.toISOString() ?? null,
      })),
    };
  });

  const defaultStats: { total: number; completed: number; failed: number; successRate: number; avgDurationMs: number | null } = {
    total: 3,
    completed: 1,
    failed: 1,
    successRate: 33,
    avgDurationMs: 5400000,
  };

  const defaultScenarios = [
    { id: "scenario-2", name: "Backend Engineer" },
    { id: "scenario-1", name: "Frontend Developer" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderClient(overrides?: Partial<{ assessments: typeof serializedAssessments; stats: typeof defaultStats; scenarios: typeof defaultScenarios }>) {
    return render(
      <AssessmentsClient
        assessments={overrides?.assessments ?? serializedAssessments}
        scenarios={overrides?.scenarios ?? defaultScenarios}
        stats={overrides?.stats ?? defaultStats}
      />
    );
  }

  it("renders the page title", () => {
    renderClient();
    expect(screen.getByText("Assessment Diagnostics")).toBeInTheDocument();
  });

  it("displays aggregate stats", () => {
    renderClient();

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
    renderClient();

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("shows error badge with count for assessments with errors", () => {
    renderClient();

    // assess-2 has errorCount=3 (1 api error + 2 client errors)
    const errorBadge = screen.getByTestId("error-badge-assess-2");
    expect(errorBadge).toBeInTheDocument();
    expect(errorBadge).toHaveTextContent("3");
  });

  it("shows green checkmark for assessments without errors", () => {
    renderClient();

    // assess-1 and assess-3 have no errors, so no error badge
    expect(screen.queryByTestId("error-badge-assess-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-badge-assess-3")).not.toBeInTheDocument();
  });

  it("shows status badges with correct styling", () => {
    renderClient();

    const completedBadges = screen.getAllByText("COMPLETED");
    const workingBadges = screen.getAllByText("WORKING");
    const welcomeBadges = screen.getAllByText("WELCOME");

    expect(completedBadges.length).toBeGreaterThan(0);
    expect(workingBadges.length).toBeGreaterThan(0);
    expect(welcomeBadges.length).toBeGreaterThan(0);
  });

  describe("Search functionality", () => {
    it("filters by candidate name", () => {
      renderClient();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "John" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });

    it("filters by email", () => {
      renderClient();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "jane@" } });

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("filters by assessment ID", () => {
      renderClient();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "assess-3" } });

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.getByText("Anonymous")).toBeInTheDocument();
    });

    it("clears search when X button is clicked", () => {
      renderClient();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "John" } });

      const clearButton = screen.getByLabelText("Clear search");
      fireEvent.click(clearButton);

      expect((searchInput as HTMLInputElement).value).toBe("");
      // All 3 visible again
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Anonymous")).toBeInTheDocument();
    });

    it("updates URL when searching", () => {
      renderClient();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "John" } });

      expect(mockReplace).toHaveBeenCalledWith(
        "/admin/assessments?search=John",
        { scroll: false }
      );
    });
  });

  describe("Status filter", () => {
    it("filters by status when selected", () => {
      renderClient();

      const statusFilter = screen.getByTestId("status-filter");
      fireEvent.change(statusFilter, { target: { value: "COMPLETED" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });

    it("shows all statuses when 'All Status' is selected", () => {
      renderClient();

      const statusFilter = screen.getByTestId("status-filter");
      fireEvent.change(statusFilter, { target: { value: "WORKING" } });
      fireEvent.change(statusFilter, { target: { value: "all" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Anonymous")).toBeInTheDocument();
    });
  });

  describe("Scenario filter", () => {
    it("filters by scenario when selected", () => {
      renderClient();

      const scenarioFilter = screen.getByTestId("scenario-filter");
      fireEvent.change(scenarioFilter, {
        target: { value: "scenario-2" },
      });

      // Only assess-3 has scenario-2
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(screen.getByText("Anonymous")).toBeInTheDocument();
    });

    it("shows all scenarios in dropdown", () => {
      renderClient();

      expect(screen.getByText("All Scenarios")).toBeInTheDocument();
      expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
      expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
    });
  });

  describe("Has errors filter", () => {
    it("filters to only assessments with errors when checked", () => {
      renderClient();

      const checkbox = screen.getByTestId("has-errors-filter");
      fireEvent.click(checkbox);

      // Only assess-2 has errors (errorCount=3)
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.queryByText("Anonymous")).not.toBeInTheDocument();
    });
  });

  describe("Date range filter", () => {
    it("has all date range options", () => {
      renderClient();

      expect(screen.getByText("Last 24h")).toBeInTheDocument();
      expect(screen.getByText("Last 7 days")).toBeInTheDocument();
      expect(screen.getByText("Last 30 days")).toBeInTheDocument();
      expect(screen.getByText("All time")).toBeInTheDocument();
    });

    it("defaults to all time", () => {
      renderClient();

      const allTimeButton = screen.getByText("All time");
      expect(allTimeButton).toHaveClass("bg-primary");
    });

    it("changes active state when date range is selected", () => {
      renderClient();

      const last7DaysButton = screen.getByText("Last 7 days");
      fireEvent.click(last7DaysButton);

      expect(last7DaysButton).toHaveClass("bg-primary");
      expect(screen.getByText("All time")).not.toHaveClass("bg-primary");
    });
  });

  describe("Sorting", () => {
    it("sorts by date when column header is clicked", () => {
      renderClient();

      const dateHeader = screen.getByTestId("sort-date");
      fireEvent.click(dateHeader);

      // Default sort is desc, so newest first (assess-3 -> assess-2 -> assess-1)
      const rows = screen.getAllByTestId(/^assessment-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "assessment-row-assess-3");
      expect(rows[2]).toHaveAttribute("data-testid", "assessment-row-assess-1");
    });

    it("toggles sort direction on second click", () => {
      renderClient();

      const dateHeader = screen.getByTestId("sort-date");
      fireEvent.click(dateHeader); // desc
      fireEvent.click(dateHeader); // asc

      const rows = screen.getAllByTestId(/^assessment-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "assessment-row-assess-1");
      expect(rows[2]).toHaveAttribute("data-testid", "assessment-row-assess-3");
    });

    it("sorts by error count", () => {
      renderClient();

      const errorsHeader = screen.getByTestId("sort-errors");
      fireEvent.click(errorsHeader); // desc — highest errors first

      const rows = screen.getAllByTestId(/^assessment-row-/);
      // assess-2 has errorCount=3, others have 0
      expect(rows[0]).toHaveAttribute("data-testid", "assessment-row-assess-2");
    });

    it("sorts by status", () => {
      renderClient();

      const statusHeader = screen.getByTestId("sort-status");
      fireEvent.click(statusHeader); // desc — COMPLETED first

      const rows = screen.getAllByTestId(/^assessment-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "assessment-row-assess-1");
    });

    it("updates URL when sorting", () => {
      renderClient();

      const dateHeader = screen.getByTestId("sort-date");
      fireEvent.click(dateHeader);

      expect(mockReplace).toHaveBeenCalledWith(
        "/admin/assessments?sortBy=date&sortDir=desc",
        { scroll: false }
      );
    });
  });

  describe("Pagination", () => {
    it("does not show pagination when fewer than 25 items", () => {
      renderClient();
      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });

    it("shows pagination when more than 25 items", () => {
      // Create 30 assessments
      const manyAssessments = Array.from({ length: 30 }, (_, i) => ({
        ...serializedAssessments[0],
        id: `assess-many-${i}`,
        user: { id: `user-${i}`, name: `User ${i}` as string | null, email: `user${i}@example.com` as string | null },
      }));

      renderClient({ assessments: manyAssessments });

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    });

    it("navigates to next page", () => {
      const manyAssessments = Array.from({ length: 30 }, (_, i) => ({
        ...serializedAssessments[0],
        id: `assess-many-${i}`,
        user: { id: `user-${i}`, name: `User ${i}` as string | null, email: `user${i}@example.com` as string | null },
      }));

      renderClient({ assessments: manyAssessments });

      const nextButton = screen.getByTestId("pagination-next");
      fireEvent.click(nextButton);

      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    });

    it("disables previous button on first page", () => {
      const manyAssessments = Array.from({ length: 30 }, (_, i) => ({
        ...serializedAssessments[0],
        id: `assess-many-${i}`,
        user: { id: `user-${i}`, name: `User ${i}` as string | null, email: `user${i}@example.com` as string | null },
      }));

      renderClient({ assessments: manyAssessments });

      const prevButton = screen.getByTestId("pagination-prev");
      expect(prevButton).toBeDisabled();
    });

    it("resets to page 1 when filters change", () => {
      const manyAssessments = Array.from({ length: 30 }, (_, i) => ({
        ...serializedAssessments[0],
        id: `assess-many-${i}`,
        user: { id: `user-${i}`, name: `User ${i}` as string | null, email: `user${i}@example.com` as string | null },
      }));

      renderClient({ assessments: manyAssessments });

      // Go to page 2
      const nextButton = screen.getByTestId("pagination-next");
      fireEvent.click(nextButton);
      expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

      // Apply search filter — should reset to page 1
      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "User 0" } });

      // Should be on page 1 now (only 1 result matches)
      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
    });
  });

  describe("Expandable row functionality", () => {
    it("expands row when clicked", () => {
      renderClient();

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);

      expect(screen.getByTestId("details-assess-1")).toBeInTheDocument();
    });

    it("shows assessment info in expanded view", () => {
      renderClient();

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);

      const details = screen.getByTestId("details-assess-1");
      expect(within(details).getByText("assess-1")).toBeInTheDocument();
      expect(
        within(details).getByText("Frontend Developer")
      ).toBeInTheDocument();
    });

    it("shows event logs in expanded view", () => {
      renderClient();

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);

      const details = screen.getByTestId("details-assess-1");
      expect(
        within(details).getByText("EVENT LOG (2 events)")
      ).toBeInTheDocument();
      expect(within(details).getByText("STARTED")).toBeInTheDocument();
    });

    it("shows API calls in expanded view", () => {
      renderClient();

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
      renderClient();

      const firstRow = screen.getByTestId("assessment-row-assess-1");
      fireEvent.click(firstRow);
      fireEvent.click(firstRow);

      expect(screen.queryByTestId("details-assess-1")).not.toBeInTheDocument();
    });

    it("only one row expanded at a time", () => {
      renderClient();

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
      renderClient();

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      expect(
        screen.getByText("No assessments found matching your criteria")
      ).toBeInTheDocument();
    });

    it("shows empty log message in expanded view when no logs", () => {
      renderClient();

      const thirdRow = screen.getByTestId("assessment-row-assess-3");
      fireEvent.click(thirdRow);

      const details = screen.getByTestId("details-assess-3");
      expect(
        within(details).getByText("No events recorded")
      ).toBeInTheDocument();
    });

    it("shows empty API calls message in expanded view when no calls", () => {
      renderClient();

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
      renderClient();

      const durations = screen.getAllByText("90m 0s");
      expect(durations.length).toBeGreaterThanOrEqual(1);
    });

    it("shows dash when no duration available", () => {
      renderClient({ stats: { ...defaultStats, avgDurationMs: null } });

      const avgDurationCard = screen.getByText("AVG DURATION").closest("div");
      expect(avgDurationCard).toHaveTextContent("-");
    });
  });

  describe("Error display in expanded view", () => {
    it("highlights error logs with red background", () => {
      renderClient();

      const secondRow = screen.getByTestId("assessment-row-assess-2");
      fireEvent.click(secondRow);

      const details = screen.getByTestId("details-assess-2");
      const errorLog = within(details).getAllByText("ERROR")[0];
      expect(errorLog).toHaveClass("bg-destructive");
    });

    it("shows error status in API calls table", () => {
      renderClient();

      const secondRow = screen.getByTestId("assessment-row-assess-2");
      fireEvent.click(secondRow);

      const details = screen.getByTestId("details-assess-2");
      expect(within(details).getByText("Error")).toBeInTheDocument();
    });
  });

  describe("Combined filters", () => {
    it("applies multiple filters together", () => {
      renderClient();

      const statusFilter = screen.getByTestId("status-filter");
      fireEvent.change(statusFilter, { target: { value: "COMPLETED" } });

      const searchInput = screen.getByTestId("search-input");
      fireEvent.change(searchInput, { target: { value: "John" } });

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(screen.queryByText("Anonymous")).not.toBeInTheDocument();
    });
  });

  describe("URL state preservation", () => {
    it("updates URL on status filter change", () => {
      renderClient();

      const statusFilter = screen.getByTestId("status-filter");
      fireEvent.change(statusFilter, { target: { value: "COMPLETED" } });

      expect(mockReplace).toHaveBeenCalledWith(
        "/admin/assessments?status=COMPLETED",
        { scroll: false }
      );
    });

    it("updates URL on scenario filter change", () => {
      renderClient();

      const scenarioFilter = screen.getByTestId("scenario-filter");
      fireEvent.change(scenarioFilter, { target: { value: "scenario-1" } });

      expect(mockReplace).toHaveBeenCalledWith(
        "/admin/assessments?scenario=scenario-1",
        { scroll: false }
      );
    });

    it("updates URL on has-errors filter change", () => {
      renderClient();

      const checkbox = screen.getByTestId("has-errors-filter");
      fireEvent.click(checkbox);

      expect(mockReplace).toHaveBeenCalledWith(
        "/admin/assessments?hasErrors=true",
        { scroll: false }
      );
    });
  });
});
