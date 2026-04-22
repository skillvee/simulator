/**
 * useVoiceBase Language Tests
 *
 * Tests that language is properly passed through to the token endpoint
 * when provided to the useVoiceBase hook.
 */

import { renderHook, act } from "@testing-library/react";
import { useVoiceBase } from "./use-voice-base";
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
  getOutputFrequencyData: () => new Uint8Array(0),
}));

// Mock API client
vi.mock("@/lib/api/client", () => ({
  buildTracedHeaders: () => ({ "X-Test": "test" }),
}));

// Mock console.log to suppress logs in tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Track fetch calls
let fetchCalls: { url: string; body: Record<string, unknown> }[] = [];

describe("useVoiceBase — language parameter", () => {
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
          },
        }),
      } as Response;
    }) as typeof fetch;
  });

  it("passes language to token endpoint when provided", async () => {
    const { result } = renderHook(() =>
      useVoiceBase({
        assessmentId: "test-assessment",
        config: {
          tokenEndpoint: "/api/call/token",
          enableSessionRecovery: false,
        },
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
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe("/api/call/token");
    expect(fetchCalls[0].body).toMatchObject({
      assessmentId: "test-assessment",
      language: "es",
    });
  });

  it("does not include language in request when not provided", async () => {
    const { result } = renderHook(() =>
      useVoiceBase({
        assessmentId: "test-assessment",
        config: {
          tokenEndpoint: "/api/call/token",
          enableSessionRecovery: false,
        },
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
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe("/api/call/token");
    expect(fetchCalls[0].body).toMatchObject({
      assessmentId: "test-assessment",
    });
    expect(fetchCalls[0].body.language).toBeUndefined();
  });

  it("merges language with tokenRequestBody when both are provided", async () => {
    const { result } = renderHook(() =>
      useVoiceBase({
        assessmentId: "test-assessment",
        config: {
          tokenEndpoint: "/api/call/token",
          enableSessionRecovery: false,
        },
        tokenRequestBody: {
          coworkerId: "coworker-123",
        },
        language: "fr",
      })
    );

    await act(async () => {
      try {
        await result.current.connect();
      } catch {
        // Expected to fail when trying to connect to Gemini
      }
    });

    // Check that both coworkerId and language are included
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body).toMatchObject({
      assessmentId: "test-assessment",
      coworkerId: "coworker-123",
      language: "fr",
    });
  });
});