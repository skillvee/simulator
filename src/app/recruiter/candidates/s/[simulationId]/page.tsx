import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { ScopedCandidatesClient } from "./client";
import type { VideoEvaluationResult, AssessmentMetrics } from "@/types";

/**
 * Candidate strength levels based on overall score (1-4 scale)
 */
type CandidateStrengthLevel = "Exceptional" | "Strong" | "Proficient" | "Developing";

/**
 * Get candidate strength level from overall score
 */
function getStrengthLevel(overallScore: number): CandidateStrengthLevel {
  if (overallScore >= 3.5) return "Exceptional";
  if (overallScore >= 2.5) return "Strong";
  if (overallScore >= 1.5) return "Proficient";
  return "Developing";
}

/**
 * Candidate data for the scoped table
 */
interface CandidateData {
  assessmentId: string;
  name: string | null;
  email: string | null;
  status: string;
  overallScore: number | null;
  percentile: number | null;
  strengthLevel: CandidateStrengthLevel | null;
  topDimension: { name: string; score: number } | null;
  midDimension: { name: string; score: number } | null;
  bottomDimension: { name: string; score: number } | null;
  redFlagCount: number;
  evaluationConfidence: string | null;
  summary: string | null;
  completedAt: string | null;
}

export default async function ScopedCandidatesPage({
  params,
}: {
  params: Promise<{ simulationId: string }>;
}) {
  const user = await requireRecruiter();
  const { simulationId } = await params;

  // Verify recruiter owns this simulation
  const simulation = await db.scenario.findUnique({
    where: { id: simulationId },
    select: { id: true, name: true, createdById: true },
  });

  if (!simulation) {
    notFound();
  }

  if (simulation.createdById !== user.id && user.role !== "ADMIN") {
    notFound();
  }

  // Fetch all assessments for this simulation
  const assessments = await db.assessment.findMany({
    where: { scenarioId: simulationId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      videoAssessment: {
        include: {
          scores: {
            select: {
              dimension: true,
              score: true,
            },
          },
          summary: {
            select: {
              overallSummary: true,
            },
          },
        },
      },
    },
  });

  // Compute per-candidate data
  const candidatesData: CandidateData[] = assessments.map((assessment) => {
    const videoAssessment = assessment.videoAssessment;
    const hasCompletedVideoAssessment =
      videoAssessment?.status === VideoAssessmentStatus.COMPLETED;

    // For non-completed candidates, return minimal data
    if (!hasCompletedVideoAssessment || !videoAssessment?.scores.length) {
      return {
        assessmentId: assessment.id,
        name: assessment.user.name,
        email: assessment.user.email,
        status: assessment.status,
        overallScore: null,
        percentile: null,
        strengthLevel: null,
        topDimension: null,
        midDimension: null,
        bottomDimension: null,
        redFlagCount: 0,
        evaluationConfidence: null,
        summary: null,
        completedAt: assessment.completedAt?.toISOString() ?? null,
      };
    }

    // Calculate overall score (average of dimension scores)
    const dimensionScores = videoAssessment.scores;
    const overallScore =
      dimensionScores.reduce((sum, s) => sum + s.score, 0) / dimensionScores.length;

    // Parse report JSON for percentiles, red flags, and confidence
    const report = assessment.report as {
      percentiles?: { overall?: number; [dimension: string]: number | undefined };
      videoEvaluation?: VideoEvaluationResult;
      metrics?: AssessmentMetrics;
    } | null;

    const percentile = report?.percentiles?.overall ?? null;

    // Count red flags across all dimensions
    let redFlagCount = 0;
    if (report?.videoEvaluation?.skills) {
      redFlagCount = report.videoEvaluation.skills.reduce(
        (sum, skill) => sum + (skill.redFlags?.length ?? 0),
        0
      );
    }

    // Get evaluation confidence
    const evaluationConfidence = report?.videoEvaluation?.evaluationConfidence ?? null;

    // Get summary (first 120 chars with ellipsis)
    const overallSummary = videoAssessment.summary?.overallSummary ?? null;
    const summary = overallSummary
      ? overallSummary.length > 120
        ? overallSummary.slice(0, 120) + "..."
        : overallSummary
      : null;

    // Get top, mid, and bottom dimension scores for mini-scores
    const sortedDimensions = [...dimensionScores].sort((a, b) => b.score - a.score);
    const topDimension = sortedDimensions[0]
      ? { name: sortedDimensions[0].dimension, score: sortedDimensions[0].score }
      : null;

    // For mid dimension, pick the one closest to the median
    const midIndex = Math.floor(sortedDimensions.length / 2);
    const midDimension =
      sortedDimensions.length > 2 && sortedDimensions[midIndex]
        ? { name: sortedDimensions[midIndex].dimension, score: sortedDimensions[midIndex].score }
        : null;

    const bottomDimension = sortedDimensions[sortedDimensions.length - 1]
      ? {
          name: sortedDimensions[sortedDimensions.length - 1].dimension,
          score: sortedDimensions[sortedDimensions.length - 1].score,
        }
      : null;

    return {
      assessmentId: assessment.id,
      name: assessment.user.name,
      email: assessment.user.email,
      status: assessment.status,
      overallScore,
      percentile,
      strengthLevel: getStrengthLevel(overallScore),
      topDimension,
      midDimension,
      bottomDimension,
      redFlagCount,
      evaluationConfidence,
      summary,
      completedAt: assessment.completedAt?.toISOString() ?? null,
    };
  });

  return (
    <ScopedCandidatesClient
      simulationId={simulationId}
      simulationName={simulation.name}
      candidates={candidatesData}
    />
  );
}
