import { notFound } from "next/navigation";
import { requireRecruiter } from "@/lib/core";
import { db } from "@/server/db";
import { VideoAssessmentStatus } from "@prisma/client";
import { SimulationCandidatesClient } from "./client";
import type { RubricAssessmentOutput } from "@/types";
import {
  getRelativeStrength,
  LEVEL_EXPECTATIONS,
  type TargetLevel,
  type RelativeStrength,
} from "@/lib/rubric/level-expectations";

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

export default async function AssessmentDetailPage({ params }: PageProps) {
  const user = await requireRecruiter();
  const { id } = await params;

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
          weights: { select: { dimension: { select: { slug: true, name: true, description: true } }, weight: true } },
          seniorityGates: { select: { dimension: { select: { slug: true } }, seniorityLevel: true, minScore: true } },
        },
      },
    },
  });

  if (!simulation) notFound();
  if (simulation.createdById !== user.id && user.role !== "ADMIN") notFound();

  const targetLevel = (simulation.targetLevel || "mid") as TargetLevel;
  const expectedScore = LEVEL_EXPECTATIONS[targetLevel].expectedScore;

  let dimensionExpectations: Record<string, number> | null = null;
  let archetypeName: string | null = null;
  let roleFamilyName: string | null = null;
  // Dimension metadata: slug → { name, description } from archetype weights
  let dimensionMeta: Record<string, { name: string; description: string }> | null = null;

  if (simulation.archetype) {
    archetypeName = simulation.archetype.name;
    roleFamilyName = simulation.archetype.roleFamily.name;
    const gateLevel = targetLevel === "junior" ? "JUNIOR" : targetLevel === "mid" ? "MID" : "SENIOR";
    // Build expected scores keyed by rubric dimension slug directly
    const gates: Record<string, number> = {};
    for (const gate of simulation.archetype.seniorityGates) {
      if (gate.seniorityLevel === gateLevel) gates[gate.dimension.slug] = gate.minScore;
    }
    dimensionExpectations = Object.keys(gates).length > 0 ? gates : null;

    // Build dimension metadata from archetype weights
    const meta: Record<string, { name: string; description: string }> = {};
    for (const w of simulation.archetype.weights) {
      meta[w.dimension.slug] = { name: w.dimension.name, description: w.dimension.description };
    }
    dimensionMeta = Object.keys(meta).length > 0 ? meta : null;
  }

  const assessments = await db.assessment.findMany({
    where: { scenarioId: id },
    include: {
      user: { select: { name: true, email: true } },
      videoAssessment: {
        include: {
          scores: { select: { dimension: true, score: true } },
          summary: { select: { overallSummary: true, rawAiResponse: true } },
        },
      },
    },
  });

  const candidatesData: CandidateData[] = assessments.map((assessment) => {
    const videoAssessment = assessment.videoAssessment;
    const hasCompletedVideoAssessment = videoAssessment?.status === VideoAssessmentStatus.COMPLETED;

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
    const overallScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    const report = assessment.report as {
      percentiles?: { overall?: number; [dimension: string]: number | undefined };
    } | null;

    const percentile = report?.percentiles?.overall ?? null;

    // Source red flags and confidence from rawAiResponse (v3 rubric data)
    const rawAiResponse = videoAssessment.summary?.rawAiResponse as unknown as RubricAssessmentOutput | null;

    let redFlagCount = 0;
    const redFlags: string[] = [];
    if (rawAiResponse?.dimensionScores) {
      for (const dimScore of rawAiResponse.dimensionScores) {
        if (dimScore.redFlags?.length) {
          redFlagCount += dimScore.redFlags.length;
          redFlags.push(...dimScore.redFlags);
        }
      }
    }

    const evaluationConfidence = rawAiResponse?.evaluationConfidence ?? null;
    const summary = videoAssessment.summary?.overallSummary ?? null;

    const dimensionScoresMap: Record<string, number> = {};
    for (const s of scores) dimensionScoresMap[s.dimension] = s.score;

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
      dimensionMeta={dimensionMeta}
      archetypeName={archetypeName}
      roleFamilyName={roleFamilyName}
      candidates={candidatesData}
    />
  );
}
