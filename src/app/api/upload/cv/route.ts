import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { STORAGE_BUCKETS } from "@/lib/storage";
import { db } from "@/server/db";
import { parseCv, profileToPrismaJson } from "@/lib/cv-parser";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/rtf",
];

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "txt", "rtf"];

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assessmentId = formData.get("assessmentId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file format" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const timestamp = Date.now();
    const path = `${userId}/${timestamp}.${extension}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RESUMES)
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get signed URL for the file (expires in 1 year for Gemini access)
    const { data: signedUrlData, error: signedUrlError } =
      await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.RESUMES)
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

    if (signedUrlError || !signedUrlData) {
      console.error("Signed URL error:", signedUrlError);
      return NextResponse.json(
        { error: "Failed to generate file URL" },
        { status: 500 }
      );
    }

    // Parse CV before storing - ensures parsed profile is available when user proceeds
    let parsedProfile = null;
    try {
      console.log(`Parsing CV for user ${userId}...`);
      parsedProfile = await parseCv(path);
      console.log(`CV parsed successfully for user ${userId}`);
    } catch (parseError) {
      console.error(`CV parsing failed for user ${userId}:`, parseError);
      // Continue with upload even if parsing fails - user can still proceed
    }

    // Update User with CV URL and parsed profile
    await db.user.update({
      where: { id: userId },
      data: {
        cvUrl: signedUrlData.signedUrl,
        ...(parsedProfile && { parsedProfile: profileToPrismaJson(parsedProfile) }),
      },
    });

    // If assessmentId is provided, also update the assessment
    if (assessmentId) {
      const assessment = await db.assessment.findFirst({
        where: {
          id: assessmentId,
          userId: userId,
        },
      });

      if (assessment) {
        await db.assessment.update({
          where: { id: assessmentId },
          data: {
            cvUrl: signedUrlData.signedUrl,
            ...(parsedProfile && { parsedProfile: profileToPrismaJson(parsedProfile) }),
          },
        });
        console.log(`CV also saved to assessment ${assessmentId}`);
      }
    }

    return NextResponse.json(
      {
        url: signedUrlData.signedUrl,
        path,
        fileName: file.name,
        fileSize: file.size,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CV upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
