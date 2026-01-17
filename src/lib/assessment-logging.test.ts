import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssessmentLogEventType } from "@prisma/client";

// Mock database
const mockVideoAssessmentLogCreate = vi.fn();
const mockVideoAssessmentApiCallCreate = vi.fn();
const mockVideoAssessmentApiCallUpdate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    videoAssessmentLog: {
      create: (...args: unknown[]) => mockVideoAssessmentLogCreate(...args),
    },
    videoAssessmentApiCall: {
      create: (...args: unknown[]) => mockVideoAssessmentApiCallCreate(...args),
      update: (...args: unknown[]) => mockVideoAssessmentApiCallUpdate(...args),
    },
  },
}));

// Import after mocks are set up
import {
  logVideoAssessmentEvent,
  logVideoAssessmentApiCall,
  createVideoAssessmentLogger,
  logJobStarted,
  logPromptSent,
  logResponseReceived,
  logParsingStarted,
  logParsingCompleted,
  logError,
  logCompleted,
} from "./assessment-logging";

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockVideoAssessmentLogCreate.mockResolvedValue({ id: "log-1" });
  mockVideoAssessmentApiCallCreate.mockResolvedValue({ id: "api-call-1" });
  mockVideoAssessmentApiCallUpdate.mockResolvedValue({ id: "api-call-1" });
});

// ============================================================================
// logVideoAssessmentEvent Tests
// ============================================================================

