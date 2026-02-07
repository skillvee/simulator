import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { VideoAssessmentStatus } from "@prisma/client";
import type { CodeReviewData } from "@/types";
import { getStoredPercentiles } from "@/lib/candidate/percentile-calculator";

/**
 * Candidate strength levels based on overall score (1-5 scale)
 */
type CandidateStrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

/**
 * Get candidate strength level from overall score
 */
function getStrengthLevel(overallScore: number): CandidateStrengthLevel {
  if (overallScore >= 4.5) return "Exceptional";
  if (overallScore >= 3.5) return "Strong";
  if (overallScore >= 2.5) return "Proficient";
  return "Developing";
}

/**
 * Session user interface for type safety
 */
interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
}

/**
 * Dimension score data for the response
 */
interface DimensionScoreData {
  dimension: string;
  score: number;
  observableBehaviors: string;
  timestamps: string[];
  trainableGap: boolean;
}

/**
 * Candidate detail response data
 */
interface CandidateDetailResponse {
  assessmentId: string;
  candidate: {
    name: string | null;
    email: string | null;
  };
  overallScore: number;
  strengthLevel: CandidateStrengthLevel;
  dimensionScores: DimensionScoreData[];
  percentiles: Record<string, number> | null;
  videoUrl: string | null;
  overallSummary: string;
  codeReview: CodeReviewData | null;
  prUrl: string | null;
}

/**
 * GET /api/recruiter/candidate/[assessmentId]
 * Returns comprehensive candidate assessment data for recruiter scorecard view
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  const { assessmentId } = await params;

  // Fetch assessment with all related data
  const assessment = await db.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      scenario: {
        select: {
          id: true,
          createdById: true,
        },
      },
      videoAssessment: {
        include: {
          scores: true,
          summary: {
            select: {
              overallSummary: true,
              rawAiResponse: true,
            },
          },
        },
      },
    },
  });

  if (!assessment) {
    return error("Assessment not found", 404);
  }

  // Verify recruiter owns the simulation (scenario)
  if (assessment.scenario.createdById !== user.id && user.role !== "ADMIN") {
    return error("You do not have access to this candidate's data", 403);
  }

  // Get video assessment data
  const videoAssessment = assessment.videoAssessment;
  const hasCompletedVideoAssessment =
    videoAssessment?.status === VideoAssessmentStatus.COMPLETED;

  // Extract dimension scores
  const dimensionScores: DimensionScoreData[] = (videoAssessment?.scores ?? []).map(
    (score) => ({
      dimension: score.dimension,
      score: score.score,
      observableBehaviors: score.observableBehaviors,
      timestamps: (score.timestamps as string[]) ?? [],
      trainableGap: score.trainableGap,
    })
  );

  // Calculate overall score from dimension scores
  const overallScore =
    dimensionScores.length > 0
      ? dimensionScores.reduce((sum, s) => sum + s.score, 0) / dimensionScores.length
      : 0;

  // Get percentiles from US-001
  const percentiles = await getStoredPercentiles(assessmentId);

  // Get overall summary
  let overallSummary = "";
  if (hasCompletedVideoAssessment && videoAssessment.summary?.rawAiResponse) {
    const rawResponse = videoAssessment.summary.rawAiResponse as Record<string, unknown>;
    if (typeof rawResponse.overall_summary === "string") {
      overallSummary = rawResponse.overall_summary;
    }
  }

  // Use stored summary if available
  if (!overallSummary && videoAssessment?.summary?.overallSummary) {
    overallSummary = videoAssessment.summary.overallSummary;
  }

  // Get code review data
  const codeReview = assessment.codeReview as CodeReviewData | null;

  // Build response
  const response: CandidateDetailResponse = {
    assessmentId,
    candidate: {
      name: assessment.user.name,
      email: assessment.user.email,
    },
    overallScore,
    strengthLevel: getStrengthLevel(overallScore),
    dimensionScores,
    percentiles,
    videoUrl: videoAssessment?.videoUrl ?? null,
    overallSummary,
    codeReview,
    prUrl: assessment.prUrl,
  };

  return success(response);
}
