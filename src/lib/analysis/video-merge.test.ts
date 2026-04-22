import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Gemini
const mockGeminiUpload = vi.fn();
const mockGeminiFilesGet = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  gemini: {
    files: {
      upload: (...args: unknown[]) => mockGeminiUpload(...args),
      get: (...args: unknown[]) => mockGeminiFilesGet(...args),
    },
  },
}));

// Mock database
const mockRecordingFindUnique = vi.fn();
const mockRecordingUpdate = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    recording: {
      findUnique: (...args: unknown[]) => mockRecordingFindUnique(...args),
      update: (...args: unknown[]) => mockRecordingUpdate(...args),
    },
  },
}));

// Mock Supabase storage
const mockDownload = vi.fn();
const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();
vi.mock("@/lib/external", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        download: (...args: unknown[]) => mockDownload(...args),
        upload: (...args: unknown[]) => mockUpload(...args),
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

import { mergeRecordingChunks } from "./video-merge";

// Helper: create a fake Blob that works in Node.js tests
function fakeBlob(content: Uint8Array) {
  return {
    arrayBuffer: () => Promise.resolve(content.buffer),
  };
}

// WebM EBML header magic bytes
const EBML_HEADER = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
// WebM Cluster element ID
const CLUSTER_ID = new Uint8Array([0x1f, 0x43, 0xb6, 0x75]);

/** Creates a fake WebM buffer with EBML header + metadata + Cluster */
function makeWebmBuffer(clusterData: number[]): Uint8Array {
  // EBML header (4 bytes) + some metadata (8 bytes) + Cluster ID (4 bytes) + data
  const metadata = new Uint8Array([0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01]);
  const result = new Uint8Array(4 + metadata.length + 4 + clusterData.length);
  result.set(EBML_HEADER, 0);
  result.set(metadata, 4);
  result.set(CLUSTER_ID, 12);
  result.set(new Uint8Array(clusterData), 16);
  return result;
}

/** Creates a plain data buffer (no EBML header, e.g. continuation chunk) */
function makeDataBuffer(data: number[]): Uint8Array {
  return new Uint8Array(data);
}

describe("mergeRecordingChunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed/merged.webm" },
      error: null,
    });
    mockRecordingUpdate.mockResolvedValue({});
    // uploadAndWaitForActive needs files.get to return ACTIVE state
    mockGeminiFilesGet.mockResolvedValue({ state: "ACTIVE" });
  });

  it("returns error when no recording exists", async () => {
    mockRecordingFindUnique.mockResolvedValue(null);

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(false);
    expect(result.error).toContain("No recording segments found");
    expect(result.totalChunks).toBe(0);
  });

  it("returns error when recording has no segments", async () => {
    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [],
    });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(false);
    expect(result.error).toContain("No recording segments found");
  });

  it("returns error when all segments have empty chunkPaths", async () => {
    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        { segmentIndex: 0, chunkPaths: [], screenshotPaths: [] },
      ],
    });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(false);
    expect(result.error).toContain("No chunks found");
  });

  // ==========================================================================
  // Single chunk optimization
  // ==========================================================================

  it("uploads single chunk directly to Gemini without merging", async () => {
    const chunkData = makeWebmBuffer([1, 2, 3, 4]);

    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        { segmentIndex: 0, chunkPaths: ["test-assessment/1000-chunk-0.webm"] },
      ],
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed/chunk.webm" },
      error: null,
    });
    mockDownload.mockResolvedValue({
      data: fakeBlob(chunkData),
      error: null,
    });
    mockGeminiUpload.mockResolvedValue({
      uri: "files/single-chunk-123",
      name: "files/single-chunk-123",
    });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(true);
    expect(result.geminiFileUri).toBe("files/single-chunk-123");
    expect(result.totalChunks).toBe(1);
    expect(result.totalSegments).toBe(1);
    expect(result.totalSizeBytes).toBe(chunkData.length);

    // Should NOT upload to Supabase (no merge needed)
    expect(mockUpload).not.toHaveBeenCalled();
    // Should upload to Gemini with correct mimeType
    expect(mockGeminiUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ mimeType: "video/webm" }),
      })
    );
  });

  it("returns error when single chunk download fails", async () => {
    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        { segmentIndex: 0, chunkPaths: ["test-assessment/1000-chunk-0.webm"] },
      ],
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://storage.example.com/signed/chunk.webm" },
      error: null,
    });
    mockDownload.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to download chunk");
  });

  // ==========================================================================
  // Multi-chunk merge
  // ==========================================================================

  it("merges multiple chunks from a single segment", async () => {
    const chunk0 = makeWebmBuffer([1, 2, 3]);
    const chunk1 = makeDataBuffer([4, 5, 6]);
    const chunk2 = makeDataBuffer([7, 8, 9]);

    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        {
          segmentIndex: 0,
          chunkPaths: [
            "test-assessment/1000-chunk-0.webm",
            "test-assessment/1000-chunk-1.webm",
            "test-assessment/1000-chunk-2.webm",
          ],
        },
      ],
    });

    let downloadCall = 0;
    mockDownload.mockImplementation(() => {
      downloadCall++;
      const data = [chunk0, chunk1, chunk2][downloadCall - 1];
      return Promise.resolve({ data: fakeBlob(data), error: null });
    });

    mockGeminiUpload.mockResolvedValue({ uri: "files/merged-123", name: "files/merged-123" });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(true);
    expect(result.geminiFileUri).toBe("files/merged-123");
    expect(result.totalChunks).toBe(3);
    expect(result.totalSegments).toBe(1);
    expect(result.totalSizeBytes).toBe(chunk0.length + chunk1.length + chunk2.length);

    // Should upload merged file to Supabase
    expect(mockUpload).toHaveBeenCalledWith(
      "test-assessment/merged.webm",
      expect.any(Buffer),
      expect.objectContaining({ contentType: "video/webm", upsert: true })
    );
  });

  it("strips EBML headers from subsequent segments' first chunks", async () => {
    // Segment 0: full WebM with EBML header
    const seg0Chunk = makeWebmBuffer([10, 20, 30]);
    // Segment 1: also has EBML header (from new MediaRecorder start)
    const seg1Chunk = makeWebmBuffer([40, 50, 60]);

    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        { segmentIndex: 0, chunkPaths: ["test/seg0-chunk0.webm"] },
        { segmentIndex: 1, chunkPaths: ["test/seg1-chunk0.webm"] },
      ],
    });

    let downloadCall = 0;
    mockDownload.mockImplementation(() => {
      downloadCall++;
      const data = downloadCall === 1 ? seg0Chunk : seg1Chunk;
      return Promise.resolve({ data: fakeBlob(data), error: null });
    });

    mockGeminiUpload.mockResolvedValue({ uri: "files/multi-seg-123", name: "files/multi-seg-123" });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(true);
    expect(result.totalSegments).toBe(2);
    expect(result.totalChunks).toBe(2);

    // The merged size should be LESS than both chunks combined
    // because segment 1's EBML header was stripped
    const fullSize = seg0Chunk.length + seg1Chunk.length;
    expect(result.totalSizeBytes).toBeLessThan(fullSize);

    // Segment 0 is kept in full, segment 1 starts from Cluster ID
    // seg0Chunk.length + (seg1Chunk data from Cluster onward)
    // Cluster starts at offset 12 in our makeWebmBuffer
    const expectedSize = seg0Chunk.length + (seg1Chunk.length - 12);
    expect(result.totalSizeBytes).toBe(expectedSize);
  });

  it("skips failed chunk downloads and continues", async () => {
    const chunk0 = makeWebmBuffer([1, 2, 3]);
    const chunk2 = makeDataBuffer([7, 8, 9]);

    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        {
          segmentIndex: 0,
          chunkPaths: [
            "test/chunk-0.webm",
            "test/chunk-1.webm", // This one will fail
            "test/chunk-2.webm",
          ],
        },
      ],
    });

    let downloadCall = 0;
    mockDownload.mockImplementation(() => {
      downloadCall++;
      if (downloadCall === 2) {
        return Promise.resolve({ data: null, error: { message: "Network error" } });
      }
      const data = downloadCall === 1 ? chunk0 : chunk2;
      return Promise.resolve({ data: fakeBlob(data), error: null });
    });

    mockGeminiUpload.mockResolvedValue({ uri: "files/partial-123", name: "files/partial-123" });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(true);
    // Total chunks count is 3 (all in segment), but only 2 were successfully downloaded
    expect(result.totalChunks).toBe(3);
    expect(result.totalSizeBytes).toBe(chunk0.length + chunk2.length);
  });

  it("returns error when all chunk downloads fail", async () => {
    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        {
          segmentIndex: 0,
          chunkPaths: ["test/chunk-0.webm", "test/chunk-1.webm"],
        },
      ],
    });

    mockDownload.mockResolvedValue({
      data: null,
      error: { message: "Storage error" },
    });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(false);
    expect(result.error).toContain("All chunk downloads failed");
  });

  // ==========================================================================
  // Supabase upload fallback
  // ==========================================================================

  it("still uploads to Gemini even if Supabase archival upload fails", async () => {
    const chunk0 = makeWebmBuffer([1, 2]);
    const chunk1 = makeDataBuffer([3, 4]);

    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        { segmentIndex: 0, chunkPaths: ["test/c0.webm", "test/c1.webm"] },
      ],
    });

    let downloadCall = 0;
    mockDownload.mockImplementation(() => {
      downloadCall++;
      const data = downloadCall === 1 ? chunk0 : chunk1;
      return Promise.resolve({ data: fakeBlob(data), error: null });
    });

    // Supabase upload fails
    mockUpload.mockResolvedValue({ error: { message: "Quota exceeded" } });
    mockGeminiUpload.mockResolvedValue({ uri: "files/fallback-123", name: "files/fallback-123" });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(true);
    expect(result.geminiFileUri).toBe("files/fallback-123");
    // Recording.storageUrl should NOT be updated
    expect(mockRecordingUpdate).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // Gemini upload failure
  // ==========================================================================

  it("returns error when Gemini upload returns no URI", async () => {
    const chunk0 = makeWebmBuffer([1, 2]);
    const chunk1 = makeDataBuffer([3, 4]);

    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        { segmentIndex: 0, chunkPaths: ["test/c0.webm", "test/c1.webm"] },
      ],
    });

    let downloadCall = 0;
    mockDownload.mockImplementation(() => {
      downloadCall++;
      const data = downloadCall === 1 ? chunk0 : chunk1;
      return Promise.resolve({ data: fakeBlob(data), error: null });
    });

    mockGeminiUpload.mockResolvedValue({ uri: null, name: null });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(false);
    expect(result.error).toContain("no URI");
    expect(result.totalSizeBytes).toBeGreaterThan(0);
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================

  it("handles unexpected errors gracefully", async () => {
    mockRecordingFindUnique.mockRejectedValue(new Error("DB connection lost"));

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(false);
    expect(result.error).toContain("DB connection lost");
    expect(result.totalChunks).toBe(0);
  });

  // ==========================================================================
  // Integration: includes interrupted segments
  // ==========================================================================

  it("merges chunks from both completed and interrupted segments", async () => {
    const seg0Chunk = makeWebmBuffer([1, 2, 3]);
    const seg1Chunk = makeWebmBuffer([4, 5, 6]);

    mockRecordingFindUnique.mockResolvedValue({
      id: "test-assessment-screen",
      segments: [
        { segmentIndex: 0, status: "interrupted", chunkPaths: ["test/seg0.webm"] },
        { segmentIndex: 1, status: "completed", chunkPaths: ["test/seg1.webm"] },
      ],
    });

    let downloadCall = 0;
    mockDownload.mockImplementation(() => {
      downloadCall++;
      const data = downloadCall === 1 ? seg0Chunk : seg1Chunk;
      return Promise.resolve({ data: fakeBlob(data), error: null });
    });

    mockGeminiUpload.mockResolvedValue({ uri: "files/interrupted-123", name: "files/interrupted-123" });

    const result = await mergeRecordingChunks("test-assessment");

    expect(result.success).toBe(true);
    expect(result.totalSegments).toBe(2);
    // Both segments' chunks should be included
    expect(result.totalChunks).toBe(2);
  });
});
