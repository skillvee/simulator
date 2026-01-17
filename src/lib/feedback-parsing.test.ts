/**
 * Unit tests for feedback parsing service
 *
 * Parses rejection feedback to extract constraint updates for search refinement.
 *
 * @since 2026-01-17
 * @see Issue #75: US-012b
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mock Gemini - must be before imports due to hoisting
// ============================================================================

vi.mock("@/lib/gemini", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
  TEXT_MODEL: "gemini-3-flash-preview",
}));

// Import after mocking
import { gemini } from "@/lib/gemini";
import { parseFeedback } from "./feedback-parsing";
import type { FeedbackParseResult, ConstraintUpdate } from "./feedback-parsing";

// Cast the mock for type safety
const mockGenerateContent = gemini.models.generateContent as ReturnType<typeof vi.fn>;

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Basic Parsing Tests
// ============================================================================

describe("parseFeedback", () => {
  describe("years of experience extraction", () => {
    it('parses "Need 8+ years, not 5" to years_experience: "8+"', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          constraints: [
            {
              type: "years_experience",
              value: "8+",
              reason: "Candidate has only 5 years",
            },
          ],
        }),
      });

      const result = await parseFeedback("Need 8+ years, not 5");

      expect(result.success).toBe(true);
      expect(result.constraints).toContainEqual(
        expect.objectContaining({
          type: "years_experience",
          value: "8+",
        })
      );
    });

    it('parses "Looking for someone with 10+ years" to years_experience: "10+"', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          constraints: [
            {
              type: "years_experience",
              value: "10+",
              reason: "Role requires senior experience",
            },
          ],
        }),
      });

      const result = await parseFeedback("Looking for someone with 10+ years");

      expect(result.success).toBe(true);
      expect(result.constraints).toContainEqual(
        expect.objectContaining({
          type: "years_experience",
          value: "10+",
        })
      );
    });
  });

  describe("skills extraction", () => {
    it('parses "Looking for more frontend focus" to skills: ["frontend"]', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          constraints: [
            {
              type: "skills",
              value: ["frontend"],
              reason: "Need frontend specialization",
            },
          ],
        }),
      });

      const result = await parseFeedback("Looking for more frontend focus");

      expect(result.success).toBe(true);
      expect(result.constraints).toContainEqual(
        expect.objectContaining({
          type: "skills",
          value: ["frontend"],
        })
      );
    });

    it("parses feedback mentioning specific technologies to skills array", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          constraints: [
            {
              type: "skills",
              value: ["React", "TypeScript"],
              reason: "Need specific tech stack expertise",
            },
          ],
        }),
      });

      const result = await parseFeedback("Need someone who knows React and TypeScript");

      expect(result.success).toBe(true);
      expect(result.constraints).toContainEqual(
        expect.objectContaining({
          type: "skills",
          value: expect.arrayContaining(["React", "TypeScript"]),
        })
      );
    });
  });

  describe("job title extraction", () => {
    it('parses "Need a Tech Lead, not IC" to job_title constraint', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          constraints: [
            {
              type: "job_title",
              value: "Tech Lead",
              reason: "Role requires leadership",
            },
          ],
        }),
      });

      const result = await parseFeedback("Need a Tech Lead, not IC");

      expect(result.success).toBe(true);
      expect(result.constraints).toContainEqual(
        expect.objectContaining({
          type: "job_title",
          value: "Tech Lead",
        })
      );
    });
  });

  describe("location extraction", () => {
    it('parses "Must be in NYC" to location constraint', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          constraints: [
            {
              type: "location",
              value: "NYC",
              reason: "Office-based role",
            },
          ],
        }),
      });

      const result = await parseFeedback("Must be in NYC");

      expect(result.success).toBe(true);
      expect(result.constraints).toContainEqual(
        expect.objectContaining({
          type: "location",
          value: "NYC",
        })
      );
    });
  });

  describe("multiple constraints", () => {
    it("extracts multiple constraints from complex feedback", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          constraints: [
            {
              type: "years_experience",
              value: "8+",
              reason: "Need senior level",
            },
            {
              type: "skills",
              value: ["backend", "Python"],
              reason: "Need backend focus",
            },
          ],
        }),
      });

      const result = await parseFeedback(
        "Need 8+ years and more backend focus, preferably Python"
      );

      expect(result.success).toBe(true);
      expect(result.constraints).toHaveLength(2);
      expect(result.constraints).toContainEqual(
        expect.objectContaining({ type: "years_experience", value: "8+" })
      );
      expect(result.constraints).toContainEqual(
        expect.objectContaining({ type: "skills", value: expect.arrayContaining(["Python"]) })
      );
    });
  });

  describe("error handling", () => {
    it("returns success: false when Gemini call fails", async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error("API error")
      );

      const result = await parseFeedback("Some feedback");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("returns empty constraints for empty feedback", async () => {
      const result = await parseFeedback("");

      expect(result.success).toBe(true);
      expect(result.constraints).toEqual([]);
    });

    it("handles malformed JSON response gracefully", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: "not valid json",
      });

      const result = await parseFeedback("Some feedback");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("processing time", () => {
    it("returns processing time in milliseconds", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ constraints: [] }),
      });

      const result = await parseFeedback("Some feedback");

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// Constraint Type Tests
// ============================================================================

describe("ConstraintUpdate type", () => {
  it("supports years_experience constraint", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        constraints: [{ type: "years_experience", value: "5+" }],
      }),
    });

    const result = await parseFeedback("5+ years");
    expect(result.constraints[0]?.type).toBe("years_experience");
  });

  it("supports skills constraint", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        constraints: [{ type: "skills", value: ["React"] }],
      }),
    });

    const result = await parseFeedback("React experience");
    expect(result.constraints[0]?.type).toBe("skills");
  });

  it("supports job_title constraint", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        constraints: [{ type: "job_title", value: "Engineer" }],
      }),
    });

    const result = await parseFeedback("Engineer role");
    expect(result.constraints[0]?.type).toBe("job_title");
  });

  it("supports location constraint", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        constraints: [{ type: "location", value: "SF" }],
      }),
    });

    const result = await parseFeedback("Based in SF");
    expect(result.constraints[0]?.type).toBe("location");
  });

  it("supports industry constraint", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        constraints: [{ type: "industry", value: ["fintech"] }],
      }),
    });

    const result = await parseFeedback("Fintech background");
    expect(result.constraints[0]?.type).toBe("industry");
  });

  it("supports company_type constraint", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        constraints: [{ type: "company_type", value: ["startup"] }],
      }),
    });

    const result = await parseFeedback("Startup experience");
    expect(result.constraints[0]?.type).toBe("company_type");
  });
});

// ============================================================================
// Acceptance Criteria Tests
// ============================================================================

describe("Acceptance Criteria", () => {
  it('AC4: System parses feedback to extract constraint updates (e.g., years_experience: "8+")', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        constraints: [
          {
            type: "years_experience",
            value: "8+",
            reason: "Need more experience",
          },
        ],
      }),
    });

    const result = await parseFeedback("Need 8+ years, not 5");

    expect(result.success).toBe(true);
    expect(result.constraints).toContainEqual(
      expect.objectContaining({
        type: "years_experience",
        value: "8+",
      })
    );
  });
});
