import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db
const mockUserCount = vi.fn();
const mockUserFindMany = vi.fn();
const mockAssessmentCount = vi.fn();
const mockAssessmentFindMany = vi.fn();
const mockAssessmentGroupBy = vi.fn();
const mockHRAssessmentFindMany = vi.fn();
const mockSegmentAnalysisFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    assessment: {
      count: (...args: unknown[]) => mockAssessmentCount(...args),
      findMany: (...args: unknown[]) => mockAssessmentFindMany(...args),
      groupBy: (...args: unknown[]) => mockAssessmentGroupBy(...args),
    },
    hRInterviewAssessment: {
      findMany: (...args: unknown[]) => mockHRAssessmentFindMany(...args),
    },
    segmentAnalysis: {
      findMany: (...args: unknown[]) => mockSegmentAnalysisFindMany(...args),
    },
  },
}));

// Import after mocks
import {
  getStartDateForPeriod,
  getEndDateForPeriod,
  generateDateRange,
  toISODateString,
  getSignupTrends,
  getAssessmentStartTrends,
  getAssessmentCompletionTrends,
  getPhaseDurationStats,
  getStatusDistribution,
  getCompletionFunnel,
  getOverviewMetrics,
  getAnalytics,
  logAnalyticsEvent,
  TimePeriodSchema,
} from "./analytics";

describe("TimePeriodSchema", () => {
  it("validates valid periods", () => {
    expect(TimePeriodSchema.parse("today")).toBe("today");
    expect(TimePeriodSchema.parse("yesterday")).toBe("yesterday");
    expect(TimePeriodSchema.parse("last7days")).toBe("last7days");
    expect(TimePeriodSchema.parse("last30days")).toBe("last30days");
    expect(TimePeriodSchema.parse("last90days")).toBe("last90days");
    expect(TimePeriodSchema.parse("all")).toBe("all");
  });

  it("rejects invalid periods", () => {
    expect(() => TimePeriodSchema.parse("invalid")).toThrow();
    expect(() => TimePeriodSchema.parse("week")).toThrow();
    expect(() => TimePeriodSchema.parse("")).toThrow();
  });
});

describe("Date Utilities", () => {
  describe("getStartDateForPeriod", () => {
    it("returns null for 'all' period", () => {
      expect(getStartDateForPeriod("all")).toBeNull();
    });

    it("returns start of today for 'today' period", () => {
      const result = getStartDateForPeriod("today");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getHours()).toBe(0);
      expect(result?.getMinutes()).toBe(0);
      expect(result?.getSeconds()).toBe(0);
    });

    it("returns yesterday for 'yesterday' period", () => {
      const result = getStartDateForPeriod("yesterday");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      expect(result?.toDateString()).toBe(yesterday.toDateString());
    });

    it("returns 7 days ago for 'last7days' period", () => {
      const result = getStartDateForPeriod("last7days");
      const today = new Date();
      const expected = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6
      );

      expect(result?.toDateString()).toBe(expected.toDateString());
    });

    it("returns 30 days ago for 'last30days' period", () => {
      const result = getStartDateForPeriod("last30days");
      const today = new Date();
      const expected = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 29
      );

      expect(result?.toDateString()).toBe(expected.toDateString());
    });

    it("returns 90 days ago for 'last90days' period", () => {
      const result = getStartDateForPeriod("last90days");
      const today = new Date();
      const expected = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 89
      );

      expect(result?.toDateString()).toBe(expected.toDateString());
    });
  });

  describe("getEndDateForPeriod", () => {
    it("returns null for non-yesterday periods", () => {
      expect(getEndDateForPeriod("today")).toBeNull();
      expect(getEndDateForPeriod("last7days")).toBeNull();
      expect(getEndDateForPeriod("last30days")).toBeNull();
      expect(getEndDateForPeriod("last90days")).toBeNull();
      expect(getEndDateForPeriod("all")).toBeNull();
    });

    it("returns start of today for 'yesterday' period", () => {
      const result = getEndDateForPeriod("yesterday");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      expect(result?.toDateString()).toBe(today.toDateString());
    });
  });

  describe("generateDateRange", () => {
    it("generates correct date range", () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-05");
      const result = generateDateRange(start, end);

      expect(result).toHaveLength(5);
      expect(result[0]).toBe("2024-01-01");
      expect(result[4]).toBe("2024-01-05");
    });

    it("handles single day range", () => {
      const date = new Date("2024-01-01");
      const result = generateDateRange(date, date);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe("2024-01-01");
    });
  });

  describe("toISODateString", () => {
    it("converts date to ISO date string", () => {
      const date = new Date("2024-06-15T14:30:00Z");
      expect(toISODateString(date)).toBe("2024-06-15");
    });
  });
});

