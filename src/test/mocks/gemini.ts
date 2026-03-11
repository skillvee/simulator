/**
 * Gemini Mocks
 *
 * Provides mock implementations for Gemini AI session and responses.
 * Use these mocks when testing components that interact with Gemini API.
 *
 * @see Issue #98: REF-008
 */

import { vi } from "vitest";

/**
 * Message sent to Gemini session.
 */
export interface GeminiMessage {
  text?: string;
  audio?: string;
  [key: string]: unknown;
}

/**
 * Gemini response candidate.
 */
export interface GeminiCandidate {
  content: {
    parts: Array<{ text?: string; [key: string]: unknown }>;
    role?: string;
  };
  finishReason?: string;
  safetyRatings?: Array<{ category: string; probability: string }>;
}

/**
 * Gemini usage metadata.
 */
export interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

/**
 * Gemini API response.
 */
export interface GeminiResponse {
  text: string;
  candidates: GeminiCandidate[];
  usageMetadata: GeminiUsageMetadata;
}

/**
 * Options for creating a mock Gemini response.
 */
export interface MockGeminiResponseOptions {
  text: string;
  candidates?: GeminiCandidate[];
  usageMetadata?: Partial<GeminiUsageMetadata>;
}

/**
 * Creates a mock Gemini API response.
 *
 * @example
 * const response = createMockGeminiResponse({ text: "Hello!" });
 * expect(response.text).toBe("Hello!");
 */
export function createMockGeminiResponse(
  options: MockGeminiResponseOptions
): GeminiResponse {
  const defaultCandidate: GeminiCandidate = {
    content: {
      parts: [{ text: options.text }],
      role: "model",
    },
    finishReason: "STOP",
  };

  return {
    text: options.text,
    candidates: options.candidates ?? [defaultCandidate],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 20,
      totalTokenCount: 30,
      ...options.usageMetadata,
    },
  };
}

/**
 * Mock Gemini session interface.
 */
export interface MockGeminiSessionInterface {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  defaultResponse?: GeminiResponse;
}

/**
 * Options for creating a mock Gemini session.
 */
export interface MockGeminiSessionOptions {
  defaultResponse?: { text: string };
}

/**
 * Creates a mock Gemini session with spied methods.
 *
 * @example
 * const session = createMockGeminiSession();
 * await session.send({ text: "Hello" });
 * expect(session.send).toHaveBeenCalled();
 */
export function createMockGeminiSession(
  options?: MockGeminiSessionOptions
): MockGeminiSessionInterface {
  const defaultResponse = options?.defaultResponse
    ? createMockGeminiResponse(options.defaultResponse)
    : createMockGeminiResponse({ text: "Mock response" });

  return {
    send: vi.fn().mockResolvedValue(defaultResponse),
    close: vi.fn().mockResolvedValue(undefined),
    defaultResponse,
  };
}

/**
 * Full-featured mock Gemini session class for advanced testing scenarios.
 *
 * @example
 * const session = new MockGeminiSession();
 * session.setResponseHandler((msg) => ({ text: `Echo: ${msg.text}` }));
 * await session.send({ text: "Hello" });
 */
export class MockGeminiSession {
  public messageHistory: GeminiMessage[] = [];
  public send: ReturnType<typeof vi.fn>;
  public close: ReturnType<typeof vi.fn>;

  private responseHandler: ((message: GeminiMessage) => GeminiResponse) | null =
    null;
  private defaultResponse: GeminiResponse;

  constructor(options?: MockGeminiSessionOptions) {
    this.defaultResponse = options?.defaultResponse
      ? createMockGeminiResponse(options.defaultResponse)
      : createMockGeminiResponse({ text: "Mock response" });

    this.send = vi.fn().mockImplementation(async (message: GeminiMessage) => {
      this.messageHistory.push(message);

      if (this.responseHandler) {
        return this.responseHandler(message);
      }

      return this.defaultResponse;
    });

    this.close = vi.fn().mockResolvedValue(undefined);
  }

  /**
   * Sets a custom response handler function.
   */
  setResponseHandler(
    handler: (message: GeminiMessage) => GeminiResponse
  ): void {
    this.responseHandler = handler;
  }

  /**
   * Resets the session state (clears message history and mocks).
   */
  reset(): void {
    this.messageHistory = [];
    this.send.mockClear();
    this.close.mockClear();
    this.responseHandler = null;
  }
}
