import { success, error } from "@/lib/api";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { fetchPrCiStatus, type PrCiStatus } from "@/lib/external";
import { Prisma } from "@prisma/client";

/**
 * GET /api/ci/status
 * Fetches the current CI status for an assessment's PR
 * - Returns cached status if available and fresh
 * - Fetches from GitHub if no cache or stale
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    // Verify assessment exists and belongs to user
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        prUrl: true,
        ciStatus: true,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to access this assessment", 403);
    }

    if (!assessment.prUrl) {
      return error("No PR URL found for this assessment", 400);
    }

    // Check if we have a recent cached status (less than 30 seconds old)
    const cachedStatus = assessment.ciStatus as PrCiStatus | null;
    if (cachedStatus?.fetchedAt) {
      const fetchedAt = new Date(cachedStatus.fetchedAt);
      const ageSeconds = (Date.now() - fetchedAt.getTime()) / 1000;
      if (ageSeconds < 30) {
        return success({
          ciStatus: cachedStatus,
          cached: true,
          cacheAge: Math.round(ageSeconds),
        });
      }
    }

    // Fetch fresh status from GitHub
    const ciStatus = await fetchPrCiStatus(assessment.prUrl);

    // Cache the status in the database
    await db.assessment.update({
      where: { id: assessmentId },
      data: {
        ciStatus: ciStatus as unknown as Prisma.InputJsonValue,
      },
    });

    return success({
      ciStatus,
      cached: false,
    });
  } catch (err) {
    console.error("Error fetching CI status:", err);
    return error("Failed to fetch CI status", 500);
  }
}

/**
 * POST /api/ci/status
 * Forces a refresh of CI status for an assessment's PR
 * Useful when the user knows CI has completed but cache is stale
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const body = await request.json();
    const { assessmentId } = body;

    if (!assessmentId) {
      return error("Assessment ID is required", 400);
    }

    // Verify assessment exists and belongs to user
    const assessment = await db.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        prUrl: true,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404);
    }

    if (assessment.userId !== session.user.id) {
      return error("Unauthorized to access this assessment", 403);
    }

    if (!assessment.prUrl) {
      return error("No PR URL found for this assessment", 400);
    }

    // Force fetch fresh status from GitHub
    const ciStatus = await fetchPrCiStatus(assessment.prUrl);

    // Update cache in the database
    await db.assessment.update({
      where: { id: assessmentId },
      data: {
        ciStatus: ciStatus as unknown as Prisma.InputJsonValue,
      },
    });

    return success({
      ciStatus,
      refreshed: true,
    });
  } catch (err) {
    console.error("Error refreshing CI status:", err);
    return error("Failed to refresh CI status", 500);
  }
}
