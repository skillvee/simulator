import { describe, it, expect, vi, beforeEach } from "vitest";
import { notFound, redirect } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// Mock database
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/server/db";
import AssessmentLayout from "./layout";

describe("AssessmentLayout - scenario language redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects from English to Spanish when scenario is Spanish", async () => {
    // Setup: Spanish scenario accessed via English URL
    const mockAssessment = {
      scenario: {
        language: "es",
      },
    };
    vi.mocked(db.assessment.findUnique).mockResolvedValue(mockAssessment as any);

    const params = Promise.resolve({
      locale: "en",
      id: "test-assessment-123",
    });

    // Act
    await AssessmentLayout({
      children: <div>Test</div>,
      params,
    });

    // Assert: Should redirect to Spanish URL
    expect(redirect).toHaveBeenCalledWith("/es/assessments/test-assessment-123");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("redirects from Spanish to English when scenario is English", async () => {
    // Setup: English scenario accessed via Spanish URL
    const mockAssessment = {
      scenario: {
        language: "en",
      },
    };
    vi.mocked(db.assessment.findUnique).mockResolvedValue(mockAssessment as any);

    const params = Promise.resolve({
      locale: "es",
      id: "test-assessment-456",
    });

    // Act
    await AssessmentLayout({
      children: <div>Test</div>,
      params,
    });

    // Assert: Should redirect to English URL
    expect(redirect).toHaveBeenCalledWith("/en/assessments/test-assessment-456");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("does not redirect when locale matches scenario language", async () => {
    // Setup: Spanish scenario accessed via Spanish URL
    const mockAssessment = {
      scenario: {
        language: "es",
      },
    };
    vi.mocked(db.assessment.findUnique).mockResolvedValue(mockAssessment as any);

    const params = Promise.resolve({
      locale: "es",
      id: "test-assessment-789",
    });

    const testChild = <div>Test Child Component</div>;

    // Act
    const result = await AssessmentLayout({
      children: testChild,
      params,
    });

    // Assert: Should not redirect, should render children
    expect(redirect).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("returns 404 when assessment does not exist", async () => {
    // Setup: Non-existent assessment
    vi.mocked(db.assessment.findUnique).mockResolvedValue(null);

    const params = Promise.resolve({
      locale: "en",
      id: "non-existent-assessment",
    });

    // Act
    await AssessmentLayout({
      children: <div>Test</div>,
      params,
    });

    // Assert: Should call notFound()
    expect(notFound).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("verifies correct database query parameters", async () => {
    // Setup
    const mockAssessment = {
      scenario: {
        language: "en",
      },
    };
    vi.mocked(db.assessment.findUnique).mockResolvedValue(mockAssessment as any);

    const params = Promise.resolve({
      locale: "en",
      id: "verify-query-assessment",
    });

    // Act
    await AssessmentLayout({
      children: <div>Test</div>,
      params,
    });

    // Assert: Verify the database was queried with correct parameters
    expect(db.assessment.findUnique).toHaveBeenCalledWith({
      where: { id: "verify-query-assessment" },
      select: {
        scenario: {
          select: {
            language: true,
          },
        },
      },
    });
  });
});