import { auth } from "@/auth";
import { db } from "@/server/db";
import { success, error } from "@/lib/api";
import { VideoAssessmentStatus } from "@prisma/client";
import { getStoredPercentiles } from "@/lib/candidate/percentile-calculator";
import { getRelativeStrength, type TargetLevel, type RelativeStrength } from "@/lib/rubric/level-expectations";
import type { AssessmentMetrics, TimestampedBehavior, RubricAssessmentOutput, AssessmentStrengthOrGap } from "@/types";

// ============================================================================
// Types
// ============================================================================

type CandidateStrengthLevel = RelativeStrength;

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
  summary: string;
  percentile: number;
  greenFlags: string[];
  redFlags: string[];
  rationale: string;
  timestamps: string[];
  observableBehaviors: TimestampedBehavior[];
}

/**
 * Work style metrics for comparison
 */
interface WorkStyleMetrics {
  totalDurationMinutes: number | null;
  workingPhaseMinutes: number | null;
  coworkersContacted: number;
  voiceCallMinutes: number;
  messageWordCount: number;
  aiUsage: { score: number; level: string; behaviors: string[] };
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
  topStrengths: AssessmentStrengthOrGap[];
  growthAreas: AssessmentStrengthOrGap[];
  summary: string;
  metrics: WorkStyleMetrics;
  confidence: string;
  videoUrl: string;
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
          targetLevel: true,
        },
      },
      videoAssessment: {
        include: {
          scores: true,
          summary: true,
        },
      },
      conversations: {
        select: {
          type: true,
          transcript: true,
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

      // Parse report JSON for metrics
      const report = assessment.report as { metrics?: AssessmentMetrics } | null;
      const metrics = report?.metrics;
      const targetLevel = (assessment.scenario.targetLevel || "mid") as TargetLevel;

      // Parse rawAiResponse for v3 rubric data (top_strengths, growth_areas, dimension summaries)
      const rawAiResponse = videoAssessment?.summary?.rawAiResponse as unknown as RubricAssessmentOutput | null;

      // Build dimension scores with percentiles, flags, rationale, timestamps, behaviors
      const dimensionScores: DimensionScoreComparison[] = [];

      if (hasCompletedVideoAssessment && videoAssessment?.scores) {
        for (const score of videoAssessment.scores) {
          const percentile = percentiles?.[score.dimension] ?? 0;

          // score.dimension is now a rubric slug that matches rawAiResponse directly
          const rubricDimData = rawAiResponse?.dimensionScores?.find(
            (d) => d.dimensionSlug === score.dimension
          );

          // Parse timestamps from DimensionScore.timestamps (stored as JSON array)
          const timestamps = Array.isArray(score.timestamps)
            ? (score.timestamps as string[])
            : [];

          // Parse observable behaviors — try JSON first (v3), fall back to text (v2)
          let observableBehaviors: TimestampedBehavior[] = [];
          if (rubricDimData?.observableBehaviors && Array.isArray(rubricDimData.observableBehaviors)) {
            observableBehaviors = rubricDimData.observableBehaviors;
          } else if (score.observableBehaviors) {
            // Try parsing as JSON (v3 storage format)
            try {
              const parsed = JSON.parse(score.observableBehaviors);
              if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object" && "timestamp" in parsed[0]) {
                observableBehaviors = parsed;
              }
            } catch {
              // v2 text format — split into sentences and pair with timestamps
              const sentences = score.observableBehaviors.split(/\.\s+/).filter(Boolean);
              observableBehaviors = sentences.map((s, i) => ({
                timestamp: timestamps[i] ?? "",
                behavior: s.endsWith(".") ? s : s + ".",
              }));
            }
          }

          dimensionScores.push({
            dimension: score.dimension,
            score: score.score,
            summary: rubricDimData?.summary ?? "",
            percentile,
            greenFlags: rubricDimData?.greenFlags ?? [],
            redFlags: rubricDimData?.redFlags ?? [],
            rationale: rubricDimData?.rationale ?? score.rationale ?? "",
            timestamps,
            observableBehaviors,
          });
        }
      }

      // Calculate overall score from dimension scores
      const overallScore =
        dimensionScores.length > 0
          ? dimensionScores.reduce((sum, s) => sum + s.score, 0) / dimensionScores.length
          : 0;

      // Extract top strengths and growth areas from v3 rubric data, or derive from scores
      let topStrengths: AssessmentStrengthOrGap[] = rawAiResponse?.topStrengths ?? [];
      let growthAreas: AssessmentStrengthOrGap[] = rawAiResponse?.growthAreas ?? [];

      // Fallback: derive from dimension scores if not stored
      if (topStrengths.length === 0 && dimensionScores.length > 0) {
        const sorted = [...dimensionScores].sort((a, b) => b.score - a.score);
        topStrengths = sorted.slice(0, 3).filter(d => d.score >= 3).map(d => ({
          dimension: d.dimension,
          score: d.score,
          description: d.greenFlags[0] ?? d.rationale.split(".")[0] ?? "",
        }));
      }

      if (growthAreas.length === 0 && dimensionScores.length > 0) {
        const sorted = [...dimensionScores].sort((a, b) => a.score - b.score);
        growthAreas = sorted.slice(0, 3).filter(d => d.score <= 2).map(d => ({
          dimension: d.dimension,
          score: d.score,
          description: d.redFlags[0] ?? d.rationale.split(".")[0] ?? "",
        }));
      }

      // Extract summary from VideoAssessmentSummary
      const summary = videoAssessment?.summary?.overallSummary ?? "";

      // Derive AI usage from work_process dimension (which covers AI tool usage)
      const creativityDim = dimensionScores.find(
        (d) => d.dimension === "work_process"
      );
      const aiScore = creativityDim?.score ?? 0;
      const aiLevel =
        aiScore >= 3.5
          ? "Expert"
          : aiScore >= 2.5
            ? "Strong"
            : aiScore >= 1.5
              ? "Basic"
              : "None";
      const aiBehaviors = creativityDim?.observableBehaviors
        ?.map((ob) => ob.behavior)
        .slice(0, 3) ?? [];

      // Compute voice call minutes and message word count from conversations
      let voiceCallMinutes = 0;
      let messageWordCount = 0;

      for (const convo of assessment.conversations) {
        const messages = Array.isArray(convo.transcript) ? (convo.transcript as Array<{ role?: string; text?: string; timestamp?: string }>) : [];

        if (convo.type === "voice") {
          // Approximate duration from first and last message timestamps
          const timestamps = messages
            .map((m) => m.timestamp)
            .filter((t): t is string => !!t);
          if (timestamps.length >= 2) {
            const first = timestamps[0];
            const last = timestamps[timestamps.length - 1];
            // Timestamps are ISO strings or "MM:SS" / "HH:MM:SS" format
            const parseTs = (ts: string): number | null => {
              // Try ISO date first
              const d = new Date(ts);
              if (!isNaN(d.getTime())) return d.getTime();
              // Try MM:SS or HH:MM:SS
              const parts = ts.split(":").map(Number);
              if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
              if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
              return null;
            };
            const firstMs = parseTs(first);
            const lastMs = parseTs(last);
            if (firstMs !== null && lastMs !== null && lastMs > firstMs) {
              voiceCallMinutes += Math.round((lastMs - firstMs) / 60000);
            }
          }
        }

        if (convo.type === "text") {
          // Count words from user messages only
          for (const msg of messages) {
            if (msg.role === "user" && msg.text) {
              messageWordCount += msg.text.split(/\s+/).filter(Boolean).length;
            }
          }
        }
      }

      // Extract metrics with sensible defaults
      const workStyleMetrics: WorkStyleMetrics = {
        totalDurationMinutes: metrics?.totalDurationMinutes ?? null,
        workingPhaseMinutes: metrics?.workingPhaseMinutes ?? null,
        coworkersContacted: metrics?.coworkersContacted ?? 0,
        voiceCallMinutes,
        messageWordCount,
        aiUsage: { score: aiScore, level: aiLevel, behaviors: aiBehaviors },
      };

      // Extract confidence from v3 rubric data
      const confidence = rawAiResponse?.evaluationConfidence ?? "medium";

      // Get video URL
      const videoUrl = videoAssessment?.videoUrl ?? "";

      return {
        assessmentId: assessment.id,
        candidateName: assessment.user.name,
        scenarioId: assessment.scenario.id,
        overallScore,
        overallPercentile,
        strengthLevel: getRelativeStrength(overallScore, targetLevel),
        dimensionScores,
        topStrengths,
        growthAreas,
        summary,
        metrics: workStyleMetrics,
        confidence,
        videoUrl,
      };
    })
  );

  // Count total completed assessments in this simulation for percentile context
  const resolvedSimulationId = simulationId || assessments[0]?.scenario.id;
  const totalCandidatesInSimulation = resolvedSimulationId
    ? await db.assessment.count({
        where: {
          scenarioId: resolvedSimulationId,
          videoAssessment: {
            status: VideoAssessmentStatus.COMPLETED,
          },
        },
      })
    : comparisons.length;

  return success({
    candidates: comparisons,
    totalCandidatesInSimulation,
  });
}
