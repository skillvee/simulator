/**
 * Video Merge Service
 *
 * Downloads all recording chunks across all segments for an assessment,
 * concatenates them into a single WebM file, uploads it to the Gemini File API,
 * and updates the Recording model with the merged file URL.
 *
 * This ensures Gemini evaluates the FULL recording, not just the last chunk.
 */

import { gemini } from "@/lib/ai/gemini";
import { db } from "@/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";
import { createLogger } from "@/lib/core";
import { makeWebmSeekable } from "@/lib/media";

const logger = createLogger("lib:analysis:video-merge");

/** Maximum total size we'll attempt to merge in-memory (500 MB) */
const MAX_MERGE_SIZE_BYTES = 500 * 1024 * 1024;

/** Max time to wait for Gemini file to become ACTIVE */
const FILE_ACTIVE_TIMEOUT_MS = 120_000;

/** Polling interval when waiting for file to become ACTIVE */
const FILE_POLL_INTERVAL_MS = 2_000;

/** WebM EBML header magic bytes */
const EBML_HEADER = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);

/** WebM Cluster element ID */
const CLUSTER_ID = new Uint8Array([0x1f, 0x43, 0xb6, 0x75]);

export interface MergeRecordingResult {
  success: boolean;
  geminiFileUri?: string;
  mergedStorageUrl?: string;
  totalChunks: number;
  totalSegments: number;
  totalSizeBytes: number;
  error?: string;
}

/**
 * Find the byte offset of the first Cluster element in a WebM buffer.
 * Returns -1 if not found.
 */
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

/**
 * Check if a buffer starts with a WebM EBML header.
 */
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
 * Uploads a video buffer to the Gemini File API and waits for it to become ACTIVE.
 * Gemini processes uploaded files asynchronously — they start in PROCESSING state
 * and must reach ACTIVE before they can be used in generateContent calls.
 */
async function uploadAndWaitForActive(
  videoBlob: Blob,
  displayName: string
): Promise<{ uri: string } | { error: string }> {
  const file = await gemini.files.upload({
    file: videoBlob,
    config: {
      mimeType: "video/webm",
      displayName,
    },
  });

  if (!file.uri || !file.name) {
    return { error: "Gemini file upload succeeded but no URI/name returned" };
  }

  // Poll until ACTIVE
  const startTime = Date.now();
  while (Date.now() - startTime < FILE_ACTIVE_TIMEOUT_MS) {
    const status = await gemini.files.get({ name: file.name });

    if (status.state === "ACTIVE") {
      return { uri: file.uri };
    }

    if (status.state === "FAILED") {
      return { error: `Gemini file processing failed for ${file.name}` };
    }

    logger.info("Waiting for Gemini file to become ACTIVE", {
      fileName: file.name,
      state: status.state ?? "unknown",
      elapsedMs: String(Date.now() - startTime),
    });

    await new Promise((r) => setTimeout(r, FILE_POLL_INTERVAL_MS));
  }

  return { error: `Timed out waiting for Gemini file ${file.name} to become ACTIVE` };
}

/**
 * Merges all recording chunks for an assessment into a single file and uploads
 * it to the Gemini File API for evaluation.
 *
 * Strategy:
 * - Single segment: simple binary concatenation of all chunks (valid WebM)
 * - Multiple segments: keep full first segment, strip EBML headers from
 *   subsequent segments' first chunks (take from first Cluster element onward)
 */
