import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { createLogger } from "@/lib/core";

const logger = createLogger("server:api:user:delete-request");

/**
 * POST /api/user/delete-request
 * Request deletion of user data (GDPR compliance)
 */
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    // Check if deletion was already requested
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        dataDeleteRequestedAt: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return error("User not found", 404);
    }

    if (user.deletedAt) {
      return error("Account has already been deleted", 400);
    }

    if (user.dataDeleteRequestedAt) {
      return success({
        message: "Data deletion request already submitted",
        requestedAt: user.dataDeleteRequestedAt,
        status: "pending",
      });
    }

    // Record the deletion request
    const updated = await db.user.update({
      where: { id: session.user.id },
      data: { dataDeleteRequestedAt: new Date() },
    });

    // In a production system, this would:
    // 1. Queue an async job to process the deletion
    // 2. Send a confirmation email
    // 3. Delete data after a grace period (e.g., 30 days)

    return success({
      message:
        "Data deletion request submitted. Your data will be deleted within 30 days.",
      requestedAt: updated.dataDeleteRequestedAt,
      status: "pending",
    });
  } catch (err) {
    logger.error("Error processing deletion request", { err });
    return error("Failed to process deletion request", 500);
  }
}

/**
 * GET /api/user/delete-request
 * Check status of data deletion request
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        dataDeleteRequestedAt: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return error("User not found", 404);
    }

    if (user.deletedAt) {
      return success({
        status: "deleted",
        deletedAt: user.deletedAt,
      });
    }

    if (user.dataDeleteRequestedAt) {
      return success({
        status: "pending",
        requestedAt: user.dataDeleteRequestedAt,
      });
    }

    return success({
      status: "none",
      message: "No deletion request on file",
    });
  } catch (err) {
    logger.error("Error checking deletion status", { err });
    return error("Failed to check deletion status", 500);
  }
}

/**
 * DELETE /api/user/delete-request
 * Cancel a pending data deletion request
 */
export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        dataDeleteRequestedAt: true,
        deletedAt: true,
      },
    });

    if (!user) {
      return error("User not found", 404);
    }

    if (user.deletedAt) {
      return error("Account has already been deleted", 400);
    }

    if (!user.dataDeleteRequestedAt) {
      return error("No deletion request to cancel", 400);
    }

    // Cancel the deletion request
    await db.user.update({
      where: { id: session.user.id },
      data: { dataDeleteRequestedAt: null },
    });

    return success({
      message: "Data deletion request cancelled",
    });
  } catch (err) {
    logger.error("Error cancelling deletion request", { err });
    return error("Failed to cancel deletion request", 500);
  }
}
