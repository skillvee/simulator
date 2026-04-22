/**
 * Video Recording Pipeline Integration Test
 *
 * Tests the full recording pipeline flow:
 * 1. Upload video chunks → /api/recording (POST)
 * 2. Manage recording segments → /api/recording/session (POST)
 * 3. Stitch chunks together → /api/recording/stitch (GET)
 * 4. Finalize assessment → /api/assessment/finalize (POST)
 *    → triggers video evaluation
 *
 * All external dependencies (auth, DB, Supabase, Gemini) are mocked.
 * This test verifies that the APIs compose correctly end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AssessmentStatus } from "@prisma/client";

// ============================================================================
// Shared State (simulates DB)
// ============================================================================

interface SegmentRecord {
  id: string;
  segmentIndex: number;
  status: string;
  startTime: Date;
  endTime: Date | null;
  chunkPaths: string[];
  screenshotPaths: string[];
}

interface RecordingRecord {
  id: string;
  assessmentId: string;
  type: string;
  storageUrl: string;
  startTime: Date;
  endTime: Date | null;
  segments: SegmentRecord[];
}

interface AssessmentRecord {
  id: string;
  userId: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  scenario: { taskDescription: string };
  recordings: Array<{ storageUrl: string }>;
}

let recordings: Record<string, RecordingRecord>;
let assessments: Record<string, AssessmentRecord>;
let segmentIdCounter: number;

// ============================================================================
// Mocks
// ============================================================================

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

const mockUpload = vi.fn().mockImplementation(() => Promise.resolve({ error: null }));
const mockCreateSignedUrl = vi.fn().mockImplementation((path: string) =>
  Promise.resolve({ data: { signedUrl: `https://storage.example.com/signed/${path}` }, error: null })
);

vi.mock("@/lib/external", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  },
  STORAGE_BUCKETS: { RECORDINGS: "recordings", SCREENSHOTS: "screenshots" },
  cleanupPrAfterAssessment: vi.fn().mockResolvedValue({ success: true, action: "skipped", message: "No PR" }),
  fetchPrCiStatus: vi.fn().mockResolvedValue(null),
}));

const mockTriggerVideoAssessment = vi.fn();
const mockMergeRecordingChunks = vi.fn();
vi.mock("@/lib/analysis", () => ({
  triggerVideoAssessment: (...args: unknown[]) => mockTriggerVideoAssessment(...args),
  mergeRecordingChunks: (...args: unknown[]) => mockMergeRecordingChunks(...args),
}));

vi.mock("@/lib/candidate", () => ({
  generateProfilePhoto: vi.fn().mockResolvedValue({ success: false, imageUrl: null, error: "No webcam snapshot" }),
}));

const mockTransaction = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    assessment: {
      findFirst: vi.fn().mockImplementation(({ where }: { where: { id: string; userId: string } }) => {
        const a = assessments[where.id];
        return (a && a.userId === where.userId) ? a : null;
      }),
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        const a = assessments[where.id];
        if (!a) return null;
        const rec = recordings[`${where.id}-screen`];
        return { ...a, recordings: rec ? [{ storageUrl: rec.storageUrl }] : [] };
      }),
      update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const a = assessments[where.id];
        if (!a) return null;
        Object.assign(a, data);
        return a;
      }),
    },
    recording: {
      upsert: vi.fn().mockImplementation(({ where, create, update }: { where: { id: string }; create: Record<string, unknown>; update?: Record<string, unknown> }) => {
        if (!recordings[where.id]) {
          recordings[where.id] = {
            id: where.id,
            assessmentId: create.assessmentId as string,
            type: create.type as string,
            storageUrl: (create.storageUrl as string) || "",
            startTime: create.startTime as Date,
            endTime: null,
            segments: [],
          };
        } else if (update?.storageUrl) {
          recordings[where.id].storageUrl = update.storageUrl as string;
          recordings[where.id].endTime = update.endTime as Date;
        }
        return recordings[where.id];
      }),
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        const r = recordings[where.id];
        if (!r) return null;
        return { ...r, segments: [...r.segments].sort((a, b) => a.segmentIndex - b.segmentIndex) };
      }),
      update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const r = recordings[where.id];
        if (!r) return null;
        Object.assign(r, data);
        return r;
      }),
    },
    recordingSegment: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        for (const rec of Object.values(recordings)) {
          const seg = rec.segments.find((s) => s.id === where.id);
          if (seg) return seg;
        }
        return null;
      }),
      update: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        for (const rec of Object.values(recordings)) {
          const seg = rec.segments.find((s) => s.id === where.id);
          if (seg) { Object.assign(seg, data); return seg; }
        }
        return null;
      }),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

vi.mock("@/lib/core/env", () => ({
  shouldAllowTestModeRecording: () => false,
  env: {
    DATABASE_URL: "postgresql://localhost:5432/test",
    DIRECT_URL: "postgresql://localhost:5432/test",
    AUTH_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    GEMINI_API_KEY: "key",
    SUPABASE_SERVICE_ROLE_KEY: "key",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "key",
    E2E_TEST_MODE: false,
    NEXT_PUBLIC_E2E_TEST_MODE: false,
  },
}));

vi.mock("@/lib/core", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  shouldSkipScreenRecording: () => false,
  isE2ETestMode: () => false,
  isE2ETestModeClient: () => false,
}));

// ============================================================================
// Route Imports (after mocks)
// ============================================================================

import { POST as uploadChunk } from "./route";
import { POST as sessionAction, GET as getSessionStatus } from "./session/route";
import { GET as getStitch } from "./stitch/route";
import { POST as finalizeAssessment } from "../../../app/api/assessment/finalize/route";

// ============================================================================
// Helpers
// ============================================================================

const AUTH_SESSION = {
  user: { id: "user-1", email: "test@example.com" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

/**
 * Creates a NextRequest with a mocked formData() to avoid jsdom arrayBuffer() hang.
 */
