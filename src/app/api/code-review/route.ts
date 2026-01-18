import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { z } from "zod";
import {
  analyzeCodeReview,
  buildCodeReviewData,
  codeReviewToPrismaJson,
  type CodeReviewData,
} from "@/lib/code-review";
import { fetchGitHubPrContent } from "@/lib/github";
import { success, error, validationError } from "@/lib/api-response";

// Schema for code review request
const codeReviewRequestSchema = z.object({
  assessmentId: z.string(),
  forceReanalyze: z.boolean().optional(), // Re-analyze even if already analyzed
});

/**
 * POST /api/code-review
 * Triggers AI code review for an assessment's PR
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return error("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = codeReviewRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { assessmentId, forceReanalyze } = parsed.data;

    // Fetch assessment with existing code review
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
      select: {
        id: true,
        prUrl: true,
        prSnapshot: true,
        codeReview: true,
        status: true,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    if (!assessment.prUrl) {
      return error(
        "No PR URL found for this assessment. Please submit your PR first.",
        400
      );
    }

    // Check if already analyzed
    if (assessment.codeReview && !forceReanalyze) {
      return success({
        analyzed: false,
        message:
          "Code review already exists. Use forceReanalyze: true to re-analyze.",
        codeReview: assessment.codeReview as unknown as CodeReviewData,
      });
    }

    // Use existing PR snapshot if available, otherwise fetch fresh
    let prSnapshot = assessment.prSnapshot as unknown as Parameters<
      typeof analyzeCodeReview
    >[1];

    if (!prSnapshot) {
      try {
        prSnapshot = await fetchGitHubPrContent(assessment.prUrl);
      } catch (error) {
        console.warn("Failed to fetch PR content:", error);
        // Continue with null - analyzeCodeReview will handle this
      }
    }

    // Run AI code review analysis
    const analysis = await analyzeCodeReview(assessment.prUrl, prSnapshot);

    // Build and store the code review data
    const codeReviewData = buildCodeReviewData(assessment.prUrl, analysis);

    // Update assessment with code review results
    await db.assessment.update({
      where: { id: assessmentId },
      data: {
        codeReview: codeReviewToPrismaJson(codeReviewData),
      },
    });

    return success({
      analyzed: true,
      codeReview: codeReviewData,
    });
  } catch (err) {
    console.error("Code review analysis error:", err);
    return error("Failed to analyze code", 500);
  }
}

/**
 * GET /api/code-review
 * Retrieves code review results for an assessment
 */
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

    // Fetch assessment with code review
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        userId: session.user.id,
      },
      select: {
        id: true,
        prUrl: true,
        codeReview: true,
        status: true,
      },
    });

    if (!assessment) {
      return error("Assessment not found", 404, "NOT_FOUND");
    }

    if (!assessment.codeReview) {
      return success({
        hasCodeReview: false,
        prUrl: assessment.prUrl,
        message: assessment.prUrl
          ? "Code review has not been run yet. Use POST to trigger analysis."
          : "No PR URL found for this assessment.",
      });
    }

    return success({
      hasCodeReview: true,
      prUrl: assessment.prUrl,
      codeReview: assessment.codeReview as unknown as CodeReviewData,
    });
  } catch (err) {
    console.error("Get code review error:", err);
    return error("Internal server error", 500);
  }
}
