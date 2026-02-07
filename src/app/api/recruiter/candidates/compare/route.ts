import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { VideoAssessmentStatus } from "@prisma/client";
import { getStoredPercentiles } from "@/lib/candidate/percentile-calculator";
import type { VideoEvaluationResult, AssessmentMetrics } from "@/types";

// ============================================================================
// Types
// ============================================================================

/**
 * Candidate strength levels based on overall score (1-5 scale)
 */
type CandidateStrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

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
 * Dimension score with percentile and evidence for comparison
 */
interface DimensionScoreComparison {
  dimension: string;
  score: number;
  percentile: number;
  greenFlags: string[];
  redFlags: string[];
  rationale: string;
  timestamps: string[];
}

/**
 * Work style metrics for comparison
 */
interface WorkStyleMetrics {
  totalDurationMinutes: number | null;
  workingPhaseMinutes: number | null;
  coworkersContacted: number;
  aiToolsUsed: boolean;
  testsStatus: string;
}

/**
 * Candidate summary for comparison view
 */
interface CandidateComparison {
  assessmentId: string;
  candidateName: string | null;
  scenarioId: string;
  overallScore: number;
  overallPercentile: number;
  strengthLevel: CandidateStrengthLevel;
  dimensionScores: DimensionScoreComparison[];
  summary: string;
  metrics: WorkStyleMetrics;
  confidence: string;
  videoUrl: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get candidate strength level from overall score
 */
function getStrengthLevel(overallScore: number): CandidateStrengthLevel {
  if (overallScore >= 4.5) return "Exceptional";
  if (overallScore >= 3.5) return "Strong";
  if (overallScore >= 2.5) return "Proficient";
  return "Developing";
}



// ============================================================================
// Route Handler
// ============================================================================

/**
 * GET /api/recruiter/candidates/compare
 *
 * Returns comparison data for multiple candidates for side-by-side view.
 *
 * Query params:
 * - assessmentIds: comma-separated list of assessment IDs (max 4)
 * - simulationId: simulation ID to validate all candidates belong to same simulation
 *
 * Returns array of candidate summaries with:
 * - assessmentId, candidateName, scenarioId
 * - overallScore, overallPercentile, strengthLevel
 * - dimensionScores with percentiles, flags, rationale, timestamps
 * - summary, metrics, confidence, videoUrl
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return error("Unauthorized", 401);
  }

  const user = session.user as SessionUser;
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return error("Recruiter access required", 403);
  }

  // Parse query params
  const url = new URL(request.url);
  const assessmentIdsParam = url.searchParams.get("assessmentIds");
  const simulationId = url.searchParams.get("simulationId");

  if (!assessmentIdsParam) {
    return error("assessmentIds query parameter is required", 400);
  }

  const assessmentIds = assessmentIdsParam.split(",").map((id) => id.trim()).filter(Boolean);

  if (assessmentIds.length === 0) {
    return error("At least one assessmentId is required", 400);
  }

  if (assessmentIds.length > 4) {
    return error("Maximum 4 assessmentIds allowed for comparison", 400);
  }

  // Fetch all assessments with related data
  const assessments = await db.assessment.findMany({
    where: {
      id: { in: assessmentIds },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
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
          summary: true,
        },
      },
    },
  });

  // Verify all requested assessments were found
  if (assessments.length !== assessmentIds.length) {
    const foundIds = new Set(assessments.map((a) => a.id));
    const missingIds = assessmentIds.filter((id) => !foundIds.has(id));
    return error(`Assessments not found: ${missingIds.join(", ")}`, 404);
  }

  // Validate all assessments belong to the same simulation if simulationId provided
  if (simulationId) {
    const differentSimulation = assessments.filter(
      (a) => a.scenario.id !== simulationId
    );

    if (differentSimulation.length > 0) {
      return error("All candidates must belong to the same simulation", 400);
    }
  }

  // Verify recruiter owns all simulations (unless admin)
  if (user.role !== "ADMIN") {
    const unauthorizedAssessments = assessments.filter(
      (a) => a.scenario.createdById !== user.id
    );

    if (unauthorizedAssessments.length > 0) {
      return error("You do not have access to one or more of these candidates", 403);
    }
  }

  // Build comparison data for each candidate
  const comparisons: CandidateComparison[] = await Promise.all(
    assessments.map(async (assessment) => {
      const videoAssessment = assessment.videoAssessment;
      const hasCompletedVideoAssessment =
        videoAssessment?.status === VideoAssessmentStatus.COMPLETED;

      // Get percentiles from stored data
      const percentiles = await getStoredPercentiles(assessment.id);
      const overallPercentile = percentiles?.overall ?? 0;

      // Parse report JSON for video evaluation and metrics
      const report = assessment.report as { videoEvaluation?: VideoEvaluationResult; metrics?: AssessmentMetrics } | null;
      const videoEvaluation = report?.videoEvaluation;
      const metrics = report?.metrics;

      // Build dimension scores with percentiles, flags, rationale, timestamps
      const dimensionScores: DimensionScoreComparison[] = [];

      if (hasCompletedVideoAssessment && videoAssessment?.scores) {
        for (const score of videoAssessment.scores) {
          const percentile = percentiles?.[score.dimension] ?? 0;

          // Find matching skill in videoEvaluation by dimension
          const skillData = videoEvaluation?.skills?.find(
            (s) => s.dimension === score.dimension
          );

          // Parse timestamps from DimensionScore.timestamps (stored as JSON array)
          const timestamps = Array.isArray(score.timestamps)
            ? score.timestamps
            : [];

          dimensionScores.push({
            dimension: score.dimension,
            score: score.score,
            percentile,
            greenFlags: skillData?.greenFlags ?? [],
            redFlags: skillData?.redFlags ?? [],
            rationale: skillData?.rationale ?? score.rationale ?? "",
            timestamps: skillData?.timestamps ?? timestamps,
          });
        }
      }

      // Calculate overall score from dimension scores
      const overallScore =
        dimensionScores.length > 0
          ? dimensionScores.reduce((sum, s) => sum + s.score, 0) / dimensionScores.length
          : 0;

      // Extract summary from VideoAssessmentSummary
      const summary = videoAssessment?.summary?.overallSummary ?? "";

      // Extract metrics with sensible defaults
      const workStyleMetrics: WorkStyleMetrics = {
        totalDurationMinutes: metrics?.totalDurationMinutes ?? null,
        workingPhaseMinutes: metrics?.workingPhaseMinutes ?? null,
        coworkersContacted: metrics?.coworkersContacted ?? 0,
        aiToolsUsed: metrics?.aiToolsUsed ?? false,
        testsStatus: metrics?.testsStatus ?? "unknown",
      };

      // Extract confidence from video evaluation
      const confidence = videoEvaluation?.evaluationConfidence ?? "medium";

      // Get video URL
      const videoUrl = videoAssessment?.videoUrl ?? "";

      return {
        assessmentId: assessment.id,
        candidateName: assessment.user.name,
        scenarioId: assessment.scenario.id,
        overallScore,
        overallPercentile,
        strengthLevel: getStrengthLevel(overallScore),
        dimensionScores,
        summary,
        metrics: workStyleMetrics,
        confidence,
        videoUrl,
      };
    })
  );

  return success(comparisons);
}
