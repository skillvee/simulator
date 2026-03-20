/**
 * Admin User Delete Image API
 *
 * POST /api/admin/user/delete-image
 * Deletes a user's profile photo from storage and clears the image field.
 */

import { requireAdmin } from "@/lib/core";
import { db } from "@/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";
import { success, error } from "@/lib/api";

interface DeleteImageRequest {
  userId: string;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { userId } = body as DeleteImageRequest;

    if (!userId) {
      return error("User ID is required", 400);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, image: true },
    });

    if (!user) {
      return error("User not found", 404);
    }

    if (!user.image) {
      return error("User has no profile image", 400);
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

    return success({
      message: "Profile image deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting user image:", err);

    if (err instanceof Error && err.message.includes("Unauthorized")) {
      return error("Unauthorized - Admin access required", 401);
    }

    return error("Failed to delete user image", 500);
  }
}
