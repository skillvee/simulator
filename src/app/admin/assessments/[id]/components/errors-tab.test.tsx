import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ErrorsTab } from "./errors-tab";
import type { SerializedClientError, SerializedApiCall } from "./types";

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

const mockClientErrors: SerializedClientError[] = [
  {
    id: "ce-1",
    errorType: "UNHANDLED_EXCEPTION",
    message: "Cannot read property 'foo' of undefined",
    stackTrace: "TypeError: Cannot read property 'foo'\n  at Component (app.tsx:42)",
    componentName: "ChatPanel",
    url: "/assessments/abc/work",
    timestamp: "2024-01-15T10:05:00.000Z",
    metadata: { userAgent: "Chrome/120", viewport: "1920x1080" },
  },
  {
    id: "ce-2",
    errorType: "REACT_BOUNDARY",
    message: "ErrorBoundary caught: Rendering failed",
    stackTrace: null,
    componentName: "VoicePanel",
    url: "/assessments/abc/work",
    timestamp: "2024-01-15T10:15:00.000Z",
    metadata: null,
  },
];

const mockApiCalls: SerializedApiCall[] = [
  {
    id: "api-1",
    requestTimestamp: "2024-01-15T10:00:06.000Z",
    responseTimestamp: "2024-01-15T10:00:07.000Z",
    durationMs: 1000,
    modelVersion: "gemini-3-flash-preview",
    statusCode: 200,
    errorMessage: null,
    stackTrace: null,
    promptTokens: 100,
    responseTokens: 50,
    promptText: "prompt text",
    responseText: "response text",
    promptType: "hr_interview",
    promptVersion: null,
    traceId: null,
  },
  {
    id: "api-2",
    requestTimestamp: "2024-01-15T10:10:00.000Z",
    responseTimestamp: null,
    durationMs: null,
    modelVersion: "gemini-3-flash-preview",
    statusCode: 500,
    errorMessage: "Internal server error from model",
    stackTrace: "Error: Internal server error\n  at callGemini (gemini.ts:100)",
    promptTokens: null,
    responseTokens: null,
    promptText: "prompt",
    responseText: null,
    promptType: "code_review",
    promptVersion: null,
    traceId: null,
  },
];

