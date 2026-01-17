import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssessmentDimension, VideoAssessmentStatus } from "@prisma/client";

// Define mock functions before vi.mock calls
const mockVideoAssessmentFindUnique = vi.fn();
const mockNotFound = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    videoAssessment: {
      findUnique: (args: unknown) => mockVideoAssessmentFindUnique(args),
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NOT_FOUND");
  },
}));

// Import after mocks are set up
import CandidateProfilePage from "./page";

// Factory function to create test video assessments
function createTestVideoAssessment(
  overrides: Partial<{
    id: string;
    candidateId: string;
    videoUrl: string;
    status: VideoAssessmentStatus;
    completedAt: Date | null;
    isSearchable: boolean;
    candidate: { id: string; name: string | null; email: string };
    scores: Array<{
      id: string;
      dimension: AssessmentDimension;
      score: number;
      observableBehaviors: string;
      trainableGap: boolean;
    }>;
    summary: { overallSummary: string } | null;
    assessment: { id: string } | null;
  }> = {}
) {
  return {
    id: "va-123",
    candidateId: "user-123",
    videoUrl: "https://example.com/video.mp4",
    status: VideoAssessmentStatus.COMPLETED,
    completedAt: new Date("2024-01-15T10:00:00Z"),
    isSearchable: true,
    candidate: {
      id: "user-123",
      name: "Jane Smith",
      email: "jane@example.com",
    },
    scores: [
      {
        id: "score-1",
        dimension: AssessmentDimension.COMMUNICATION,
        score: 4,
        observableBehaviors: "Clear communication throughout",
        trainableGap: false,
      },
      {
        id: "score-2",
        dimension: AssessmentDimension.PROBLEM_SOLVING,
        score: 5,
        observableBehaviors: "Excellent problem decomposition",
        trainableGap: false,
      },
      {
        id: "score-3",
        dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
        score: 4,
        observableBehaviors: "Strong technical foundation",
        trainableGap: false,
      },
      {
        id: "score-4",
        dimension: AssessmentDimension.COLLABORATION,
        score: 3,
        observableBehaviors: "Good team interaction",
        trainableGap: true,
      },
      {
        id: "score-5",
        dimension: AssessmentDimension.ADAPTABILITY,
        score: 4,
        observableBehaviors: "Adapted well to changes",
        trainableGap: false,
      },
      {
        id: "score-6",
        dimension: AssessmentDimension.LEADERSHIP,
        score: 3,
        observableBehaviors: "Showed initiative",
        trainableGap: true,
      },
      {
        id: "score-7",
        dimension: AssessmentDimension.CREATIVITY,
        score: 4,
        observableBehaviors: "Creative solutions proposed",
        trainableGap: false,
      },
      {
        id: "score-8",
        dimension: AssessmentDimension.TIME_MANAGEMENT,
        score: 5,
        observableBehaviors: "Excellent time management",
        trainableGap: false,
      },
    ],
    summary: {
      overallSummary:
        "Jane demonstrated strong technical skills and excellent problem-solving abilities throughout the simulation.",
    },
    assessment: { id: "assessment-123" },
    ...overrides,
  };
}

