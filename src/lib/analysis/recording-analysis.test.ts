import { describe, it, expect, vi } from "vitest";
import {
  activityEntrySchema,
  toolUsageSchema,
  stuckMomentSchema,
  segmentAnalysisResponseSchema,
  buildSegmentAnalysisData,
  aggregateSegmentAnalyses,
  type SegmentAnalysisResponse,
} from "./recording-analysis";

// Mock gemini module
vi.mock("@/lib/ai", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
}));

describe("Recording Analysis Schemas", () => {
  describe("activityEntrySchema", () => {
    it("should validate valid activity entry", () => {
      const entry = {
        timestamp: "0:30",
        activity: "coding",
        description: "Writing TypeScript code",
        applicationVisible: "VS Code",
      };
      expect(() => activityEntrySchema.parse(entry)).not.toThrow();
    });

    it("should reject invalid activity type", () => {
      const entry = {
        timestamp: "0:30",
        activity: "invalid_activity",
        description: "Test",
      };
      expect(() => activityEntrySchema.parse(entry)).toThrow();
    });

    it("should allow optional applicationVisible", () => {
      const entry = {
        timestamp: "1:00",
        activity: "browsing",
        description: "Searching for documentation",
      };
      expect(() => activityEntrySchema.parse(entry)).not.toThrow();
    });
  });

  describe("toolUsageSchema", () => {
    it("should validate valid tool usage", () => {
      const usage = {
        tool: "VS Code",
        usageCount: 5,
        contextNotes: "Primary editor for development",
      };
      expect(() => toolUsageSchema.parse(usage)).not.toThrow();
    });
  });

  describe("stuckMomentSchema", () => {
    it("should validate valid stuck moment", () => {
      const moment = {
        startTime: "5:00",
        endTime: "8:00",
        description: "Debugging API error",
        potentialCause: "debugging",
        durationSeconds: 180,
      };
      expect(() => stuckMomentSchema.parse(moment)).not.toThrow();
    });

    it("should reject invalid potential cause", () => {
      const moment = {
        startTime: "5:00",
        endTime: "8:00",
        description: "Test",
        potentialCause: "invalid_cause",
        durationSeconds: 180,
      };
      expect(() => stuckMomentSchema.parse(moment)).toThrow();
    });
  });

  describe("segmentAnalysisResponseSchema", () => {
    it("should validate complete analysis response", () => {
      const response = {
        activityTimeline: [
          {
            timestamp: "0:00",
            activity: "coding",
            description: "Initial setup",
          },
        ],
        toolUsage: [
          {
            tool: "Chrome",
            usageCount: 3,
            contextNotes: "Documentation lookup",
          },
        ],
        stuckMoments: [
          {
            startTime: "2:00",
            endTime: "4:00",
            description: "Understanding API",
            potentialCause: "unclear_requirements",
            durationSeconds: 120,
          },
        ],
        summary: {
          totalActiveTimeSeconds: 500,
          totalIdleTimeSeconds: 100,
          focusScore: 4,
          dominantActivity: "coding",
          aiToolsUsed: true,
          keyObservations: ["Used Claude for help", "Good problem breakdown"],
        },
      };
      expect(() => segmentAnalysisResponseSchema.parse(response)).not.toThrow();
    });

    it("should reject focus score outside range", () => {
      const response = {
        activityTimeline: [],
        toolUsage: [],
        stuckMoments: [],
        summary: {
          totalActiveTimeSeconds: 500,
          totalIdleTimeSeconds: 100,
          focusScore: 10, // Invalid: should be 1-5
          dominantActivity: "coding",
          aiToolsUsed: false,
          keyObservations: [],
        },
      };
      expect(() => segmentAnalysisResponseSchema.parse(response)).toThrow();
    });
  });
});

describe("buildSegmentAnalysisData", () => {
  it("should build correct data structure for database", () => {
    const analysis: SegmentAnalysisResponse = {
      activityTimeline: [
        {
          timestamp: "0:00",
          activity: "coding",
          description: "Writing tests",
        },
      ],
      toolUsage: [
        {
          tool: "VS Code",
          usageCount: 10,
          contextNotes: "Primary editor",
        },
      ],
      stuckMoments: [],
      summary: {
        totalActiveTimeSeconds: 600,
        totalIdleTimeSeconds: 60,
        focusScore: 5,
        dominantActivity: "coding",
        aiToolsUsed: false,
        keyObservations: ["Very productive session"],
      },
    };

    const data = buildSegmentAnalysisData("segment-123", analysis, 5);

    expect(data.segmentId).toBe("segment-123");
    expect(data.totalActiveTime).toBe(600);
    expect(data.totalIdleTime).toBe(60);
    expect(data.focusScore).toBe(5);
    expect(data.screenshotsAnalyzed).toBe(5);
    expect(data.activityTimeline).toEqual(analysis.activityTimeline);
    expect(data.toolUsage).toEqual(analysis.toolUsage);
    expect(data.stuckMoments).toEqual(analysis.stuckMoments);
    expect(data.aiAnalysis).toMatchObject(analysis);
  });
});

