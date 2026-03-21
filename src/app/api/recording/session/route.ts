import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { shouldAllowTestModeRecording, createLogger } from "@/lib/core";
import { success, error, validateRequest } from "@/lib/api";
import { RecordingSessionSchema } from "@/lib/schemas";

const logger = createLogger("api:recording:session");

// Note: Screenshot analysis was removed as part of assessment simplification (RF-022).
// The new system uses only video evaluation instead of screenshot-by-screenshot analysis.

// POST /api/recording/session - Start or update a recording segment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const validated = await validateRequest(request, RecordingSessionSchema);
    if ("error" in validated) return validated.error;
    const { assessmentId, action, segmentId, chunkPath, screenshotPath, testMode } = validated.data;

    // Reject testMode requests if not in development mode (double-gate safety)
    if (testMode && !shouldAllowTestModeRecording()) {
      return error("Test mode is only available in development environment", 403);
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

    // Ensure recording exists
    await db.recording.upsert({
      where: { id: recordingId },
      create: {
        id: recordingId,
        assessmentId,
        type: "screen",
        storageUrl: "",
        startTime: new Date(),
      },
      update: {},
    });

    switch (action) {
      case "start": {
        // Wrap all segment operations in a transaction with FOR UPDATE lock
        // This ensures segment indices are always sequential with no gaps
        // and prevents race conditions between concurrent requests
        const segmentResult = await db.$transaction(async (tx) => {
          // Lock the recording row to prevent concurrent reads/writes
          // This ensures only one request can determine the next segment index at a time
          await tx.$queryRaw`SELECT id FROM "Recording" WHERE id = ${recordingId} FOR UPDATE`;

          // Mark any existing "recording" segments as interrupted
          await tx.recordingSegment.updateMany({
            where: {
              recordingId,
              status: "recording",
            },
            data: {
              status: "interrupted",
              endTime: new Date(),
            },
          });

          // Get the next segment index (safe now due to FOR UPDATE lock)
          const lastSegment = await tx.recordingSegment.findFirst({
            where: { recordingId },
            orderBy: { segmentIndex: "desc" },
          });
          const nextIndex = (lastSegment?.segmentIndex ?? -1) + 1;

          // In test mode, create a completed segment with empty paths
          // This allows downstream code that expects segments to work
          if (testMode) {
            const testSegment = await tx.recordingSegment.create({
              data: {
                recordingId,
                segmentIndex: nextIndex,
                startTime: new Date(),
                endTime: new Date(),
                status: "completed",
                chunkPaths: [],
                screenshotPaths: [],
              },
            });

            return {
              success: true,
              segmentId: testSegment.id,
              segmentIndex: testSegment.segmentIndex,
              testMode: true,
            };
          }

          // Create a new segment
          const newSegment = await tx.recordingSegment.create({
            data: {
              recordingId,
              segmentIndex: nextIndex,
              startTime: new Date(),
              status: "recording",
              chunkPaths: [],
              screenshotPaths: [],
            },
          });

          return {
            success: true,
            segmentId: newSegment.id,
            segmentIndex: newSegment.segmentIndex,
          };
        });

        return success(segmentResult);
      }

      case "addChunk": {
        if (!segmentId || !chunkPath) {
          return error("segmentId and chunkPath required for addChunk", 400);
        }

        const segment = await db.recordingSegment.findUnique({
          where: { id: segmentId },
        });

        if (!segment) {
          return error("Segment not found", 404);
        }

        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            chunkPaths: [...segment.chunkPaths, chunkPath],
          },
        });

        return success({});
      }

      case "addScreenshot": {
        if (!segmentId || !screenshotPath) {
          return error("segmentId and screenshotPath required for addScreenshot", 400);
        }

        const segment = await db.recordingSegment.findUnique({
          where: { id: segmentId },
        });

        if (!segment) {
          return error("Segment not found", 404);
        }

        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            screenshotPaths: [...segment.screenshotPaths, screenshotPath],
          },
        });

        return success({});
      }

      case "complete": {
        if (!segmentId) {
          return error("segmentId required for complete", 400);
        }

        // Get segment to access screenshot paths for analysis
        const segmentToComplete = await db.recordingSegment.findUnique({
          where: { id: segmentId },
        });

        if (!segmentToComplete) {
          return error("Segment not found", 404);
        }

        const endTime = new Date();

        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            status: "completed",
            endTime,
          },
        });

        // Update recording end time
        await db.recording.update({
          where: { id: recordingId },
          data: { endTime },
        });

        // Note: Incremental screenshot analysis was removed (RF-022).
        // Video evaluation now happens after assessment completion.

        return success({});
      }

      case "interrupt": {
        if (!segmentId) {
          return error("segmentId required for interrupt", 400);
        }

        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            status: "interrupted",
            endTime: new Date(),
          },
        });

        return success({});
      }

      default:
        return error(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    logger.error("Recording session error", { error: String(err) });
    return error("Internal server error", 500);
  }
}

// GET /api/recording/session - Get current recording session status
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

    // Get the recording with all segments
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
        activeSegment: null,
        segments: [],
        totalChunks: 0,
        totalScreenshots: 0,
      });
    }

    // Find active segment (status = "recording")
    const activeSegment = recording.segments.find(
      (s) => s.status === "recording"
    );

    // Calculate totals
    const totalChunks = recording.segments.reduce(
      (acc, s) => acc + s.chunkPaths.length,
      0
    );
    const totalScreenshots = recording.segments.reduce(
      (acc, s) => acc + s.screenshotPaths.length,
      0
    );

    return success({
      hasRecording: true,
      recordingId: recording.id,
      startTime: recording.startTime,
      endTime: recording.endTime,
      activeSegment: activeSegment
        ? {
            id: activeSegment.id,
            segmentIndex: activeSegment.segmentIndex,
            startTime: activeSegment.startTime,
            chunkCount: activeSegment.chunkPaths.length,
            screenshotCount: activeSegment.screenshotPaths.length,
          }
        : null,
      segments: recording.segments.map((s) => ({
        id: s.id,
        segmentIndex: s.segmentIndex,
        status: s.status,
        startTime: s.startTime,
        endTime: s.endTime,
        chunkCount: s.chunkPaths.length,
        screenshotCount: s.screenshotPaths.length,
      })),
      totalChunks,
      totalScreenshots,
    });
  } catch (err) {
    logger.error("Recording session fetch error", { error: String(err) });
    return error("Internal server error", 500);
  }
}
