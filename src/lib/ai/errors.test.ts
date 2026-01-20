import { describe, it, expect, vi } from "vitest";
import { AIError, wrapAICall, isAIError } from "./errors";

describe("AIError", () => {
  const defaultContext = {
    model: "gemini-3-flash-preview",
    promptType: "cv-parsing",
    promptVersion: "1.0",
  };

  describe("constructor", () => {
    it("creates an error with all required properties", () => {
      const error = new AIError(
        "Test error message",
        defaultContext.model,
        defaultContext.promptType,
        defaultContext.promptVersion
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIError);
      expect(error.name).toBe("AIError");
      expect(error.message).toBe("Test error message");
      expect(error.model).toBe("gemini-3-flash-preview");
      expect(error.promptType).toBe("cv-parsing");
      expect(error.promptVersion).toBe("1.0");
      expect(error.originalError).toBeUndefined();
    });

    it("includes original error when provided", () => {
      const originalError = new Error("Original error");
      const error = new AIError(
        "Wrapped error",
        defaultContext.model,
        defaultContext.promptType,
        defaultContext.promptVersion,
        originalError
      );

      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.message).toBe("Original error");
    });

    it("maintains stack trace", () => {
      const error = new AIError(
        "Test error",
        defaultContext.model,
        defaultContext.promptType,
        defaultContext.promptVersion
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("AIError");
    });
  });

  describe("toDetailedString", () => {
    it("formats error details without original error", () => {
      const error = new AIError(
        "Connection failed",
        "gemini-2.5-flash",
        "hr-assessment",
        "2024-01"
      );

      const detailed = error.toDetailedString();

      expect(detailed).toContain("AIError: Connection failed");
      expect(detailed).toContain("Model: gemini-2.5-flash");
      expect(detailed).toContain("Prompt Type: hr-assessment");
      expect(detailed).toContain("Prompt Version: 2024-01");
      expect(detailed).not.toContain("Original Error");
    });

    it("formats error details with original error", () => {
      const originalError = new Error("Network timeout");
      const error = new AIError(
        "AI call failed",
        defaultContext.model,
        defaultContext.promptType,
        defaultContext.promptVersion,
        originalError
      );

      const detailed = error.toDetailedString();

      expect(detailed).toContain("AIError: AI call failed");
      expect(detailed).toContain("Original Error: Network timeout");
    });
  });
});

describe("wrapAICall", () => {
  const defaultContext = {
    model: "gemini-3-flash-preview",
    promptType: "cv-parsing",
    promptVersion: "1.0",
  };

  it("returns the result when the call succeeds", async () => {
    const mockResult = { text: "parsed content" };
    const mockFn = vi.fn().mockResolvedValue(mockResult);

    const result = await wrapAICall(mockFn, defaultContext);

    expect(result).toBe(mockResult);
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it("throws AIError when the call fails with an Error", async () => {
    const originalError = new Error("API rate limit exceeded");
    const mockFn = vi.fn().mockRejectedValue(originalError);

    await expect(wrapAICall(mockFn, defaultContext)).rejects.toThrow(AIError);

    try {
      await wrapAICall(mockFn, defaultContext);
    } catch (error) {
      expect(error).toBeInstanceOf(AIError);
      const aiError = error as AIError;
      expect(aiError.message).toBe("API rate limit exceeded");
      expect(aiError.model).toBe("gemini-3-flash-preview");
      expect(aiError.promptType).toBe("cv-parsing");
      expect(aiError.promptVersion).toBe("1.0");
      expect(aiError.originalError).toBe(originalError);
    }
  });

  it("throws AIError when the call fails with a non-Error value", async () => {
    const mockFn = vi.fn().mockRejectedValue("String error");

    await expect(wrapAICall(mockFn, defaultContext)).rejects.toThrow(AIError);

    try {
      await wrapAICall(mockFn, defaultContext);
    } catch (error) {
      expect(error).toBeInstanceOf(AIError);
      const aiError = error as AIError;
      expect(aiError.message).toBe("String error");
      expect(aiError.originalError).toBeUndefined();
    }
  });

  it("preserves all context in the thrown AIError", async () => {
    const customContext = {
      model: "gemini-2.5-flash-native-audio-latest",
      promptType: "hr-interview",
      promptVersion: "2024-06-15",
    };
    const mockFn = vi.fn().mockRejectedValue(new Error("Test failure"));

    try {
      await wrapAICall(mockFn, customContext);
    } catch (error) {
      const aiError = error as AIError;
      expect(aiError.model).toBe("gemini-2.5-flash-native-audio-latest");
      expect(aiError.promptType).toBe("hr-interview");
      expect(aiError.promptVersion).toBe("2024-06-15");
    }
  });

  it("works with generic type parameter", async () => {
    interface ParsedCV {
      name: string;
      experience: number;
    }

    const mockResult: ParsedCV = { name: "John Doe", experience: 5 };
    const mockFn = vi.fn().mockResolvedValue(mockResult);

    const result = await wrapAICall<ParsedCV>(mockFn, defaultContext);

    expect(result.name).toBe("John Doe");
    expect(result.experience).toBe(5);
  });
});

describe("isAIError", () => {
  it("returns true for AIError instances", () => {
    const error = new AIError("Test", "model", "type", "version");
    expect(isAIError(error)).toBe(true);
  });

  it("returns false for regular Error instances", () => {
    const error = new Error("Regular error");
    expect(isAIError(error)).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isAIError("string error")).toBe(false);
    expect(isAIError(null)).toBe(false);
    expect(isAIError(undefined)).toBe(false);
    expect(isAIError({ message: "object" })).toBe(false);
  });
});
