import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { processImmediateDeletion } from "@/lib/core/data-deletion";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";

const logger = createLogger("server:api:user:delete");

/**
 * POST /api/user/delete
 * Execute immediate account deletion
 *
 * Requires confirmation in request body:
 * { "confirm": "DELETE MY ACCOUNT" }
 *
 * This performs:
 * - Soft delete of user record (marks deletedAt, clears personal data)
 * - Hard delete of all assessments, recordings, conversations
 * - Deletion of files from Supabase storage (CVs, recordings, screenshots)
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    // Parse and validate confirmation
    const body = await request.json();
    const { confirm } = body;

    if (confirm !== "DELETE MY ACCOUNT") {
      return error("Confirmation required", 400);
    }

    // Check user exists and isn't already deleted
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return error("User not found", 404);
    }

    if (user.deletedAt) {
      return error("Account has already been deleted", 400);
    }

    // Execute deletion
    const result = await processImmediateDeletion(session.user.id);

    if (!result.success) {
      logger.error("Deletion errors", { errors: result.errors });
      return error("Deletion partially failed", 500);
    }

    return success({
      message: "Your account and all associated data have been deleted.",
      deletedItems: result.deletedItems,
    });
  } catch (err) {
    logger.error("Error executing deletion", { err });
    return error("Failed to delete account", 500);
  }
}