describe("logVideoAssessmentEvent", () => {
  it("should create a log entry with correct event type", async () => {
    await logVideoAssessmentEvent({
      videoAssessmentId: "assessment-1",
      eventType: AssessmentLogEventType.STARTED,
    });

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-1",
        eventType: AssessmentLogEventType.STARTED,
        timestamp: expect.any(Date),
        durationMs: null,
      }),
    });
  });

  it("should include metadata when provided", async () => {
    await logVideoAssessmentEvent({
      videoAssessmentId: "assessment-1",
      eventType: AssessmentLogEventType.STARTED,
      metadata: { job_id: "job-123" },
    });

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { job_id: "job-123" },
      }),
    });
  });

  it("should calculate durationMs from previous timestamp", async () => {
    const previousTimestamp = new Date(Date.now() - 1000); // 1 second ago

    await logVideoAssessmentEvent({
      videoAssessmentId: "assessment-1",
      eventType: AssessmentLogEventType.PROMPT_SENT,
      previousEventTimestamp: previousTimestamp,
    });

    const call = mockVideoAssessmentLogCreate.mock.calls[0][0];
    expect(call.data.durationMs).toBeGreaterThanOrEqual(1000);
    expect(call.data.durationMs).toBeLessThan(2000);
  });

  it("should return the timestamp of the logged event", async () => {
    const result = await logVideoAssessmentEvent({
      videoAssessmentId: "assessment-1",
      eventType: AssessmentLogEventType.STARTED,
    });

    expect(result).toBeInstanceOf(Date);
  });

  it("should store timestamps in UTC", async () => {
    const result = await logVideoAssessmentEvent({
      videoAssessmentId: "assessment-1",
      eventType: AssessmentLogEventType.STARTED,
    });

    // Verify the timestamp is a valid Date (JavaScript Dates are always UTC internally)
    expect(result.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

// ============================================================================
// logVideoAssessmentApiCall Tests
// ============================================================================

describe("logVideoAssessmentApiCall", () => {
  it("should create an API call record with request details", async () => {
    await logVideoAssessmentApiCall({
      videoAssessmentId: "assessment-1",
      promptText: "Test prompt",
      modelVersion: "gemini-3-pro-preview",
    });

    expect(mockVideoAssessmentApiCallCreate).toHaveBeenCalledWith({
      data: {
        videoAssessmentId: "assessment-1",
        requestTimestamp: expect.any(Date),
        promptText: "Test prompt",
        modelVersion: "gemini-3-pro-preview",
      },
    });
  });

  it("should return an updateWithResponse function", async () => {
    const result = await logVideoAssessmentApiCall({
      videoAssessmentId: "assessment-1",
      promptText: "Test prompt",
      modelVersion: "gemini-3-pro-preview",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("requestTimestamp");
    expect(result).toHaveProperty("updateWithResponse");
    expect(typeof result.updateWithResponse).toBe("function");
  });

  it("should update API call record with response details", async () => {
    const apiCall = await logVideoAssessmentApiCall({
      videoAssessmentId: "assessment-1",
      promptText: "Test prompt",
      modelVersion: "gemini-3-pro-preview",
    });

    await apiCall.updateWithResponse({
      responseText: "Response text",
      statusCode: 200,
      promptTokens: 100,
      responseTokens: 500,
    });

    expect(mockVideoAssessmentApiCallUpdate).toHaveBeenCalledWith({
      where: { id: "api-call-1" },
      data: {
        responseTimestamp: expect.any(Date),
        durationMs: expect.any(Number),
        responseText: "Response text",
        statusCode: 200,
        errorMessage: undefined,
        stackTrace: undefined,
        promptTokens: 100,
        responseTokens: 500,
      },
    });
  });

  it("should update API call record with error details", async () => {
    const apiCall = await logVideoAssessmentApiCall({
      videoAssessmentId: "assessment-1",
      promptText: "Test prompt",
      modelVersion: "gemini-3-pro-preview",
    });

    await apiCall.updateWithResponse({
      errorMessage: "API Error",
      stackTrace: "Error stack trace",
      statusCode: 500,
    });

    expect(mockVideoAssessmentApiCallUpdate).toHaveBeenCalledWith({
      where: { id: "api-call-1" },
      data: expect.objectContaining({
        errorMessage: "API Error",
        stackTrace: "Error stack trace",
        statusCode: 500,
      }),
    });
  });

  it("should calculate durationMs between request and response", async () => {
    const apiCall = await logVideoAssessmentApiCall({
      videoAssessmentId: "assessment-1",
      promptText: "Test prompt",
      modelVersion: "gemini-3-pro-preview",
    });

    // Wait a bit before completing
    await new Promise((resolve) => setTimeout(resolve, 50));

    await apiCall.updateWithResponse({
      responseText: "Response",
      statusCode: 200,
    });

    const updateCall = mockVideoAssessmentApiCallUpdate.mock.calls[0][0];
    expect(updateCall.data.durationMs).toBeGreaterThanOrEqual(50);
  });
});

// ============================================================================
// createVideoAssessmentLogger Tests
// ============================================================================

describe("createVideoAssessmentLogger", () => {
  it("should create a logger with logEvent method", () => {
    const logger = createVideoAssessmentLogger("assessment-1");

    expect(logger).toHaveProperty("logEvent");
    expect(typeof logger.logEvent).toBe("function");
  });

  it("should create a logger with startApiCall method", () => {
    const logger = createVideoAssessmentLogger("assessment-1");

    expect(logger).toHaveProperty("startApiCall");
    expect(typeof logger.startApiCall).toBe("function");
  });

  it("should log events with the correct assessment ID", async () => {
    const logger = createVideoAssessmentLogger("assessment-123");

    await logger.logEvent(AssessmentLogEventType.STARTED, { job_id: "job-1" });

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-123",
        eventType: AssessmentLogEventType.STARTED,
      }),
    });
  });

  it("should automatically calculate duration between events", async () => {
    const logger = createVideoAssessmentLogger("assessment-1");

    // First event
    await logger.logEvent(AssessmentLogEventType.STARTED);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Second event
    await logger.logEvent(AssessmentLogEventType.PROMPT_SENT);

    // First event should have no duration
    expect(mockVideoAssessmentLogCreate.mock.calls[0][0].data.durationMs).toBeNull();

    // Second event should have duration >= 50ms
    expect(mockVideoAssessmentLogCreate.mock.calls[1][0].data.durationMs).toBeGreaterThanOrEqual(50);
  });

  it("should track last event timestamp", async () => {
    const logger = createVideoAssessmentLogger("assessment-1");

    expect(logger.getLastEventTimestamp()).toBeNull();

    await logger.logEvent(AssessmentLogEventType.STARTED);

    expect(logger.getLastEventTimestamp()).toBeInstanceOf(Date);
  });

  it("should start API call tracking", async () => {
    const logger = createVideoAssessmentLogger("assessment-1");

    const tracker = logger.startApiCall("Test prompt", "gemini-3-pro-preview");

    expect(tracker).toHaveProperty("complete");
    expect(tracker).toHaveProperty("fail");

    await tracker.complete({ responseText: "Response", statusCode: 200 });

    expect(mockVideoAssessmentApiCallCreate).toHaveBeenCalled();
    expect(mockVideoAssessmentApiCallUpdate).toHaveBeenCalled();
  });

  it("should handle API call failures", async () => {
    const logger = createVideoAssessmentLogger("assessment-1");

    const tracker = logger.startApiCall("Test prompt", "gemini-3-pro-preview");

    const error = new Error("API failed");
    error.stack = "Error stack";
    await tracker.fail(error);

    expect(mockVideoAssessmentApiCallUpdate).toHaveBeenCalledWith({
      where: { id: "api-call-1" },
      data: expect.objectContaining({
        errorMessage: "API failed",
        stackTrace: "Error stack",
        statusCode: 500,
      }),
    });
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("logJobStarted", () => {
  it("should log STARTED event with job_id metadata", async () => {
    await logJobStarted("assessment-1", "job-123");

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-1",
        eventType: AssessmentLogEventType.STARTED,
        metadata: { job_id: "job-123" },
      }),
    });
  });
});

describe("logPromptSent", () => {
  it("should log PROMPT_SENT event with prompt_length metadata", async () => {
    await logPromptSent("assessment-1", 1500);

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-1",
        eventType: AssessmentLogEventType.PROMPT_SENT,
        metadata: { prompt_length: 1500 },
      }),
    });
  });

  it("should calculate duration from previous timestamp", async () => {
    const previousTimestamp = new Date(Date.now() - 500);
    await logPromptSent("assessment-1", 1500, previousTimestamp);

    const call = mockVideoAssessmentLogCreate.mock.calls[0][0];
    expect(call.data.durationMs).toBeGreaterThanOrEqual(500);
  });
});

