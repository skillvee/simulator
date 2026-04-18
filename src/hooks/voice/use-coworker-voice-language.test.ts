/**
 * useCoworkerVoice Language Tests
 *
 * Tests that language is properly passed through to the token endpoint
 * when provided to the useCoworkerVoice hook.
 */

import { renderHook, act } from "@testing-library/react";
import { useCoworkerVoice } from "./use-coworker-voice";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock media functions
vi.mock("@/lib/media", () => ({
  checkAudioSupport: () => true,
  checkMicrophonePermission: () => Promise.resolve("prompt" as const),
  requestMicrophoneAccess: () =>
    Promise.resolve({
      getTracks: () => [{ stop: () => {} }],
    } as MediaStream),
  playAudioChunk: () => Promise.resolve(),
  stopAudioPlayback: () => {},
  createAudioWorkletBlobUrl: () => "blob:test",
}));

// Mock API client
vi.mock("@/lib/api/client", () => ({
  buildTracedHeaders: () => ({ "X-Test": "test" }),
}));

// Mock progress functions
vi.mock("@/lib/core", () => ({
  createLogger: () => ({
    log: () => {},
    error: () => {},
    warn: () => {},
  }),
  saveProgress: () => {},
  loadProgress: () => null,
  clearProgress: () => {},
  categorizeError: (err: unknown) => ({
    category: "connection",
    userMessage: String(err),
    isRetryable: false,
    originalError: err,
  }),
  calculateBackoffDelay: () => 1000,
}));

// Track fetch calls
let fetchCalls: { url: string; body: Record<string, unknown> }[] = [];

describe("useCoworkerVoice — language parameter", () => {
  beforeEach(() => {
    fetchCalls = [];
    vi.clearAllMocks();

    // Mock global fetch
    global.fetch = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const urlString = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const body = init?.body ? JSON.parse(init.body as string) : {};
      fetchCalls.push({ url: urlString, body });

      // Return successful token response
      return {
        ok: true,
        json: async () => ({
          data: {
            token: "test-token",
            coworkerId: "coworker-123",
            coworkerName: "Test Coworker",
            coworkerRole: "Engineer",
            isDefenseCall: false,
          },
        }),
      } as Response;
    }) as typeof fetch;
  });

  it("passes language to token endpoint when provided", async () => {
    const { result } = renderHook(() =>
      useCoworkerVoice({
        assessmentId: "test-assessment",
        coworkerId: "coworker-123",
        language: "es",
      })
    );

    // Try to connect (will fail due to mocked Gemini, but that's okay)
    await act(async () => {
      try {
        await result.current.connect();
      } catch {
        // Expected to fail when trying to connect to Gemini
      }
    });

    // Check that fetch was called with the language
    const tokenCall = fetchCalls.find((call) =>
      call.url.includes("/api/call/token")
    );
    expect(tokenCall).toBeDefined();
    expect(tokenCall?.body).toMatchObject({
      assessmentId: "test-assessment",
      coworkerId: "coworker-123",
      language: "es",
    });
  });

  it("does not include language in request when not provided", async () => {
    const { result } = renderHook(() =>
      useCoworkerVoice({
        assessmentId: "test-assessment",
        coworkerId: "coworker-123",
        // No language provided
      })
    );

    await act(async () => {
      try {
        await result.current.connect();
      } catch {
        // Expected to fail when trying to connect to Gemini
      }
    });

    // Check that fetch was called without language
    const tokenCall = fetchCalls.find((call) =>
      call.url.includes("/api/call/token")
    );
    expect(tokenCall).toBeDefined();
    expect(tokenCall?.body).toMatchObject({
      assessmentId: "test-assessment",
      coworkerId: "coworker-123",
    });
    expect(tokenCall?.body.language).toBeUndefined();
  });

  it("passes language through the entire flow", async () => {
    const { result } = renderHook(() =>
      useCoworkerVoice({
        assessmentId: "test-assessment",
        coworkerId: "coworker-123",
        language: "fr",
      })
    );

    // Try to connect
    await act(async () => {
      try {
        await result.current.connect();
      } catch {
        // Expected to fail when trying to connect to Gemini
      }
    });

    // Verify that the language was passed to the token endpoint
    const tokenCall = fetchCalls.find((call) =>
      call.url.includes("/api/call/token")
    );
    expect(tokenCall).toBeDefined();
    expect(tokenCall?.body).toMatchObject({
      assessmentId: "test-assessment",
      coworkerId: "coworker-123",
      language: "fr",
    });

    // The test verifies that language is properly threaded through the hook
    // The actual transcript saving happens in endCall but doesn't need language
  });
});