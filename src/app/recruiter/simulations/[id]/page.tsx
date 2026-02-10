import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import { SimulationCandidatesClient } from "./client";
import type { VideoEvaluationResult, AssessmentMetrics } from "@/types";
import {
  getRelativeStrength,
  LEVEL_EXPECTATIONS,
  type TargetLevel,
  type RelativeStrength,
} from "@/lib/rubric/level-expectations";
import { computeExpectedScores } from "@/lib/rubric/dimension-mapping";

export interface CandidateData {
  assessmentId: string;
  name: string | null;
  email: string | null;
  status: string;
  overallScore: number | null;
  percentile: number | null;
  strengthLevel: RelativeStrength | null;
  dimensionScores: Record<string, number>;
  redFlagCount: number;
  redFlags: string[];
  evaluationConfidence: string | null;
  summary: string | null;
  completedAt: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SimulationDetailPage({ params }: PageProps) {
  const user = await requireRecruiter();
  const { id } = await params;

  // Verify recruiter owns this simulation
  const simulation = await db.scenario.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdById: true,
      targetLevel: true,
      archetypeId: true,
      archetype: {
        select: {
          id: true,
          name: true,
          roleFamily: { select: { name: true } },
          weights: { select: { dimension: { select: { slug: true } }, weight: true } },
          seniorityGates: { select: { dimension: { select: { slug: true } }, seniorityLevel: true, minScore: true } },
        },
      },
    },
  });

  if (!simulation) {
    notFound();
  }

  if (simulation.createdById !== user.id && user.role !== "ADMIN") {
    notFound();
  }

  const targetLevel = (simulation.targetLevel || "mid") as TargetLevel;
  const expectedScore = LEVEL_EXPECTATIONS[targetLevel].expectedScore;

  // Compute per-dimension expected scores from archetype seniority gates
  let dimensionExpectations: Record<string, number> | null = null;
  let archetypeName: string | null = null;
  let roleFamilyName: string | null = null;

  if (simulation.archetype) {
    archetypeName = simulation.archetype.name;
    roleFamilyName = simulation.archetype.roleFamily.name;

    // Map seniority level to gate level: junior→JUNIOR, mid→MID, senior/staff→SENIOR
    const gateLevel = targetLevel === "junior" ? "JUNIOR"
      : targetLevel === "mid" ? "MID"
      : "SENIOR";

    // Build gates and weights maps from DB data
    const gates: Record<string, number> = {};
    for (const gate of simulation.archetype.seniorityGates) {
      if (gate.seniorityLevel === gateLevel) {
        gates[gate.dimension.slug] = gate.minScore;
      }
    }

    const weights: Record<string, number> = {};
    for (const w of simulation.archetype.weights) {
      weights[w.dimension.slug] = w.weight;
    }

    dimensionExpectations = computeExpectedScores(gates, weights);
  }

  // Fetch all assessments for this simulation
  const assessments = await db.assessment.findMany({
    where: { scenarioId: id },
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

    if (!hasCompletedVideoAssessment || !videoAssessment?.scores.length) {
      return {
        assessmentId: assessment.id,
        name: assessment.user.name,
        email: assessment.user.email,
        status: assessment.status,
        overallScore: null,
        percentile: null,
        strengthLevel: null,
        dimensionScores: {},
        redFlagCount: 0,
        redFlags: [],
        evaluationConfidence: null,
        summary: null,
        completedAt: assessment.completedAt?.toISOString() ?? null,
      };
    }

    const scores = videoAssessment.scores;
    const overallScore =
      scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    const report = assessment.report as {
      percentiles?: {
        overall?: number;
        [dimension: string]: number | undefined;
      };
      videoEvaluation?: VideoEvaluationResult;
      metrics?: AssessmentMetrics;
    } | null;

    const percentile = report?.percentiles?.overall ?? null;

    let redFlagCount = 0;
    const redFlags: string[] = [];
    if (report?.videoEvaluation?.skills) {
      for (const skill of report.videoEvaluation.skills) {
        if (skill.redFlags?.length) {
          redFlagCount += skill.redFlags.length;
          redFlags.push(...skill.redFlags);
        }
      }
    }

    const evaluationConfidence =
      report?.videoEvaluation?.evaluationConfidence ?? null;

    const overallSummary = videoAssessment.summary?.overallSummary ?? null;
    const summary = overallSummary ?? null;

    const dimensionScoresMap: Record<string, number> = {};
    for (const s of scores) {
      dimensionScoresMap[s.dimension] = s.score;
    }

    return {
      assessmentId: assessment.id,
      name: assessment.user.name,
      email: assessment.user.email,
      status: assessment.status,
      overallScore,
      percentile,
      strengthLevel: getRelativeStrength(overallScore, targetLevel),
      dimensionScores: dimensionScoresMap,
      redFlagCount,
      redFlags,
      evaluationConfidence,
      summary,
      completedAt: assessment.completedAt?.toISOString() ?? null,
    };
  });

  return (
    <SimulationCandidatesClient
      simulationId={id}
      simulationName={simulation.name}
      targetLevel={targetLevel}
      expectedScore={expectedScore}
      dimensionExpectations={dimensionExpectations}
      archetypeName={archetypeName}
      roleFamilyName={roleFamilyName}
      candidates={candidatesData}
    />
  );
}
