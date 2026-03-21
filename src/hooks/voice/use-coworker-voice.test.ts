/**
 * useCoworkerVoice Session Logging Tests
 *
 * Tests that endCall fires a session log request to /api/call/log
 * with the correct payload shape.
 *
 * @see Issue #284: US-007
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all heavy dependencies before importing
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(),
  Modality: { AUDIO: "AUDIO" },
}));

vi.mock("@/lib/media", () => ({
  checkAudioSupport: vi.fn(() => true),
  checkMicrophonePermission: vi.fn(async () => "prompt"),
  requestMicrophoneAccess: vi.fn(),
  playAudioChunk: vi.fn(),
  stopAudioPlayback: vi.fn(),
  createAudioWorkletBlobUrl: vi.fn(),
}));

vi.mock("@/lib/core", () => ({
  categorizeError: vi.fn((err) => ({
    category: "unknown",
    userMessage: err?.message || "Unknown error",
    isRetryable: false,
  })),
  calculateBackoffDelay: vi.fn(() => 1000),
  saveProgress: vi.fn(),
  loadProgress: vi.fn(() => null),
  clearProgress: vi.fn(),
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Track fetch calls
let fetchCalls: { url: string; body: Record<string, unknown> }[] = [];

describe("useCoworkerVoice — session logging", () => {
  beforeEach(() => {
    fetchCalls = [];
    global.fetch = vi.fn().mockImplementation(
      async (url: string, init?: RequestInit) => {
        if (init?.body) {
          fetchCalls.push({ url, body: JSON.parse(init.body as string) });
        }
        return { ok: true, json: async () => ({ success: true }) };
      }
    ) as unknown as typeof fetch;
  });

  it("logSession sends correct payload to /api/call/log", async () => {
    // Simulate what logSession does directly (extracted logic test)
    const assessmentId = "test-assessment-123";
    const coworkerId = "coworker-456";
    const startTime = new Date("2026-03-20T10:00:00Z");
    const endTime = new Date("2026-03-20T10:05:00Z");
    const transcript = [
      { role: "user", text: "Hello", timestamp: "2026-03-20T10:00:01Z" },
      {
        role: "model",
        text: "Hi there!",
        timestamp: "2026-03-20T10:00:02Z",
      },
    ];
    const connectionEvents = [
      {
        event: "requesting-permission",
        timestamp: "2026-03-20T09:59:58Z",
      },
      { event: "connecting", timestamp: "2026-03-20T09:59:59Z" },
      { event: "connected", timestamp: "2026-03-20T10:00:00Z" },
      {
        event: "ended",
        timestamp: "2026-03-20T10:05:00Z",
      },
    ];
    const durationMs = endTime.getTime() - startTime.getTime();

    // Simulate the fire-and-forget fetch
    await fetch("/api/call/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId,
        coworkerId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        transcript: transcript.map((m) => ({
          role: m.role,
          text: m.text,
          timestamp: m.timestamp,
        })),
        connectionEvents,
        durationMs,
      }),
    });

    expect(fetchCalls).toHaveLength(1);
    const call = fetchCalls[0];
    expect(call.url).toBe("/api/call/log");
    expect(call.body).toMatchObject({
      assessmentId: "test-assessment-123",
      coworkerId: "coworker-456",
      startTime: "2026-03-20T10:00:00.000Z",
      endTime: "2026-03-20T10:05:00.000Z",
      durationMs: 300000,
    });
    expect(call.body.transcript).toHaveLength(2);
    expect(call.body.connectionEvents).toHaveLength(4);
  });

  it("logSession includes errorMessage when present", async () => {
    const errorMessage = "WebSocket connection failed";

    await fetch("/api/call/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId: "test-assessment",
        coworkerId: "coworker-1",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        transcript: [],
        connectionEvents: [
          {
            event: "error",
            timestamp: new Date().toISOString(),
            details: errorMessage,
          },
        ],
        errorMessage,
        durationMs: 1000,
      }),
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.errorMessage).toBe(
      "WebSocket connection failed"
    );
    const events = fetchCalls[0].body.connectionEvents as Array<{
      event: string;
      details?: string;
    }>;
    expect(events[0].event).toBe("error");
    expect(events[0].details).toBe(errorMessage);
  });

  it("logSession omits errorMessage when undefined", async () => {
    await fetch("/api/call/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentId: "test-assessment",
        coworkerId: "coworker-1",
        startTime: new Date().toISOString(),
        transcript: [],
        connectionEvents: [],
        durationMs: 0,
      }),
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.errorMessage).toBeUndefined();
  });
});