function makeUploadRequest(fields: {
  fileContent: string;
  fileType: string;
  assessmentId: string;
  type: string;
  chunkIndex?: string;
  timestamp?: string;
  segmentId?: string;
  snapshotId?: string;
}): NextRequest {
  const request = new NextRequest("http://localhost/api/recording", { method: "POST" });
  const buffer = new TextEncoder().encode(fields.fileContent).buffer;
  const mockFile = { type: fields.fileType, size: buffer.byteLength, arrayBuffer: () => Promise.resolve(buffer) };

  const formDataMap: Record<string, unknown> = {
    file: mockFile,
    assessmentId: fields.assessmentId,
    type: fields.type,
    chunkIndex: fields.chunkIndex ?? null,
    timestamp: fields.timestamp ?? null,
    segmentId: fields.segmentId ?? null,
    snapshotId: fields.snapshotId ?? null,
  };

  vi.spyOn(request, "formData").mockResolvedValue({
    get: (key: string) => formDataMap[key] ?? null,
  } as unknown as FormData);

  return request;
}

// ============================================================================
// Pipeline Test
// ============================================================================

describe("Video Recording Pipeline", () => {
  const ASSESSMENT_ID = "pipeline-test-assessment";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(AUTH_SESSION);
    recordings = {};
    assessments = {};
    segmentIdCounter = 0;

    // Default: merge succeeds
    mockMergeRecordingChunks.mockResolvedValue({
      success: true,
      geminiFileUri: "files/merged-pipeline-123",
      totalChunks: 3,
      totalSegments: 1,
      totalSizeBytes: 1024,
    });

    assessments[ASSESSMENT_ID] = {
      id: ASSESSMENT_ID,
      userId: "user-1",
      status: AssessmentStatus.WORKING,
      startedAt: new Date("2026-03-27T10:00:00Z"),
      completedAt: null,
      scenario: { taskDescription: "Implement a todo list feature" },
      recordings: [],
    };

    mockTransaction.mockImplementation(async (fn) => {
      const recordingId = `${ASSESSMENT_ID}-screen`;
      const recording = recordings[recordingId];
      const existingSegments = recording?.segments ?? [];
      const lastSegment = existingSegments.length > 0 ? existingSegments[existingSegments.length - 1] : null;
      const nextIndex = (lastSegment?.segmentIndex ?? -1) + 1;

      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        recordingSegment: {
          updateMany: vi.fn().mockImplementation(() => {
            if (recording) {
              for (const seg of recording.segments) {
                if (seg.status === "recording") { seg.status = "interrupted"; seg.endTime = new Date(); }
              }
            }
            return Promise.resolve({ count: 0 });
          }),
          findFirst: vi.fn().mockResolvedValue(lastSegment),
          create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
            segmentIdCounter++;
            const newSeg = {
              id: `segment-${segmentIdCounter}`,
              segmentIndex: nextIndex,
              status: data.status as string,
              startTime: data.startTime as Date,
              endTime: (data.endTime as Date) ?? null,
              chunkPaths: (data.chunkPaths as string[]) ?? [],
              screenshotPaths: (data.screenshotPaths as string[]) ?? [],
            };
            if (recording) recording.segments.push(newSeg);
            return Promise.resolve(newSeg);
          }),
        },
      };
      return fn(tx);
    });
  });

  // ==========================================================================
  // Stage 1: Upload
  // ==========================================================================

  it("Stage 1: Upload video chunk to storage", async () => {
    const request = makeUploadRequest({
      fileContent: "fake-video-data",
      fileType: "video/webm",
      assessmentId: ASSESSMENT_ID,
      type: "video",
      chunkIndex: "0",
      timestamp: "1711522800000",
    });

    const response = await uploadChunk(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.type).toBe("video");
    expect(data.data.chunkIndex).toBe(0);
    expect(data.data.path).toContain(ASSESSMENT_ID);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(recordings[`${ASSESSMENT_ID}-screen`]).toBeDefined();
  });

  it("Stage 1b: Upload screenshot to storage", async () => {
    const request = makeUploadRequest({
      fileContent: "fake-jpeg-data",
      fileType: "image/jpeg",
      assessmentId: ASSESSMENT_ID,
      type: "screenshot",
      timestamp: "1711522830000",
    });

    const response = await uploadChunk(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.type).toBe("screenshot");
  });

  // ==========================================================================
  // Stage 2: Session Management
  // ==========================================================================

  it("Stage 2: Start and complete a recording segment", async () => {
    const startReq = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: ASSESSMENT_ID, action: "start" }),
    });
    const startRes = await sessionAction(startReq);
    expect(startRes.status).toBe(200);
    const startData = await startRes.json();
    expect(startData.data.segmentIndex).toBe(0);

    const completeReq = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: ASSESSMENT_ID, action: "complete", segmentId: startData.data.segmentId }),
    });
    const completeRes = await sessionAction(completeReq);
    expect(completeRes.status).toBe(200);
  });

  it("Stage 2b: Multiple segments with interruption", async () => {
    const start0 = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: ASSESSMENT_ID, action: "start" }),
    });
    const res0 = await sessionAction(start0);
    const seg0 = (await res0.json()).data;
    expect(seg0.segmentIndex).toBe(0);

    const start1 = new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: ASSESSMENT_ID, action: "start" }),
    });
    const res1 = await sessionAction(start1);
    const seg1 = (await res1.json()).data;
    expect(seg1.segmentIndex).toBe(1);

    const recording = recordings[`${ASSESSMENT_ID}-screen`];
    const segment0 = recording?.segments.find((s) => s.id === seg0.segmentId);
    expect(segment0?.status).toBe("interrupted");
  });

  // ==========================================================================
  // Stage 3: Stitch
  // ==========================================================================

  it("Stage 3: Stitch returns chunks in correct order", async () => {
    const recordingId = `${ASSESSMENT_ID}-screen`;
    recordings[recordingId] = {
      id: recordingId, assessmentId: ASSESSMENT_ID, type: "screen",
      storageUrl: "https://example.com/url", startTime: new Date(), endTime: new Date(),
      segments: [
        { id: "seg-0", segmentIndex: 0, status: "completed", startTime: new Date(), endTime: new Date(),
          chunkPaths: [`${ASSESSMENT_ID}/1000-chunk-0.webm`, `${ASSESSMENT_ID}/1000-chunk-1.webm`],
          screenshotPaths: [`${ASSESSMENT_ID}/1000.jpg`] },
        { id: "seg-1", segmentIndex: 1, status: "completed", startTime: new Date(), endTime: new Date(),
          chunkPaths: [`${ASSESSMENT_ID}/2000-chunk-0.webm`, `${ASSESSMENT_ID}/2000-chunk-1.webm`, `${ASSESSMENT_ID}/2000-chunk-2.webm`],
          screenshotPaths: [`${ASSESSMENT_ID}/2000.jpg`] },
      ],
    };

    const response = await getStitch(new NextRequest(
      `http://localhost/api/recording/stitch?assessmentId=${ASSESSMENT_ID}`
    ));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.totalSegments).toBe(2);
    expect(data.data.totalChunks).toBe(5);
    expect(data.data.totalScreenshots).toBe(2);

    const order = data.data.stitchingOrder;
    expect(order).toHaveLength(5);
    expect(order[0].segmentIndex).toBe(0);
    expect(order[1].segmentIndex).toBe(0);
    expect(order[2].segmentIndex).toBe(1);
    expect(order[4].segmentIndex).toBe(1);
  });

  // ==========================================================================
  // Stage 4: Finalize
  // ==========================================================================

  it("Stage 4: Finalize triggers video assessment when recording exists", async () => {
    recordings[`${ASSESSMENT_ID}-screen`] = {
      id: `${ASSESSMENT_ID}-screen`, assessmentId: ASSESSMENT_ID, type: "screen",
      storageUrl: "https://storage.example.com/signed/video.webm",
      startTime: new Date(), endTime: new Date(), segments: [],
    };
    assessments[ASSESSMENT_ID].recordings = [{ storageUrl: "https://storage.example.com/signed/video.webm" }];

    mockTriggerVideoAssessment.mockResolvedValue({ success: true, videoAssessmentId: "video-assessment-123" });

    const response = await finalizeAssessment(new Request(
      "http://localhost/api/assessment/finalize",
      { method: "POST", body: JSON.stringify({ assessmentId: ASSESSMENT_ID }) }
    ));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.assessment.status).toBe(AssessmentStatus.COMPLETED);
    expect(data.data.videoAssessment.triggered).toBe(true);
    expect(data.data.videoAssessment.videoAssessmentId).toBe(null); // Resolved async (fire-and-forget)
    // Flush microtasks so the fire-and-forget .then() chain completes
    await new Promise((r) => setTimeout(r, 0));
    // Verify merge was called, then trigger includes geminiFileUri
    expect(mockMergeRecordingChunks).toHaveBeenCalledWith(ASSESSMENT_ID);
    expect(mockTriggerVideoAssessment).toHaveBeenCalledWith({
      assessmentId: ASSESSMENT_ID, candidateId: "user-1",
      videoUrl: "https://storage.example.com/signed/video.webm",
      geminiFileUri: "files/merged-pipeline-123",
      taskDescription: "Implement a todo list feature",
    });
  });

  it("Stage 4b: Finalize without recording does not trigger video assessment", async () => {
    const response = await finalizeAssessment(new Request(
      "http://localhost/api/assessment/finalize",
      { method: "POST", body: JSON.stringify({ assessmentId: ASSESSMENT_ID }) }
    ));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data.videoAssessment.triggered).toBe(false);
    expect(data.data.videoAssessment.hasRecording).toBe(false);
    expect(mockTriggerVideoAssessment).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // Full Pipeline
  // ==========================================================================

  it("Full pipeline: upload → session → stitch → finalize", async () => {
    // Step 1: Start a recording session
    const startRes = await sessionAction(new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: ASSESSMENT_ID, action: "start" }),
    }));
    expect(startRes.status).toBe(200);
    const { segmentId } = (await startRes.json()).data;

    // Step 2: Upload 3 video chunks
    for (let i = 0; i < 3; i++) {
      const uploadRes = await uploadChunk(makeUploadRequest({
        fileContent: `video-data-chunk-${i}`, fileType: "video/webm",
        assessmentId: ASSESSMENT_ID, type: "video",
        chunkIndex: String(i), timestamp: String(1711522800000 + i * 10000), segmentId,
      }));
      expect(uploadRes.status).toBe(200);
    }

    // Step 3: Upload a screenshot
    const ssRes = await uploadChunk(makeUploadRequest({
      fileContent: "fake-jpeg", fileType: "image/jpeg",
      assessmentId: ASSESSMENT_ID, type: "screenshot",
      timestamp: "1711522830000", segmentId,
    }));
    expect(ssRes.status).toBe(200);

    // Step 4: Complete the segment
    const completeRes = await sessionAction(new NextRequest("http://localhost/api/recording/session", {
      method: "POST",
      body: JSON.stringify({ assessmentId: ASSESSMENT_ID, action: "complete", segmentId }),
    }));
    expect(completeRes.status).toBe(200);

    // Step 5: Session status
    const statusRes = await getSessionStatus(new NextRequest(
      `http://localhost/api/recording/session?assessmentId=${ASSESSMENT_ID}`
    ));
    expect(statusRes.status).toBe(200);
    expect((await statusRes.json()).data.hasRecording).toBe(true);

    // Step 6: Stitch
    const stitchRes = await getStitch(new NextRequest(
      `http://localhost/api/recording/stitch?assessmentId=${ASSESSMENT_ID}`
    ));
    expect(stitchRes.status).toBe(200);
    expect((await stitchRes.json()).data.hasRecording).toBe(true);

    // Step 7: Finalize
    const recordingId = `${ASSESSMENT_ID}-screen`;
    if (recordings[recordingId]) {
      recordings[recordingId].storageUrl = "https://storage.example.com/signed/final.webm";
      assessments[ASSESSMENT_ID].recordings = [{ storageUrl: "https://storage.example.com/signed/final.webm" }];
    }

    mockTriggerVideoAssessment.mockResolvedValue({ success: true, videoAssessmentId: "va-pipeline-test" });

    const finalizeRes = await finalizeAssessment(new Request(
      "http://localhost/api/assessment/finalize",
      { method: "POST", body: JSON.stringify({ assessmentId: ASSESSMENT_ID }) }
    ));
    expect(finalizeRes.status).toBe(200);

    const finalizeData = await finalizeRes.json();
    expect(finalizeData.data.assessment.status).toBe(AssessmentStatus.COMPLETED);
    expect(finalizeData.data.videoAssessment.triggered).toBe(true);
    expect(finalizeData.data.videoAssessment.videoAssessmentId).toBe(null); // Resolved async (fire-and-forget)
    // Flush microtasks so the fire-and-forget .then() chain completes
    await new Promise((r) => setTimeout(r, 0));
    expect(mockMergeRecordingChunks).toHaveBeenCalledWith(ASSESSMENT_ID);
    expect(mockTriggerVideoAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: ASSESSMENT_ID, candidateId: "user-1",
        videoUrl: "https://storage.example.com/signed/final.webm",
        geminiFileUri: "files/merged-pipeline-123",
      })
    );
    expect(mockUpload).toHaveBeenCalledTimes(4);
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  it("rejects uploads after assessment is completed", async () => {
    assessments[ASSESSMENT_ID].status = AssessmentStatus.COMPLETED;

    const response = await uploadChunk(makeUploadRequest({
      fileContent: "late-video-data", fileType: "video/webm",
      assessmentId: ASSESSMENT_ID, type: "video", chunkIndex: "99",
    }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("completed");
  });
});
