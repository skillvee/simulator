/**
 * Admin User Reset API
 *
 * POST /api/admin/user/reset
 * Deletes all assessment data for a user so they can start fresh.
 * The user account itself is preserved.
 */

import { requireAdmin, createLogger } from "@/lib/core";

const logger = createLogger("api:admin:reset");
import { db } from "@/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";
import { success, error } from "@/lib/api";

interface ResetRequest {
  userId: string;
}

/**
 * Extract storage path from a full Supabase URL or return the path as-is
 */
function extractStoragePath(urlOrPath: string): string {
  if (urlOrPath.startsWith("http")) {
    try {
      const url = new URL(urlOrPath);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.findIndex(
        (p) =>
          p === STORAGE_BUCKETS.RESUMES ||
          p === STORAGE_BUCKETS.RECORDINGS ||
          p === STORAGE_BUCKETS.SCREENSHOTS
      );
      if (bucketIndex !== -1) {
        return pathParts.slice(bucketIndex + 1).join("/");
      }
    } catch {
      // If URL parsing fails, return as-is
    }
  }
  return urlOrPath;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { userId } = body as ResetRequest;

    if (!userId) {
      return error("User ID is required", 400);
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return error("User not found", 404);
    }

    // Step 1: Collect storage file paths before deleting DB records
    const assessments = await db.assessment.findMany({
      where: { userId },
      select: {
        recordings: {
          select: {
            storageUrl: true,
            segments: {
              select: {
                chunkPaths: true,
                screenshotPaths: true,
              },
            },
          },
        },
      },
    });

    const recordingPaths: string[] = [];
    const screenshotPaths: string[] = [];

    for (const assessment of assessments) {
      for (const recording of assessment.recordings) {
        if (recording.storageUrl) {
          recordingPaths.push(recording.storageUrl);
        }
        for (const segment of recording.segments) {
          recordingPaths.push(...segment.chunkPaths);
          screenshotPaths.push(...segment.screenshotPaths);
        }
      }
    }

    // Step 2: Delete DB records in a transaction
    const counts = await db.$transaction(async (tx) => {
      // Delete video assessments first (linked by candidateId, not assessment cascade)
      const vaResult = await tx.videoAssessment.deleteMany({
        where: { candidateId: userId },
      });

      // Delete all assessments (cascades to conversations, recordings, logs, etc.)
      const assessmentResult = await tx.assessment.deleteMany({
        where: { userId },
      });

      return {
        assessments: assessmentResult.count,
        videoAssessments: vaResult.count,
      };
    });

    // Step 3: Delete storage files
    let storageFilesDeleted = 0;

    const cleanRecordingPaths = recordingPaths
      .map(extractStoragePath)
      .filter(Boolean);
    if (cleanRecordingPaths.length > 0) {
      const { error: storageErr } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.RECORDINGS)
        .remove(cleanRecordingPaths);
      if (!storageErr) storageFilesDeleted += cleanRecordingPaths.length;
    }

    const cleanScreenshotPaths = screenshotPaths
      .map(extractStoragePath)
      .filter(Boolean);
    if (cleanScreenshotPaths.length > 0) {
      const { error: storageErr } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.SCREENSHOTS)
        .remove(cleanScreenshotPaths);
      if (!storageErr) storageFilesDeleted += cleanScreenshotPaths.length;
    }

    logger.info(
      `Reset user ${user.email}`,
      { assessments: counts.assessments, videoAssessments: counts.videoAssessments, storageFilesDeleted }
    );

    return success({
      message: `Reset complete. Deleted ${counts.assessments} assessment(s).`,
      deletedCounts: {
        ...counts,
        storageFiles: storageFilesDeleted,
      },
    });
  } catch (err) {
    logger.error("Error resetting user data", { error: err instanceof Error ? err.message : String(err) });

    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return error("Unauthorized - Admin access required", 401);
    }

    return error("Failed to reset user data", 500);
  }
}