export async function mergeRecordingChunks(
  assessmentId: string
): Promise<MergeRecordingResult> {
  const recordingId = `${assessmentId}-screen`;

  try {
    // Get recording with all segments ordered by index
    const recording = await db.recording.findUnique({
      where: { id: recordingId },
      include: {
        segments: {
          orderBy: { segmentIndex: "asc" },
        },
      },
    });

    if (!recording || recording.segments.length === 0) {
      return {
        success: false,
        totalChunks: 0,
        totalSegments: 0,
        totalSizeBytes: 0,
        error: "No recording segments found",
      };
    }

    // Collect all chunk paths in order: (segmentIndex, chunk array order)
    const segments = recording.segments.filter(
      (s) => s.chunkPaths.length > 0
    );

    if (segments.length === 0) {
      return {
        success: false,
        totalChunks: 0,
        totalSegments: recording.segments.length,
        totalSizeBytes: 0,
        error: "No chunks found in any segment",
      };
    }

    const totalChunks = segments.reduce(
      (acc, s) => acc + s.chunkPaths.length,
      0
    );

    // Single chunk optimization: skip merge, just upload directly
    if (totalChunks === 1 && segments.length === 1) {
      const singlePath = segments[0].chunkPaths[0];

      const { data: downloadData, error: downloadError } =
        await supabaseAdmin.storage
          .from(STORAGE_BUCKETS.RECORDINGS)
          .download(singlePath);

      if (downloadError || !downloadData) {
        return {
          success: false,
          totalChunks: 1,
          totalSegments: 1,
          totalSizeBytes: 0,
          error: `Failed to download chunk: ${downloadError?.message}`,
        };
      }

      const rawBuffer = Buffer.from(await downloadData.arrayBuffer());
      const buffer = await makeWebmSeekable(rawBuffer);

      // Persist the seekable version so admin playback can scrub immediately
      const mergedPath = `${assessmentId}/merged.webm`;
      const { error: uploadStorageError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.RECORDINGS)
        .upload(mergedPath, buffer, {
          contentType: "video/webm",
          upsert: true,
        });

      if (!uploadStorageError) {
        const { data: signedData } = await supabaseAdmin.storage
          .from(STORAGE_BUCKETS.RECORDINGS)
          .createSignedUrl(mergedPath, 60 * 60 * 24 * 365); // 1 year
        if (signedData?.signedUrl) {
          await db.recording.update({
            where: { id: recordingId },
            data: { storageUrl: signedData.signedUrl },
          });
        }
      }

      const uploadResult = await uploadAndWaitForActive(
        new Blob([buffer], { type: "video/webm" }),
        `assessment-${assessmentId}-recording`
      );

      if ("error" in uploadResult) {
        return {
          success: false,
          totalChunks: 1,
          totalSegments: 1,
          totalSizeBytes: buffer.length,
          error: uploadResult.error,
        };
      }

      logger.info("Single chunk uploaded to Gemini", {
        assessmentId,
        geminiUri: uploadResult.uri,
        sizeBytes: String(buffer.length),
      });

      return {
        success: true,
        geminiFileUri: uploadResult.uri,
        totalChunks: 1,
        totalSegments: 1,
        totalSizeBytes: buffer.length,
      };
    }

    // Download all chunks and concatenate
    logger.info("Starting chunk merge", {
      assessmentId,
      totalSegments: String(segments.length),
      totalChunks: String(totalChunks),
    });

    const chunkBuffers: Buffer[] = [];
    let totalSize = 0;
    let skippedChunks = 0;
    let isFirstSegment = true;

    for (const segment of segments) {
      let isFirstChunkInSegment = true;

      for (const chunkPath of segment.chunkPaths) {
        const { data, error: dlError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKETS.RECORDINGS)
          .download(chunkPath);

        if (dlError || !data) {
          logger.warn("Failed to download chunk, skipping", {
            assessmentId,
            chunkPath,
            error: dlError?.message,
          });
          skippedChunks++;
          isFirstChunkInSegment = false;
          continue;
        }

        let buffer = Buffer.from(await data.arrayBuffer());

        // For subsequent segments' first chunk: strip EBML header if present
        // Keep only from the first Cluster element onward
        if (!isFirstSegment && isFirstChunkInSegment && hasEbmlHeader(buffer)) {
          const clusterOffset = findFirstClusterOffset(buffer);
          if (clusterOffset > 0) {
            logger.info("Stripping EBML header from segment first chunk", {
              assessmentId,
              segmentIndex: String(segment.segmentIndex),
              originalSize: String(buffer.length),
              clusterOffset: String(clusterOffset),
            });
            buffer = buffer.subarray(clusterOffset);
          }
        }

        // Safety check: don't exceed memory limit
        if (totalSize + buffer.length > MAX_MERGE_SIZE_BYTES) {
          logger.warn("Merge size limit reached, stopping", {
            assessmentId,
            currentSize: String(totalSize),
            limit: String(MAX_MERGE_SIZE_BYTES),
          });
          break;
        }

        chunkBuffers.push(buffer);
        totalSize += buffer.length;
        isFirstChunkInSegment = false;
      }

      isFirstSegment = false;
    }

    if (chunkBuffers.length === 0) {
      return {
        success: false,
        totalChunks,
        totalSegments: segments.length,
        totalSizeBytes: 0,
        error: "All chunk downloads failed",
      };
    }

    const concatenated = Buffer.concat(chunkBuffers);
    const merged = await makeWebmSeekable(concatenated);

    logger.info("Chunks merged", {
      assessmentId,
      mergedSize: String(merged.length),
      chunksUsed: String(chunkBuffers.length),
      chunksSkipped: String(skippedChunks),
    });

    // Upload merged file to Supabase for archival
    const mergedPath = `${assessmentId}/merged.webm`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RECORDINGS)
      .upload(mergedPath, merged, {
        contentType: "video/webm",
        upsert: true,
      });

    if (uploadError) {
      logger.warn("Failed to upload merged file to Supabase", {
        assessmentId,
        error: uploadError.message,
      });
    } else {
      // Update Recording.storageUrl with merged file signed URL
      const { data: signedData } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.RECORDINGS)
        .createSignedUrl(mergedPath, 60 * 60 * 24 * 365); // 1 year

      if (signedData?.signedUrl) {
        await db.recording.update({
          where: { id: recordingId },
          data: { storageUrl: signedData.signedUrl },
        });
      }
    }

    // Upload to Gemini File API and wait for ACTIVE
    const uploadResult = await uploadAndWaitForActive(
      new Blob([merged], { type: "video/webm" }),
      `assessment-${assessmentId}-recording`
    );

    if ("error" in uploadResult) {
      return {
        success: false,
        totalChunks,
        totalSegments: segments.length,
        totalSizeBytes: merged.length,
        error: uploadResult.error,
      };
    }

    logger.info("Merged recording uploaded to Gemini", {
      assessmentId,
      geminiUri: uploadResult.uri,
      totalSizeBytes: String(merged.length),
      segmentCount: String(segments.length),
      chunkCount: String(chunkBuffers.length),
    });

    return {
      success: true,
      geminiFileUri: uploadResult.uri,
      mergedStorageUrl: mergedPath,
      totalChunks,
      totalSegments: segments.length,
      totalSizeBytes: merged.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Video merge failed", { assessmentId, error: message });
    return {
      success: false,
      totalChunks: 0,
      totalSegments: 0,
      totalSizeBytes: 0,
      error: message,
    };
  }
}
