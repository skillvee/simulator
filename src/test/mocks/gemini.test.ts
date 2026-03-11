/**
 * Gemini Mocks Tests (RED phase)
 *
 * Following TDD: Write tests first, watch them fail, then implement.
 * @see Issue #98: REF-008
 */

import { describe, it, expect, vi, type Mock } from "vitest";
import {
  createMockGeminiSession,
  createMockGeminiResponse,
  MockGeminiSession,
  type GeminiMessage,
} from "./gemini";

describe("createMockGeminiSession", () => {
  it("creates a mock session with send method", () => {
    const session = createMockGeminiSession();

    expect(session.send).toBeDefined();
    expect(typeof session.send).toBe("function");
  });

  it("creates a mock session with close method", () => {
    const session = createMockGeminiSession();

    expect(session.close).toBeDefined();
    expect(typeof session.close).toBe("function");
  });

  it("methods are spy functions", async () => {
    const session = createMockGeminiSession();

    await (session.send as Mock<(msg: GeminiMessage) => Promise<unknown>>)({
      text: "Hello",
    });
    expect(session.send).toHaveBeenCalledWith({ text: "Hello" });
  });

  it("allows configuring default response", () => {
    const customResponse = { text: "Custom response" };
    const session = createMockGeminiSession({
      defaultResponse: customResponse,
    });

    // defaultResponse is expanded to full GeminiResponse format
    expect(session.defaultResponse?.text).toBe("Custom response");
  });

  it("can be used with async/await patterns", async () => {
    const session = createMockGeminiSession();

    // Should not throw - cast to callable mock
    await (session.send as Mock<(msg: GeminiMessage) => Promise<unknown>>)({
      text: "test",
    });
    expect(session.send).toHaveBeenCalled();
  });
});

describe("createMockGeminiResponse", () => {
  it("creates a response with text", () => {
    const response = createMockGeminiResponse({ text: "Hello world" });

    expect(response.text).toBe("Hello world");
  });

  it("creates a response with candidates array", () => {
    const response = createMockGeminiResponse({ text: "Test" });

    expect(response.candidates).toBeDefined();
    expect(Array.isArray(response.candidates)).toBe(true);
  });

  it("allows custom candidates", () => {
    const customCandidates = [{ content: { parts: [{ text: "Custom" }] } }];
    const response = createMockGeminiResponse({
      text: "Test",
      candidates: customCandidates,
    });

    expect(response.candidates).toEqual(customCandidates);
  });

  it("provides usageMetadata", () => {
    const response = createMockGeminiResponse({ text: "Test" });

    expect(response.usageMetadata).toBeDefined();
    expect(response.usageMetadata.promptTokenCount).toBeDefined();
    expect(response.usageMetadata.candidatesTokenCount).toBeDefined();
  });
});

describe("MockGeminiSession class", () => {
  it("can be instantiated", () => {
    const session = new MockGeminiSession();

    expect(session).toBeInstanceOf(MockGeminiSession);
  });

  it("tracks message history", async () => {
    const session = new MockGeminiSession();

    await (session.send as Mock<(msg: GeminiMessage) => Promise<unknown>>)({
      text: "First",
    });
    await (session.send as Mock<(msg: GeminiMessage) => Promise<unknown>>)({
      text: "Second",
    });

    expect(session.messageHistory).toHaveLength(2);
    expect(session.messageHistory[0]).toEqual({ text: "First" });
  });

  it("can be reset", async () => {
    const session = new MockGeminiSession();

    await (session.send as Mock<(msg: GeminiMessage) => Promise<unknown>>)({
      text: "Message",
    });
    session.reset();

    expect(session.messageHistory).toHaveLength(0);
  });

  it("allows setting response behavior", async () => {
    const session = new MockGeminiSession();
    const mockFn = vi.fn().mockReturnValue({ text: "Mocked" });

    session.setResponseHandler(mockFn);
    await (session.send as Mock<(msg: GeminiMessage) => Promise<unknown>>)({
      text: "Test",
    });

    expect(mockFn).toHaveBeenCalled();
  });
});
