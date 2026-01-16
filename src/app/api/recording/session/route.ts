import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

// POST /api/recording/session - Start or update a recording segment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assessmentId, action, segmentId, chunkPath, screenshotPath } = body;

    if (!assessmentId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: assessmentId, action" },
        { status: 400 }
      );
    }

    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    const recordingId = `${assessmentId}-screen`;

    // Ensure recording exists
    const recording = await db.recording.upsert({
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
        // Mark any existing "recording" segments as interrupted
        await db.recordingSegment.updateMany({
          where: {
            recordingId,
            status: "recording",
          },
          data: {
            status: "interrupted",
            endTime: new Date(),
          },
        });

        // Get the next segment index
        const lastSegment = await db.recordingSegment.findFirst({
          where: { recordingId },
          orderBy: { segmentIndex: "desc" },
        });
        const nextIndex = (lastSegment?.segmentIndex ?? -1) + 1;

        // Create a new segment
        const newSegment = await db.recordingSegment.create({
          data: {
            recordingId,
            segmentIndex: nextIndex,
            startTime: new Date(),
            status: "recording",
            chunkPaths: [],
            screenshotPaths: [],
          },
        });

        return NextResponse.json({
          success: true,
          segmentId: newSegment.id,
          segmentIndex: newSegment.segmentIndex,
        });
      }

      case "addChunk": {
        if (!segmentId || !chunkPath) {
          return NextResponse.json(
            { error: "segmentId and chunkPath required for addChunk" },
            { status: 400 }
          );
        }

        const segment = await db.recordingSegment.findUnique({
          where: { id: segmentId },
        });

        if (!segment) {
          return NextResponse.json(
            { error: "Segment not found" },
            { status: 404 }
          );
        }

        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            chunkPaths: [...segment.chunkPaths, chunkPath],
          },
        });

        return NextResponse.json({ success: true });
      }

      case "addScreenshot": {
        if (!segmentId || !screenshotPath) {
          return NextResponse.json(
            { error: "segmentId and screenshotPath required for addScreenshot" },
            { status: 400 }
          );
        }

        const segment = await db.recordingSegment.findUnique({
          where: { id: segmentId },
        });

        if (!segment) {
          return NextResponse.json(
            { error: "Segment not found" },
            { status: 404 }
          );
        }

        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            screenshotPaths: [...segment.screenshotPaths, screenshotPath],
          },
        });

        return NextResponse.json({ success: true });
      }

      case "complete": {
        if (!segmentId) {
          return NextResponse.json(
            { error: "segmentId required for complete" },
            { status: 400 }
          );
        }

        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            status: "completed",
            endTime: new Date(),
          },
        });

        // Update recording end time
        await db.recording.update({
          where: { id: recordingId },
          data: { endTime: new Date() },
        });

        return NextResponse.json({ success: true });
      }

      case "interrupt": {
        if (!segmentId) {
          return NextResponse.json(
            { error: "segmentId required for interrupt" },
            { status: 400 }
          );
        }

        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            status: "interrupted",
            endTime: new Date(),
          },
        });

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Recording session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/recording/session - Get current recording session status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 }
      );
    }

    // Verify the assessment belongs to the user
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
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
      return NextResponse.json({
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

    return NextResponse.json({
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
  } catch (error) {
    console.error("Recording session fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
