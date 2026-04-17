import { auth } from "@/auth";
import { db } from "@/server/db";
import { AssessmentStatus } from "@prisma/client";
import { supabaseAdmin } from "@/lib/external";
import { STORAGE_BUCKETS } from "@/lib/external/storage";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";

const logger = createLogger("api:assessment:deliverable");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/assessment/deliverable
 * Upload a deliverable file for an assessment (model, database, image, etc.)
 * Accepts multipart/form-data with:
 * - file: File
 * - assessmentId: string
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assessmentId = formData.get("assessmentId") as string | null;

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    if (!file) {
      return error("File is required", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return error("File must be under 50MB", 400);
    }

    // Verify assessment exists, belongs to user, and is in WORKING status
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to modify this assessment", 403);
    }

    if (assessment.status !== AssessmentStatus.WORKING) {
      return error(
        `Cannot upload deliverable in ${assessment.status} status`,
        400
      );
    }

    // Upload to Supabase storage
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "bin";
    const storagePath = `${assessmentId}/${timestamp}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.DELIVERABLES)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      logger.error("Deliverable upload failed", { assessmentId, error: uploadError.message });
      return error("Failed to upload file", 500);
    }

    // Generate a signed URL (1 year expiry)
    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.DELIVERABLES)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    if (signError || !signedData) {
      logger.error("Failed to generate signed URL", { assessmentId, error: signError?.message });
      return error("Failed to generate download URL", 500);
    }

    return success({
      path: storagePath,
      url: signedData.signedUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    logger.error("Error uploading deliverable", { error: String(err) });
    return error("Failed to upload deliverable", 500);
  }
}
