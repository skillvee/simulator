import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorDashboardClient } from "./client";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const baseError = {
  id: "err-1",
  source: "client" as const,
  timestamp: new Date().toISOString(),
  errorType: "CONSOLE_ERROR",
  message: "Test error message",
  stackTrace: null,
  componentName: null,
  url: "http://localhost:3000/test",
  assessmentId: "assessment-1",
  assessmentName: "Test Assessment",
  userId: "user-1",
  userName: "Test User",
};

const defaultProps = {
  errors: [baseError],
  summaryStats: {
    totalErrorsLast24h: 5,
    totalErrorsPrior24h: 3,
    mostCommonError: "Something went wrong",
    mostCommonCount: 3,
    mostAffectedAssessment: {
      id: "assessment-1",
      name: "Test Assessment",
      count: 4,
    },
  },
  filterOptions: {
    assessments: [{ id: "assessment-1", name: "Test Assessment" }],
    users: [{ id: "user-1", name: "Test User" }],
  },
  geminiHealth: {
    modelStats: [
      { model: "Flash", totalCalls: 100, successRate: 98.5, avgLatencyMs: 320, errorCount: 2 },
      { model: "Live", totalCalls: 50, successRate: 92.0, avgLatencyMs: 450, errorCount: 4 },
      { model: "Pro", totalCalls: 25, successRate: 100, avgLatencyMs: 1200, errorCount: 0 },
    ],
    hourlyErrors: Array.from({ length: 24 }, (_, i) => ({ hoursAgo: 23 - i, errors: i === 12 ? 3 : 0 })),
  },
};

