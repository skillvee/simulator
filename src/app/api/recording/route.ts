import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { supabaseAdmin } from "@/lib/supabase";
import { STORAGE_BUCKETS } from "@/lib/storage";

// Maximum file sizes
const MAX_VIDEO_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB per chunk
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5MB per screenshot

// POST /api/recording - Upload a video chunk or screenshot
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assessmentId = formData.get("assessmentId") as string | null;
    const type = formData.get("type") as "video" | "screenshot" | null;
    const chunkIndex = formData.get("chunkIndex") as string | null;
    const timestamp = formData.get("timestamp") as string | null;
    const segmentId = formData.get("segmentId") as string | null;

    if (!file || !assessmentId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: file, assessmentId, type" },
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

    // Validate file size
    const maxSize = type === "video" ? MAX_VIDEO_CHUNK_SIZE : MAX_SCREENSHOT_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate storage path
    const bucket =
      type === "video"
        ? STORAGE_BUCKETS.RECORDINGS
        : STORAGE_BUCKETS.SCREENSHOTS;

    const extension = type === "video" ? "webm" : "jpg";
    const chunkSuffix = chunkIndex ? `-chunk-${chunkIndex}` : "";
    const tsValue = timestamp || Date.now().toString();
    const path = `${assessmentId}/${tsValue}${chunkSuffix}.${extension}`;

    // Upload to Supabase storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type || (type === "video" ? "video/webm" : "image/jpeg"),
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Create signed URL for access
    const { data: signedUrlData, error: signedUrlError } =
      await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year expiry

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
    }

    const storageUrl = signedUrlData?.signedUrl || path;

    // For video chunks, update or create Recording record and add to segment
    if (type === "video") {
      await db.recording.upsert({
        where: {
          id: `${assessmentId}-screen`, // Single recording per assessment
        },
        create: {
          id: `${assessmentId}-screen`,
          assessmentId,
          type: "screen",
          storageUrl: storageUrl,
          startTime: new Date(),
        },
        update: {
          storageUrl: storageUrl,
          endTime: new Date(),
        },
      });

      // Add chunk path to segment if segmentId provided
      if (segmentId) {
        const segment = await db.recordingSegment.findUnique({
          where: { id: segmentId },
        });
        if (segment) {
          await db.recordingSegment.update({
            where: { id: segmentId },
            data: {
              chunkPaths: [...segment.chunkPaths, path],
            },
          });
        }
      }
    }

    // Add screenshot path to segment if segmentId provided
    if (type === "screenshot" && segmentId) {
      const segment = await db.recordingSegment.findUnique({
        where: { id: segmentId },
      });
      if (segment) {
        await db.recordingSegment.update({
          where: { id: segmentId },
          data: {
            screenshotPaths: [...segment.screenshotPaths, path],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      path,
      url: storageUrl,
      type,
      chunkIndex: chunkIndex ? parseInt(chunkIndex) : undefined,
      segmentId,
    });
  } catch (error) {
    console.error("Recording upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/recording - Get recording metadata for an assessment
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
      include: {
        recordings: {
          include: {
            segments: {
              orderBy: { segmentIndex: "asc" },
            },
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      recordings: assessment.recordings,
    });
  } catch (error) {
    console.error("Recording fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