describe("Analytics Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSignupTrends", () => {
    it("returns daily signup counts", async () => {
      // Use midnight local time to match implementation's date range generation
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayString = toISODateString(today);

      mockUserFindMany.mockResolvedValue([
        { createdAt: today },
        { createdAt: today },
        { createdAt: today },
      ]);

      const result = await getSignupTrends("today");

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((d) => d.date === todayString && d.count === 3)).toBe(
        true
      );
    });

    it("returns empty counts for days with no signups", async () => {
      mockUserFindMany.mockResolvedValue([]);

      const result = await getSignupTrends("last7days");

      expect(result).toHaveLength(7);
      expect(result.every((d) => d.count === 0)).toBe(true);
    });
  });

  describe("getAssessmentStartTrends", () => {
    it("returns daily assessment start counts", async () => {
      // Use midnight local time to match implementation's date range generation
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayString = toISODateString(today);

      mockAssessmentFindMany.mockResolvedValue([
        { startedAt: today },
        { startedAt: today },
      ]);

      const result = await getAssessmentStartTrends("today");

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((d) => d.date === todayString && d.count === 2)).toBe(
        true
      );
    });
  });

  describe("getAssessmentCompletionTrends", () => {
    it("returns daily completion counts", async () => {
      // Use midnight local time to match implementation's date range generation
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayString = toISODateString(today);

      mockAssessmentFindMany.mockResolvedValue([{ completedAt: today }]);

      const result = await getAssessmentCompletionTrends("today");

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((d) => d.date === todayString && d.count === 1)).toBe(
        true
      );
    });
  });

  describe("getPhaseDurationStats", () => {
    it("returns total assessment duration stats", async () => {
      const start = new Date("2024-01-01T10:00:00Z");
      const end = new Date("2024-01-01T11:00:00Z"); // 1 hour later

      mockAssessmentFindMany.mockResolvedValue([
        { startedAt: start, completedAt: end },
      ]);
      mockSegmentAnalysisFindMany.mockResolvedValue([]);

      const result = await getPhaseDurationStats();

      const totalStats = result.find((s) => s.phase === "Total Assessment");
      expect(totalStats).toBeDefined();
      expect(totalStats?.avgDurationMinutes).toBe(60);
    });

    it("returns working phase duration stats from segment analysis", async () => {
      mockAssessmentFindMany.mockResolvedValue([]);
      mockSegmentAnalysisFindMany.mockResolvedValue([
        { totalActiveTime: 600, totalIdleTime: 300 }, // 15 min total
        { totalActiveTime: 1200, totalIdleTime: 600 }, // 30 min total
      ]);

      const result = await getPhaseDurationStats();

      const workingStats = result.find((s) => s.phase === "Working (Active)");
      expect(workingStats).toBeDefined();
      expect(workingStats?.sampleSize).toBe(2);
    });

    it("returns empty array when no data", async () => {
      mockAssessmentFindMany.mockResolvedValue([]);
      mockSegmentAnalysisFindMany.mockResolvedValue([]);

      const result = await getPhaseDurationStats();

      expect(result).toEqual([]);
    });
  });

  describe("getStatusDistribution", () => {
    it("returns status counts with percentages", async () => {
      mockAssessmentGroupBy.mockResolvedValue([
        { status: "WELCOME", _count: 5 },
        { status: "WORKING", _count: 3 },
        { status: "COMPLETED", _count: 2 },
      ]);

      const result = await getStatusDistribution();

      expect(result).toHaveLength(3); // WELCOME, WORKING, COMPLETED
      expect(result.find((s) => s.status === "WELCOME")?.count).toBe(5);
      expect(result.find((s) => s.status === "COMPLETED")?.count).toBe(2);
      expect(result.find((s) => s.status === "WORKING")?.count).toBe(3);
    });

    it("returns zero counts for all statuses when empty", async () => {
      mockAssessmentGroupBy.mockResolvedValue([]);

      const result = await getStatusDistribution();

      expect(result).toHaveLength(3);
      expect(result.every((s) => s.count === 0)).toBe(true);
      expect(result.every((s) => s.percentage === 0)).toBe(true);
    });
  });

  describe("getCompletionFunnel", () => {
    it("returns funnel steps with counts and percentages", async () => {
      // Mock assessment counts for the new 3-step funnel:
      // Started (all) -> Working (WORKING + COMPLETED) -> Completed
      mockAssessmentCount
        .mockResolvedValueOnce(100) // Total started
        .mockResolvedValueOnce(60) // Reached WORKING or COMPLETED
        .mockResolvedValueOnce(30); // COMPLETED

      const result = await getCompletionFunnel();

      expect(result).toHaveLength(3);
      expect(result[0].step).toBe("Started");
      expect(result[0].count).toBe(100);
      expect(result[0].percentage).toBe(100);

      expect(result[1].step).toBe("Working");
      expect(result[1].count).toBe(60);
      expect(result[1].percentage).toBe(60);

      expect(result[2].step).toBe("Completed");
      expect(result[2].count).toBe(30);
    });

    it("handles zero counts gracefully", async () => {
      mockAssessmentCount.mockResolvedValue(0);

      const result = await getCompletionFunnel();

      expect(result).toHaveLength(3);
      expect(result.every((s) => s.count === 0)).toBe(true);
    });
  });

  describe("getOverviewMetrics", () => {
    it("returns all overview metrics", async () => {
      mockUserCount.mockResolvedValue(100);
      mockAssessmentCount
        .mockResolvedValueOnce(50) // Total assessments
        .mockResolvedValueOnce(20) // Completed
        .mockResolvedValueOnce(10); // Active

      mockAssessmentFindMany.mockResolvedValue([
        {
          startedAt: new Date("2024-01-01T10:00:00Z"),
          completedAt: new Date("2024-01-01T11:00:00Z"),
        },
      ]);

      const result = await getOverviewMetrics("last30days");

      expect(result.totalUsers).toBe(100);
      expect(result.totalAssessments).toBe(50);
      expect(result.completedAssessments).toBe(20);
      expect(result.activeAssessments).toBe(10);
      expect(result.completionRate).toBe(40); // 20/50 = 40%
      expect(result.avgCompletionTimeMinutes).toBe(60);
    });

    it("returns null avg completion time when no completed assessments", async () => {
      mockUserCount.mockResolvedValue(10);
      mockAssessmentCount.mockResolvedValue(0);
      mockAssessmentFindMany.mockResolvedValue([]);

      const result = await getOverviewMetrics("all");

      expect(result.avgCompletionTimeMinutes).toBeNull();
    });
  });

  describe("getAnalytics", () => {
    it("returns complete analytics data structure", async () => {
      // Setup all mocks
      mockUserCount.mockResolvedValue(10);
      mockUserFindMany.mockResolvedValue([]);
      mockAssessmentCount.mockResolvedValue(5);
      mockAssessmentFindMany.mockResolvedValue([]);
      mockAssessmentGroupBy.mockResolvedValue([]);
      mockHRAssessmentFindMany.mockResolvedValue([]);
      mockSegmentAnalysisFindMany.mockResolvedValue([]);

      const result = await getAnalytics("last30days");

      expect(result.overview).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.trends.signups).toBeDefined();
      expect(result.trends.assessmentStarts).toBeDefined();
      expect(result.trends.assessmentCompletions).toBeDefined();
      expect(result.phaseDurations).toBeDefined();
      expect(result.statusDistribution).toBeDefined();
      expect(result.completionFunnel).toBeDefined();
      expect(result.period).toBe("last30days");
      expect(result.generatedAt).toBeDefined();
    });
  });
});

describe("logAnalyticsEvent", () => {
  it("logs event without PII", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logAnalyticsEvent("signup");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain("[ANALYTICS]");
    expect(logCall).toContain("signup");

    consoleSpy.mockRestore();
  });

  it("logs event with metadata (no PII)", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logAnalyticsEvent("phase_transition", {
      phase: "WORKING",
      scenarioId: "scenario-123",
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain("phase_transition");
    expect(logCall).toContain("WORKING");
    expect(logCall).toContain("scenario-123");
    // Should NOT contain PII like email, name, etc.
    expect(logCall).not.toContain("@");

    consoleSpy.mockRestore();
  });
});
