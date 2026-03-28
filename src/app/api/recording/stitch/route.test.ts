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
vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    recording: {
      findUnique: (...args: unknown[]) => mockRecordingFindUnique(...args),
    },
  },
}));

// Mock Supabase storage
const mockCreateSignedUrl = vi.fn();
vi.mock("@/lib/external", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  },
  STORAGE_BUCKETS: {
    RECORDINGS: "recordings",
    SCREENSHOTS: "screenshots",
  },
}));

// Mock logger
vi.mock("@/lib/core", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { GET } from "./route";

const session = {
  user: { id: "user-1", email: "test@example.com" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

describe("GET /api/recording/stitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed-url" },
      error: null,
    });
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/recording/stitch?assessmentId=test"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 if assessmentId is missing", async () => {
    mockAuth.mockResolvedValue(session);

    const request = new NextRequest(
      "http://localhost/api/recording/stitch"
    );

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 if assessment not found", async () => {
    mockAuth.mockResolvedValue(session);
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/recording/stitch?assessmentId=test"
    );

    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("returns hasRecording false if no recording exists", async () => {
    mockAuth.mockResolvedValue(session);
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingFindUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/recording/stitch?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.hasRecording).toBe(false);
    expect(data.data.segments).toEqual([]);
    expect(data.data.stitchingOrder).toEqual([]);
  });

  it("returns segments with signed URLs in correct order", async () => {
    mockAuth.mockResolvedValue(session);
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });

    const now = new Date();
    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      startTime: now,
      endTime: new Date(now.getTime() + 60000),
      segments: [
        {
          id: "segment-0",
          segmentIndex: 0,
          status: "completed",
          startTime: now,
          endTime: new Date(now.getTime() + 30000),
          chunkPaths: ["assessment-1/1000-chunk-0.webm", "assessment-1/1000-chunk-1.webm"],
          screenshotPaths: ["assessment-1/1000.jpg"],
        },
        {
          id: "segment-1",
          segmentIndex: 1,
          status: "completed",
          startTime: new Date(now.getTime() + 30000),
          endTime: new Date(now.getTime() + 60000),
          chunkPaths: ["assessment-1/2000-chunk-0.webm"],
          screenshotPaths: [],
        },
      ],
    });

    // Return different signed URLs for each path
    let callCount = 0;
    mockCreateSignedUrl.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        data: { signedUrl: `https://example.com/signed-url-${callCount}` },
        error: null,
      });
    });

    const request = new NextRequest(
      "http://localhost/api/recording/stitch?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.data.hasRecording).toBe(true);
    expect(data.data.totalSegments).toBe(2);
    expect(data.data.totalChunks).toBe(3);
    expect(data.data.totalScreenshots).toBe(1);

    // Verify stitching order has all 3 chunks in correct segment order
    expect(data.data.stitchingOrder).toHaveLength(3);
    expect(data.data.stitchingOrder[0].segmentIndex).toBe(0);
    expect(data.data.stitchingOrder[1].segmentIndex).toBe(0);
    expect(data.data.stitchingOrder[2].segmentIndex).toBe(1);

    // Verify segments include chunk and screenshot details
    expect(data.data.segments[0].chunks).toHaveLength(2);
    expect(data.data.segments[0].screenshots).toHaveLength(1);
    expect(data.data.segments[1].chunks).toHaveLength(1);
    expect(data.data.segments[1].screenshots).toHaveLength(0);
  });

  it("reports interruption count in summary", async () => {
    mockAuth.mockResolvedValue(session);
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });

    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      startTime: new Date(),
      endTime: new Date(),
      segments: [
        {
          id: "segment-0",
          segmentIndex: 0,
          status: "interrupted",
          startTime: new Date(),
          endTime: new Date(),
          chunkPaths: ["chunk-0.webm"],
          screenshotPaths: [],
        },
        {
          id: "segment-1",
          segmentIndex: 1,
          status: "completed",
          startTime: new Date(),
          endTime: new Date(),
          chunkPaths: ["chunk-1.webm"],
          screenshotPaths: [],
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost/api/recording/stitch?assessmentId=assessment-1"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.data.summary.interruptionCount).toBe(1);
    expect(data.data.summary.completedSegments).toBe(1);
    expect(data.data.summary.recordingSegments).toBe(0);
  });

  it("handles signed URL failures gracefully", async () => {
    mockAuth.mockResolvedValue(session);
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });

    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      startTime: new Date(),
      endTime: new Date(),
      segments: [
        {
          id: "segment-0",
          segmentIndex: 0,
          status: "completed",
          startTime: new Date(),
          endTime: new Date(),
          chunkPaths: ["chunk-0.webm"],
          screenshotPaths: [],
        },
      ],
    });

    // Signed URL returns null (failure)
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const request = new NextRequest(
      "http://localhost/api/recording/stitch?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    // Chunk should have null URL
    expect(data.data.segments[0].chunks[0].url).toBeNull();
    // Stitching order should exclude null URLs
    expect(data.data.stitchingOrder).toHaveLength(0);
  });

  it("returns empty stitching order for recording with no chunks", async () => {
    mockAuth.mockResolvedValue(session);
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });

    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      startTime: new Date(),
      endTime: new Date(),
      segments: [
        {
          id: "segment-0",
          segmentIndex: 0,
          status: "completed",
          startTime: new Date(),
          endTime: new Date(),
          chunkPaths: [],
          screenshotPaths: ["ss-1.jpg"],
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost/api/recording/stitch?assessmentId=assessment-1"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.data.stitchingOrder).toHaveLength(0);
    expect(data.data.totalChunks).toBe(0);
    expect(data.data.totalScreenshots).toBe(1);
  });
});
