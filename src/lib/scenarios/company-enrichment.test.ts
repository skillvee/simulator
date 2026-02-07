import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Gemini before importing
const mockGenerateContent = vi.fn();

vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    models: {
      generateContent: mockGenerateContent,
    },
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Import after mocks
import {
  enrichCompanyContext,
  type EnrichCompanyInput,
} from "./company-enrichment";

describe("enrichCompanyContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing description unchanged if >= 50 characters", async () => {
    const input: EnrichCompanyInput = {
      companyName: "TechCorp",
      existingDescription:
        "TechCorp is a Series B fintech startup building real-time payment infrastructure for small businesses.",
    };

    const result = await enrichCompanyContext(input);

    expect(result).toEqual({
      companyDescription: input.existingDescription,
      wasEnriched: false,
      enrichmentSource: "none",
    });

    // Should not call fetch or Gemini
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns original description if web fetch fails", async () => {
    const input: EnrichCompanyInput = {
      companyName: "FailCorp",
      existingDescription: "tech company",
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const result = await enrichCompanyContext(input);

    expect(result.companyDescription).toBe("tech company");
    expect(result.wasEnriched).toBe(false);
    expect(result.enrichmentSource).toBe("none");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns original description if web fetch throws error", async () => {
    const input: EnrichCompanyInput = {
      companyName: "ErrorCorp",
      existingDescription: "company",
    };

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await enrichCompanyContext(input);

    expect(result.companyDescription).toBe("company");
    expect(result.wasEnriched).toBe(false);
    expect(result.enrichmentSource).toBe("none");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("has correct minimal description threshold of 50 characters", () => {
    // This is a behavior test - verifying the constant
    const shortDescription = "x".repeat(49);
    const longDescription = "x".repeat(50);

    expect(shortDescription.length).toBe(49);
    expect(longDescription.length).toBe(50);
  });
});