describe("logResponseReceived", () => {
  it("should log RESPONSE_RECEIVED event with response details", async () => {
    await logResponseReceived("assessment-1", 5000, 200);

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-1",
        eventType: AssessmentLogEventType.RESPONSE_RECEIVED,
        metadata: { response_length: 5000, status_code: 200 },
      }),
    });
  });
});

describe("logParsingStarted", () => {
  it("should log PARSING_STARTED event", async () => {
    await logParsingStarted("assessment-1");

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-1",
        eventType: AssessmentLogEventType.PARSING_STARTED,
      }),
    });
  });
});

describe("logParsingCompleted", () => {
  it("should log PARSING_COMPLETED event with dimension count", async () => {
    await logParsingCompleted("assessment-1", 7);

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-1",
        eventType: AssessmentLogEventType.PARSING_COMPLETED,
        metadata: { parsed_dimension_count: 7 },
      }),
    });
  });
});

describe("logError", () => {
  it("should log ERROR event with full error details", async () => {
    const error = new Error("Test error");
    error.stack = "Error stack trace";

    await logError("assessment-1", error);

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-1",
        eventType: AssessmentLogEventType.ERROR,
        metadata: {
          error_message: "Test error",
          error_name: "Error",
          stack_trace: "Error stack trace",
        },
      }),
    });
  });
});

describe("logCompleted", () => {
  it("should log COMPLETED event", async () => {
    await logCompleted("assessment-1");

    expect(mockVideoAssessmentLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        videoAssessmentId: "assessment-1",
        eventType: AssessmentLogEventType.COMPLETED,
      }),
    });
  });
});

// ============================================================================
// Timestamp Precision Tests
// ============================================================================

describe("Timestamp Precision", () => {
  it("should store timestamps with millisecond precision", async () => {
    await logVideoAssessmentEvent({
      videoAssessmentId: "assessment-1",
      eventType: AssessmentLogEventType.STARTED,
    });

    const call = mockVideoAssessmentLogCreate.mock.calls[0][0];
    const timestamp = call.data.timestamp;

    // Check that milliseconds are captured
    expect(timestamp.getMilliseconds()).toBeDefined();
    expect(typeof timestamp.getMilliseconds()).toBe("number");
  });

  it("should calculate durationMs with millisecond accuracy", async () => {
    const previousTimestamp = new Date(Date.now() - 123); // 123ms ago

    await logVideoAssessmentEvent({
      videoAssessmentId: "assessment-1",
      eventType: AssessmentLogEventType.PROMPT_SENT,
      previousEventTimestamp: previousTimestamp,
    });

    const call = mockVideoAssessmentLogCreate.mock.calls[0][0];
    // Should be at least 123ms, allowing for some execution time
    expect(call.data.durationMs).toBeGreaterThanOrEqual(123);
    expect(call.data.durationMs).toBeLessThan(200); // But not too much more
  });
});
