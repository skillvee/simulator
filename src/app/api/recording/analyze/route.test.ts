import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock database
const mockAssessmentFindFirst = vi.fn();
const mockRecordingFindUnique = vi.fn();
const mockRecordingUpdate = vi.fn();
const mockSegmentAnalysisUpsert = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    recording: {
      findUnique: (...args: unknown[]) => mockRecordingFindUnique(...args),
      update: (...args: unknown[]) => mockRecordingUpdate(...args),
    },
    segmentAnalysis: {
      upsert: (...args: unknown[]) => mockSegmentAnalysisUpsert(...args),
    },
  },
}));

// Mock supabase storage (now in @/lib/external)
vi.mock("@/lib/external", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        createSignedUrl: vi
          .fn()
          .mockResolvedValue({
            data: { signedUrl: "https://example.com/ss.png" },
          }),
      }),
    },
  },
  STORAGE_BUCKETS: {
    RESUMES: "resumes",
    RECORDINGS: "recordings",
    SCREENSHOTS: "screenshots",
  },
}));

// Mock recording analysis module
const mockAnalyzeSegmentScreenshots = vi.fn();
const mockBuildSegmentAnalysisData = vi.fn();
const mockAggregateSegmentAnalyses = vi.fn();

vi.mock("@/lib/analysis", () => ({
  analyzeSegmentScreenshots: (...args: unknown[]) =>
    mockAnalyzeSegmentScreenshots(...args),
  buildSegmentAnalysisData: (...args: unknown[]) =>
    mockBuildSegmentAnalysisData(...args),
  aggregateSegmentAnalyses: (...args: unknown[]) =>
    mockAggregateSegmentAnalyses(...args),
}));

import { POST, GET } from "./route";

