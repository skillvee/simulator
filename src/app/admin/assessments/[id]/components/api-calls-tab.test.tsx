import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ApiCallsTab } from "./api-calls-tab";
import type { SerializedApiCall } from "./types";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

const mockApiCalls: SerializedApiCall[] = [
  {
    id: "api-1",
    requestTimestamp: "2024-01-15T10:00:00.000Z",
    responseTimestamp: "2024-01-15T10:00:01.000Z",
    durationMs: 1000,
    modelVersion: "gemini-3-flash-preview",
    statusCode: 200,
    errorMessage: null,
    stackTrace: null,
    promptTokens: 100,
    responseTokens: 50,
    promptText: '{"role": "user", "text": "Hello"}',
    responseText: '{"role": "model", "text": "Hi there"}',
    promptType: "hr_interview",
    promptVersion: "v2",
    traceId: "trace-abc-123",
  },
  {
    id: "api-2",
    requestTimestamp: "2024-01-15T10:05:00.000Z",
    responseTimestamp: null,
    durationMs: null,
    modelVersion: "gemini-3-flash-preview",
    statusCode: 500,
    errorMessage: "Internal server error",
    stackTrace: "Error: Internal server error\n  at callGemini (gemini.ts:100)",
    promptTokens: 200,
    responseTokens: null,
    promptText: "Generate code review",
    responseText: null,
    promptType: "code_review",
    promptVersion: null,
    traceId: null,
  },
  {
    id: "api-3",
    requestTimestamp: "2024-01-15T10:10:00.000Z",
    responseTimestamp: "2024-01-15T10:10:02.500Z",
    durationMs: 2500,
    modelVersion: "gemini-3-flash-preview",
    statusCode: 200,
    errorMessage: null,
    stackTrace: null,
    promptTokens: 300,
    responseTokens: 150,
    promptText: "Summarize the task",
    responseText: "Task summary here",
    promptType: "task_description",
    promptVersion: "v1",
    traceId: "trace-xyz-789",
  },
];

describe("ApiCallsTab", () => {
  describe("Empty state", () => {
    it("shows empty state when no API calls", () => {
      render(<ApiCallsTab apiCalls={[]} />);
      expect(screen.getByTestId("api-calls-tab")).toBeInTheDocument();
      expect(
        screen.getByText("No API calls recorded for this assessment")
      ).toBeInTheDocument();
    });
  });

  describe("Summary stats", () => {
    it("shows total calls count", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      expect(screen.getByText("TOTAL CALLS")).toBeInTheDocument();
      // "3" appears in summary and header
      expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    });

    it("shows failed calls count", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      expect(screen.getByText("FAILED")).toBeInTheDocument();
      expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    });

    it("shows token counts", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      expect(screen.getByText("PROMPT TOKENS")).toBeInTheDocument();
      // 100 + 200 + 300 = 600
      expect(screen.getByText("600")).toBeInTheDocument();
      expect(screen.getByText("RESPONSE TOKENS")).toBeInTheDocument();
      // 50 + 0 + 150 = 200 (also "200" appears as status code badges)
      expect(screen.getAllByText("200").length).toBeGreaterThan(0);
    });
  });

  describe("Table rows", () => {
    it("renders all API call rows", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      expect(screen.getByTestId("api-call-row-api-1")).toBeInTheDocument();
      expect(screen.getByTestId("api-call-row-api-2")).toBeInTheDocument();
      expect(screen.getByTestId("api-call-row-api-3")).toBeInTheDocument();
    });

    it("shows prompt types in rows", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      // Each prompt type appears in both mobile and desktop layouts
      expect(screen.getAllByText("hr_interview").length).toBeGreaterThan(0);
      expect(screen.getAllByText("code_review").length).toBeGreaterThan(0);
      expect(screen.getAllByText("task_description").length).toBeGreaterThan(0);
    });

    it("shows error status for failed calls", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      // Multiple 200 badges for successful calls, one 500 for failed
      const errorBadges = screen.getAllByText("500");
      expect(errorBadges.length).toBeGreaterThan(0);
    });

    it("shows header row count", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      expect(screen.getByText("API CALL LOG (3 calls)")).toBeInTheDocument();
    });
  });

  describe("Expandable detail view", () => {
    it("expands row when clicked", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(screen.getByTestId("api-call-detail-api-1")).toBeInTheDocument();
    });

    it("shows metadata bar with model version", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(screen.getByText("MODEL VERSION")).toBeInTheDocument();
    });

    it("shows trace ID in metadata", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(screen.getByText("TRACE ID")).toBeInTheDocument();
    });

    it("shows total tokens in metadata", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(screen.getByText("TOTAL TOKENS")).toBeInTheDocument();
      // 100 + 50 = 150
      expect(screen.getByText("150")).toBeInTheDocument();
    });

    it("shows prompt and response code sections", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(
        screen.getByTestId("inspector-prompt-api-1-section")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("inspector-response-api-1-section")
      ).toBeInTheDocument();
    });

    it("shows copy buttons for prompt and response", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(
        screen.getByTestId("inspector-prompt-api-1-copy-button")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("inspector-response-api-1-copy-button")
      ).toBeInTheDocument();
    });

    it("collapses when clicked again", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(screen.getByTestId("api-call-detail-api-1")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(
        screen.queryByTestId("api-call-detail-api-1")
      ).not.toBeInTheDocument();
    });

    it("only one row expanded at a time", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-1"));
      expect(screen.getByTestId("api-call-detail-api-1")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("api-call-trigger-api-3"));
      expect(
        screen.queryByTestId("api-call-detail-api-1")
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("api-call-detail-api-3")).toBeInTheDocument();
    });
  });

  describe("Error display", () => {
    it("shows error message prominently for failed calls", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-2"));
      expect(screen.getByText("ERROR MESSAGE")).toBeInTheDocument();
      expect(screen.getByText("Internal server error")).toBeInTheDocument();
    });

    it("shows stack trace for failed calls", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-2"));
      expect(screen.getByText("STACK TRACE")).toBeInTheDocument();
      expect(
        screen.getByText(/Error: Internal server error/)
      ).toBeInTheDocument();
    });

    it("shows 'No response data' for calls without response", () => {
      render(<ApiCallsTab apiCalls={mockApiCalls} />);
      fireEvent.click(screen.getByTestId("api-call-trigger-api-2"));
      expect(screen.getByText("No response data")).toBeInTheDocument();
    });
  });
});
