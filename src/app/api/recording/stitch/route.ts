import { NextRequest } from "next/server";
import { success, error } from "@/lib/api";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { supabaseAdmin } from "@/lib/external";
import { STORAGE_BUCKETS } from "@/lib/external";

// GET /api/recording/stitch - Get all recording segments with signed URLs for stitching
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return error("assessmentId is required", 400);
    }

    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    const recordingId = `${assessmentId}-screen`;

    // Get recording with all segments ordered by index
    const recording = await db.recording.findUnique({
      where: { id: recordingId },
      include: {
        segments: {
          orderBy: { segmentIndex: "asc" },
        },
      },
    });

    if (!recording) {
      return success({
        hasRecording: false,
        segments: [],
        stitchingOrder: [],
      });
    }

    // Generate signed URLs for all chunks and screenshots
    const segmentsWithUrls = await Promise.all(
      recording.segments.map(async (segment) => {
        // Get signed URLs for video chunks
        const chunkUrls = await Promise.all(
          segment.chunkPaths.map(async (path) => {
            const { data } = await supabaseAdmin.storage
              .from(STORAGE_BUCKETS.RECORDINGS)
              .createSignedUrl(path, 60 * 60 * 24); // 24 hour expiry
            return {
              path,
              url: data?.signedUrl || null,
            };
          })
        );

        // Get signed URLs for screenshots
        const screenshotUrls = await Promise.all(
          segment.screenshotPaths.map(async (path) => {
            const { data } = await supabaseAdmin.storage
              .from(STORAGE_BUCKETS.SCREENSHOTS)
              .createSignedUrl(path, 60 * 60 * 24); // 24 hour expiry
            return {
              path,
              url: data?.signedUrl || null,
            };
          })
        );

        return {
          id: segment.id,
          segmentIndex: segment.segmentIndex,
          status: segment.status,
          startTime: segment.startTime,
          endTime: segment.endTime,
          chunks: chunkUrls,
          screenshots: screenshotUrls,
        };
      })
    );

    // Create a flat ordered list of all chunk URLs for stitching
    const stitchingOrder = segmentsWithUrls.flatMap((segment) =>
      segment.chunks
        .filter((c) => c.url !== null)
        .map((c) => ({
          segmentId: segment.id,
          segmentIndex: segment.segmentIndex,
          url: c.url!,
          path: c.path,
        }))
    );

    return success({
      hasRecording: true,
      recordingId: recording.id,
      startTime: recording.startTime,
      endTime: recording.endTime,
      segments: segmentsWithUrls,
      stitchingOrder,
      totalSegments: recording.segments.length,
      totalChunks: stitchingOrder.length,
      totalScreenshots: segmentsWithUrls.reduce(
        (acc, s) => acc + s.screenshots.length,
        0
      ),
      // Summary for analysis
      summary: {
        interruptionCount: recording.segments.filter(
          (s) => s.status === "interrupted"
        ).length,
        completedSegments: recording.segments.filter(
          (s) => s.status === "completed"
        ).length,
        recordingSegments: recording.segments.filter(
          (s) => s.status === "recording"
        ).length,
      },
    });
  } catch (err) {
    console.error("Recording stitch error:", err);
    return error("Internal server error", 500);
  }
}
