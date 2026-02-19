/**
 * Admin User Reset API
 *
 * POST /api/admin/user/reset
 * Deletes all assessment data for a user so they can start fresh.
 * The user account itself is preserved.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";

interface ResetRequest {
  userId: string;
}

interface ResetResponse {
  success: boolean;
  message: string;
  deletedCounts?: {
    assessments: number;
    videoAssessments: number;
    storageFiles: number;
  };
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

export async function POST(
  request: Request
): Promise<NextResponse<ResetResponse>> {
  try {
    await requireAdmin();

    const body = await request.json();
    const { userId } = body as ResetRequest;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
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
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.RECORDINGS)
        .remove(cleanRecordingPaths);
      if (!error) storageFilesDeleted += cleanRecordingPaths.length;
    }

    const cleanScreenshotPaths = screenshotPaths
      .map(extractStoragePath)
      .filter(Boolean);
    if (cleanScreenshotPaths.length > 0) {
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.SCREENSHOTS)
        .remove(cleanScreenshotPaths);
      if (!error) storageFilesDeleted += cleanScreenshotPaths.length;
    }

    console.log(
      `[Admin] Reset user ${user.email}: ${counts.assessments} assessments, ${counts.videoAssessments} video assessments, ${storageFilesDeleted} storage files deleted`
    );

    return NextResponse.json({
      success: true,
      message: `Reset complete. Deleted ${counts.assessments} assessment(s).`,
      deletedCounts: {
        ...counts,
        storageFiles: storageFilesDeleted,
      },
    });
  } catch (error) {
    console.error("Error resetting user data:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to reset user data" },
      { status: 500 }
    );
  }
}
