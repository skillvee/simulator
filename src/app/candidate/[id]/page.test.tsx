import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssessmentDimension, VideoAssessmentStatus } from "@prisma/client";

// Define mock functions before vi.mock calls
const mockVideoAssessmentFindUnique = vi.fn();
const mockNotFound = vi.fn();
const mockGet = vi.fn();
const mockReplace = vi.fn();
const mockPathname = "/candidate/va-123";

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
  useSearchParams: () => ({
    get: mockGet,
    toString: () => "",
  }),
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
}));

// Import after mocks are set up
import CandidateProfilePage from "./page";
import {
  CandidateProfileClient,
  parseTimestampToSeconds,
  normalizeTimestamp,
  formatTime,
  type CandidateProfileData,
} from "./client";

// Factory function to create test video assessments
function createTestVideoAssessment(
  overrides: Partial<{
    id: string;
    candidateId: string;
    videoUrl: string;
    status: VideoAssessmentStatus;
    completedAt: Date | null;
    isSearchable: boolean;
    candidate: { id: string; name: string | null; email: string | null };
    scores: Array<{
      id: string;
      dimension: AssessmentDimension;
      score: number;
      observableBehaviors: string;
      trainableGap: boolean;
      timestamps: unknown;
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
        timestamps: ["2:34", "5:12"],
      },
      {
        id: "score-2",
        dimension: AssessmentDimension.PROBLEM_SOLVING,
        score: 5,
        observableBehaviors: "Excellent problem decomposition",
        trainableGap: false,
        timestamps: ["10:45"],
      },
      {
        id: "score-3",
        dimension: AssessmentDimension.TECHNICAL_KNOWLEDGE,
        score: 4,
        observableBehaviors: "Strong technical foundation",
        trainableGap: false,
        timestamps: [],
      },
      {
        id: "score-4",
        dimension: AssessmentDimension.COLLABORATION,
        score: 3,
        observableBehaviors: "Good team interaction",
        trainableGap: true,
        timestamps: ["15:30", "22:15"],
      },
      {
        id: "score-5",
        dimension: AssessmentDimension.ADAPTABILITY,
        score: 4,
        observableBehaviors: "Adapted well to changes",
        trainableGap: false,
        timestamps: ["8:00"],
      },
      {
        id: "score-6",
        dimension: AssessmentDimension.LEADERSHIP,
        score: 3,
        observableBehaviors: "Showed initiative",
        trainableGap: true,
        timestamps: [],
      },
      {
        id: "score-7",
        dimension: AssessmentDimension.CREATIVITY,
        score: 4,
        observableBehaviors: "Creative solutions proposed",
        trainableGap: false,
        timestamps: ["1:23:45"],
      },
      {
        id: "score-8",
        dimension: AssessmentDimension.TIME_MANAGEMENT,
        score: 5,
        observableBehaviors: "Excellent time management",
        trainableGap: false,
        timestamps: ["30:00", "45:15"],
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

// Factory function for client component data
function createClientData(
  overrides: Partial<CandidateProfileData> = {}
): CandidateProfileData {
  const base = createTestVideoAssessment();
  return {
    id: base.id,
    videoUrl: base.videoUrl,
    completedAt: base.completedAt,
    isSearchable: base.isSearchable,
    candidate: base.candidate,
    scores: base.scores,
    summary: base.summary,
    assessment: base.assessment,
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
});

describe("CandidateProfileClient", () => {
  describe("candidate info display", () => {
    it("displays candidate name", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("displays candidate email", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("displays simulation completion date", () => {
      const data = createClientData({
        completedAt: new Date("2024-01-15T10:00:00Z"),
      });
      render(<CandidateProfileClient data={data} />);
      expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
    });

    it("displays fallback when name is not available", () => {
      const data = createClientData({
        candidate: { id: "user-123", name: null, email: "jane@example.com" },
      });
      render(<CandidateProfileClient data={data} />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("jane@example.com");
    });
  });

  describe("dimension scores display", () => {
    it("displays all 8 dimension cards", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      const dimensionCards = container.querySelectorAll(
        '[data-testid="dimension-card"]'
      );
      expect(dimensionCards.length).toBe(8);
    });

    it("displays dimension names", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      expect(container.textContent).toContain("Communication");
      expect(container.textContent).toContain("Problem Solving");
      expect(container.textContent).toContain("Technical Knowledge");
      expect(container.textContent).toContain("Collaboration");
      expect(container.textContent).toContain("Adaptability");
      expect(container.textContent).toContain("Leadership");
      expect(container.textContent).toContain("Creativity");
      expect(container.textContent).toContain("Time Management");
    });

    it("displays visual score indicators (1-5 scale)", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      const scoreSegments = container.querySelectorAll(
        '[data-testid="score-segment"]'
      );
      // 8 dimensions x 5 segments = 40 segments
      expect(scoreSegments.length).toBe(40);
    });

    it("displays score values numerically", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      const pageContent = container.textContent || "";
      expect(pageContent).toContain("4/5");
      expect(pageContent).toContain("5/5");
      expect(pageContent).toContain("3/5");
    });

    it("handles missing scores gracefully", () => {
      const data = createClientData({ scores: [] });
      render(<CandidateProfileClient data={data} />);
      expect(screen.getByText(/No scores available/i)).toBeInTheDocument();
    });
  });

  describe("expandable dimension details", () => {
    it("dimension cards are collapsed by default", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      const details = container.querySelectorAll(
        '[data-testid="dimension-details"]'
      );
      expect(details.length).toBe(0);
    });

    it("clicking dimension header expands details", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      const headers = container.querySelectorAll(
        '[data-testid="dimension-header"]'
      );
      fireEvent.click(headers[0]);
      const details = container.querySelectorAll(
        '[data-testid="dimension-details"]'
      );
      expect(details.length).toBe(1);
    });

    it("expanded details show observable behaviors", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]); // Click Communication
      expect(
        screen.getByText("Clear communication throughout")
      ).toBeInTheDocument();
    });

    it("expanded details show trainable gap indicator when applicable", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      // Collaboration has trainableGap: true
      const headers = screen.getAllByTestId("dimension-header");
      // Find and click Collaboration (index 3 in dimension order)
      fireEvent.click(headers[3]);
      expect(screen.getByText("Trainable Gap")).toBeInTheDocument();
    });

    it("clicking header again collapses details", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      const headers = container.querySelectorAll(
        '[data-testid="dimension-header"]'
      );
      fireEvent.click(headers[0]); // Expand
      expect(
        container.querySelectorAll('[data-testid="dimension-details"]').length
      ).toBe(1);
      fireEvent.click(headers[0]); // Collapse
      expect(
        container.querySelectorAll('[data-testid="dimension-details"]').length
      ).toBe(0);
    });
  });

  describe("timestamp links", () => {
    it("displays timestamp links when timestamps exist", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]); // Communication has timestamps ["2:34", "5:12"]
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      expect(timestampLinks.length).toBe(2);
      expect(timestampLinks[0]).toHaveTextContent("2:34");
      expect(timestampLinks[1]).toHaveTextContent("5:12");
    });

    it("does not display timestamp section when no timestamps", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      // Technical Knowledge has no timestamps (index 2)
      fireEvent.click(headers[2]);
      expect(screen.queryByText("VIDEO TIMESTAMPS")).not.toBeInTheDocument();
    });

    it("clicking timestamp opens video modal", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]); // Communication
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]); // Click "2:34"
      expect(screen.getByTestId("video-modal")).toBeInTheDocument();
    });

    it("handles HH:MM:SS format timestamps", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      // Creativity has timestamp "1:23:45" (index 6)
      fireEvent.click(headers[6]);
      expect(screen.getByText("1:23:45")).toBeInTheDocument();
    });
  });

  describe("video player modal", () => {
    it("video modal displays video player", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]);
      expect(screen.getByTestId("video-player")).toBeInTheDocument();
    });

    it("video modal shows current time display", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]); // "2:34" = 154 seconds
      // The time display shows current time / total duration
      expect(screen.getByTestId("time-display")).toBeInTheDocument();
      expect(screen.getByTestId("current-time")).toBeInTheDocument();
    });

    it("clicking close button closes modal", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]);
      expect(screen.getByTestId("video-modal")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("close-modal"));
      expect(screen.queryByTestId("video-modal")).not.toBeInTheDocument();
    });

    it("clicking modal background closes modal", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]);
      expect(screen.getByTestId("video-modal")).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("video-modal"));
      expect(screen.queryByTestId("video-modal")).not.toBeInTheDocument();
    });
  });

  describe("overall summary display", () => {
    it("displays overall summary text", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      expect(
        screen.getByText(
          /Jane demonstrated strong technical skills and excellent problem-solving abilities/
        )
      ).toBeInTheDocument();
    });

    it("handles missing summary gracefully", () => {
      const data = createClientData({ summary: null });
      render(<CandidateProfileClient data={data} />);
      expect(screen.getByText(/No summary available/i)).toBeInTheDocument();
    });
  });

  describe("searchable status", () => {
    it("displays searchable status as public by default", () => {
      const data = createClientData({ isSearchable: true });
      render(<CandidateProfileClient data={data} />);
      expect(
        screen.getByText(/Searchable by hiring managers/i)
      ).toBeInTheDocument();
    });

    it("displays private status when not searchable", () => {
      const data = createClientData({ isSearchable: false });
      render(<CandidateProfileClient data={data} />);
      expect(screen.getByText(/Private/i)).toBeInTheDocument();
    });
  });

  describe("recording link", () => {
    it("displays link to view simulation recording", () => {
      const data = createClientData({ assessment: { id: "assessment-123" } });
      const { container } = render(<CandidateProfileClient data={data} />);
      const recordingLink = container.querySelector(
        'a[href*="/assessment/assessment-123"]'
      );
      expect(recordingLink).toBeInTheDocument();
      expect(recordingLink).toHaveTextContent(/View.*Recording/i);
    });

    it("hides recording link when no linked assessment", () => {
      const data = createClientData({ assessment: null });
      render(<CandidateProfileClient data={data} />);
      expect(
        screen.queryByText(/View.*Recording|Watch.*Simulation/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("neo-brutalist styling", () => {
    it("uses score bar segments for visual indicators", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      const scoreBar = container.querySelector('[data-testid="score-bar"]');
      expect(scoreBar).toBeInTheDocument();
    });

    it("applies border-2 styling to sections", () => {
      const data = createClientData();
      const { container } = render(<CandidateProfileClient data={data} />);
      const sections = container.querySelectorAll(".border-2");
      expect(sections.length).toBeGreaterThan(0);
    });
  });
});

describe("timestamp utility functions", () => {
  describe("parseTimestampToSeconds", () => {
    it("parses MM:SS format", () => {
      expect(parseTimestampToSeconds("2:34")).toBe(154);
      expect(parseTimestampToSeconds("15:07")).toBe(907);
      expect(parseTimestampToSeconds("0:30")).toBe(30);
    });

    it("parses HH:MM:SS format", () => {
      expect(parseTimestampToSeconds("1:23:45")).toBe(5025);
      expect(parseTimestampToSeconds("0:15:30")).toBe(930);
    });

    it("returns null for invalid formats", () => {
      expect(parseTimestampToSeconds("invalid")).toBeNull();
      expect(parseTimestampToSeconds("12")).toBeNull();
      expect(parseTimestampToSeconds("")).toBeNull();
      expect(parseTimestampToSeconds("abc:def")).toBeNull();
    });
  });

  describe("normalizeTimestamp", () => {
    it("validates MM:SS format", () => {
      expect(normalizeTimestamp("2:34")).toBe("2:34");
      expect(normalizeTimestamp("15:07")).toBe("15:07");
    });

    it("validates HH:MM:SS format", () => {
      expect(normalizeTimestamp("1:23:45")).toBe("1:23:45");
    });

    it("returns null for non-string inputs", () => {
      expect(normalizeTimestamp(123)).toBeNull();
      expect(normalizeTimestamp(null)).toBeNull();
      expect(normalizeTimestamp(undefined)).toBeNull();
      expect(normalizeTimestamp({})).toBeNull();
    });

    it("returns null for invalid timestamp strings", () => {
      expect(normalizeTimestamp("invalid")).toBeNull();
      expect(normalizeTimestamp("12:345")).toBeNull();
      expect(normalizeTimestamp("1:2:3:4")).toBeNull();
    });
  });

  describe("formatTime", () => {
    it("formats seconds to MM:SS", () => {
      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(30)).toBe("0:30");
      expect(formatTime(154)).toBe("2:34");
      expect(formatTime(907)).toBe("15:07");
    });

    it("formats seconds to HH:MM:SS when over an hour", () => {
      expect(formatTime(3600)).toBe("1:00:00");
      expect(formatTime(5025)).toBe("1:23:45");
      expect(formatTime(7200)).toBe("2:00:00");
    });

    it("handles edge cases", () => {
      expect(formatTime(59)).toBe("0:59");
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(3599)).toBe("59:59");
    });
  });
});

describe("video player controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  describe("timestamp and duration display", () => {
    it("displays current time and total duration", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]);

      expect(screen.getByTestId("time-display")).toBeInTheDocument();
      expect(screen.getByTestId("current-time")).toBeInTheDocument();
      expect(screen.getByTestId("total-duration")).toBeInTheDocument();
    });
  });

  describe("playback speed controls", () => {
    it("displays playback speed controls", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]);

      expect(screen.getByTestId("speed-controls")).toBeInTheDocument();
    });

    it("displays all speed options (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]);

      expect(screen.getByTestId("speed-0.5")).toBeInTheDocument();
      expect(screen.getByTestId("speed-0.75")).toBeInTheDocument();
      expect(screen.getByTestId("speed-1")).toBeInTheDocument();
      expect(screen.getByTestId("speed-1.25")).toBeInTheDocument();
      expect(screen.getByTestId("speed-1.5")).toBeInTheDocument();
      expect(screen.getByTestId("speed-2")).toBeInTheDocument();
    });

    it("1x speed is selected by default", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]);

      const speed1Button = screen.getByTestId("speed-1");
      expect(speed1Button).toHaveClass("bg-secondary");
    });

    it("clicking speed button updates selected state", () => {
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);
      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]);
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]);

      const speed2Button = screen.getByTestId("speed-2");
      fireEvent.click(speed2Button);
      expect(speed2Button).toHaveClass("bg-secondary");
    });
  });
});