describe("ErrorDashboardClient", () => {
  it("renders the page title", () => {
    render(<ErrorDashboardClient {...defaultProps} />);
    expect(screen.getByText("Error Dashboard")).toBeInTheDocument();
  });

  it("renders summary cards with correct data", () => {
    render(<ErrorDashboardClient {...defaultProps} />);
    // Total errors
    expect(screen.getByText("5")).toBeInTheDocument();
    // Trend percentage: (5-3)/3 = 66.67% rounded to 67%
    expect(screen.getByText("+67%")).toBeInTheDocument();
    // Most common error
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    // Most affected assessment (appears in summary + error row)
    expect(screen.getAllByText("Test Assessment").length).toBeGreaterThanOrEqual(1);
  });

  it("renders error rows with correct content", () => {
    render(<ErrorDashboardClient {...defaultProps} />);
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("shows empty state when no errors match filters", () => {
    render(<ErrorDashboardClient {...defaultProps} errors={[]} />);
    expect(
      screen.getByText("No errors found for the selected filters.")
    ).toBeInTheDocument();
  });

  it("shows error count in the list header", () => {
    const errors = [
      baseError,
      { ...baseError, id: "err-2", message: "Another error" },
    ];
    render(<ErrorDashboardClient {...defaultProps} errors={errors} />);
    expect(screen.getByText("2 errors found")).toBeInTheDocument();
  });

  it("renders group toggle button", () => {
    render(<ErrorDashboardClient {...defaultProps} />);
    expect(screen.getByText("List")).toBeInTheDocument();
  });

  it("switches to grouped view when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<ErrorDashboardClient {...defaultProps} />);
    const toggleBtn = screen.getByText("List");
    await user.click(toggleBtn);
    expect(screen.getByText("Grouped")).toBeInTheDocument();
  });

  it("renders assessment link for error with assessment", () => {
    render(<ErrorDashboardClient {...defaultProps} />);
    const links = screen.getAllByRole("link", { name: "Test Assessment" });
    const assessmentLinks = links.filter((l) =>
      l.getAttribute("href")?.includes("/admin/assessments/assessment-1")
    );
    expect(assessmentLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders pagination when more than 50 errors", () => {
    const errors = Array.from({ length: 55 }, (_, i) => ({
      ...baseError,
      id: `err-${i}`,
      message: `Error ${i}`,
    }));
    render(<ErrorDashboardClient {...defaultProps} errors={errors} />);
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    expect(screen.getByText(/55 total/)).toBeInTheDocument();
  });

  it("navigates pages when pagination buttons are clicked", async () => {
    const user = userEvent.setup();
    const errors = Array.from({ length: 55 }, (_, i) => ({
      ...baseError,
      id: `err-${i}`,
      message: `Error ${i}`,
    }));
    render(<ErrorDashboardClient {...defaultProps} errors={errors} />);
    // Go to page 2
    const nextBtn = screen.getAllByRole("button").find(
      (btn) => btn.querySelector(".lucide-chevron-right")
    );
    expect(nextBtn).toBeDefined();
    await user.click(nextBtn!);
    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
  });

  it("shows most affected assessment link in summary card", () => {
    render(<ErrorDashboardClient {...defaultProps} />);
    // Find the card with "Most Affected" label
    const links = screen.getAllByRole("link", { name: "Test Assessment" });
    const summaryLink = links.find((l) =>
      l.getAttribute("href")?.includes("assessment-1")
    );
    expect(summaryLink).toBeDefined();
  });

  it("renders trend as green when errors decreased", () => {
    const props = {
      ...defaultProps,
      summaryStats: {
        ...defaultProps.summaryStats,
        totalErrorsLast24h: 2,
        totalErrorsPrior24h: 5,
      },
    };
    render(<ErrorDashboardClient {...props} />);
    expect(screen.getByText("-60%")).toBeInTheDocument();
  });

  it("renders 0% when no change in error count", () => {
    const props = {
      ...defaultProps,
      summaryStats: {
        ...defaultProps.summaryStats,
        totalErrorsLast24h: 5,
        totalErrorsPrior24h: 5,
      },
    };
    render(<ErrorDashboardClient {...props} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  describe("Gemini Health Section", () => {
    it("renders Gemini Health heading", () => {
      render(<ErrorDashboardClient {...defaultProps} />);
      expect(screen.getByText("Gemini Health")).toBeInTheDocument();
    });

    it("renders per-model stats table", () => {
      render(<ErrorDashboardClient {...defaultProps} />);
      expect(screen.getByText("Flash")).toBeInTheDocument();
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });

    it("shows correct stats values", () => {
      render(<ErrorDashboardClient {...defaultProps} />);
      expect(screen.getByText("100")).toBeInTheDocument(); // Flash total calls
      expect(screen.getByText("98.5%")).toBeInTheDocument(); // Flash success rate
      expect(screen.getByText("320ms")).toBeInTheDocument(); // Flash avg latency
    });

    it("highlights models with success rate below 95% in red", () => {
      render(<ErrorDashboardClient {...defaultProps} />);
      // Live has 92% success rate - should be red
      const liveRate = screen.getByText("92%");
      expect(liveRate.className).toContain("text-red-600");
      // Flash has 98.5% - should be green
      const flashRate = screen.getByText("98.5%");
      expect(flashRate.className).toContain("text-green-600");
    });

    it("shows empty state when no API calls", () => {
      const props = {
        ...defaultProps,
        geminiHealth: { modelStats: [], hourlyErrors: [] },
      };
      render(<ErrorDashboardClient {...props} />);
      expect(screen.getByText("No API calls in the last 24 hours.")).toBeInTheDocument();
    });

    it("renders hourly error bar chart", () => {
      render(<ErrorDashboardClient {...defaultProps} />);
      expect(screen.getByText("Error Rate by Hour (last 24h)")).toBeInTheDocument();
      expect(screen.getByText("24h ago")).toBeInTheDocument();
      expect(screen.getByText("now")).toBeInTheDocument();
    });
  });

  it("groups errors by message signature", async () => {
    const user = userEvent.setup();
    const errors = [
      { ...baseError, id: "err-1", message: "Cannot read property of null" },
      { ...baseError, id: "err-2", message: "Cannot read property of null" },
      { ...baseError, id: "err-3", message: "Network timeout" },
    ];
    render(<ErrorDashboardClient {...defaultProps} errors={errors} />);

    // Switch to grouped view
    await user.click(screen.getByText("List"));

    // Should show grouped counts
    expect(screen.getByText("2x")).toBeInTheDocument();
    expect(screen.getByText("1x")).toBeInTheDocument();
  });
});
