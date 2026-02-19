/**
 * Admin User Delete Image API
 *
 * POST /api/admin/user/delete-image
 * Deletes a user's profile photo from storage and clears the image field.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";

interface DeleteImageRequest {
  userId: string;
}

interface DeleteImageResponse {
  success: boolean;
  message: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<DeleteImageResponse>> {
  try {
    await requireAdmin();

    const body = await request.json();
    const { userId } = body as DeleteImageRequest;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, image: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (!user.image) {
      return NextResponse.json(
        { success: false, message: "User has no profile image" },
        { status: 400 }
      );
    }

    // Delete from avatars bucket
    const avatarPath = `candidates/${userId}.jpg`;
    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .remove([avatarPath]);

    if (storageError) {
      console.error(
        `[Admin] Failed to delete avatar from storage for ${user.email}:`,
        storageError
      );
      // Continue anyway — clear the DB reference even if storage delete fails
    }

    // Clear image field in database
    await db.user.update({
      where: { id: userId },
      data: { image: null },
    });

    console.log(`[Admin] Deleted profile image for user ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Profile image deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting user image:", error);

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to delete user image" },
      { status: 500 }
    );
  }
}