describe("aggregateSegmentAnalyses", () => {
  it("should aggregate multiple analyses correctly", () => {
    const analyses: SegmentAnalysisResponse[] = [
      {
        activityTimeline: [
          { timestamp: "0:00", activity: "coding", description: "Setup" },
        ],
        toolUsage: [
          { tool: "VS Code", usageCount: 5, contextNotes: "Editing" },
        ],
        stuckMoments: [
          {
            startTime: "1:00",
            endTime: "2:00",
            description: "Debugging",
            potentialCause: "debugging",
            durationSeconds: 60,
          },
        ],
        summary: {
          totalActiveTimeSeconds: 300,
          totalIdleTimeSeconds: 30,
          focusScore: 4,
          dominantActivity: "coding",
          aiToolsUsed: true,
          keyObservations: ["Used AI assistant"],
        },
      },
      {
        activityTimeline: [
          {
            timestamp: "10:00",
            activity: "testing",
            description: "Running tests",
          },
        ],
        toolUsage: [
          { tool: "VS Code", usageCount: 3, contextNotes: "More editing" },
          { tool: "Terminal", usageCount: 2, contextNotes: "Running tests" },
        ],
        stuckMoments: [],
        summary: {
          totalActiveTimeSeconds: 200,
          totalIdleTimeSeconds: 20,
          focusScore: 5,
          dominantActivity: "testing",
          aiToolsUsed: false,
          keyObservations: ["All tests pass"],
        },
      },
    ];

    const aggregated = aggregateSegmentAnalyses(analyses);

    // Check timeline is combined
    expect(aggregated.activityTimeline.length).toBe(2);

    // Check tool usage is aggregated
    const vscodeUsage = aggregated.toolUsage.find((t) => t.tool === "VS Code");
    expect(vscodeUsage?.usageCount).toBe(8); // 5 + 3
    expect(
      aggregated.toolUsage.find((t) => t.tool === "Terminal")
    ).toBeTruthy();

    // Check stuck moments are combined
    expect(aggregated.stuckMoments.length).toBe(1);

    // Check time totals
    expect(aggregated.totalActiveTime).toBe(500); // 300 + 200
    expect(aggregated.totalIdleTime).toBe(50); // 30 + 20

    // Check focus score is averaged (4 + 5) / 2 = 4.5 → 5 (rounded)
    expect(aggregated.overallFocusScore).toBe(5);

    // Check AI tools used if any segment used them
    expect(aggregated.aiToolsUsed).toBe(true);

    // Check observations are combined
    expect(aggregated.keyObservations.length).toBe(2);
  });

  it("should handle empty analyses array", () => {
    const aggregated = aggregateSegmentAnalyses([]);

    expect(aggregated.activityTimeline).toEqual([]);
    expect(aggregated.toolUsage).toEqual([]);
    expect(aggregated.stuckMoments).toEqual([]);
    expect(aggregated.totalActiveTime).toBe(0);
    expect(aggregated.totalIdleTime).toBe(0);
    expect(aggregated.overallFocusScore).toBe(3); // Default score
    expect(aggregated.aiToolsUsed).toBe(false);
    expect(aggregated.keyObservations).toEqual([]);
  });

  it("should handle single analysis", () => {
    const analyses: SegmentAnalysisResponse[] = [
      {
        activityTimeline: [],
        toolUsage: [{ tool: "Claude", usageCount: 1, contextNotes: "Help" }],
        stuckMoments: [],
        summary: {
          totalActiveTimeSeconds: 100,
          totalIdleTimeSeconds: 10,
          focusScore: 3,
          dominantActivity: "reading_docs",
          aiToolsUsed: true,
          keyObservations: ["Quick session"],
        },
      },
    ];

    const aggregated = aggregateSegmentAnalyses(analyses);

    expect(aggregated.toolUsage.length).toBe(1);
    expect(aggregated.totalActiveTime).toBe(100);
    expect(aggregated.overallFocusScore).toBe(3);
    expect(aggregated.aiToolsUsed).toBe(true);
  });
});