describe("/candidate/[id] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("not found handling", () => {
    it("returns 404 when video assessment not found", async () => {
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(null);

      await expect(
        CandidateProfilePage({ params: Promise.resolve({ id: "nonexistent" }) })
      ).rejects.toThrow("NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("returns 404 when assessment is not completed", async () => {
      const incompleteAssessment = createTestVideoAssessment({
        status: VideoAssessmentStatus.PROCESSING,
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(incompleteAssessment);

      await expect(
        CandidateProfilePage({ params: Promise.resolve({ id: "va-123" }) })
      ).rejects.toThrow("NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("returns 404 when assessment is pending", async () => {
      const pendingAssessment = createTestVideoAssessment({
        status: VideoAssessmentStatus.PENDING,
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(pendingAssessment);

      await expect(
        CandidateProfilePage({ params: Promise.resolve({ id: "va-123" }) })
      ).rejects.toThrow("NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });

    it("returns 404 when assessment has failed", async () => {
      const failedAssessment = createTestVideoAssessment({
        status: VideoAssessmentStatus.FAILED,
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(failedAssessment);

      await expect(
        CandidateProfilePage({ params: Promise.resolve({ id: "va-123" }) })
      ).rejects.toThrow("NOT_FOUND");
      expect(mockNotFound).toHaveBeenCalled();
    });
  });

  describe("candidate info display", () => {
    it("displays candidate name", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("displays candidate email", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("displays simulation completion date", async () => {
      const assessment = createTestVideoAssessment({
        completedAt: new Date("2024-01-15T10:00:00Z"),
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      // Should display formatted date
      expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
    });

    it("displays fallback when name is not available", async () => {
      const assessment = createTestVideoAssessment({
        candidate: { id: "user-123", name: null, email: "jane@example.com" },
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      // Should show email as the display name (h1) when name is null
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("jane@example.com");
    });
  });

  describe("dimension scores display", () => {
    it("displays all 8 dimension scores", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      const { container } = render(result);

      // Check all 8 dimensions are displayed by looking for their labels
      const dimensionCards = container.querySelectorAll(".border-2.border-foreground.p-4");
      expect(dimensionCards.length).toBe(8);

      // Verify dimension names exist in the page
      expect(container.textContent).toContain("Communication");
      expect(container.textContent).toContain("Problem Solving");
      expect(container.textContent).toContain("Technical Knowledge");
      expect(container.textContent).toContain("Collaboration");
      expect(container.textContent).toContain("Adaptability");
      expect(container.textContent).toContain("Leadership");
      expect(container.textContent).toContain("Creativity");
      expect(container.textContent).toContain("Time Management");
    });

    it("displays visual score indicators (1-5 scale)", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      const { container } = render(result);

      // Should have score bars with segments (5 segments per score)
      const scoreSegments = container.querySelectorAll('[data-testid="score-segment"]');
      // 8 dimensions × 5 segments = 40 segments
      expect(scoreSegments.length).toBe(40);
    });

    it("displays score values numerically", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      const { container } = render(result);

      // Check that score displays exist with the expected format (N/5)
      const pageContent = container.textContent || "";

      // All 8 test scores should be present
      expect(pageContent).toContain("4/5");
      expect(pageContent).toContain("5/5");
      expect(pageContent).toContain("3/5");

      // Count score bars (each dimension has one)
      const scoreBars = container.querySelectorAll('[data-testid="score-bar"]');
      expect(scoreBars.length).toBe(8);
    });

    it("handles missing scores gracefully", async () => {
      const assessment = createTestVideoAssessment({
        scores: [], // No scores
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      // Should show "No scores available" or similar message
      expect(
        screen.getByText(/No scores available|Assessment pending/i)
      ).toBeInTheDocument();
    });
  });

  describe("overall summary display", () => {
    it("displays overall summary text", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      expect(
        screen.getByText(
          /Jane demonstrated strong technical skills and excellent problem-solving abilities/
        )
      ).toBeInTheDocument();
    });

    it("handles missing summary gracefully", async () => {
      const assessment = createTestVideoAssessment({
        summary: null,
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      // Should show "Summary not available" or similar message
      expect(
        screen.getByText(/No summary available|Summary pending/i)
      ).toBeInTheDocument();
    });
  });

  describe("searchable status", () => {
    it("displays searchable status as public by default", async () => {
      const assessment = createTestVideoAssessment({
        isSearchable: true,
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      expect(
        screen.getByText(/Searchable by hiring managers|Public/i)
      ).toBeInTheDocument();
    });

    it("displays private status when not searchable", async () => {
      const assessment = createTestVideoAssessment({
        isSearchable: false,
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      expect(
        screen.getByText(/Private|Not searchable/i)
      ).toBeInTheDocument();
    });
  });

  describe("recording link", () => {
    it("displays link to view simulation recording", async () => {
      const assessment = createTestVideoAssessment({
        assessment: { id: "assessment-123" },
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      const { container } = render(result);

      const recordingLink = container.querySelector(
        'a[href*="/assessment/assessment-123"]'
      );
      expect(recordingLink).toBeInTheDocument();
      expect(recordingLink).toHaveTextContent(/View.*Recording|Watch.*Simulation/i);
    });

    it("hides recording link when no linked assessment", async () => {
      const assessment = createTestVideoAssessment({
        assessment: null,
      });
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      render(result);

      // Should not show recording link
      expect(
        screen.queryByText(/View.*Recording|Watch.*Simulation/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("database query", () => {
    it("fetches video assessment with correct includes", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });

      expect(mockVideoAssessmentFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "va-123" },
          include: expect.objectContaining({
            candidate: expect.any(Object),
            scores: expect.any(Boolean),
            summary: expect.any(Boolean),
            assessment: expect.any(Object),
          }),
        })
      );
    });
  });

  describe("neo-brutalist styling", () => {
    it("uses score bar segments for visual indicators", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      const { container } = render(result);

      // Check for neo-brutalist score bar styling
      const scoreBar = container.querySelector('[data-testid="score-bar"]');
      expect(scoreBar).toBeInTheDocument();
    });

    it("applies border-2 styling to sections", async () => {
      const assessment = createTestVideoAssessment();
      mockVideoAssessmentFindUnique.mockResolvedValueOnce(assessment);

      const result = await CandidateProfilePage({
        params: Promise.resolve({ id: "va-123" }),
      });
      const { container } = render(result);

      // Check for neo-brutalist borders
      const sections = container.querySelectorAll(".border-2");
      expect(sections.length).toBeGreaterThan(0);
    });
  });
});
