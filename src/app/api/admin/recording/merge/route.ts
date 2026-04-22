import { requireAdmin, createLogger } from "@/lib/core";
import { success, error } from "@/lib/api";
import { db } from "@/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";

const logger = createLogger("api:admin:recording:merge");

/** WebM EBML header magic bytes */
const EBML_HEADER = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);

/** WebM Cluster element ID */
const CLUSTER_ID = new Uint8Array([0x1f, 0x43, 0xb6, 0x75]);

/** Max merge size (500 MB) */
const MAX_MERGE_SIZE_BYTES = 500 * 1024 * 1024;

function findFirstClusterOffset(buffer: Uint8Array): number {
  for (let i = 0; i <= buffer.length - 4; i++) {
    if (
      buffer[i] === CLUSTER_ID[0] &&
      buffer[i + 1] === CLUSTER_ID[1] &&
      buffer[i + 2] === CLUSTER_ID[2] &&
      buffer[i + 3] === CLUSTER_ID[3]
    ) {
      return i;
    }
  }
  return -1;
}

function hasEbmlHeader(buffer: Uint8Array): boolean {
  if (buffer.length < 4) return false;
  return (
    buffer[0] === EBML_HEADER[0] &&
    buffer[1] === EBML_HEADER[1] &&
    buffer[2] === EBML_HEADER[2] &&
    buffer[3] === EBML_HEADER[3]
  );
}

/**
 * POST /api/admin/recording/merge
 *
 * Admin-only endpoint to merge recording chunks on-demand for playback.
 * Merges all chunks into a single WebM, uploads to Supabase, updates storageUrl.
 * Does NOT upload to Gemini (that happens during finalization).
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const assessmentId = body.assessmentId;

    if (!assessmentId || typeof assessmentId !== "string") {
      return error("assessmentId is required", 400);
    }

    const recordingId = `${assessmentId}-screen`;

    const recording = await db.recording.findUnique({
      where: { id: recordingId },
      include: {
        segments: {
          orderBy: { segmentIndex: "asc" },
        },
      },
    });

    if (!recording) {
      return error("No recording found", 404);
    }

    const segments = recording.segments.filter(
      (s) => s.chunkPaths.length > 0
    );

    if (segments.length === 0) {
      return error("No chunks found in any segment", 404);
    }

    const totalChunks = segments.reduce(
      (acc, s) => acc + s.chunkPaths.length,
      0
    );

    logger.info("Starting admin merge", {
      assessmentId,
      totalSegments: String(segments.length),
      totalChunks: String(totalChunks),
    });

    // Download all chunks in parallel, then assemble in order
    const allChunkPaths = segments.flatMap((segment, segIdx) =>
      segment.chunkPaths.map((path, chunkIdx) => ({
        path,
        segIdx,
        chunkIdx,
        isFirstSegment: segIdx === 0,
        isFirstChunkInSegment: chunkIdx === 0,
      }))
    );

    const downloadResults = await Promise.all(
      allChunkPaths.map(async (chunk) => {
        const { data, error: dlError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKETS.RECORDINGS)
          .download(chunk.path);

        if (dlError || !data) {
          logger.warn("Failed to download chunk, skipping", {
            assessmentId,
            chunkPath: chunk.path,
            error: dlError?.message,
          });
          return { ...chunk, buffer: null };
        }

        let buffer = Buffer.from(await data.arrayBuffer());

        // For subsequent segments' first chunk: strip EBML header
        if (!chunk.isFirstSegment && chunk.isFirstChunkInSegment && hasEbmlHeader(buffer)) {
          const clusterOffset = findFirstClusterOffset(buffer);
          if (clusterOffset > 0) {
            buffer = buffer.subarray(clusterOffset);
          }
        }

        return { ...chunk, buffer };
      })
    );

    // Assemble in order, respecting size limit
    const chunkBuffers: Buffer[] = [];
    let totalSize = 0;
    let skippedChunks = 0;

    for (const result of downloadResults) {
      if (!result.buffer) {
        skippedChunks++;
        continue;
      }
      if (totalSize + result.buffer.length > MAX_MERGE_SIZE_BYTES) {
        logger.warn("Merge size limit reached", { assessmentId });
        break;
      }
      chunkBuffers.push(result.buffer);
      totalSize += result.buffer.length;
    }

    if (chunkBuffers.length === 0) {
      return error("All chunk downloads failed", 500);
    }

    const merged = Buffer.concat(chunkBuffers);

    // Upload merged file to Supabase
    const mergedPath = `${assessmentId}/merged.webm`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RECORDINGS)
      .upload(mergedPath, merged, {
        contentType: "video/webm",
        upsert: true,
      });

    if (uploadError) {
      return error(`Failed to upload merged file: ${uploadError.message}`, 500);
    }

    // Create signed URL and update recording
    const { data: signedData } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RECORDINGS)
      .createSignedUrl(mergedPath, 60 * 60 * 24 * 365); // 1 year

    if (!signedData?.signedUrl) {
      return error("Failed to create signed URL for merged file", 500);
    }

    await db.recording.update({
      where: { id: recordingId },
      data: { storageUrl: signedData.signedUrl },
    });

    logger.info("Admin merge complete", {
      assessmentId,
      mergedSize: String(merged.length),
      chunksUsed: String(chunkBuffers.length),
      chunksSkipped: String(skippedChunks),
    });

    return success({
      storageUrl: signedData.signedUrl,
      totalChunks,
      chunksUsed: chunkBuffers.length,
      chunksSkipped: skippedChunks,
      totalSizeBytes: merged.length,
    });
  } catch (err) {
    logger.error("Admin merge failed", { error: String(err) });
    return error("Internal server error", 500);
  }
}
