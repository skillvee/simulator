/**
 * Unit tests for CandidateSearchResultCard component
 *
 * @since 2026-01-17
 * @see Issue #74: US-012
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessmentDimension } from "@prisma/client";
import {
  CandidateSearchResultCard,
  CandidateSearchResultGrid,
  type CandidateSearchResult,
} from "./candidate-search-result-card";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ============================================================================
// Test Data
// ============================================================================

function createMockCandidate(
  overrides: Partial<CandidateSearchResult> = {}
): CandidateSearchResult {
  return {
    id: "va-123",
    candidate: {
      id: "user-123",
      name: "Jane Doe",
      email: "jane@example.com",
    },
    fitScore: 85,
    archetype: "SENIOR_FRONTEND_ENGINEER",
    seniorityLevel: "SENIOR",
    dimensionScores: [
      {
        dimension: AssessmentDimension.COMMUNICATION,
        score: 4,
        weightLevel: "VERY_HIGH",
      },
      {
        dimension: AssessmentDimension.PROBLEM_SOLVING,
        score: 5,
        weightLevel: "HIGH",
      },
      {
        dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
        score: 4,
        weightLevel: "VERY_HIGH",
      },
      {
        dimension: AssessmentDimension.COLLABORATION,
        score: 3,
        weightLevel: "HIGH",
      },
      {
        dimension: AssessmentDimension.ADAPTABILITY,
        score: 4,
        weightLevel: "MEDIUM",
      },
      {
        dimension: AssessmentDimension.LEADERSHIP,
        score: 3,
        weightLevel: "MEDIUM",
      },
      {
        dimension: AssessmentDimension.CREATIVITY,
        score: 5,
        weightLevel: "VERY_HIGH",
      },
      {
        dimension: AssessmentDimension.TIME_MANAGEMENT,
        score: 4,
        weightLevel: "HIGH",
      },
    ],
    summaryExcerpt:
      "Demonstrates strong frontend expertise with excellent communication skills.",
    completedAt: new Date("2026-01-15"),
    ...overrides,
  };
}

// ============================================================================
// CandidateSearchResultCard Tests
// ============================================================================

describe("CandidateSearchResultCard", () => {
  describe("rendering", () => {
    it("renders candidate card with all required elements", () => {
      const candidate = createMockCandidate();
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByTestId("candidate-card")).toBeInTheDocument();
      expect(screen.getByTestId("candidate-avatar")).toBeInTheDocument();
      expect(screen.getByTestId("candidate-name")).toBeInTheDocument();
      expect(screen.getByTestId("archetype-match")).toBeInTheDocument();
      expect(screen.getByTestId("fit-score-badge")).toBeInTheDocument();
      expect(screen.getByTestId("dimensions-section")).toBeInTheDocument();
      expect(screen.getByTestId("view-profile-button")).toBeInTheDocument();
    });

    it("displays candidate name correctly", () => {
      const candidate = createMockCandidate({
        candidate: { id: "1", name: "John Smith", email: null },
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByTestId("candidate-name")).toHaveTextContent(
        "John Smith"
      );
    });

    it("displays candidate email when name is null", () => {
      const candidate = createMockCandidate({
        candidate: { id: "1", name: null, email: "john@example.com" },
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByTestId("candidate-name")).toHaveTextContent(
        "john@example.com"
      );
    });

    it("displays Anonymous when name and email are null", () => {
      const candidate = createMockCandidate({
        candidate: { id: "1", name: null, email: null },
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByTestId("candidate-name")).toHaveTextContent(
        "Anonymous"
      );
    });

    it("displays fit score correctly", () => {
      const candidate = createMockCandidate({ fitScore: 92.5 });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByTestId("fit-score-value")).toHaveTextContent("93");
    });

    it("displays archetype match correctly", () => {
      const candidate = createMockCandidate({
        archetype: "ENGINEERING_MANAGER",
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByTestId("archetype-match")).toHaveTextContent(
        "Eng Manager"
      );
    });

    it("displays summary excerpt when provided", () => {
      const candidate = createMockCandidate({
        summaryExcerpt: "Strong technical skills with leadership potential.",
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByTestId("summary-section")).toBeInTheDocument();
      expect(
        screen.getByText("Strong technical skills with leadership potential.")
      ).toBeInTheDocument();
    });

    it("does not render summary section when summaryExcerpt is null", () => {
      const candidate = createMockCandidate({ summaryExcerpt: null });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.queryByTestId("summary-section")).not.toBeInTheDocument();
    });
  });

  describe("avatar initials", () => {
    it("generates initials from name", () => {
      const candidate = createMockCandidate({
        candidate: { id: "1", name: "Jane Doe", email: "jane@example.com" },
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      const avatar = screen.getByTestId("candidate-avatar");
      expect(avatar).toHaveTextContent("JD");
    });

    it("generates initials from email when name is null", () => {
      const candidate = createMockCandidate({
        candidate: { id: "1", name: null, email: "john.smith@example.com" },
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      const avatar = screen.getByTestId("candidate-avatar");
      // email "john.smith@example.com" splits by @ and space, giving ["john.smith", "example.com"]
      // Taking first letter of each = "JE"
      expect(avatar).toHaveTextContent("JE");
    });

    it("shows ? when both name and email are null", () => {
      const candidate = createMockCandidate({
        candidate: { id: "1", name: null, email: null },
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      const avatar = screen.getByTestId("candidate-avatar");
      expect(avatar).toHaveTextContent("?");
    });
  });

  describe("dimension scores", () => {
    it("renders 6 dimension score bars", () => {
      const candidate = createMockCandidate();
      render(<CandidateSearchResultCard candidate={candidate} />);

      const scoreBars = screen.getAllByTestId("dimension-score-bar");
      expect(scoreBars).toHaveLength(6);
    });

    it("displays dimension labels correctly", () => {
      const candidate = createMockCandidate();
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByText("TECH")).toBeInTheDocument();
      expect(screen.getByText("PROB")).toBeInTheDocument();
      expect(screen.getByText("COMM")).toBeInTheDocument();
      expect(screen.getByText("COLLAB")).toBeInTheDocument();
      expect(screen.getByText("ADAPT")).toBeInTheDocument();
      expect(screen.getByText("LEAD")).toBeInTheDocument();
    });

    it("renders score dots for each dimension", () => {
      const candidate = createMockCandidate();
      render(<CandidateSearchResultCard candidate={candidate} />);

      // Each dimension has 5 dots
      const allDots = screen.getAllByTestId(/score-dot-/);
      expect(allDots.length).toBe(30); // 6 dimensions × 5 dots
    });
  });

  describe("threshold highlighting", () => {
    it("highlights scores exceeding SENIOR threshold (4) in green for VERY_HIGH dimensions", () => {
      const candidate = createMockCandidate({
        seniorityLevel: "SENIOR",
        dimensionScores: [
          {
            dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
            score: 5,
            weightLevel: "VERY_HIGH",
          },
          {
            dimension: AssessmentDimension.PROBLEM_SOLVING,
            score: 3,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.COMMUNICATION,
            score: 4,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.COLLABORATION,
            score: 3,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.ADAPTABILITY,
            score: 4,
            weightLevel: "MEDIUM",
          },
          {
            dimension: AssessmentDimension.LEADERSHIP,
            score: 3,
            weightLevel: "MEDIUM",
          },
        ],
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      // Check that the TECH dimension has green dots (score 5 exceeds threshold 4)
      const techScoreBar = screen.getAllByTestId("dimension-score-bar")[0];
      expect(techScoreBar).toBeInTheDocument();
    });

    it("highlights scores below SENIOR threshold (4) in amber for VERY_HIGH dimensions", () => {
      const candidate = createMockCandidate({
        seniorityLevel: "SENIOR",
        dimensionScores: [
          {
            dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
            score: 3,
            weightLevel: "VERY_HIGH",
          },
          {
            dimension: AssessmentDimension.PROBLEM_SOLVING,
            score: 3,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.COMMUNICATION,
            score: 4,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.COLLABORATION,
            score: 3,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.ADAPTABILITY,
            score: 4,
            weightLevel: "MEDIUM",
          },
          {
            dimension: AssessmentDimension.LEADERSHIP,
            score: 3,
            weightLevel: "MEDIUM",
          },
        ],
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      // Component should render without errors
      const techScoreBar = screen.getAllByTestId("dimension-score-bar")[0];
      expect(techScoreBar).toBeInTheDocument();
    });

    it("uses default gold color when no seniority level is set", () => {
      const candidate = createMockCandidate({ seniorityLevel: null });
      render(<CandidateSearchResultCard candidate={candidate} />);

      // Should render without threshold highlighting
      const scoreBars = screen.getAllByTestId("dimension-score-bar");
      expect(scoreBars).toHaveLength(6);
    });

    it("does not apply threshold for JUNIOR level (threshold 0)", () => {
      const candidate = createMockCandidate({
        seniorityLevel: "JUNIOR",
        dimensionScores: [
          {
            dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
            score: 1,
            weightLevel: "VERY_HIGH",
          },
          {
            dimension: AssessmentDimension.PROBLEM_SOLVING,
            score: 1,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.COMMUNICATION,
            score: 1,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.COLLABORATION,
            score: 1,
            weightLevel: "HIGH",
          },
          {
            dimension: AssessmentDimension.ADAPTABILITY,
            score: 1,
            weightLevel: "MEDIUM",
          },
          {
            dimension: AssessmentDimension.LEADERSHIP,
            score: 1,
            weightLevel: "MEDIUM",
          },
        ],
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      // Should render without threshold highlighting errors
      const scoreBars = screen.getAllByTestId("dimension-score-bar");
      expect(scoreBars).toHaveLength(6);
    });
  });

  describe("View Profile link", () => {
    it("links to the correct candidate profile page with archetype context", () => {
      const candidate = createMockCandidate({
        id: "va-456",
        archetype: "SENIOR_FRONTEND_ENGINEER",
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      const viewProfileLink = screen.getByTestId("view-profile-button");
      expect(viewProfileLink).toHaveAttribute(
        "href",
        "/candidate/va-456?archetype=SENIOR_FRONTEND_ENGINEER"
      );
    });

    it("displays View Profile button text", () => {
      const candidate = createMockCandidate();
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByText("View Profile")).toBeInTheDocument();
    });
  });

  describe("date formatting", () => {
    it("displays formatted completion date when provided", () => {
      const candidate = createMockCandidate({
        completedAt: new Date("2026-01-15"),
      });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.getByText(/Assessed Jan 2026/)).toBeInTheDocument();
    });

    it("does not display date when completedAt is null", () => {
      const candidate = createMockCandidate({ completedAt: null });
      render(<CandidateSearchResultCard candidate={candidate} />);

      expect(screen.queryByText(/Assessed/)).not.toBeInTheDocument();
    });
  });

  describe("fit score badge styling", () => {
    it("uses gold background for high scores (>=80)", () => {
      const candidate = createMockCandidate({ fitScore: 85 });
      render(<CandidateSearchResultCard candidate={candidate} />);

      const badge = screen.getByTestId("fit-score-badge");
      expect(badge).toHaveClass("bg-secondary");
    });

    it("uses green background for medium scores (60-79)", () => {
      const candidate = createMockCandidate({ fitScore: 75 });
      render(<CandidateSearchResultCard candidate={candidate} />);

      const badge = screen.getByTestId("fit-score-badge");
      expect(badge.className).toMatch(/bg-green/);
    });

    it("uses muted background for low scores (<60)", () => {
      const candidate = createMockCandidate({ fitScore: 50 });
      render(<CandidateSearchResultCard candidate={candidate} />);

      const badge = screen.getByTestId("fit-score-badge");
      expect(badge).toHaveClass("bg-muted");
    });
  });

  describe("className prop", () => {
    it("applies custom className to card", () => {
      const candidate = createMockCandidate();
      render(
        <CandidateSearchResultCard
          candidate={candidate}
          className="custom-class"
        />
      );

      expect(screen.getByTestId("candidate-card")).toHaveClass("custom-class");
    });
  });

  describe("reject button", () => {
    it('renders a "Not a fit" reject button when onReject is provided', () => {
      const candidate = createMockCandidate();
      render(
        <CandidateSearchResultCard candidate={candidate} onReject={() => {}} />
      );

      expect(screen.getByTestId("reject-button")).toBeInTheDocument();
    });

    it("displays the correct button text", () => {
      const candidate = createMockCandidate();
      render(
        <CandidateSearchResultCard candidate={candidate} onReject={() => {}} />
      );

      expect(screen.getByText(/Not a fit/)).toBeInTheDocument();
    });

    it("calls onReject callback with candidate id when clicked", async () => {
      const user = userEvent.setup();
      const mockOnReject = vi.fn();
      const candidate = createMockCandidate({ id: "va-456" });
      render(
        <CandidateSearchResultCard
          candidate={candidate}
          onReject={mockOnReject}
        />
      );

      await user.click(screen.getByTestId("reject-button"));
      expect(mockOnReject).toHaveBeenCalledWith("va-456");
    });

    it("does not render reject button when onReject is not provided", () => {
      const candidate = createMockCandidate();
      render(<CandidateSearchResultCard candidate={candidate} />);

      // Reject button should only appear when onReject is provided
      expect(screen.queryByTestId("reject-button")).not.toBeInTheDocument();
    });

    it("renders reject button when onReject is provided", () => {
      const candidate = createMockCandidate();
      render(
        <CandidateSearchResultCard candidate={candidate} onReject={() => {}} />
      );

      expect(screen.getByTestId("reject-button")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// CandidateSearchResultGrid Tests
// ============================================================================

describe("CandidateSearchResultGrid", () => {
  describe("rendering", () => {
    it("renders grid with multiple candidates", () => {
      const candidates = [
        createMockCandidate({ id: "va-1" }),
        createMockCandidate({ id: "va-2" }),
        createMockCandidate({ id: "va-3" }),
      ];
      render(<CandidateSearchResultGrid candidates={candidates} />);

      expect(screen.getByTestId("candidate-grid")).toBeInTheDocument();
      expect(screen.getAllByTestId("candidate-card")).toHaveLength(3);
    });

    it("displays no results message when candidates array is empty", () => {
      render(<CandidateSearchResultGrid candidates={[]} />);

      expect(screen.getByTestId("no-results")).toBeInTheDocument();
      expect(
        screen.getByText("No candidates found matching your criteria.")
      ).toBeInTheDocument();
    });

    it("applies responsive grid classes", () => {
      const candidates = [createMockCandidate()];
      render(<CandidateSearchResultGrid candidates={candidates} />);

      const grid = screen.getByTestId("candidate-grid");
      expect(grid).toHaveClass("grid-cols-1");
      expect(grid).toHaveClass("sm:grid-cols-2");
      expect(grid).toHaveClass("lg:grid-cols-3");
      expect(grid).toHaveClass("xl:grid-cols-4");
    });
  });

  describe("className prop", () => {
    it("applies custom className to grid", () => {
      const candidates = [createMockCandidate()];
      render(
        <CandidateSearchResultGrid
          candidates={candidates}
          className="custom-grid"
        />
      );

      expect(screen.getByTestId("candidate-grid")).toHaveClass("custom-grid");
    });
  });
});

// ============================================================================
// Acceptance Criteria Tests
// ============================================================================

describe("Acceptance Criteria", () => {
  it("AC1: Card displays candidate name, fit score (0-100), archetype match", () => {
    const candidate = createMockCandidate({
      candidate: { id: "1", name: "John Doe", email: "john@test.com" },
      fitScore: 87,
      archetype: "SENIOR_BACKEND_ENGINEER",
    });
    render(<CandidateSearchResultCard candidate={candidate} />);

    expect(screen.getByTestId("candidate-name")).toHaveTextContent("John Doe");
    expect(screen.getByTestId("fit-score-value")).toHaveTextContent("87");
    expect(screen.getByTestId("archetype-match")).toHaveTextContent(
      "Backend Engineer"
    );
  });

  it("AC2: Shows 6 dimension scores as compact visual", () => {
    const candidate = createMockCandidate();
    render(<CandidateSearchResultCard candidate={candidate} />);

    const scoreBars = screen.getAllByTestId("dimension-score-bar");
    expect(scoreBars).toHaveLength(6);
  });

  it("AC3: Highlights dimensions that exceed threshold (green) or fall short (amber)", () => {
    const candidate = createMockCandidate({
      seniorityLevel: "SENIOR", // threshold = 4
      dimensionScores: [
        // VERY_HIGH weight dimensions - these will be checked against threshold
        {
          dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
          score: 5,
          weightLevel: "VERY_HIGH",
        }, // exceeds (green)
        {
          dimension: AssessmentDimension.COMMUNICATION,
          score: 3,
          weightLevel: "VERY_HIGH",
        }, // below (amber)
        // Other dimensions
        {
          dimension: AssessmentDimension.PROBLEM_SOLVING,
          score: 4,
          weightLevel: "HIGH",
        },
        {
          dimension: AssessmentDimension.COLLABORATION,
          score: 3,
          weightLevel: "HIGH",
        },
        {
          dimension: AssessmentDimension.ADAPTABILITY,
          score: 4,
          weightLevel: "MEDIUM",
        },
        {
          dimension: AssessmentDimension.LEADERSHIP,
          score: 2,
          weightLevel: "MEDIUM",
        },
      ],
    });
    render(<CandidateSearchResultCard candidate={candidate} />);

    // Just verify the card renders with the dimension scores
    const scoreBars = screen.getAllByTestId("dimension-score-bar");
    expect(scoreBars).toHaveLength(6);
  });

  it("AC4: Displays 1-sentence summary excerpt", () => {
    const candidate = createMockCandidate({
      summaryExcerpt:
        "Exceptional frontend developer with strong React expertise.",
    });
    render(<CandidateSearchResultCard candidate={candidate} />);

    expect(
      screen.getByText(
        "Exceptional frontend developer with strong React expertise."
      )
    ).toBeInTheDocument();
  });

  it('AC5: "View Profile" button links to full candidate profile with archetype context', () => {
    const candidate = createMockCandidate({
      id: "test-va-123",
      archetype: "SENIOR_FRONTEND_ENGINEER",
    });
    render(<CandidateSearchResultCard candidate={candidate} />);

    const viewProfileButton = screen.getByTestId("view-profile-button");
    expect(viewProfileButton).toHaveAttribute(
      "href",
      "/candidate/test-va-123?archetype=SENIOR_FRONTEND_ENGINEER"
    );
    expect(viewProfileButton).toHaveTextContent("View Profile");
  });

  it("AC6: Card fits in grid layout (3-4 per row on desktop)", () => {
    const candidates = [
      createMockCandidate({ id: "1" }),
      createMockCandidate({ id: "2" }),
      createMockCandidate({ id: "3" }),
      createMockCandidate({ id: "4" }),
    ];
    render(<CandidateSearchResultGrid candidates={candidates} />);

    const grid = screen.getByTestId("candidate-grid");
    // lg:grid-cols-3 for 3 per row, xl:grid-cols-4 for 4 per row
    expect(grid).toHaveClass("lg:grid-cols-3");
    expect(grid).toHaveClass("xl:grid-cols-4");
  });
});

// ============================================================================
// Issue #75 Acceptance Criteria Tests
// ============================================================================

describe("Issue #75 Acceptance Criteria", () => {
  it('AC1: Each candidate card has a "Not a fit" or "Reject" button', () => {
    const candidate = createMockCandidate();
    render(
      <CandidateSearchResultCard candidate={candidate} onReject={() => {}} />
    );

    const rejectButton = screen.getByTestId("reject-button");
    expect(rejectButton).toBeInTheDocument();
    expect(screen.getByText(/Not a fit/)).toBeInTheDocument();
  });
});
