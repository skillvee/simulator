import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth - define mock function before vi.mock
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock database - define mock functions before vi.mock
const mockAssessmentFindFirst = vi.fn();
const mockRecordingUpsert = vi.fn();
const mockRecordingFindUnique = vi.fn();
const mockRecordingUpdate = vi.fn();
const mockSegmentFindFirst = vi.fn();
const mockSegmentCreate = vi.fn();
const mockSegmentUpdate = vi.fn();
const mockSegmentUpdateMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: (...args: unknown[]) => mockAssessmentFindFirst(...args),
    },
    recording: {
      upsert: (...args: unknown[]) => mockRecordingUpsert(...args),
      findUnique: (...args: unknown[]) => mockRecordingFindUnique(...args),
      update: (...args: unknown[]) => mockRecordingUpdate(...args),
    },
    recordingSegment: {
      findFirst: (...args: unknown[]) => mockSegmentFindFirst(...args),
      create: (...args: unknown[]) => mockSegmentCreate(...args),
      update: (...args: unknown[]) => mockSegmentUpdate(...args),
      updateMany: (...args: unknown[]) => mockSegmentUpdateMany(...args),
    },
  },
}));

import { POST, GET } from "./route";

describe("POST /api/recording/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id", action: "start" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 if missing required fields", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 404 if assessment not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "test-id", action: "start" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("should create a new segment on start action", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });
    mockSegmentUpdateMany.mockResolvedValue({ count: 0 });
    mockSegmentFindFirst.mockResolvedValue(null);
    mockSegmentCreate.mockResolvedValue({
      id: "segment-1",
      segmentIndex: 0,
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1", action: "start" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.segmentId).toBe("segment-1");
    expect(data.segmentIndex).toBe(0);
  });

  it("should mark previous segment as interrupted on start action", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });
    mockSegmentUpdateMany.mockResolvedValue({ count: 1 });
    mockSegmentFindFirst.mockResolvedValue({
      segmentIndex: 0,
    });
    mockSegmentCreate.mockResolvedValue({
      id: "segment-2",
      segmentIndex: 1,
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1", action: "start" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.segmentIndex).toBe(1);
    expect(mockSegmentUpdateMany).toHaveBeenCalledWith({
      where: {
        recordingId: "assessment-1-screen",
        status: "recording",
      },
      data: expect.objectContaining({ status: "interrupted" }),
    });
  });

  it("should update segment status on interrupt action", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });
    mockSegmentUpdate.mockResolvedValue({ id: "segment-1" });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        action: "interrupt",
        segmentId: "segment-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockSegmentUpdate).toHaveBeenCalledWith({
      where: { id: "segment-1" },
      data: expect.objectContaining({ status: "interrupted" }),
    });
  });

  it("should update segment status on complete action", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });
    mockRecordingUpdate.mockResolvedValue({});
    mockSegmentUpdate.mockResolvedValue({ id: "segment-1" });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        action: "complete",
        segmentId: "segment-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockSegmentUpdate).toHaveBeenCalledWith({
      where: { id: "segment-1" },
      data: expect.objectContaining({ status: "completed" }),
    });
  });

  it("should return 400 for unknown action", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        action: "unknown",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Unknown action");
  });
});

describe("GET /api/recording/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/recording/session?assessmentId=test-id"
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 if missing assessmentId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    const request = new NextRequest("http://localhost/api/recording/session");

    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("should return hasRecording false if no recording exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingFindUnique.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/recording/session?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasRecording).toBe(false);
  });

  it("should return session status with segments", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingFindUnique.mockResolvedValue({
      id: "assessment-1-screen",
      startTime: new Date(),
      segments: [
        {
          id: "segment-1",
          segmentIndex: 0,
          status: "completed",
          startTime: new Date(),
          endTime: new Date(),
          chunkPaths: ["chunk-1", "chunk-2"],
          screenshotPaths: ["ss-1"],
        },
        {
          id: "segment-2",
          segmentIndex: 1,
          status: "recording",
          startTime: new Date(),
          endTime: null,
          chunkPaths: ["chunk-3"],
          screenshotPaths: [],
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost/api/recording/session?assessmentId=assessment-1"
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.hasRecording).toBe(true);
    expect(data.totalChunks).toBe(3);
    expect(data.totalScreenshots).toBe(1);
    expect(data.activeSegment?.id).toBe("segment-2");
    expect(data.segments.length).toBe(2);
  });
});