describe("URL parameter handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("reading timestamp from URL", () => {
    it("opens video modal when t parameter is present", () => {
      mockGet.mockReturnValue("134");
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);

      expect(screen.getByTestId("video-modal")).toBeInTheDocument();
    });

    it("does not open modal when t parameter is not present", () => {
      mockGet.mockReturnValue(null);
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);

      expect(screen.queryByTestId("video-modal")).not.toBeInTheDocument();
    });

    it("ignores invalid t parameter values", () => {
      mockGet.mockReturnValue("invalid");
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);

      expect(screen.queryByTestId("video-modal")).not.toBeInTheDocument();
    });

    it("ignores negative t parameter values", () => {
      mockGet.mockReturnValue("-10");
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);

      expect(screen.queryByTestId("video-modal")).not.toBeInTheDocument();
    });
  });

  describe("updating URL on timestamp click", () => {
    it("updates URL when clicking timestamp link", () => {
      mockGet.mockReturnValue(null);
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);

      const headers = screen.getAllByTestId("dimension-header");
      fireEvent.click(headers[0]); // Communication
      const timestampLinks = screen.getAllByTestId("timestamp-link");
      fireEvent.click(timestampLinks[0]); // "2:34" = 154 seconds

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("t=154"),
        expect.objectContaining({ scroll: false })
      );
    });

    it("clears URL parameter when closing modal", () => {
      mockGet.mockReturnValue("134");
      const data = createClientData();
      render(<CandidateProfileClient data={data} />);

      fireEvent.click(screen.getByTestId("close-modal"));

      expect(mockReplace).toHaveBeenCalledWith(
        mockPathname,
        expect.objectContaining({ scroll: false })
      );
    });
  });
});