describe("POST /api/recording/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/recording/analyze", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 if missing assessmentId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/recording/analyze", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 if assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/recording/analyze", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "missing-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 404 if recording not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "assessment-1" });
    mockRecordingFindUnique.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/recording/analyze", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Recording not found");
  });

  it("should skip already analyzed segments", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "assessment-1" });
    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      segments: [
        {
          id: "segment-1",
          status: "completed",
          screenshotPaths: ["s1.png"],
          startTime: new Date(),
          endTime: new Date(),
          analysis: { id: "existing-analysis" },
        },
      ],
    });
    mockAggregateSegmentAnalyses.mockReturnValue({
      activityTimeline: [],
      toolUsage: [],
      stuckMoments: [],
      totalActiveTime: 0,
      totalIdleTime: 0,
      overallFocusScore: 3,
      aiToolsUsed: false,
      keyObservations: [],
    });

    const request = new NextRequest("http://localhost/api/recording/analyze", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.analyzed).toBe(false);
    expect(data.message).toBe("No new segments to analyze");
  });

  it("should analyze segments with screenshots", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "assessment-1" });
    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      segments: [
        {
          id: "segment-1",
          status: "completed",
          screenshotPaths: ["s1.png", "s2.png"],
          startTime: new Date(),
          endTime: new Date(Date.now() + 60000),
          analysis: null,
        },
      ],
    });
    mockAnalyzeSegmentScreenshots.mockResolvedValue({
      activityTimeline: [
        { timestamp: "0:00", activity: "coding", description: "Test" },
      ],
      toolUsage: [{ tool: "VS Code", usageCount: 2, contextNotes: "Editing" }],
      stuckMoments: [],
      summary: {
        totalActiveTimeSeconds: 60,
        totalIdleTimeSeconds: 0,
        focusScore: 4,
        dominantActivity: "coding",
        aiToolsUsed: false,
        keyObservations: ["Quick segment"],
      },
    });
    mockBuildSegmentAnalysisData.mockReturnValue({
      segmentId: "segment-1",
      activityTimeline: [],
      toolUsage: [],
      stuckMoments: [],
      totalActiveTime: 60,
      totalIdleTime: 0,
      focusScore: 4,
      screenshotsAnalyzed: 2,
      aiAnalysis: {},
    });
    mockSegmentAnalysisUpsert.mockResolvedValue({});
    mockAggregateSegmentAnalyses.mockReturnValue({
      activityTimeline: [],
      toolUsage: [],
      stuckMoments: [],
      totalActiveTime: 60,
      totalIdleTime: 0,
      overallFocusScore: 4,
      aiToolsUsed: false,
      keyObservations: [],
    });
    mockRecordingUpdate.mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/recording/analyze", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.analyzed).toBe(true);
    expect(data.segmentsAnalyzed).toBe(1);
    expect(mockAnalyzeSegmentScreenshots).toHaveBeenCalled();
    expect(mockSegmentAnalysisUpsert).toHaveBeenCalled();
  });

  it("should skip segments with no screenshots", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "assessment-1" });
    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      segments: [
        {
          id: "segment-1",
          status: "completed",
          screenshotPaths: [], // No screenshots
          startTime: new Date(),
          endTime: new Date(),
          analysis: null,
        },
      ],
    });

    const request = new NextRequest("http://localhost/api/recording/analyze", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.analyzed).toBe(false);
    expect(data.message).toBe("No segments ready for analysis");
  });

  it("should re-analyze with forceReanalyze flag", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "assessment-1" });
    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      segments: [
        {
          id: "segment-1",
          status: "completed",
          screenshotPaths: ["s1.png"],
          startTime: new Date(),
          endTime: new Date(Date.now() + 60000),
          analysis: { id: "existing-analysis" }, // Already analyzed
        },
      ],
    });
    mockAnalyzeSegmentScreenshots.mockResolvedValue({
      activityTimeline: [],
      toolUsage: [],
      stuckMoments: [],
      summary: {
        totalActiveTimeSeconds: 60,
        totalIdleTimeSeconds: 0,
        focusScore: 4,
        dominantActivity: "coding",
        aiToolsUsed: false,
        keyObservations: [],
      },
    });
    mockBuildSegmentAnalysisData.mockReturnValue({
      segmentId: "segment-1",
      activityTimeline: [],
      toolUsage: [],
      stuckMoments: [],
      totalActiveTime: 60,
      totalIdleTime: 0,
      focusScore: 4,
      screenshotsAnalyzed: 1,
      aiAnalysis: {},
    });
    mockSegmentAnalysisUpsert.mockResolvedValue({});
    mockAggregateSegmentAnalyses.mockReturnValue({
      activityTimeline: [],
      toolUsage: [],
      stuckMoments: [],
      totalActiveTime: 60,
      totalIdleTime: 0,
      overallFocusScore: 4,
      aiToolsUsed: false,
      keyObservations: [],
    });
    mockRecordingUpdate.mockResolvedValue({});

    const request = new NextRequest("http://localhost/api/recording/analyze", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        forceReanalyze: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.analyzed).toBe(true);
    expect(mockAnalyzeSegmentScreenshots).toHaveBeenCalled();
  });
});

describe("GET /api/recording/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/recording/analyze?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 if missing assessmentId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/recording/analyze");

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return 404 if assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/recording/analyze?assessmentId=missing-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("should return analysis results for recording", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "assessment-1" });
    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      analysis: { overallFocusScore: 4, aiToolsUsed: true },
      segments: [
        {
          id: "segment-1",
          segmentIndex: 0,
          status: "completed",
          analysis: {
            activityTimeline: [],
            toolUsage: [],
            stuckMoments: [],
            totalActiveTime: 300,
            totalIdleTime: 30,
            focusScore: 4,
            screenshotsAnalyzed: 5,
            analyzedAt: new Date(),
          },
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost/api/recording/analyze?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasRecording).toBe(true);
    expect(data.aggregatedAnalysis).toBeDefined();
    expect(data.totalSegments).toBe(1);
    expect(data.analyzedSegments).toBe(1);
  });

  it("should return specific segment analysis when segmentId provided", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({ id: "assessment-1" });
    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      segments: [
        {
          id: "segment-1",
          segmentIndex: 0,
          status: "completed",
          analysis: {
            activityTimeline: [],
            toolUsage: [],
            stuckMoments: [],
            totalActiveTime: 300,
            totalIdleTime: 30,
            focusScore: 4,
            screenshotsAnalyzed: 5,
            analyzedAt: new Date(),
          },
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost/api/recording/analyze?assessmentId=assessment-1&segmentId=segment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.segmentId).toBe("segment-1");
    expect(data.hasAnalysis).toBe(true);
  });
});
