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
const mockSegmentFindUnique = vi.fn();
const mockSegmentCreate = vi.fn();
const mockSegmentUpdate = vi.fn();
const mockSegmentUpdateMany = vi.fn();
const mockSegmentAnalysisUpsert = vi.fn();
const mockTransaction = vi.fn();

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
      findUnique: (...args: unknown[]) => mockSegmentFindUnique(...args),
      create: (...args: unknown[]) => mockSegmentCreate(...args),
      update: (...args: unknown[]) => mockSegmentUpdate(...args),
      updateMany: (...args: unknown[]) => mockSegmentUpdateMany(...args),
    },
    segmentAnalysis: {
      upsert: (...args: unknown[]) => mockSegmentAnalysisUpsert(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

// Note: @/lib/external and recording-analysis mocks removed (RF-022)
// Screenshot analysis was removed as part of assessment simplification.

// Mock isE2ETestMode and env
const mockIsE2ETestMode = vi.fn();
vi.mock("@/lib/core", () => ({
  isE2ETestMode: () => mockIsE2ETestMode(),
  isE2ETestModeClient: () => mockIsE2ETestMode(),
  env: {
    DATABASE_URL: "postgresql://localhost:5432/test",
    DIRECT_URL: "postgresql://localhost:5432/test",
    AUTH_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "test-google-id",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    GEMINI_API_KEY: "test-gemini-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-supabase-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    E2E_TEST_MODE: false,
    NEXT_PUBLIC_E2E_TEST_MODE: false,
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

    // Transaction mock for start action (includes FOR UPDATE lock)
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]), // FOR UPDATE lock
        recordingSegment: {
          updateMany: mockSegmentUpdateMany.mockResolvedValue({ count: 0 }),
          findFirst: mockSegmentFindFirst.mockResolvedValue(null),
          create: mockSegmentCreate.mockResolvedValue({
            id: "segment-1",
            segmentIndex: 0,
          }),
        },
      };
      return fn(tx);
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

    // Transaction mock for start action with existing segment (includes FOR UPDATE lock)
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]), // FOR UPDATE lock
        recordingSegment: {
          updateMany: mockSegmentUpdateMany.mockResolvedValue({ count: 1 }),
          findFirst: mockSegmentFindFirst.mockResolvedValue({
            segmentIndex: 0,
          }),
          create: mockSegmentCreate.mockResolvedValue({
            id: "segment-2",
            segmentIndex: 1,
          }),
        },
      };
      return fn(tx);
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
    mockSegmentFindUnique.mockResolvedValue({
      id: "segment-1",
      startTime: new Date(),
      screenshotPaths: [],
    });
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

  it("should trigger analysis when segment has screenshots", async () => {
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
    mockSegmentFindUnique.mockResolvedValue({
      id: "segment-1",
      startTime: new Date(),
      screenshotPaths: ["screenshot-1.png", "screenshot-2.png"],
    });
    mockSegmentUpdate.mockResolvedValue({ id: "segment-1" });
    mockSegmentAnalysisUpsert.mockResolvedValue({});

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
    const data = await response.json();
    // Note: analysisTriggered field was removed in RF-022 (screenshot analysis removed)
    expect(data.success).toBe(true);
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

  it("should reject testMode requests when not in development", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockIsE2ETestMode.mockReturnValue(false);

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        action: "start",
        testMode: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("only available in development");
  });

  it("should create completed segment in testMode when in development", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockIsE2ETestMode.mockReturnValue(true);
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });

    // Transaction mock for test mode (includes FOR UPDATE lock)
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]), // FOR UPDATE lock
        recordingSegment: {
          updateMany: mockSegmentUpdateMany.mockResolvedValue({ count: 0 }),
          findFirst: mockSegmentFindFirst.mockResolvedValue(null),
          create: mockSegmentCreate.mockResolvedValue({
            id: "test-segment-1",
            segmentIndex: 0,
          }),
        },
      };
      return fn(tx);
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({
        assessmentId: "assessment-1",
        action: "start",
        testMode: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.segmentId).toBe("test-segment-1");
    expect(data.testMode).toBe(true);

    // Verify segment was created with completed status and empty paths
    expect(mockSegmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "completed",
        chunkPaths: [],
        screenshotPaths: [],
      }),
    });
  });

  // ============================================================================
  // Transaction Tests (DI-002)
  // ============================================================================

  it("should wrap segment start operations in a transaction for atomicity", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });

    // Transaction mock (includes FOR UPDATE lock)
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]), // FOR UPDATE lock
        recordingSegment: {
          updateMany: mockSegmentUpdateMany.mockResolvedValue({ count: 0 }),
          findFirst: mockSegmentFindFirst.mockResolvedValue(null),
          create: mockSegmentCreate.mockResolvedValue({
            id: "segment-1",
            segmentIndex: 0,
          }),
        },
      };
      return fn(tx);
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1", action: "start" }),
    });

    await POST(request);

    // Verify transaction was called
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should rollback updateMany if segment create fails", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });

    // Transaction mock that fails on create (includes FOR UPDATE lock)
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]), // FOR UPDATE lock
        recordingSegment: {
          updateMany: mockSegmentUpdateMany.mockResolvedValue({ count: 1 }),
          findFirst: mockSegmentFindFirst.mockResolvedValue({ segmentIndex: 0 }),
          create: mockSegmentCreate.mockRejectedValue(new Error("Create failed")),
        },
      };
      // This will throw, simulating transaction rollback
      return fn(tx);
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1", action: "start" }),
    });

    const response = await POST(request);
    // Transaction failure results in 500 internal server error
    expect(response.status).toBe(500);
  });

  it("should ensure segment indices are sequential with no gaps", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });

    // Track operations within transaction
    const operations: string[] = [];

    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: vi.fn().mockImplementation(() => {
          operations.push("forUpdateLock");
          return Promise.resolve([]);
        }),
        recordingSegment: {
          updateMany: vi.fn().mockImplementation(() => {
            operations.push("updateMany");
            return Promise.resolve({ count: 0 });
          }),
          findFirst: vi.fn().mockImplementation(() => {
            operations.push("findFirst");
            return Promise.resolve({ segmentIndex: 4 }); // Last segment was index 4
          }),
          create: vi.fn().mockImplementation((args: { data: { segmentIndex: number } }) => {
            operations.push("create");
            // Verify the new segment index is last + 1
            expect(args.data.segmentIndex).toBe(5);
            return Promise.resolve({
              id: "segment-5",
              segmentIndex: 5,
            });
          }),
        },
      };
      return fn(tx);
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1", action: "start" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.segmentIndex).toBe(5);

    // Verify operations happened in correct order (FOR UPDATE lock first for race condition prevention)
    expect(operations).toEqual(["forUpdateLock", "updateMany", "findFirst", "create"]);
  });

  // ============================================================================
  // Race Condition Prevention Tests (DI-003)
  // ============================================================================

  it("should use FOR UPDATE lock to prevent race conditions on segment index", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });

    // Track if FOR UPDATE lock was called
    let forUpdateCalled = false;

    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: vi.fn().mockImplementation(() => {
          forUpdateCalled = true;
          return Promise.resolve([]);
        }),
        recordingSegment: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({
            id: "segment-1",
            segmentIndex: 0,
          }),
        },
      };
      return fn(tx);
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1", action: "start" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify FOR UPDATE lock was acquired before determining segment index
    expect(forUpdateCalled).toBe(true);
  });

  it("should acquire lock before reading segment index to prevent concurrent read races", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAssessmentFindFirst.mockResolvedValue({
      id: "assessment-1",
      userId: "user-1",
    });
    mockRecordingUpsert.mockResolvedValue({ id: "assessment-1-screen" });

    const operationOrder: string[] = [];

    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        $queryRaw: vi.fn().mockImplementation(() => {
          operationOrder.push("lock");
          return Promise.resolve([]);
        }),
        recordingSegment: {
          updateMany: vi.fn().mockImplementation(() => {
            operationOrder.push("updateMany");
            return Promise.resolve({ count: 0 });
          }),
          findFirst: vi.fn().mockImplementation(() => {
            operationOrder.push("findFirst");
            return Promise.resolve({ segmentIndex: 2 });
          }),
          create: vi.fn().mockImplementation(() => {
            operationOrder.push("create");
            return Promise.resolve({ id: "segment-3", segmentIndex: 3 });
          }),
        },
      };
      return fn(tx);
    });

    const request = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: "assessment-1", action: "start" }),
    });

    await POST(request);

    // Lock must happen before findFirst (which reads segment index)
    const lockIndex = operationOrder.indexOf("lock");
    const findFirstIndex = operationOrder.indexOf("findFirst");
    expect(lockIndex).toBeLessThan(findFirstIndex);
    expect(lockIndex).toBe(0); // Lock should be first operation
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