describe("ErrorsTab", () => {
  describe("Empty state", () => {
    it("shows empty state when no errors", () => {
      render(
        <ErrorsTab
          clientErrors={[]}
          apiCalls={[
            {
              ...mockApiCalls[0],
              errorMessage: null,
            },
          ]}
        />
      );
      expect(screen.getByTestId("errors-empty-state")).toBeInTheDocument();
      expect(screen.getByText("No errors recorded")).toBeInTheDocument();
    });

    it("shows empty state with no API calls at all", () => {
      render(<ErrorsTab clientErrors={[]} apiCalls={[]} />);
      expect(screen.getByTestId("errors-empty-state")).toBeInTheDocument();
    });
  });

  describe("Error listing", () => {
    it("renders combined errors in chronological order", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={mockApiCalls} />
      );
      const entries = screen.getAllByTestId(/^error-entry-/);
      // api-2 at 10:10, ce-1 at 10:05, ce-2 at 10:15 → order: ce-1, api-2, ce-2
      expect(entries).toHaveLength(3);
      expect(entries[0]).toHaveAttribute("data-testid", "error-entry-ce-1");
      expect(entries[1]).toHaveAttribute("data-testid", "error-entry-api-2");
      expect(entries[2]).toHaveAttribute("data-testid", "error-entry-ce-2");
    });

    it("shows total error count in header", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={mockApiCalls} />
      );
      expect(screen.getByText("ERRORS (3 actionable)")).toBeInTheDocument();
    });

    it("shows Client badge for client errors", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={[]} />
      );
      const badges = screen.getAllByText("Client");
      expect(badges.length).toBe(2);
    });

    it("shows API badge for API errors", () => {
      render(
        <ErrorsTab clientErrors={[]} apiCalls={mockApiCalls} />
      );
      expect(screen.getByText("API")).toBeInTheDocument();
    });

    it("shows error type badge for client errors", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={[]} />
      );
      expect(screen.getByText("Unhandled Exception")).toBeInTheDocument();
      expect(screen.getByText("React Boundary")).toBeInTheDocument();
    });

    it("shows HTTP status badge for API errors", () => {
      render(
        <ErrorsTab clientErrors={[]} apiCalls={mockApiCalls} />
      );
      expect(screen.getByText("HTTP 500")).toBeInTheDocument();
    });

    it("shows error message in each entry", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={mockApiCalls} />
      );
      expect(
        screen.getByText("Cannot read property 'foo' of undefined")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Internal server error from model")
      ).toBeInTheDocument();
    });
  });

  describe("Expandable details", () => {
    it("expands client error details when clicked", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={[]} />
      );
      const entry = screen.getByTestId("error-entry-ce-1");
      fireEvent.click(within(entry).getByRole("button"));

      expect(screen.getByText("COMPONENT")).toBeInTheDocument();
      expect(screen.getByText("ChatPanel")).toBeInTheDocument();
      expect(screen.getByText("URL")).toBeInTheDocument();
      expect(screen.getByText("/assessments/abc/work")).toBeInTheDocument();
    });

    it("shows browser metadata for client errors", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={[]} />
      );
      const entry = screen.getByTestId("error-entry-ce-1");
      fireEvent.click(within(entry).getByRole("button"));

      expect(screen.getByText("BROWSER METADATA")).toBeInTheDocument();
      expect(screen.getByText(/"userAgent": "Chrome\/120"/)).toBeInTheDocument();
    });

    it("shows stack trace when expanded", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={[]} />
      );
      const entry = screen.getByTestId("error-entry-ce-1");
      fireEvent.click(within(entry).getByRole("button"));

      expect(screen.getByText("STACK TRACE")).toBeInTheDocument();
      expect(
        screen.getByText(/TypeError: Cannot read property/)
      ).toBeInTheDocument();
    });

    it("expands API error details when clicked", () => {
      render(
        <ErrorsTab clientErrors={[]} apiCalls={mockApiCalls} />
      );
      const entry = screen.getByTestId("error-entry-api-2");
      fireEvent.click(within(entry).getByRole("button"));

      expect(screen.getByText("STATUS CODE")).toBeInTheDocument();
      expect(screen.getByText("500")).toBeInTheDocument();
      expect(screen.getByText("MODEL VERSION")).toBeInTheDocument();
      expect(screen.getByText("gemini-3-flash-preview")).toBeInTheDocument();
      expect(screen.getByText("PROMPT TYPE")).toBeInTheDocument();
      expect(screen.getByText("code_review")).toBeInTheDocument();
    });

    it("shows API error stack trace when expanded", () => {
      render(
        <ErrorsTab clientErrors={[]} apiCalls={mockApiCalls} />
      );
      const entry = screen.getByTestId("error-entry-api-2");
      fireEvent.click(within(entry).getByRole("button"));

      expect(
        screen.getByText(/Error: Internal server error/)
      ).toBeInTheDocument();
    });

    it("collapses details when clicked again", () => {
      render(
        <ErrorsTab clientErrors={mockClientErrors} apiCalls={[]} />
      );
      const entry = screen.getByTestId("error-entry-ce-1");
      const button = within(entry).getByRole("button");

      fireEvent.click(button);
      expect(screen.getByText("STACK TRACE")).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText("STACK TRACE")).not.toBeInTheDocument();
    });
  });

  describe("Filtering non-error API calls", () => {
    it("only includes API calls with errorMessage", () => {
      render(
        <ErrorsTab clientErrors={[]} apiCalls={mockApiCalls} />
      );
      // api-1 has no error, api-2 has an error
      const entries = screen.getAllByTestId(/^error-entry-/);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toHaveAttribute("data-testid", "error-entry-api-2");
    });
  });
});
